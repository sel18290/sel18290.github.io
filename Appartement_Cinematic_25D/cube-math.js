export const faces=['px','nx','py','ny','pz','nz'];
export function view(yaw,pitch,fov){return {yaw:((yaw+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,pitch:Math.max(-Math.PI*.48,Math.min(Math.PI*.48,pitch)),fov:Math.max(35,Math.min(95,fov))};}
// ZIP, stored entries: no external compression dependency or multiple downloads.
export function zip(files){
 const encoder=new TextEncoder(),parts=[],directory=[];let offset=0;
 const crc=data=>{let n=0xffffffff;for(const b of data){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;};
 for(const [name,data]of files){const label=encoder.encode(name),sum=crc(data),head=new Uint8Array(30+label.length),h=new DataView(head.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,sum,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,label.length,true);head.set(label,30);parts.push(head,data);
 const central=new Uint8Array(46+label.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint32(16,sum,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,label.length,true);c.setUint32(42,offset,true);central.set(label,46);directory.push(central);offset+=head.length+data.length;
 }const length=directory.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,length,true);e.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
}
