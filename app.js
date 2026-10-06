import {createJournal,addStop,readJournal,describeSound,STOP_LIMIT} from './core.js';
import {loadModel,infer} from './model.js';
import {recordClip,importClip} from './audio.js';
const $=id=>document.getElementById(id);
const KEY='listening-loop-journal-v1';
let journal=createJournal(),busy=false,ready=false,controller=null,operation=0;
function message(text){$('activity').textContent=text;}
function error(e){$('error').hidden=false;$('error').textContent=e.message || String(e);}
function clearError(){$('error').hidden=true;$('error').textContent='';}
function buttons(){
  $('listen').disabled=!ready || busy || journal.stops.length>=STOP_LIMIT;
  $('audio-file').disabled=$('listen').disabled;
  $('demo').disabled=!ready || busy;
  $('prepare').disabled=busy || ready;
  $('restart').disabled=busy;
  $('export').disabled=busy;
  $('stop-name').disabled=busy;
}
function save(){
  try {if($('remember').checked)localStorage.setItem(KEY,JSON.stringify(journal));else localStorage.removeItem(KEY);$('forget').hidden=!$('remember').checked;}
  catch { $('remember').checked=false;$('forget').hidden=true;error(new Error('This browser could not save your journal. You can still download it.')); }
}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function render(){
  $('counter').textContent=`${journal.stops.length} of 3 stops`;
  $('journal').replaceChildren();
  journal.stops.forEach((stop,i)=>{
    const card=node('article',undefined,'note-card');card.append(node('span',`STOP 0${i+1}`,'stop-no'),node('h3',stop.name),node('div',stop.sound.title,'sound-title'));
    const tags=node('div',undefined,'sound-tags');
    stop.sound.top.slice(0,3).forEach(x=>tags.append(node('span',x.label,'tag')));card.append(tags,node('p',stop.sound.prompt));
    const label=node('label','What did you actually notice?');label.htmlFor=`note-${i}`;
    const input=node('textarea');input.id=`note-${i}`;input.maxLength=600;input.placeholder='A bird behind the wall. The rustle of a leaf.';input.value=stop.note;
    input.addEventListener('input',()=>{journal.stops[i].note=input.value;save();});
    const detail=node('details');detail.append(node('summary','Model scores'));stop.sound.top.forEach(x=>detail.append(node('p',`${x.label}: ${x.score.toFixed(3)}`)));detail.append(node('p','Scores are not probabilities.'));
    card.append(label,input,detail,node('span',stop.source==='microphone'?'6-second microphone observation':'Imported audio · not a verified outdoor observation','source'));$('journal').append(card);
  });
  const done=journal.stops.length===STOP_LIMIT;
  $('complete').hidden=!done;$('active-stop').hidden=done;
  $('walk-hint').textContent=journal.stops.length?'Put the phone away. Walk somewhere that sounds different, then pause.':'Pause somewhere comfortable. Put the phone down and listen first.';
  buttons();
}

async function cacheForOffline(){
  if(!('serviceWorker' in navigator))return false;
  await navigator.serviceWorker.register('./sw.js');
  let waitTimer;
  const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{waitTimer=setTimeout(()=>reject(new Error('Offline setup timed out.')),15000);})]).finally(()=>clearTimeout(waitTimer));
  return await new Promise(resolve=>{
    const channel=new MessageChannel();const timeout=setTimeout(()=>resolve(false),30000);
    channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data?.ok===true);};
    registration.active.postMessage({type:'CACHE_MODEL'},[channel.port2]);
  });
}

$('prepare').addEventListener('click',async()=>{
  clearError();busy=true;buttons();$('model-status').textContent='Packing the audio model…';
  try {
    await loadModel(progress=>{$('model-status').textContent=`Downloading model… ${Math.round(progress*100)}%`;});
    ready=true;
    const offline=await cacheForOffline().catch(()=>false);
    $('model-status').textContent=offline?'Ready for offline listening. Your microphone is still off.':'Model ready in this tab. Offline storage is unavailable; keep this tab open.';
    $('prepare').textContent=offline?'Packed for offline use ✓':'Audio model ready ✓';
    message('You’re ready. Step outside and choose your first place to pause.');
  } catch(e){error(e);$('model-status').textContent='Preparation did not finish. Reconnect and try again.';}
  finally{busy=false;buttons();}
});

async function observe(samples,source,token,name){
  message('Listening back, on your device…');
  const result=await infer(samples);
  if(token!==operation)return;
  journal=addStop(journal,{name,source,at:new Date().toISOString(),note:'',sound:describeSound(result.ranked,result.quality)});
  $('stop-name').value='';save();render();
  message(journal.stops.length===3?'Three stops, one loop. Add a few notes while the sounds are fresh.':'Stop saved. Add what you heard, then put your phone away and keep walking.');
}
$('listen').addEventListener('click',async()=>{
  clearError();const token=++operation,name=$('stop-name').value;busy=true;controller=new AbortController();buttons();$('cancel').hidden=false;
  let samples;
  try {samples=await recordClip(controller.signal,seconds=>message(`Listening… ${seconds}s. Let your ears do the noticing.`));$('cancel').hidden=true;await observe(samples,'microphone',token,name);}
  catch(e){if(e.name==='AbortError')message('Recording cancelled. Nothing was added.');else error(e);}
  finally{samples?.fill(0);controller=null;busy=false;$('cancel').hidden=true;buttons();}
});
$('cancel').addEventListener('click',()=>controller?.abort());
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller?.abort();});
addEventListener('pagehide',()=>controller?.abort());
$('audio-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  clearError();busy=true;const token=++operation,name=$('stop-name').value;buttons();let samples;
  try{samples=await importClip(file);await observe(samples,'imported-audio',token,name);}catch(e){error(e);}finally{samples?.fill(0);busy=false;e.target.value='';buttons();}
});
$('demo').addEventListener('click',async()=>{
  clearError();busy=true;buttons();$('demo-result').textContent='Listening to the example, on your device…';let samples;
  try{const response=await fetch('./samples/birdsong.ogg');if(!response.ok)throw new Error('Could not load the example recording.');samples=await importClip(new File([await response.blob()],'birdsong.ogg',{type:'audio/ogg'}));const result=await infer(samples);$('demo-result').textContent=`Example recording · suggested sound: ${result.ranked[0].label} (model score ${result.ranked[0].score.toFixed(3)}). This is a demo, not an observation from your walk.`;}catch(e){error(e);$('demo-result').textContent='Demo did not finish.';}finally{samples?.fill(0);busy=false;buttons();}
});
$('remember').addEventListener('change',save);
$('forget').addEventListener('click',()=>{$('remember').checked=false;save();message('Saved journal removed from this device. The current walk remains in this tab.');});
$('export').addEventListener('click',()=>{
  const exportData={...journal,exported:new Date().toISOString(),disclosure:'Labels are AI suggestions, not calibrated probabilities. Audio is not included. Imported clips are not verified field observations.'};
  const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});const link=node('a');const url=URL.createObjectURL(blob);link.href=url;link.download='listening-loop-journal.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('restart').addEventListener('click',()=>{journal=createJournal();operation++;save();render();message('A fresh loop. Start close to home.');});
try{const cached=readJournal(localStorage.getItem(KEY));if(cached){journal=cached;$('remember').checked=true;$('forget').hidden=false;}}catch{/* Journaling still works without browser storage. */}
render();
