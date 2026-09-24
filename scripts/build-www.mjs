// Copies the web app into www/, which Capacitor bundles into the iOS and Android apps.
// The web app itself stays at the repo root so GitHub Pages keeps serving it unchanged.
import {cpSync,rmSync,mkdirSync} from "node:fs";
const FILES=["index.html","app.js","engine.js","data.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","privacy.html"];
rmSync("www",{recursive:true,force:true});
mkdirSync("www");
for(const f of FILES) cpSync(f,"www/"+f);
cpSync("fonts","www/fonts",{recursive:true});
console.log("www/ ready:",FILES.length,"files + fonts/");
