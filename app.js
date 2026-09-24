(function(){
const E=window.SC.engine;
const $=id=>document.getElementById(id);
const PROFILE_VERSION=2;

// ---------- storage (everything stays on this device; the app works without it) ----------
const store={
  get(k,def){try{const v=localStorage.getItem("sc-"+k);return v===null?def:JSON.parse(v)}catch(e){return def}},
  set(k,v){try{localStorage.setItem("sc-"+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("sc-"+k)}catch(e){}}
};
function weekKey(){const d=new Date();d.setHours(12);d.setDate(d.getDate()-(d.getDay()+6)%7);return "week-"+d.toISOString().slice(0,10);}
const loadDone=()=>store.get(weekKey(),[]);
const saveDone=a=>store.set(weekKey(),a);
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function dateOf(dayIdx){const d=new Date();d.setHours(12);d.setDate(d.getDate()-(d.getDay()+6)%7+dayIdx);return ymd(d);}
// one record per calendar day: sleep, hunger and which daily moves were done
const dayRec=date=>store.get("day-"+date,{});
const today=()=>ymd(new Date());
const saveDayRec=(date,r)=>store.set("day-"+date,r);

let profile=store.get("profile",null), adjust=store.get("adjust",E.newAdjust());

// ---------- quiz ----------
const DAYS3=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SLOTS=[["morning","Morning"],["midday","Midday"],["evening","Evening"],["late","After bedtime"]];
const SLOT_NAMES=Object.fromEntries(SLOTS);
const WORKING=["drive","transit","home","feet"];
const STEPS=[
 {k:"goals",q:"What do you want to work on?",hint:"Pick up to three.",multi:3,opts:[
   ["strength","Overall strength","Feel stronger in daily life"],["glutes","Glutes + legs","Lower-body strength and shape"],
   ["posture","Posture + upper back","Desk posture, tech neck, rounded shoulders"],["core","Core + back health","A steadier, stronger middle"],
   ["mobility","Mobility","Move and stretch more freely"],["feet","Feet + balance","Arches, bunions, steadiness"]]},
 {k:"exp",q:"How much strength training have you done?",opts:[
   ["new","New to it","Or it's been a long time"],["some","Some","I've done workouts on and off"],["regular","Regular","I train most weeks"]]},
 {k:"kids",q:"Who's at home with you?",hint:"Pick all that apply. We'll suggest ways to move with them.",multi:9,none:"No kids at home",opts:[
   ["little","Baby or toddler","Ages 0–3"],["kids","Kids","Ages 4–12"],["teens","Teens","Ages 13+"]]},
 {k:"work",q:"What does a workday look like?",opts:[
   ["drive","I drive to a workplace"],["transit","I take transit or walk to work"],["home","I work from home"],
   ["feet","I'm on my feet all day","Nursing, retail, teaching…"],["parent","I'm a stay-at-home parent"],["none","Not working right now"]]},
 {k:"workDays",q:"Which days do you work?",hint:"You'll get workday ideas on these days, and weekend-style ideas on the others.",week:1,when:p=>WORKING.includes(p.work)},
 {k:"walk",q:"How much do you walk on a normal day?",hint:"Counting everything: errands, commute, chasing kids.",opts:[
   ["low","Under 15 minutes"],["mid","15 to 45 minutes"],["high","Over 45 minutes"]]},
 {k:"days",q:"Which days can you fit in a workout?",hint:"Pick 2 to 6 days. Rest days in between help.",week:1},
 {k:"mins",q:"How long is a typical session?",hint:"You can change individual days next.",grid:1,opts:[[10,"10 min"],[20,"20 min"],[30,"30 min"],[45,"45 min"]]},
 {k:"sched",q:"When can you fit it in?",hint:"Pick a time and length for each day. Leave the time blank if it varies.",sched:1},
 {k:"gear",q:"What do you have?",hint:"We assume a wall, a chair and a towel. Pick any others.",multi:9,opts:[
   ["band","Loop band","Small band that goes around your legs"],["tube","Long band","With handles, or tied to a door or railing"],
   ["db","Dumbbells"],["kb","Kettlebell"],["gym","Gym access","On some or all of your days"]]},
 {k:"gymDays",q:"Which days are gym days?",hint:"The other days use what you have at home.",week:1,when:p=>(p.gear||[]).includes("gym")},
 {k:"limits",q:"Anything we should work around?",hint:"Pick all that apply. We'll leave out exercises that tend to aggravate them.",multi:9,none:"None of these",opts:[
   ["knee","Knee pain"],["back","Lower-back pain"],["shoulder","Shoulder pain"],["neck","Neck pain or tech neck"],["wrist","Wrist pain"],
   ["core","Postpartum or ab separation","No planks; watch for belly doming"],["feet","Foot pain or bunions"],["floor","Getting down to the floor is hard"]]},
 {k:"caution",q:"Health check",hint:"Has a doctor told you to limit exercise? Or do you have chest pain, dizziness or fainting with activity, a heart condition, or are you pregnant?",opts:[[false,"No"],[true,"Yes to any of these"]]}
];
const BLANK={goals:[],exp:null,kids:null,work:null,workDays:[0,1,2,3,4],walk:null,days:[],mins:null,sched:{},gear:[],gymDays:[],limits:null,caution:null};
let draft=null, qi=0;
const activeSteps=()=>STEPS.filter(s=>!s.when||s.when(draft));
function stepValid(s){
  const v=draft[s.k];
  if(s.k==="days") return v.length>=2&&v.length<=6;
  if(s.k==="workDays") return v.length>=1;
  if(s.k==="gymDays"||s.k==="sched"||s.k==="gear") return true;
  if(s.none) return Array.isArray(v);            // null until they pick something or "none"
  if(s.multi) return v.length>0;
  return v!==undefined&&v!==null;
}
function welcomeHTML(){
  return `<section class="card intro"><div class="phase">Welcome</div><h2>Fitness that fits a busy life</h2>
   <p>Answer a few quick questions. You'll get a weekly plan that fits your schedule, gear and body, with a timer, form cues and a video for every exercise.</p>
   <p>On busy days, the app suggests easy ways to move more: at work, with the kids, or on the weekend.</p>
   <p>After each workout, tell the app how it felt. Next time the plan adjusts: harder, easier, or with a swap for anything that hurt.</p>
   <div class="warn"><span>This is general fitness guidance, not medical advice.</span><span>Your answers stay on this phone. Nothing is sent anywhere.</span></div>
   <button class="btn" data-q="start">Build my plan</button></section>`;
}
function schedHTML(){
  return `<div class="sched">${[...draft.days].sort((a,b)=>a-b).map(d=>{const sc=draft.sched[d];return `<div class="schedrow" data-sd="${d}">
    <div class="schedday">${E.DAY_NAMES[d]}</div>
    <div class="chips">${SLOTS.map(([v,l])=>`<button class="pill" data-slot="${v}" aria-pressed="${sc.slot===v}">${l}</button>`).join("")}</div>
    <div class="chips">${[10,20,30,45].map(m=>`<button class="pill" data-len="${m}" aria-pressed="${sc.mins===m}">${m} min</button>`).join("")}</div></div>`;}).join("")}</div>`;
}
function stepHTML(){
  const steps=activeSteps(), s=steps[qi], v=draft[s.k];
  const bar=`<div class="steps">${steps.map((_,i)=>`<i class="${i<=qi?"on":""}"></i>`).join("")}</div>`;
  let opts;
  if(s.sched) opts=schedHTML();
  else if(s.week){
    const pool=s.k==="gymDays"?[...draft.days].sort((a,b)=>a-b):[0,1,2,3,4,5,6];
    opts=`<div class="opts week">${pool.map(d=>`<button class="opt" data-o="${d}" aria-pressed="${v.includes(d)}">${DAYS3[d]}</button>`).join("")}</div>`;
  }else{
    opts=`<div class="opts${s.grid?" grid2":""}">${s.opts.map(([val,label,sub])=>{
      const on=s.multi?(v||[]).includes(val):v===val;
      return `<button class="opt" data-o="${val}" aria-pressed="${on}"><span>${label}</span>${sub?`<small>${sub}</small>`:""}</button>`;}).join("")}
      ${s.none?`<button class="opt" data-o="__none" aria-pressed="${Array.isArray(v)&&v.length===0}"><span>${s.none}</span></button>`:""}</div>`;
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
  draft={...JSON.parse(JSON.stringify(BLANK)),...(profile?JSON.parse(JSON.stringify(profile)):{})};
  qi=0; showCaution=false; renderSetup();
}
// Every chosen day gets a schedule entry; the length defaults to the typical session length.
function syncSched(){
  const s={};
  draft.days.forEach(d=>{const o=draft.sched[d]||{};s[d]={slot:o.slot||null,mins:o.mins||draft.mins||30};});
  draft.sched=s;
}
function finishQuiz(){
  syncSched();
  draft.gymDays=(draft.gear.includes("gym")?draft.gymDays:[]).filter(d=>draft.days.includes(d));
  const planKeys=["goals","exp","days","gear","gymDays","limits","caution"];
  const planChanged=!profile||planKeys.some(k=>JSON.stringify(profile[k])!==JSON.stringify(draft[k]));
  profile={...draft,v:PROFILE_VERSION}; store.set("profile",profile);
  if(planChanged){adjust=E.newAdjust();store.set("adjust",adjust);} // new body/gear answers → fresh starting point
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
    if(qi===0){draft=null; profile&&profile.v===PROFILE_VERSION?showPlan():renderSetup(); return;}
    qi--; renderSetup(); return;
  }
  if(act==="next"){
    if(!stepValid(s))return;
    if(qi<steps.length-1){qi++; if(steps[qi].sched) syncSched(); renderSetup();}
    else if(draft.caution){showCaution=true;renderSetup();}
    else finishQuiz();
    return;
  }
  const row=b.closest(".schedrow");
  if(row){
    const sc=draft.sched[row.dataset.sd];
    if(b.dataset.slot) sc.slot=sc.slot===b.dataset.slot?null:b.dataset.slot;
    if(b.dataset.len) sc.mins=+b.dataset.len;
    renderSetup(); return;
  }
  if(b.dataset.o===undefined)return;
  const raw=b.dataset.o, src=s.week?null:s.opts.find(o=>String(o[0])===raw), val=s.week?+raw:src?src[0]:raw;
  if(s.week||s.multi){
    let arr=draft[s.k]||[];
    if(raw==="__none") arr=[];
    else if(arr.includes(val)) arr=arr.filter(x=>x!==val);
    else if(s.week||arr.length<s.multi) arr=[...arr,val];
    if(s.k==="days"&&arr.length>6) return;
    draft[s.k]=arr;
  }else draft[s.k]=val;
  renderSetup();
});

// ---------- plan state ----------
let week=[], dayIdx=(new Date().getDay()+6)%7, mode="full", session=null, cards=[], cur=0;
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
const chipRow=(k,val,opts)=>`<div class="chips" data-ck="${k}">${opts.map(([v,l])=>`<button class="pill" data-cv="${v}" aria-pressed="${val===v}">${l}</button>`).join("")}</div>`;
const SLEEP=[["poor","Poor"],["ok","OK"],["good","Good"]], HUNGER=[["low","Low"],["normal","Normal"],["high","High"]];
function checkinHTML(date){
  if(date>today()) return `<p class="hint">Check in on the day.</p>`;
  const rec=dayRec(date);
  return `<div class="checkin" data-date="${date}"><div class="ckrow"><span>Sleep last night</span>${chipRow("sleep",rec.sleep,SLEEP)}</div>
    <div class="ckrow"><span>Hunger today</span>${chipRow("hunger",rec.hunger,HUNGER)}</div></div>`;
}
function introHTML(s){
  const lim=profile.limits||[], rec=dayRec(today());   // you're working out now, so today's sleep counts
  const warns=["Breathe through every rep and hold. Never hold your breath to lift.","Aim for 6–7 out of 10 effort. Stop for sharp pain, dizziness, chest pain or a headache."];
  if(lim.includes("core")) warns.push("Skip anything that makes your belly dome or bulge along the middle.");
  if(profile.caution) warns.push("You told us to be careful. Keep it gentle and follow your doctor's advice.");
  const where=[E.DAY_NAMES[dayIdx],s.slot?SLOT_NAMES[s.slot]:null,s.gym?"Gym":"Home"].filter(Boolean).join(" · ");
  const tired=rec.sleep==="poor"&&mode==="full"&&s.mins>10?`<div class="note">Rough night? The 10-minute version still counts. <button class="pill" data-act="short">Switch to 10 min</button></div>`:"";
  const quiet=s.slot==="late"&&!s.rest?`<p class="hint">Kids asleep? Turn Voice off at the top. The beeps are enough.</p>`:"";
  return `<section class="card intro"><div class="phase">${where}</div><h2>${session.title}</h2>
   <dl class="meta"><dt>Time</dt><dd>About ${session.estMin} min</dd><dt>Gear</dt><dd>${session.gear.length?session.gear.join(", ").replace(/^./,c=>c.toUpperCase()):"None, just a wall and a chair"}</dd></dl>
   ${tired}
   <div class="warn">${warns.map(w=>`<span>${w}</span>`).join("")}</div>
   ${quiet}<p class="hint">Rather follow along with someone today? <button class="linkbtn" data-act="gocreators">See creators who fit you</button></p>
   <p class="hint">Swipe or tap Next to move through. Timed cards move you on automatically when the timer ends.</p>
   <button class="btn" data-act="begin">Start workout</button></section>`;
}
function movesHTML(){
  const s=week[dayIdx], date=dateOf(dayIdx), rec=dayRec(date), done=rec.moves||[], future=date>today();
  const m=E.dailyMoves(profile,dayIdx,date);
  const got=m.items.filter(x=>done.includes(x.id)).reduce((a,x)=>a+x.min,0);
  const goal=m.goal?`<div class="goal"><div><b>${Math.min(got,m.goal)} of ${m.goal} min</b> of extra walking and movement</div><div class="bar"><i style="width:${Math.min(100,got/m.goal*100)}%"></i></div><small>Any chunks count. Three 7-minute walks work as well as one long one.</small></div>`
    :`<p class="hint">${m.onFeet?"Your job keeps you moving, so there's no walking goal on workdays.":"You already walk a lot. These are extras if you want them."}</p>`;
  const workoutLine=s.rest?`<p class="hint">No workout today. Rest is when your body adapts.</p>`
    :`<p class="hint">Workout today: ${E.FOCUS[s.focus].title}${s.slot?", "+SLOT_NAMES[s.slot].toLowerCase():""}. <button class="linkbtn" data-act="full">Open it</button></p>`;
  return `<section class="card intro" id="moveCard"><div class="phase">${E.DAY_NAMES[dayIdx]} · Daily moves</div><h2>Move a little, often</h2>
   ${workoutLine}${goal}
   <h3>Ideas for today</h3>
   <div>${m.items.map(x=>`<div class="moverow"><div><div class="name">${x.t}</div><small>${x.d}</small>
      ${x.video?`<a class="video" href="${x.video}" target="_blank" rel="noopener">Find a video</a>`:""}</div>
      <button class="pill" data-move="${x.id}" aria-pressed="${done.includes(x.id)}"${future?" disabled":""}>${done.includes(x.id)?"Done ✓":"+"+x.min+" min"}</button></div>`).join("")}</div>
   <h3>Daily check-in</h3>${checkinHTML(date)}
   ${s.rest?`<button class="btn ghost" data-act="short">Want more? Open a 10-minute session</button>`:""}</section>`;
}
// ---------- creators ----------
let showAllCreators=false;
const creatorPrefs=()=>store.get("creators",{saved:[],hidden:[]});
function rerenderKeepScroll(fn){const card=track.firstElementChild, top=card?card.scrollTop:0; track.innerHTML=fn(); if(track.firstElementChild) track.firstElementChild.scrollTop=top;}
function creatorRow(x,future,doneIds){
  const did=doneIds.includes(x.c.id);
  return `<div class="crow" data-cid="${x.c.id}"><div class="cname">${x.c.name}</div><small>${x.c.blurb}</small>
    ${x.reasons.length?`<ul class="cues">${x.reasons.map(r=>`<li>${r}</li>`).join("")}</ul>`:""}
    <a class="video" href="${x.videoUrl}" target="_blank" rel="noopener" data-open="${x.c.id}">Find a video: ${x.query}</a>
    <div class="chips"><button class="pill" data-csave="${x.c.id}" aria-pressed="${x.saved}">${x.saved?"Saved ♥":"Save"}</button>
    <button class="pill" data-cdid="${x.c.id}" aria-pressed="${did}"${future?" disabled":""}>${did?"Done today ✓":"I did one today"}</button>
    <button class="pill" data-chide="${x.c.id}">Not for me</button></div></div>`;
}
function creatorsHTML(){
  const s=week[dayIdx], date=dateOf(dayIdx), future=date>today();
  const R=E.matchCreators(profile,{mins:s.rest?20:s.mins,focus:s.focus,rest:s.rest,slot:s.slot},creatorPrefs());
  const doneIds=store.get("creatorlog",[]).filter(e=>e.date===date).map(e=>e.id);
  const main=showAllCreators?R.workout:R.workout.slice(0,6);
  return `<section class="card intro" id="creatorCard"><div class="phase">${E.DAY_NAMES[dayIdx]} · Creators</div><h2>Creators for you</h2>
   <p class="hint">Matched to your answers. Handy on days you'd rather follow along with someone.${s.rest?"":" A video can stand in for today's workout. Tap \"I did one today\" to count it."}</p>
   <h3>For your workouts</h3>${main.map(x=>creatorRow(x,future,doneIds)).join("")}
   ${!showAllCreators&&R.workout.length>6?`<button class="btn ghost" data-act="morecreators">Show ${R.workout.length-6} more</button>`:""}
   ${R.kids.length?`<h3>With the kids</h3>${R.kids.map(x=>creatorRow(x,future,doneIds)).join("")}`:""}
   ${R.rehab.length?`<h3>For aches and pains</h3>${R.rehab.map(x=>creatorRow(x,future,doneIds)).join("")}`:""}
   <p class="fine">Strength Coach isn't affiliated with or endorsed by these creators. Links open their public YouTube channels. Creators you hide can be brought back in Settings.</p></section>`;
}
function creatorAction(b){
  const pr=creatorPrefs();
  if(b.dataset.csave){const id=b.dataset.csave;pr.saved=pr.saved.includes(id)?pr.saved.filter(x=>x!==id):[...pr.saved,id];store.set("creators",pr);}
  else if(b.dataset.chide){const id=b.dataset.chide;pr.hidden=[...new Set([...pr.hidden,id])];pr.saved=pr.saved.filter(x=>x!==id);store.set("creators",pr);}
  else if(b.dataset.cdid){
    const id=b.dataset.cdid, date=dateOf(dayIdx); if(date>today()) return;
    let log=store.get("creatorlog",[]);
    if(log.some(e=>e.date===date&&e.id===id)) log=log.filter(e=>!(e.date===date&&e.id===id));
    else{log.push({date,id,day:dayIdx}); if(!week[dayIdx].rest){const d=loadDone(); if(!d.includes(dayIdx)){d.push(dayIdx);saveDone(d);renderDays();}}}
    store.set("creatorlog",log.slice(-1000));
  }
  rerenderKeepScroll(creatorsHTML);
}

function endHTML(){
  const seen=new Set(), list=session.exIds.filter(id=>!seen.has(id)&&seen.add(id));
  return `<section class="card intro" id="endCard"><div class="phase">Finished</div><h2>How did that feel?</h2>
   <div class="rate">${[["easy","Too easy"],["right","About right"],["hard","Too hard"]].map(([v,l])=>`<button class="opt" data-rate="${v}" aria-pressed="false">${l}</button>`).join("")}</div>
   <h3>Any exercise to change? <span class="hint">(optional)</span></h3>
   <div>${list.map(id=>`<div class="fbrow" data-ex="${id}"><div class="name">${E.BY_ID[id].name}</div><div class="chips">
     <button class="pill" data-v="up" aria-pressed="false">Too easy</button><button class="pill" data-v="down" aria-pressed="false">Too hard</button><button class="pill" data-v="hurt" aria-pressed="false">Caused pain</button></div></div>`).join("")}</div>
   <h3>Check-in <span class="hint">(optional)</span></h3>${checkinHTML(today())}
   <button class="btn restbtn" data-act="savefb" disabled>Save and mark done</button>
   <p class="fine">Pick how it felt to save. Sharp or lasting pain is worth checking with a physio or doctor.</p></section>`;
}
function build(){
  stopTimer();
  const s=week[dayIdx];
  if(s.rest&&mode==="full") mode="move";
  $("fullBtn").hidden=s.rest; $("shortBtn").hidden=!s.rest&&s.mins<=10;
  $("fullBtn").textContent=`${s.mins||profile.mins} min`;
  if(mode==="move"){session=null;cards=[];track.innerHTML=movesHTML();}
  else if(mode==="creators"){session=null;cards=[];track.innerHTML=creatorsHTML();}
  else{
    session=E.buildSession(profile,adjust,sessionOpts(s,mode==="short"?10:s.mins));
    cards=session.cards;
    track.innerHTML=introHTML(s)+cards.map(cardHTML).join("")+endHTML();
  }
  [["fullBtn","full"],["shortBtn","short"],["moveBtn","move"],["creatorBtn","creators"]].forEach(([id,m])=>$(id).setAttribute("aria-pressed",String(mode===m)));
  $("modeRow").hidden=false;
  cur=0; track.scrollTo({left:0,behavior:"instant"}); updateNav();
}
function showPlan(){
  $("setup").hidden=true; $("app").hidden=false;
  week=E.buildWeek(profile); mode="full";
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
  const rec=dayRec(today());
  const hist=store.get("history",[]); hist.push({date:ymd(new Date()),day:dayIdx,focus:session.focus,mins:session.mins,rating:fb.rating,ex:fb.ex,sleep:rec.sleep||null,hunger:rec.hunger||null}); store.set("history",hist.slice(-500));
  const d=loadDone(); if(!d.includes(dayIdx)){d.push(dayIdx);saveDone(d);} renderDays();
  const notes=[...res.notes,...swaps.map(x=>"Swap: "+x)];
  el.innerHTML=`<div class="phase">Saved</div><h2>Nice work.</h2>
   ${notes.length?`<h3>Next time</h3><ul class="notes">${notes.map(n=>`<li>${n}</li>`).join("")}</ul>`:`<p>Your plan stays the same for now. Rate "About right" three sessions in a row and it steps up.</p>`}
   <p class="hint">Drink some water. Your next session is ready when you are.</p>
   <button class="btn" data-act="gomove">See today's daily moves</button>
   <button class="btn ghost" data-act="reload">Back to the start</button>`;
}

// ---------- settings ----------
function trendsHTML(){
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setHours(12);d.setDate(d.getDate()-i);return dayRec(ymd(d));});
  const n=(k,v)=>days.filter(r=>r[k]===v).length, logged=days.filter(r=>r.sleep||r.hunger).length;
  const moves=days.reduce((a,r)=>a+(r.moves||[]).length,0);
  if(!logged&&!moves) return `<p class="fine">Check in on the Daily moves tab to see your sleep and hunger here.</p>`;
  const tips=[];
  if(n("sleep","poor")>=3) tips.push("Sleep has been rough on 3 or more of the last 7 days. On those days, the 10-minute version is a fine choice.");
  if(n("hunger","high")>=3) tips.push("Hunger has been high on 3 or more of the last 7 days. Regular meals and snacks with some protein help many people. If it's a worry, a doctor or dietitian can advise.");
  return `<dl class="meta"><dt>Sleep</dt><dd>${n("sleep","good")} good · ${n("sleep","ok")} OK · ${n("sleep","poor")} poor</dd>
   <dt>Hunger</dt><dd>${n("hunger","low")} low · ${n("hunger","normal")} normal · ${n("hunger","high")} high</dd>
   <dt>Moves</dt><dd>${moves} daily move${moves===1?"":"s"} done</dd></dl>
   ${tips.map(t=>`<p class="note">${t}</p>`).join("")}`;
}
function settingsHTML(){
  const hist=store.get("history",[]), a=adjust, cl=store.get("creatorlog",[]).length, hiddenN=creatorPrefs().hidden.length;
  const lvl=a.int===0?"Starting level":a.int>0?`${a.int} step${a.int>1?"s":""} up from where you started`:`${-a.int} step${a.int<-1?"s":""} easier than where you started`;
  const names={strength:"Overall strength",glutes:"Glutes + legs",posture:"Posture",core:"Core",mobility:"Mobility",feet:"Feet + balance"};
  const sched=week.filter(s=>!s.rest).map(s=>`${DAYS3[s.d]} ${s.slot?SLOT_NAMES[s.slot].toLowerCase()+", ":""}${s.mins} min`).join(" · ");
  return `<section class="card intro"><div class="phase">Your plan</div><h2>Settings</h2>
   <dl class="meta"><dt>Goals</dt><dd>${profile.goals.map(g=>names[g]).join(", ")}</dd>
   <dt>Schedule</dt><dd>${sched}</dd>
   ${WORKING.includes(profile.work)?`<dt>Work days</dt><dd>${(profile.workDays||[0,1,2,3,4]).slice().sort().map(d=>DAYS3[d]).join(", ")}</dd>`:""}
   <dt>Level</dt><dd>${lvl}</dd><dt>Removed</dt><dd>${a.ban.length?a.ban.map(id=>E.BY_ID[id].name).join(", "):"Nothing"}</dd>
   <dt>Logged</dt><dd>${hist.length} workout${hist.length===1?"":"s"}${cl?` · ${cl} creator video${cl===1?"":"s"}`:""}</dd></dl>
   ${hiddenN?`<p class="note">${hiddenN} creator${hiddenN===1?"":"s"} hidden. <button class="pill" data-act="unhide">Show them again</button></p>`:""}
   <button class="btn" data-act="calendar">Add workouts to my calendar</button>
   <p class="fine">Adds a weekly repeating event for each workout day, with a reminder 10 minutes before: ${calTimesText()}. You can change the times in your calendar app. Changed your schedule here? Delete the old events, then add them again.</p>
   <h3>Last 7 days</h3>${trendsHTML()}
   <button class="btn" data-act="requiz">Change my answers</button>
   <button class="btn ghost" data-act="resetadj">Undo all feedback changes</button>
   <button class="btn ghost" data-act="close">‹ Back to my plan</button>
   <p class="fine">Everything is stored only on this device. Clearing your browser data or uninstalling removes it.</p>
   <p class="fine">General fitness guidance, not medical advice. Stop if something hurts, and check with a doctor or physio about pain or health conditions.</p></section>`;
}
function calTimesText(){
  const t=([h,m])=>`${h%12||12}${m?":"+String(m).padStart(2,"0"):""} ${h<12?"am":"pm"}`;
  return SLOTS.map(([k,l])=>`${l.toLowerCase()} ${t(E.SLOT_TIMES[k])}`).join(", ")+`, and ${t(E.DEFAULT_TIME)} for days without a time`;
}
function downloadCalendar(){
  let uid=store.get("uid",null); if(!uid){uid="sc"+Math.random().toString(36).slice(2,10);store.set("uid",uid);}
  const ics=E.calendarICS(profile,week,{url:location.origin+location.pathname,uid});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
  a.download="strength-coach-workouts.ics"; document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
}
function openSettings(){stopTimer();$("modeRow").hidden=true;track.innerHTML=settingsHTML();cur=0;track.scrollTo({left:0,behavior:"instant"});updateNav();}

// ---------- events ----------
track.addEventListener("click",e=>{
  const a=e.target.closest("a[data-open]");
  if(a){const o=store.get("creatoropens",{});o[a.dataset.open]=(o[a.dataset.open]||0)+1;store.set("creatoropens",o);return;} // kept on this phone for now
  const b=e.target.closest("button"); if(!b)return; unlock();
  if(b.dataset.rate){endCard().querySelectorAll("[data-rate]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));endCard().querySelector('[data-act="savefb"]').disabled=false;return;}
  if(b.dataset.v){const on=b.getAttribute("aria-pressed")==="true";b.parentNode.querySelectorAll(".pill").forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed",String(!on));return;}
  if(b.dataset.cv){ // sleep / hunger check-in: saved immediately, tap again to clear
    const k=b.parentNode.dataset.ck, date=b.closest(".checkin").dataset.date, rec=dayRec(date);
    rec[k]=rec[k]===b.dataset.cv?null:b.dataset.cv; saveDayRec(date,rec);
    b.parentNode.querySelectorAll(".pill").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.cv===rec[k])));
    return;
  }
  if(b.dataset.csave||b.dataset.chide||b.dataset.cdid){creatorAction(b);return;}
  if(b.dataset.move){
    const date=dateOf(dayIdx); if(date>today()) return;
    const rec=dayRec(date), m=rec.moves||[];
    rec.moves=m.includes(b.dataset.move)?m.filter(x=>x!==b.dataset.move):[...m,b.dataset.move]; saveDayRec(date,rec);
    const left=track.scrollLeft, top=$("moveCard").scrollTop; track.innerHTML=movesHTML(); $("moveCard").scrollTop=top; track.scrollLeft=left;
    return;
  }
  const act=b.dataset.act, t=b.closest(".timer"), ci=t?+t.dataset.t:-1;
  if(act==="begin") go(1);
  else if(act==="short"){mode="short";build();}
  else if(act==="full"){mode="full";build();}
  else if(act==="gomove"){mode="move";build();}
  else if(act==="gocreators"){mode="creators";build();}
  else if(act==="morecreators"){showAllCreators=true;rerenderKeepScroll(creatorsHTML);}
  else if(act==="unhide"){const pr=creatorPrefs();pr.hidden=[];store.set("creators",pr);openSettings();}
  else if(act==="savefb") saveFeedback();
  else if(act==="reload") build();
  else if(act==="reset") resetCard(ci);
  else if(act==="go"){
    if(timer.card===ci){timer.running?pauseTimer():resumeTimer();}
    else startTimer(ci,cards[ci].segs);
  }
  else if(act==="requiz") startQuiz();
  else if(act==="calendar") downloadCalendar();
  else if(act==="resetadj"){if(confirm("Undo every change your feedback has made to the plan?")){adjust=E.newAdjust();store.set("adjust",adjust);openSettings();}}
  else if(act==="close") build();
});
$("days").addEventListener("click",e=>{const b=e.target.closest(".day");if(!b)return;dayIdx=+b.dataset.i;mode=mode==="creators"?"creators":"full";showAllCreators=false;renderDays();build();});
$("fullBtn").onclick=()=>{mode="full";build();};
$("shortBtn").onclick=()=>{mode="short";build();};
$("moveBtn").onclick=()=>{mode="move";build();};
$("creatorBtn").onclick=()=>{mode="creators";build();};
$("settingsBtn").onclick=openSettings;
$("prevBtn").onclick=()=>go(cur-1);
$("nextBtn").onclick=()=>{unlock();go(cur+1);};
function syncToggles(){$("soundBtn").setAttribute("aria-pressed",String(sound));$("voiceBtn").setAttribute("aria-pressed",String(voice));}
$("soundBtn").onclick=()=>{sound=!sound;store.set("sound",sound);syncToggles();unlock();beep();};
$("voiceBtn").onclick=()=>{voice=!voice;store.set("voice",voice);syncToggles();if(voice)say("Voice on");};
document.addEventListener("keydown",e=>{if($("app").hidden)return;if(e.key==="ArrowRight")go(cur+1);if(e.key==="ArrowLeft")go(cur-1);});
window.addEventListener("resize",()=>track.scrollTo({left:cur*step(),behavior:"instant"}));

// People who set up before the lifestyle questions existed start at the first new question; their old answers are prefilled.
if(profile&&profile.v===PROFILE_VERSION) showPlan();
else if(profile){startQuiz(); qi=activeSteps().findIndex(s=>!stepValid(s)); if(qi<0)qi=0; renderSetup();}
else renderSetup();
})();
