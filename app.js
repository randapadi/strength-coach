(function(){
const E=window.SC.engine;
const $=id=>document.getElementById(id);

// ---------- storage (everything stays on this device; the app works without it) ----------
const store={
  get(k,def){try{const v=localStorage.getItem("sc-"+k);return v===null?def:JSON.parse(v)}catch(e){return def}},
  set(k,v){try{localStorage.setItem("sc-"+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("sc-"+k)}catch(e){}}
};
function weekKey(){const d=new Date();d.setHours(12);d.setDate(d.getDate()-(d.getDay()+6)%7);return "week-"+d.toISOString().slice(0,10);}
const loadDone=()=>store.get(weekKey(),[]);
const saveDone=a=>store.set(weekKey(),a);

let profile=store.get("profile",null), adjust=store.get("adjust",E.newAdjust());

// ---------- quiz ----------
const DAYS3=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const STEPS=[
 {k:"goals",q:"What do you want to work on?",hint:"Pick up to three.",multi:3,opts:[
   ["strength","Overall strength","Feel stronger in daily life"],["glutes","Glutes + legs","Lower-body strength and shape"],
   ["posture","Posture + upper back","Desk posture, tech neck, rounded shoulders"],["core","Core + back health","A steadier, stronger middle"],
   ["mobility","Mobility","Move and stretch more freely"],["feet","Feet + balance","Arches, bunions, steadiness"]]},
 {k:"exp",q:"How much strength training have you done?",opts:[
   ["new","New to it","Or it's been a long time"],["some","Some","I've done workouts on and off"],["regular","Regular","I train most weeks"]]},
 {k:"days",q:"Which days can you train?",hint:"Pick 2 to 6 days. Rest days in between help.",week:1},
 {k:"mins",q:"How long per session?",grid:1,opts:[[10,"10 min"],[20,"20 min"],[30,"30 min"],[45,"45 min"]]},
 {k:"gear",q:"What do you have?",hint:"We assume a wall, a chair and a towel. Pick any others.",multi:9,opts:[
   ["band","Loop band","Small band that goes around your legs"],["tube","Long band","With handles, or tied to a door or railing"],
   ["db","Dumbbells"],["kb","Kettlebell"],["gym","Gym access","On some or all of your days"]]},
 {k:"gymDays",q:"Which days are gym days?",hint:"The other days use what you have at home.",week:1,when:p=>(p.gear||[]).includes("gym")},
 {k:"limits",q:"Anything we should work around?",hint:"Pick all that apply. We'll leave out exercises that tend to aggravate them.",multi:9,none:1,opts:[
   ["knee","Knee pain"],["back","Lower-back pain"],["shoulder","Shoulder pain"],["neck","Neck pain or tech neck"],["wrist","Wrist pain"],
   ["core","Postpartum or ab separation","No planks; watch for belly doming"],["feet","Foot pain or bunions"],["floor","Getting down to the floor is hard"]]},
 {k:"caution",q:"Health check",hint:"Has a doctor told you to limit exercise? Or do you have chest pain, dizziness or fainting with activity, a heart condition, or are you pregnant?",opts:[[false,"No"],[true,"Yes to any of these"]]}
];
let draft=null, qi=0;
const activeSteps=()=>STEPS.filter(s=>!s.when||s.when(draft));
function stepValid(s){
  const v=draft[s.k];
  if(s.k==="days") return v.length>=2&&v.length<=6;
  if(s.k==="gymDays") return true;
  if(s.multi) return s.k==="gear"||s.none?true:v.length>0;
  return v!==undefined&&v!==null;
}
function welcomeHTML(){
  return `<section class="card intro"><div class="phase">Welcome</div><h2>A workout plan built around you</h2>
   <p>Answer a few quick questions. You'll get a weekly plan that fits your time, gear and body, with a timer, form cues and a video for every exercise.</p>
   <p>After each workout, tell the app how it felt. Next time the plan adjusts: harder, easier, or with a swap for anything that hurt.</p>
   <div class="warn"><span>This is general fitness guidance, not medical advice.</span><span>Your answers stay on this phone. Nothing is sent anywhere.</span></div>
   <button class="btn" data-q="start">Build my plan</button></section>`;
}
function stepHTML(){
  const steps=activeSteps(), s=steps[qi], v=draft[s.k];
  const bar=`<div class="steps">${steps.map((_,i)=>`<i class="${i<=qi?"on":""}"></i>`).join("")}</div>`;
  let opts;
  if(s.week){
    const pool=s.k==="gymDays"?draft.days:[0,1,2,3,4,5,6];
    opts=`<div class="opts week">${pool.map(d=>`<button class="opt" data-o="${d}" aria-pressed="${v.includes(d)}">${DAYS3[d]}</button>`).join("")}</div>`;
  }else{
    opts=`<div class="opts${s.grid?" grid2":""}">${s.opts.map(([val,label,sub])=>{
      const on=s.multi?v.includes(val):v===val;
      return `<button class="opt" data-o="${val}" aria-pressed="${on}"><span>${label}</span>${sub?`<small>${sub}</small>`:""}</button>`;}).join("")}
      ${s.none?`<button class="opt" data-o="__none" aria-pressed="${v.length===0}"><span>None of these</span></button>`:""}</div>`;
  }
  const last=qi===steps.length-1;
  return `${bar}<section class="card"><div class="phase">Question ${qi+1} of ${steps.length}</div><h2 class="q">${s.q}</h2>
    ${s.hint?`<p class="hint">${s.hint}</p>`:""}${opts}</section>
    <div class="navrow"><button class="btn ghost" data-q="back">‹ Back</button><button class="btn" data-q="next"${stepValid(s)?"":" disabled"}>${last?"Create my plan":"Next ›"}</button></div>`;
}
function cautionHTML(){
  return `<section class="card intro"><div class="phase">Before you start</div><h2>Check with your doctor first</h2>
   <p>Please get the OK from a doctor or physio before starting a new exercise plan. If you're pregnant, a prenatal program your provider approves is a better fit than this app.</p>
   <p>If you go ahead, we'll keep your plan at the gentlest level.</p>
   <button class="btn" data-q="finish">I understand, show my plan</button>
   <button class="btn ghost" data-q="back">‹ Change my answer</button></section>`;
}
let showCaution=false;
function renderSetup(){
  $("app").hidden=true; $("setup").hidden=false;
  $("setup").innerHTML=draft===null?welcomeHTML():showCaution?cautionHTML():stepHTML();
  window.scrollTo(0,0);
}
function startQuiz(){
  draft=profile?JSON.parse(JSON.stringify(profile)):{goals:[],exp:null,days:[],mins:null,gear:[],gymDays:[],limits:[],caution:null};
  qi=0; showCaution=false; renderSetup();
}
function finishQuiz(){
  draft.gymDays=(draft.gear.includes("gym")?draft.gymDays:[]).filter(d=>draft.days.includes(d));
  const changed=!profile||JSON.stringify(profile)!==JSON.stringify(draft);
  profile={...draft,v:1}; store.set("profile",profile);
  if(changed){adjust=E.newAdjust();store.set("adjust",adjust);} // new answers → fresh starting point
  draft=null; showPlan();
}
$("setup").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b)return;
  const act=b.dataset.q;
  if(act==="start"){startQuiz();return;}
  if(act==="finish"){finishQuiz();return;}
  const steps=activeSteps(), s=steps[qi];
  if(act==="back"){
    if(showCaution){showCaution=false;renderSetup();return;}
    if(qi===0){draft=null; profile?showPlan():renderSetup(); return;}
    qi--; renderSetup(); return;
  }
  if(act==="next"){
    if(!stepValid(s))return;
    if(qi<steps.length-1){qi++;renderSetup();}
    else if(draft.caution){showCaution=true;renderSetup();}
    else finishQuiz();
    return;
  }
  if(b.dataset.o===undefined)return;
  const raw=b.dataset.o, src=s.week?null:s.opts.find(o=>String(o[0])===raw), val=s.week?+raw:src?src[0]:raw;
  if(s.week||s.multi){
    let arr=draft[s.k];
    if(raw==="__none") arr=[];
    else if(arr.includes(val)) arr=arr.filter(x=>x!==val);
    else if(!s.multi||arr.length<s.multi||s.week) arr=[...arr,val];
    if(s.k==="days"&&arr.length>6) return;
    draft[s.k]=arr;
  }else draft[s.k]=val;
  renderSetup();
});

// ---------- plan state ----------
let week=[], dayIdx=(new Date().getDay()+6)%7, short=false, session=null, cards=[], cur=0;
let sound=store.get("sound",true), voice=store.get("voice",true);
const track=$("track");
function sessionOpts(s,mins){return {focus:s.rest?"C":s.focus,variant:s.variant||0,gym:!!s.gym,mins};}

// ---------- audio ----------
let ac=null;
function unlock(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(ac&&ac.state==="suspended")ac.resume();}
function beep(freq=880,dur=.12,vol=.25){if(!sound||!ac)return;try{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur+.02);}catch(e){}}
function say(t){if(!voice)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=1;speechSynthesis.speak(u);}catch(e){}}
let wake=null;
async function keepAwake(){try{if(!wake&&navigator.wakeLock){wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>wake=null);}}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&timer.running)keepAwake();});

// ---------- rendering ----------
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
function renderDays(){
  const done=loadDone();
  $("days").innerHTML=week.map((s,i)=>`<button class="day${done.includes(i)?" done":""}" data-i="${i}" aria-current="${i===dayIdx}"><b>${DAYS3[i]}</b><span>${s.rest?"Rest":(s.gym?"Gym":E.FOCUS[s.focus].short)}</span></button>`).join("");
}
function cardHTML(c,i){
  const cues=c.cues&&c.cues.length?`<ul class="cues">${c.cues.map(x=>`<li>${x}</li>`).join("")}</ul>`:"";
  const vid=c.video?`<a class="video" href="${c.video}" target="_blank" rel="noopener">${c.videoKind==="search"?"Find a form video":"Watch form video"}</a>`:"";
  let tool="";
  if(c.segs){
    const total=c.segs.reduce((a,b)=>a+b.s,0);
    const label=c.restOnly?"Rest before next round":c.segs[0].l;
    tool=`<div class="timer${c.restOnly?" rest":""}" data-t="${i}"><div class="seg">${label}</div><div class="clock">${fmt(c.segs[0].s)}</div>
      <div class="segcount">${c.segs.length>1?`${c.segs.length} steps · ${fmt(total)} total`:"&nbsp;"}</div>
      <div class="btns"><button class="btn${c.restOnly?" restbtn":""}" data-act="go">${c.restOnly?"Start rest":"Start"}</button><button class="btn ghost" data-act="reset" aria-label="Reset timer">↺</button></div></div>`;
  }
  return `<section class="card" aria-label="${c.name}"><div class="phase">${c.phase}</div><h2>${c.name}</h2><div class="rx">${c.rx}</div>${cues}${vid}${tool}</section>`;
}
function introHTML(s){
  const lim=profile.limits||[];
  const warns=["Breathe through every rep and hold. Never hold your breath to lift.","Aim for 6–7 out of 10 effort. Stop for sharp pain, dizziness, chest pain or a headache."];
  if(lim.includes("core")) warns.push("Skip anything that makes your belly dome or bulge along the middle.");
  if(profile.caution) warns.push("You told us to be careful. Keep it gentle and follow your doctor's advice.");
  return `<section class="card intro"><div class="phase">${E.DAY_NAMES[dayIdx]} · ${s.gym?"Gym":"Home"}</div><h2>${session.title}</h2>
   <dl class="meta"><dt>Time</dt><dd>About ${session.estMin} min</dd><dt>Gear</dt><dd>${session.gear.length?session.gear.join(", ").replace(/^./,c=>c.toUpperCase()):"None, just a wall and a chair"}</dd></dl>
   <div class="warn">${warns.map(w=>`<span>${w}</span>`).join("")}</div>
   <p class="hint">Swipe or tap Next to move through. Timed cards move you on automatically when the timer ends.</p>
   <button class="btn" data-act="begin">Start workout</button></section>`;
}
function restHTML(){
  return `<section class="card intro"><div class="phase">${E.DAY_NAMES[dayIdx]}</div><h2>Rest day</h2>
   <p>Rest is when your body adapts. A walk or some easy movement is a good idea.</p>
   <p class="hint">Want something light? There's a 10-minute core and mobility session.</p>
   <button class="btn" data-act="short">Open the 10-minute session</button></section>`;
}
function endHTML(){
  const seen=new Set(), list=session.exIds.filter(id=>!seen.has(id)&&seen.add(id));
  return `<section class="card intro" id="endCard"><div class="phase">Finished</div><h2>How did that feel?</h2>
   <div class="rate">${[["easy","Too easy"],["right","About right"],["hard","Too hard"]].map(([v,l])=>`<button class="opt" data-rate="${v}" aria-pressed="false">${l}</button>`).join("")}</div>
   <h3>Any exercise to change? <span class="hint">(optional)</span></h3>
   <div>${list.map(id=>`<div class="fbrow" data-ex="${id}"><div class="name">${E.BY_ID[id].name}</div><div class="chips">
     <button class="pill" data-v="up" aria-pressed="false">Too easy</button><button class="pill" data-v="down" aria-pressed="false">Too hard</button><button class="pill" data-v="hurt" aria-pressed="false">Caused pain</button></div></div>`).join("")}</div>
   <button class="btn restbtn" data-act="savefb" disabled>Save and mark done</button>
   <p class="fine">Pick how it felt to save. Sharp or lasting pain is worth checking with a physio or doctor.</p></section>`;
}
function build(){
  stopTimer();
  const s=week[dayIdx];
  const fullMins=profile.mins;
  $("modeRow").hidden=s.rest?!short:fullMins<=10;
  $("fullBtn").textContent=`Full ${fullMins} min`;
  if(s.rest&&!short){session=null;cards=[];track.innerHTML=restHTML();}
  else{
    session=E.buildSession(profile,adjust,sessionOpts(s,short?10:fullMins));
    cards=session.cards;
    track.innerHTML=introHTML(s)+cards.map(cardHTML).join("")+endHTML();
  }
  $("fullBtn").setAttribute("aria-pressed",String(!short));
  $("shortBtn").setAttribute("aria-pressed",String(short));
  cur=0; track.scrollTo({left:0,behavior:"instant"}); updateNav();
}
function showPlan(){
  $("setup").hidden=true; $("app").hidden=false;
  week=E.buildWeek(profile); short=false;
  renderDays(); build(); syncToggles();
}
function total(){return track.children.length}
function step(){return track.clientWidth+16}
function go(i){i=Math.max(0,Math.min(total()-1,i));track.scrollTo({left:i*step(),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});cur=i;updateNav();}
function updateNav(){
  const n=total();
  $("prevBtn").disabled=cur===0; $("nextBtn").disabled=cur>=n-1;
  $("count").textContent=n>1?`${cur+1} / ${n}`:"";
  $("barFill").style.width=n>1?(cur/(n-1)*100)+"%":"0";
}
let st;
track.addEventListener("scroll",()=>{clearTimeout(st);st=setTimeout(()=>{const i=Math.round(track.scrollLeft/step());if(i!==cur){cur=i;updateNav();}},80);});

// ---------- timer ----------
const timer={card:-1,segs:[],idx:0,end:0,remain:0,running:false,iv:null,lastSec:null};
function timerEl(ci){return track.querySelector(`.timer[data-t="${ci}"]`)}
function paint(){
  const el=timerEl(timer.card); if(!el)return;
  const seg=timer.segs[timer.idx]; if(!seg)return;
  el.querySelector(".seg").textContent=seg.l;
  el.classList.toggle("rest",!!seg.r); el.classList.toggle("work",!seg.r);
  el.querySelector(".clock").textContent=fmt(timer.remain);
  const sc=el.querySelector(".segcount"); if(sc&&timer.segs.length>1) sc.textContent=`Step ${timer.idx+1} of ${timer.segs.length}`;
  const b=el.querySelector('[data-act="go"]'); if(b) b.textContent=timer.running?"Pause":"Resume";
}
function tick(){
  timer.remain=(timer.end-Date.now())/1000;
  const sec=Math.ceil(timer.remain);
  if(sec!==timer.lastSec){timer.lastSec=sec; if(sec<=3&&sec>=1) beep(660,.09,.2);}
  if(timer.remain<=0){
    timer.idx++;
    if(timer.idx>=timer.segs.length){finishTimer();return;}
    const seg=timer.segs[timer.idx];
    beep(seg.r?520:990,.22,.3); say(seg.l.replace(/ \d+$/,""));
    timer.end=Date.now()+seg.s*1000; timer.remain=seg.s; timer.lastSec=null;
  }
  paint();
}
function startTimer(ci,segs){
  stopTimer(); unlock(); keepAwake();
  Object.assign(timer,{card:ci,segs,idx:0,running:true,lastSec:null});
  timer.remain=segs[0].s; timer.end=Date.now()+segs[0].s*1000;
  beep(segs[0].r?520:990,.22,.3); say(segs[0].l.replace(/ \d+$/,""));
  timer.iv=setInterval(tick,200); paint();
}
function pauseTimer(){if(!timer.running)return;timer.running=false;clearInterval(timer.iv);timer.remain=(timer.end-Date.now())/1000;paint();}
function resumeTimer(){if(timer.running||timer.card<0)return;unlock();timer.running=true;timer.end=Date.now()+timer.remain*1000;timer.iv=setInterval(tick,200);paint();}
function stopTimer(){clearInterval(timer.iv);timer.running=false;timer.card=-1;}
function resetCard(ci){
  const c=cards[ci]; if(timer.card===ci) stopTimer();
  const el=timerEl(ci); if(!el||!c.segs)return;
  el.classList.remove("rest","work"); if(c.restOnly) el.classList.add("rest");
  el.querySelector(".seg").textContent=c.restOnly?"Rest before next round":c.segs[0].l;
  el.querySelector(".clock").textContent=fmt(c.segs[0].s);
  const sc=el.querySelector(".segcount"); if(sc) sc.innerHTML=c.segs.length>1?`${c.segs.length} steps · ${fmt(c.segs.reduce((a,b)=>a+b.s,0))} total`:"&nbsp;";
  el.querySelector('[data-act="go"]').textContent=c.restOnly?"Start rest":"Start";
}
function finishTimer(){
  const ci=timer.card; stopTimer();
  beep(990,.18,.3); setTimeout(()=>beep(1320,.35,.3),220);
  const el=timerEl(ci);
  if(el){el.querySelector(".seg").textContent="Done";el.querySelector(".clock").textContent="0:00";el.querySelector('[data-act="go"]').textContent="Again";}
  setTimeout(()=>advance(ci),1200);
}
function advance(ci){
  if(cur!==ci+1) return; // user already moved away
  go(ci+2);
  const nc=cards[ci+1];
  say(nc?"Next: "+nc.name:"Workout complete");
}

// ---------- feedback ----------
function endCard(){return $("endCard");}
function saveFeedback(){
  const el=endCard(), rateBtn=el.querySelector("[data-rate][aria-pressed=true]"); if(!rateBtn)return;
  const fb={rating:rateBtn.dataset.rate,ex:{}};
  el.querySelectorAll(".fbrow").forEach(r=>{const on=r.querySelector(".pill[aria-pressed=true]");if(on)fb.ex[r.dataset.ex]=on.dataset.v;});
  const s=week[dayIdx], opts=sessionOpts(s,session.mins);
  const res=E.applyFeedback(profile,adjust,fb,opts);
  const before=E.buildSession(profile,adjust,opts), after=E.buildSession(profile,res.adjust,opts);
  const swaps=E.diffSessions(before,after);
  adjust=res.adjust; store.set("adjust",adjust);
  const hist=store.get("history",[]); hist.push({date:new Date().toISOString().slice(0,10),day:dayIdx,focus:session.focus,mins:session.mins,rating:fb.rating,ex:fb.ex}); store.set("history",hist.slice(-500));
  const d=loadDone(); if(!d.includes(dayIdx)){d.push(dayIdx);saveDone(d);} renderDays();
  const notes=[...res.notes,...swaps.map(x=>"Swap: "+x)];
  el.innerHTML=`<div class="phase">Saved</div><h2>Nice work.</h2>
   ${notes.length?`<h3>Next time</h3><ul class="notes">${notes.map(n=>`<li>${n}</li>`).join("")}</ul>`:`<p>Your plan stays the same for now. Rate "About right" three sessions in a row and it steps up.</p>`}
   <p class="hint">Drink some water. Your next session is ready when you are.</p>
   <button class="btn" data-act="reload">Back to the start</button>`;
}

// ---------- settings ----------
function settingsHTML(){
  const hist=store.get("history",[]), a=adjust;
  const lvl=a.int===0?"Starting level":a.int>0?`${a.int} step${a.int>1?"s":""} up from where you started`:`${-a.int} step${a.int<-1?"s":""} easier than where you started`;
  const names={strength:"Overall strength",glutes:"Glutes + legs",posture:"Posture",core:"Core",mobility:"Mobility",feet:"Feet + balance"};
  return `<section class="card intro"><div class="phase">Your plan</div><h2>Settings</h2>
   <dl class="meta"><dt>Goals</dt><dd>${profile.goals.map(g=>names[g]).join(", ")}</dd>
   <dt>Days</dt><dd>${profile.days.slice().sort().map(d=>DAYS3[d]).join(", ")} · ${profile.mins} min</dd>
   <dt>Level</dt><dd>${lvl}</dd><dt>Removed</dt><dd>${a.ban.length?a.ban.map(id=>E.BY_ID[id].name).join(", "):"Nothing"}</dd>
   <dt>Logged</dt><dd>${hist.length} session${hist.length===1?"":"s"}</dd></dl>
   <button class="btn" data-act="requiz">Change my answers</button>
   <button class="btn ghost" data-act="resetadj">Undo all feedback changes</button>
   <button class="btn ghost" data-act="close">‹ Back to my plan</button>
   <p class="fine">Everything is stored only on this device. Clearing your browser data or uninstalling removes it.</p>
   <p class="fine">General fitness guidance, not medical advice. Stop if something hurts, and check with a doctor or physio about pain or health conditions.</p></section>`;
}
function openSettings(){stopTimer();$("modeRow").hidden=true;track.innerHTML=settingsHTML();cur=0;track.scrollTo({left:0,behavior:"instant"});updateNav();}

// ---------- events ----------
track.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b)return; unlock();
  if(b.dataset.rate){endCard().querySelectorAll("[data-rate]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));endCard().querySelector('[data-act="savefb"]').disabled=false;return;}
  if(b.dataset.v){const on=b.getAttribute("aria-pressed")==="true";b.parentNode.querySelectorAll(".pill").forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed",String(!on));return;}
  const act=b.dataset.act, t=b.closest(".timer"), ci=t?+t.dataset.t:-1;
  if(act==="begin") go(1);
  else if(act==="short"){short=true;build();}
  else if(act==="savefb") saveFeedback();
  else if(act==="reload") build();
  else if(act==="reset") resetCard(ci);
  else if(act==="go"){
    if(timer.card===ci){timer.running?pauseTimer():resumeTimer();}
    else startTimer(ci,cards[ci].segs);
  }
  else if(act==="requiz") startQuiz();
  else if(act==="resetadj"){if(confirm("Undo every change your feedback has made to the plan?")){adjust=E.newAdjust();store.set("adjust",adjust);openSettings();}}
  else if(act==="close") build();
});
$("days").addEventListener("click",e=>{const b=e.target.closest(".day");if(!b)return;dayIdx=+b.dataset.i;short=false;renderDays();build();});
$("fullBtn").onclick=()=>{short=false;build();};
$("shortBtn").onclick=()=>{short=true;build();};
$("settingsBtn").onclick=openSettings;
$("prevBtn").onclick=()=>go(cur-1);
$("nextBtn").onclick=()=>{unlock();go(cur+1);};
function syncToggles(){$("soundBtn").setAttribute("aria-pressed",String(sound));$("voiceBtn").setAttribute("aria-pressed",String(voice));}
$("soundBtn").onclick=()=>{sound=!sound;store.set("sound",sound);syncToggles();unlock();beep();};
$("voiceBtn").onclick=()=>{voice=!voice;store.set("voice",voice);syncToggles();if(voice)say("Voice on");};
document.addEventListener("keydown",e=>{if($("app").hidden)return;if(e.key==="ArrowRight")go(cur+1);if(e.key==="ArrowLeft")go(cur-1);});
window.addEventListener("resize",()=>track.scrollTo({left:cur*step(),behavior:"instant"}));

if(profile&&profile.days&&profile.days.length) showPlan(); else renderSetup();
})();
