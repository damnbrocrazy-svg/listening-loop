import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resampleMono,checkAudio,rankScores,describeSound,createJournal,addStop,readJournal,demoWave} from '../core.js';
const labels=JSON.parse(await readFile(new URL('../model/labels.json',import.meta.url)));
test('48k and44.1k audio preserve duration and DC level rather than drop final samples',()=>{
  for(const rate of [48000,44100,16000]){const input=new Float32Array(rate*2).fill(.25);const out=resampleMono(input,rate);assert.equal(out.length,32000);assert.ok(out.every(x=>Math.abs(x-.25)<1e-6));assert.notEqual(out,input);}
});
test('downsampling averages opposing samples, rejecting naive decimation',()=>{assert.equal(resampleMono(new Float32Array([1,-1,1,-1]),32000)[0],0);});
test('invalid,short and oversized signals fail before inference',()=>{
  for(const audio of [new Float32Array(10),new Float32Array(96001),new Float32Array(16000).fill(NaN),new Float32Array(16000).fill(2)])assert.throws(()=>checkAudio(audio));
  assert.throws(()=>resampleMono(new Float32Array(16000),0));
});
test('silence and clipping are explicitly represented',()=>{assert.equal(checkAudio(new Float32Array(16000)).tooQuiet,true);assert.equal(checkAudio(new Float32Array(16000).fill(1)).tooLoud,true);assert.equal(checkAudio(demoWave()).tooQuiet,false);});
test('class ordering uses full521-label map and rejects bad scores',()=>{const scores=new Float32Array(521);scores[494]=.9;const ranked=rankScores(scores,labels);assert.equal(ranked[0].label,'Silence');assert.throws(()=>rankScores(new Float32Array(520),labels));scores[0]=NaN;assert.throws(()=>rankScores(scores,labels));});
test('ambiguous scores do not manufacture a confident nature claim',()=>{const ranked=[{label:'Bird',score:.32},{label:'Traffic noise, roadway noise',score:.30}];assert.equal(describeSound(ranked,{tooQuiet:false,tooLoud:false}).uncertain,true);assert.equal(describeSound(ranked,{tooQuiet:true,tooLoud:false}).title,'A very faint moment');});
test('demo results cannot enter the journal and fourthstop is rejected',()=>{let j=createJournal();const s={name:'tree',note:'heard a bird',source:'microphone',sound:{top:[{label:'Bird',score:.3}],title:'Mixed',prompt:'What did you notice?'}};assert.throws(()=>addStop(j,{...s,source:'demo'}));for(let i=0;i<3;i++)j=addStop(j,s);assert.equal(j.stops.length,3);assert.throws(()=>addStop(j,s));assert.ok(readJournal(JSON.stringify(j)));assert.equal(readJournal('{bad'),null);assert.equal(readJournal(JSON.stringify({...j,stops:[...j.stops,s]})),null);});
test('persisted notes must be valid and typed, protecting render from malformed state',()=>{const j=addStop(createJournal(),{name:'tree',note:'heard a bird',source:'microphone',sound:{top:[{label:'Bird',score:.3}],title:'Mixed',prompt:'What did you notice?'}});j.stops[0].sound.top[0].score='invented';assert.equal(readJournal(JSON.stringify(j)),null);});
