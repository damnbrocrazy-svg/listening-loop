export const SAMPLE_RATE = 16000;
export const SECONDS = 6;
export const STOP_LIMIT = 3;

const groups = {
  Nature: new Set(['Bird','Bird vocalization, bird call, bird song','Chirp, tweet','Insect','Cricket','Frog','Wind','Rustling leaves','Water','Stream','Rain','Raindrop','Thunderstorm','Ocean','Waves, surf']),
  People: new Set(['Speech','Conversation','Crowd','Music','Laughter','Walk, footsteps','Shout','Children playing']),
  City: new Set(['Traffic noise, roadway noise','Car','Vehicle','Engine','Bus','Train','Motorcycle','Air conditioning','Mechanical fan','Construction','Truck','Siren'])
};

// Area-average each output bin. Unlike picking every third sample, this includes
// every input sample when converting common 44.1/48 kHz microphone streams.
export function resampleMono(input, rate, target = SAMPLE_RATE) {
  if (!(input instanceof Float32Array) || !Number.isFinite(rate) || rate < target || rate > 192000 || input.length === 0) throw new Error('Unsupported audio sample rate or empty audio.');
  if (rate === target) return input.slice();
  const ratio = rate / target;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i=0; i<output.length; i++) {
    const left = i * ratio, right = (i+1) * ratio;
    let total = 0;
    for (let j=Math.floor(left); j<Math.ceil(right); j++) {
      const weight = Math.max(0, Math.min(right, j+1) - Math.max(left,j));
      total += (input[j] || 0) * weight;
    }
    output[i] = total / ratio;
  }
  return output;
}

export function checkAudio(samples) {
  if (!(samples instanceof Float32Array) || samples.length < SAMPLE_RATE || samples.length > SAMPLE_RATE * SECONDS) throw new Error('Use between one and six seconds of audio.');
  let energy=0, clipped=0;
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < -1.001 || sample > 1.001) throw new Error('Audio contains invalid samples.');
    energy += sample*sample;
    if (Math.abs(sample) >= 0.99) clipped++;
  }
  const rms=Math.sqrt(energy/samples.length);
  return {rms, clipping:clipped/samples.length, tooQuiet:rms<0.002, tooLoud:clipped/samples.length>0.02};
}

export function rankScores(scores, labels) {
  if (scores.length !== 521 || labels.length !== 521) throw new Error('Unexpected audio-model output.');
  return Array.from(scores, (score,i) => {
    if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error('The model returned invalid scores.');
    return {label:labels[i], score};
  }).sort((a,b)=>b.score-a.score);
}

export function describeSound(ranked, quality) {
  const bands=Object.entries(groups).map(([name,labels])=>({name,score:Math.max(0,...ranked.filter(x=>labels.has(x.label)).map(x=>x.score))})).sort((a,b)=>b.score-a.score);
  // These are presentation heuristics, never probabilities or calibrated limits.
  const uncertain=quality.tooQuiet || quality.tooLoud || ranked[0].score<0.2 || bands[0].score<0.2 || bands[0].score-bands[1].score<0.08;
  const title=quality.tooQuiet?'A very faint moment':quality.tooLoud?'A clipped recording':uncertain?'A mixed soundscape':`${bands[0].name} stood out`;
  const prominent=ranked.filter(x=>x.score>=0.05).slice(0,5);
  return {title,uncertain,bands,top:prominent.length?prominent:ranked.slice(0,1),prompt:quality.tooQuiet?'Listen with your own ears. What did the microphone miss?':uncertain?'The model is unsure. What did you notice?':`Did you hear ${ranked[0].label.toLowerCase()}, or something else?`};
}

export function createJournal() { return {schema:1,model:'Google YAMNet TFJS v1',started:new Date().toISOString(),stops:[]}; }
export function addStop(journal, stop) {
  if (journal.stops.length >= STOP_LIMIT) throw new Error('This three-stop walk is complete.');
  if (!['microphone','imported-audio'].includes(stop.source)) throw new Error('Demo results cannot be recorded as a walk.');
  return {...journal,stops:[...journal.stops,{...stop,name:String(stop.name).trim().slice(0,60) || `Stop ${journal.stops.length+1}`,note:String(stop.note || '').slice(0,600)}]};
}

export function readJournal(text) {
  try {
    const j=JSON.parse(text);
    if (j?.schema!==1 || j.model!=='Google YAMNet TFJS v1' || !Array.isArray(j.stops) || j.stops.length>STOP_LIMIT) return null;
    if (!j.stops.every(s=>['microphone','imported-audio'].includes(s.source) && typeof s.name==='string' && typeof s.note==='string' && s.name.length<=60 && s.note.length<=600 && Array.isArray(s.sound?.top) && s.sound.top.length<=5 && s.sound.top.every(x=>typeof x.label==='string' && Number.isFinite(x.score) && x.score>=0 && x.score<=1) && typeof s.sound.title==='string' && typeof s.sound.prompt==='string')) return null;
    return j;
  } catch { return null; }
}

export function demoWave() {
  const wave=new Float32Array(SAMPLE_RATE*3);
  for(let i=0;i<wave.length;i++) {
    const t=i/SAMPLE_RATE;
    wave[i]=0.2*Math.sin(2*Math.PI*(1100*t+70*t*t))*Math.min(1,t*10)*Math.min(1,(3-t)*10);
  }
  return wave;
}
