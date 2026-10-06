const VERSION='listening-loop-v2';
const SHELL=['./','./index.html','./style.css','./app.js','./core.js','./model.js','./audio.js','./icon.svg','./manifest.webmanifest','./vendor/tf.min.js','./THIRD_PARTY.md','./samples/birdsong.ogg'];
const MODEL=['./model/model.json','./model/labels.json',...Array.from({length:4},(_,i)=>`./model/group1-shard${i+1}of4.bin`)];
const url=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL.map(url))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_MODEL')return;
  event.waitUntil((async()=>{
    try {
      const cache=await caches.open(VERSION);
      for(const path of MODEL)if(!await cache.match(url(path)))await cache.add(url(path));
      const complete=(await Promise.all([...SHELL,...MODEL].map(path=>cache.match(url(path))))).every(Boolean);
      event.ports[0]?.postMessage({ok:complete});
    } catch {event.ports[0]?.postMessage({ok:false});}
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || ![...SHELL,...MODEL].map(url).includes(event.request.url))return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request,{cacheName:VERSION});
    if(cached)return cached;
    return fetch(event.request);
  })());
});
