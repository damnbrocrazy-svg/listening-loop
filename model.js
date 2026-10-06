import {checkAudio, rankScores} from './core.js';
let graph=null,labels=null,pending=null;
export async function loadModel(progress=()=>{}) {
  if (graph) return;
  if (pending) return pending;
  pending=(async()=>{
    if (!globalThis.tf) throw new Error('The audio engine did not load. Reconnect once, then reload.');
    try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
    await tf.ready();
    const r=await fetch('./model/labels.json');
    if(!r.ok) throw new Error('Could not load audio labels.');
    labels=await r.json();
    if(labels.length!==521) throw new Error('The audio-label file is incomplete.');
    graph=await tf.loadGraphModel('./model/model.json',{onProgress:progress});
    try { await infer(new Float32Array(16000)); } catch(e) {graph.dispose();graph=null;throw e;}
  })();
  try { await pending; } finally {pending=null;}
}
export async function infer(samples) {
  const quality=checkAudio(samples);
  if(!graph) throw new Error('Prepare the audio model first.');
  let input,outputs,average;
  try {
    input=tf.tensor1d(samples);
    outputs=graph.predict(input);
    const scores=Array.isArray(outputs)?outputs.find(t=>t.shape.length===2 && t.shape[1]===521):null;
    if(!scores) throw new Error('Unexpected audio-model output shape.');
    average=scores.mean(0);
    const ranked=rankScores(await average.data(),labels);
    return {quality,ranked};
  } finally { tf.dispose(input); tf.dispose(outputs); tf.dispose(average); }
}
