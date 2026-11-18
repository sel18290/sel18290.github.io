window.CORTEX_LOCAL_PDF=(function pdfFactory(){
  const PT=72/25.4,W=210,H=297, E=new TextEncoder();
  const fix=n=>Number(n).toFixed(3),p=n=>Number(n)*PT,bytes=s=>E.encode(s);
  const colors=a=>a.map(n=>fix(Math.max(0,Math.min(255,n))/255)).join(" ");
  const maps={'€':128,'œ':156,'Œ':140,'’':146,'‘':145,'“':147,'”':148,'–':150,'—':151,'•':149,'…':133,'→':62,'←':60,'✓':86};
  function encodeText(s){const out=[];for(const c of String(s||'')){const cp=c.codePointAt(0);out.push(cp<256?cp:(maps[c]||63));}return out;}
  const textHex=s=>encodeText(s).map(b=>b.toString(16).padStart(2,'0')).join('');
  function decodeJPEG(s){
    if(!/^data:image\/jpe?g;base64,/i.test(s))throw Error('Image JPEG requise');
    const raw=atob(s.substring(s.indexOf(',')+1)),data=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)data[i]=raw.charCodeAt(i);
    let index=2,dim=null;
    while(index+8<data.length){
      if(data[index]!==255){index++;continue;}
      const m=data[index+1];
      if(m===216||m===217||m===1){index+=2;continue;}
      if(m===218)break;
      const len=(data[index+2]<<8)+data[index+3];
      if([192,193,194,195,198,199,201,202].includes(m)){dim={height:(data[index+5]<<8)+data[index+6],width:(data[index+7]<<8)+data[index+8]};break;}
      if(!len||index+len+2>data.length)break;
      index+=len+2;
    }
    if(!dim)throw Error('Dimensions JPEG non reconnues');
    return {data,...dim};
  }
  return class LocalPDF{
    constructor(){
      this.pages=[{commands:[],images:[]}];this.current=0;this.fontSize=10;this.font='F1';
      // Une même page de référence peut apparaître dans des dizaines de copies.
      this.imageCache=new Map();
      this.fill=[255,255,255];this.ink=[0,0,0];this.stroke=[0,0,0];
      this.internal={pageSize:{getWidth:()=>W,getHeight:()=>H},getNumberOfPages:()=>this.pages.length};
    }
    page(){return this.pages[this.current]}
    setFillColor(...v){this.fill=v;return this}
    setDrawColor(...v){this.stroke=v;return this}
    setTextColor(...v){this.ink=v;return this}
    setFont(a,b){this.font=b==='bold'?'F2':'F1';return this}
    setFontSize(v){this.fontSize=Number(v)||10;return this}
    rect(x,y,w,h,style){
      this.page().commands.push(colors(style==='F'?this.fill:this.stroke)+(style==='F'?' rg ':' RG ')+[p(x),p(H-y-h),p(w),p(h)].map(fix).join(' ')+' re '+(style==='F'?'f':'S')+'\n');return this
    }
    line(x,y,x2,y2){
      this.page().commands.push(colors(this.stroke)+' RG '+fix(p(x))+' '+fix(p(H-y))+' m '+fix(p(x2))+' '+fix(p(H-y2))+' l S\n');return this
    }
    text(s,x,y,opt={}){
      s=String(s??'');if(!s)return this;
      if(opt.align==='right')x-=encodeText(s).length*this.fontSize*0.5/PT;
      else if(opt.align==='center')x-=encodeText(s).length*this.fontSize*0.25/PT;
      this.page().commands.push(colors(this.ink)+' rg BT /'+this.font+' '+fix(this.fontSize)+' Tf 1 0 0 1 '+fix(p(x))+' '+fix(p(H-y))+' Tm <'+textHex(s)+'> Tj ET\n');return this;
    }
    splitTextToSize(value,width){
      const lim=Math.max(10,p(width)),out=[];
      for(const para of String(value??'').split('\n')){
        let line='';
        for(const word of para.split(/\s+/)){
          const joint=line?line+' '+word:word;
          if(encodeText(joint).length*this.fontSize*0.5<lim){line=joint;continue;}
          if(line){out.push(line);line='';}
          if(encodeText(word).length*this.fontSize*0.5<lim){line=word;continue;}
          let part='';
          for(const ch of word){
            if(encodeText(part+ch).length*this.fontSize*0.5>=lim&&part){out.push(part);part='';}
            part+=ch;
          }
          line=part;
        }
        out.push(line);
      }
      return out;
    }
    addPage(){this.pages.push({commands:[],images:[]});this.current=this.pages.length-1;return this}
    setPage(i){this.current=Math.min(this.pages.length-1,Math.max(0,Number(i)-1));return this}
    addImage(data,kind,x,y,w,h){
      if(!/^(jpe?g)$/i.test(kind))throw Error('Seul JPEG est pris en charge');
      let image=this.imageCache.get(data);
      if(!image){image=decodeJPEG(data);this.imageCache.set(data,image);}
      const name='Im'+(this.page().images.length+1);
      this.page().images.push({...image,name});
      this.page().commands.push('q '+[p(w),0,0,p(h),p(x),p(H-y-h)].map(fix).join(' ')+' cm /'+name+' Do Q\n');return this;
    }
    build(){
      const objects=[null,null,null,bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')];
      const ids=[];const add=x=>(objects.push(x),objects.length-1);
      const reusableImages=new WeakMap();
      const stream=(raw,prefix='<< /Length ')=>([bytes(prefix+raw.length+' >>\nstream\n'),raw,bytes('\nendstream')]);
      for(const page of this.pages){
        const pageId=add(null),contentId=add(null),refs=[];
        for(const im of page.images){
          const body='<< /Type /XObject /Subtype /Image /Width '+im.width+' /Height '+im.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ';
          let id=reusableImages.get(im.data);
          if(!id){id=add(stream(im.data,body));reusableImages.set(im.data,id);}
          refs.push('/'+im.name+' '+id+' 0 R');
        }
        objects[contentId]=stream(bytes(page.commands.join('')));
        objects[pageId]=bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+fix(p(W))+' '+fix(p(H))+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << '+refs.join(' ')+' >> >> /Contents '+contentId+' 0 R >>');
        ids.push(pageId);
      }
      objects[1]=bytes('<< /Type /Catalog /Pages 2 0 R >>');
      objects[2]=bytes('<< /Type /Pages /Kids ['+ids.map(id=>id+' 0 R').join(' ')+'] /Count '+ids.length+' >>');
      const chunks=[bytes('%PDF-1.4\n%PDF-ENC\n')],offsets=[0];let total=chunks[0].length;
      const push=v=>(chunks.push(v),total+=v.length);
      for(let i=1;i<objects.length;i++){
        offsets[i]=total;push(bytes(i+' 0 obj\n'));
        const body=objects[i];for(const chunk of Array.isArray(body)?body:[body])push(chunk);
        push(bytes('\nendobj\n'));
      }
      const startxref=total;push(bytes('xref\n0 '+objects.length+'\n0000000000 65535 f \n'));
      for(let i=1;i<objects.length;i++)push(bytes(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
      push(bytes('trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+startxref+'\n%%EOF'));
      return new Blob(chunks,{type:'application/pdf'});
    }
    save(name){
      const blob=this.build(),url=URL.createObjectURL(blob),el=document.createElement('a');
      el.href=url;el.download=name;el.style.display='none';document.body.appendChild(el);el.click();el.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);return blob;
    }
  };
})();
