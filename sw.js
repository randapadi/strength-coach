// Serves the app from the phone's cache (fast, works offline) and refreshes the cache in the
// background, so a new version pushed to the site shows up on the next launch.
const C="coach-v2";
const FILES=["./","index.html","app.js","engine.js","data.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url), mine=u.origin===self.location.origin, fonts=u.hostname.startsWith("fonts.g");
  if(!mine&&!fonts)return;
  e.respondWith(caches.open(C).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:mine});
    const fresh=fetch(e.request).then(res=>{if(res.ok||res.type==="opaque")c.put(e.request,res.clone());return res;});
    if(hit){e.waitUntil(fresh.catch(()=>{}));return hit;}
    return fresh.catch(()=>c.match("index.html"));
  }));
});
