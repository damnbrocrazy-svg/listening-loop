import {resampleMono,SAMPLE_RATE,SECONDS} from './core.js';
export async function recordClip(signal, tick=()=>{}) {
  let stream,ctx,source,processor,mute,timer,ticker,abortHandler;
  const chunks=[];
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Recording needs HTTPS or localhost in a browser with microphone support.');
    if(signal.aborted) throw new DOMException('Cancelled','AbortError');
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    if(signal.aborted) throw new DOMException('Cancelled','AbortError');
    ctx=new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    await ctx.resume();
    source=ctx.createMediaStreamSource(stream);
    processor=ctx.createScriptProcessor(4096,1,1);
    mute=ctx.createGain();mute.gain.value=0;
    processor.onaudioprocess=e=>chunks.push(e.inputBuffer.getChannelData(0).slice());
    source.connect(processor);processor.connect(mute);mute.connect(ctx.destination);
    await new Promise((resolve,reject)=>{
      abortHandler=()=>reject(new DOMException('Cancelled','AbortError'));
      signal.addEventListener('abort',abortHandler,{once:true});
      if(signal.aborted){abortHandler();return;}
      const started=performance.now();
      tick(SECONDS);
      ticker=setInterval(()=>tick(Math.max(0,Math.ceil(SECONDS-(performance.now()-started)/1000))),200);
      timer=setTimeout(resolve,SECONDS*1000);
    });
    const joined=new Float32Array(chunks.reduce((n,a)=>n+a.length,0));
    let position=0;for(const chunk of chunks) {joined.set(chunk,position);position+=chunk.length;}
    return resampleMono(joined,ctx.sampleRate).slice(0,SAMPLE_RATE*SECONDS);
  } finally {
    clearTimeout(timer);clearInterval(ticker);
    if(abortHandler) signal.removeEventListener('abort',abortHandler);
    if(processor) processor.onaudioprocess=null;
    source?.disconnect();processor?.disconnect();mute?.disconnect();
    stream?.getTracks().forEach(t=>t.stop());
    if(ctx && ctx.state!=='closed') await ctx.close();
    chunks.length=0;
  }
}

export async function importClip(file) {
  if(file.size>8*1024*1024) throw new Error('Choose an audio file under 8 MB. Only its first six seconds will be used.');
  const ctx=new (globalThis.AudioContext || globalThis.webkitAudioContext)();
  try {
    const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
    const limit=Math.min(decoded.length,Math.floor(decoded.sampleRate*SECONDS));
    if(limit<decoded.sampleRate) throw new Error('Choose an audio clip at least one second long.');
    const mono=new Float32Array(limit);
    for(let c=0;c<decoded.numberOfChannels;c++) {const data=decoded.getChannelData(c);for(let i=0;i<limit;i++) mono[i]+=data[i]/decoded.numberOfChannels;}
    return resampleMono(mono,decoded.sampleRate).slice(0,SAMPLE_RATE*SECONDS);
  } finally {await ctx.close();}
}
