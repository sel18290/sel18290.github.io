export function createFrameTelemetry(capacity=600){
  const samples=new Float32Array(capacity);let count=0,index=0,latest={};
  return {
    record(ms,state={}){if(!Number.isFinite(ms)||ms<=0||ms>2000)return;samples[index]=ms;index=(index+1)%capacity;count=Math.min(count+1,capacity);latest=state;},
    snapshot(){const sorted=Array.from(samples.subarray(0,count)).sort((a,b)=>a-b);const percentile=p=>sorted[Math.min(count-1,Math.floor(count*p))]??0;
      return {...latest,frames:count,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),maxMs:sorted[count-1]??0,over33ms:sorted.filter(ms=>ms>33.4).length};},
    reset(){count=index=0;latest={};}
  };
}
