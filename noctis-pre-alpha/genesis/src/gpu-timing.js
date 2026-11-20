// Asynchronous GPU queries. Never waits for the GPU, and never calls gl.finish().
export function createGpuTiming(gl){
  const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending=[];let current=null,last=null,frame=0;
  return {
    get milliseconds(){return last;},
    begin(){
      if(!ext)return;
      if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
        pending.forEach(q=>gl.deleteQuery(q));pending.length=0;last=null;return;
      }
      while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
        const query=pending.shift();last=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);
      }
      if(++frame%30||pending.length>=3)return;
      current=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,current);
    },
    end(){if(!current)return;gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(current);current=null;},
    dispose(){
      if(current){gl.endQuery(ext.TIME_ELAPSED_EXT);gl.deleteQuery(current);current=null;}
      pending.forEach(q=>gl.deleteQuery(q));pending.length=0;
    }
  };
}
