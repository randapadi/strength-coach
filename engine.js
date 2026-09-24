// Plan generator. Pure functions: profile + adjustments in, plan out. No DOM, no storage, no network,
// so it runs instantly on the phone and can be tested on its own (see test.html).
(function(){
const {EXERCISES,WARM,MOVES,CREATORS}=window.SC;
const BY_ID=Object.fromEntries(EXERCISES.map(x=>[x.id,x]));

const FOCUS={
  L:{title:"Lower Body + Glutes",short:"Lower",slots:["squat","hinge","glute","lunge","glute","core","hinge","squat"]},
  U:{title:"Upper Body + Posture",short:"Upper",slots:["pull","push","posture","pull","posture","core","push","pull"]},
  F:{title:"Full Body Strength",short:"Full",slots:["squat","pull","hinge","push","glute","core","lunge","posture"]},
  C:{title:"Core + Mobility",short:"Core",slots:["core","glute","core","posture","squat","core","hinge","pull"]}
};
// When nothing fits a slot (gear or limitations rule everything out), try these patterns instead.
const FALLBACK={squat:["glute","lunge"],hinge:["glute","squat"],glute:["hinge","squat"],lunge:["squat","glute"],
  push:["posture","pull"],pull:["posture","push"],posture:["pull","core"],core:["glute","posture"]};
// Minutes → main-circuit size, cool-down cards, finisher cards. Rounds are worked out to fill the time.
const SIZE={10:{n:4,cool:1,fin:0},20:{n:4,cool:2,fin:1},30:{n:6,cool:2,fin:2},45:{n:7,cool:3,fin:2}};
const EXP={new:{lvl:1,mult:.8,rest:60},some:{lvl:2,mult:1,rest:45},regular:{lvl:3,mult:1.2,rest:45}};
const GEAR_NAMES={band:"loop band",tube:"long band with an anchor",db:"dumbbells",kb:"kettlebell",gym:"gym machines"};
const DAY_NAMES=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const newAdjust=()=>({int:0,pl:{},xb:{},ban:[],streak:0});

// ---------- which focus goes on which day ----------
function focusOrder(p){
  const g=p.goals||[], o=[];
  if(g.includes("glutes")) o.push("L");
  if(g.includes("posture")) o.push("U");
  if(g.includes("core")||g.includes("mobility")) o.push("C");
  o.push("F");
  return o;
}
function buildWeek(p){
  const order=focusOrder(p), train=[...(p.days||[])].sort((a,b)=>a-b), seen={};
  return DAY_NAMES.map((name,d)=>{
    const i=train.indexOf(d);
    if(i<0) return {d,name,rest:true};
    const focus=order[i%order.length];
    seen[focus]=(seen[focus]||0)+1;
    const sc=(p.sched||{})[d]||{};
    return {d,name,focus,variant:seen[focus]-1,gym:(p.gymDays||[]).includes(d),slot:sc.slot||null,mins:sc.mins||p.mins||30};
  });
}

// ---------- exercise selection ----------
function hasGear(eq,gear){return !eq||eq.split("|").some(g=>gear.includes(g));}
function allowed(x,ctx){
  return hasGear(x.eq,ctx.gear) && !(x.avoid||[]).some(f=>ctx.limits.includes(f)) && !ctx.adj.ban.includes(x.id);
}
function targetLevel(pat,ctx){return clamp(ctx.baseLvl+(ctx.adj.pl[pat]||0),1,3);}
function candidates(pat,ctx){
  const t=targetLevel(pat,ctx);
  return EXERCISES.filter(x=>x.pat===pat&&allowed(x,ctx)&&x.lvl<=t+1).map(x=>{   // never jump more than one level up
    let s=-Math.abs(x.lvl-t)*10-(x.lvl>t?5:0);   // closest level wins; prefer easier over harder on a tie
    if(x.eq&&x.eq!=="gym") s+=2;                 // use the gear people said they own
    if(x.eq==="gym") s+=ctx.gymDay?4:-99;
    return {x,s};
  }).filter(c=>c.s>-90).sort((a,b)=>b.s-a.s||a.x.id.localeCompare(b.x.id));
}
function pick(pat,ctx,used,turn){
  for(const p of [pat,...(FALLBACK[pat]||[])]){
    const c=candidates(p,ctx).filter(c=>!used.has(c.x.id));
    if(!c.length) continue;
    const top=c.filter(k=>k.s===c[0].s);          // equally good options rotate between days
    return top[turn%top.length].x;
  }
  return null;
}

// ---------- dosing ----------
function doseMult(ctx,id){return clamp(ctx.expMult*(1+.1*ctx.adj.int)*(1+.15*(ctx.adj.xb[id]||0)),.6,1.8);}
function dose(d,m){
  if(d.r) return {...d,r:clamp(Math.round(d.r*m),4,25)};
  if(d.h) return {...d,h:clamp(Math.round(d.h*m/5)*5,15,120)};
  return {...d};
}
function rxText(d){
  if(d.r) return d.side?`${d.r} each side`:`${d.r} reps`;
  if(d.h) return d.side?`${d.h} sec each side`:`${d.h}-sec hold`;
  return d.t>=60?`${Math.round(d.t/60)} min`:`${d.t} sec`;
}
function segsFor(d,label){
  if(d.h&&d.side) return [{l:"Left side",s:d.h},{l:"Switch",s:5,r:1},{l:"Right side",s:d.h}];
  if(d.h) return [{l:"Hold",s:d.h}];
  if(d.t) return [{l:label||"Go",s:d.t}];
  return null;
}
function secs(d){
  if(d.r) return d.r*(d.side?2:1)*3.5+15;
  if(d.h) return d.h*(d.side?2:1)+(d.side?5:0)+15;
  return (d.t||0)+10;
}
const searchUrl=name=>"https://www.youtube.com/results?search_query="+encodeURIComponent(name+" exercise proper form");
function exCard(x,phase,ctx){
  const d=x.pat==="stretch"?{...x.d}:dose(x.d,doseMult(ctx,x.id));
  const c={phase,name:x.name,rx:rxText(d),cues:x.cues,video:x.v||searchUrl(x.name),videoKind:x.v?"form":"search",exId:x.id,pat:x.pat,sec:secs(d)};
  const s=segsFor(d,x.pat==="stretch"?"Breathe":"Go"); if(s) c.segs=s;
  return c;
}

// ---------- one session ----------
function context(p,adj,opts){
  const e=EXP[p.caution?"new":p.exp]||EXP.some;
  const gear=[...(p.gear||[]).filter(g=>g!=="gym"),...(opts.gym?["gym"]:[])];
  return {gear,limits:p.limits||[],adj:{...newAdjust(),...adj},baseLvl:e.lvl,expMult:e.mult,rest:e.rest,gymDay:!!opts.gym};
}
function buildSession(p,adj,opts){
  const focus=opts.focus, F=FOCUS[focus], mins=opts.mins||p.mins||30, size=SIZE[mins]||SIZE[30];
  const ctx=context(p,adj,opts), turn=opts.variant||0, used=new Set();
  const goals=p.goals||[], lim=ctx.limits;

  // warm-up
  const warm=WARM[focus].slice(0,mins<=10?1:2).map(w=>{
    const d=mins<=10&&w.d.t?{t:60}:w.d;
    return {phase:"Warm-up",name:w.name,rx:rxText(d),cues:w.cues,segs:segsFor(d,"Go")||undefined,sec:secs(d)};
  });

  // main circuit exercises
  const main=[];
  for(let i=0;i<size.n;i++){
    const x=pick(F.slots[i],ctx,used,turn+i); if(!x) continue;
    used.add(x.id); main.push(x);
  }

  // finisher: feet for foot goals/limits, neck work for posture goals on non-upper days
  let fin=[];
  if(goals.includes("feet")||lim.includes("feet")){
    const ids=lim.includes("feet")&&ctx.gear.includes("band")?["shortfoot","bigtoe","toeyoga","heelraise"]:["shortfoot","toeyoga","heelraise"];
    ids.forEach(id=>{const x=BY_ID[id]; if(allowed(x,ctx)) fin.push(x);});
  }
  if((goals.includes("posture")||lim.includes("neck"))&&focus!=="U"&&!used.has("chinwall")&&allowed(BY_ID.chinwall,ctx)) fin.push(BY_ID.chinwall);
  fin=fin.slice(0,size.fin); fin.forEach(x=>used.add(x.id));
  const finCards=fin.map(x=>exCard(x,"Finisher",ctx));

  // cool-down: stretches that suit this focus, more of them for mobility goals
  const cool=EXERCISES.filter(x=>x.pat==="stretch"&&x.for.includes(focus)&&allowed(x,ctx)&&!used.has(x.id));
  const nCool=Math.min(cool.length,size.cool+(goals.includes("mobility")&&mins>10?1:0));
  const coolCards=[]; for(let i=0;i<nCool;i++) coolCards.push(exCard(cool[(turn+i)%cool.length],"Cool-down",ctx));

  // rounds: fill the chosen time, measured at the starting dose so feedback that adds reps adds work, not rounds
  const fixed=[...warm,...finCards,...coolCards].reduce((a,c)=>a+c.sec,0), budget=mins*60-fixed;
  const exSec=x=>secs(dose(x.d,ctx.expMult));
  const fit=()=>{const rs=main.reduce((a,x)=>a+exSec(x),0)||1, r=clamp(Math.round((budget+ctx.rest)/(rs+ctx.rest)),1,5);return {r,sec:r*rs+(r-1)*ctx.rest};};
  // too little work to fill the time (long exercises, few rounds)? add exercises from the later slots
  for(let i=size.n;i<F.slots.length*2&&main.length<10&&budget-fit().sec>90;i++){
    const x=pick(F.slots[i%F.slots.length],ctx,used,turn+i); if(x){used.add(x.id);main.push(x);}
  }
  const rounds=clamp(fit().r-(ctx.adj.int<=-2?1:0),1,5);
  const mainCards=[];
  for(let r=1;r<=rounds;r++) main.forEach((x,i)=>{
    mainCards.push(exCard(x,`Round ${r} of ${rounds} · ${i+1}/${main.length}`,ctx));
    if(i===main.length-1&&r<rounds) mainCards.push({phase:`Round ${r} done`,name:"Rest",rx:`${ctx.rest} sec, then round ${r+1}`,cues:["Sip water, shake out your legs"],segs:[{l:"Rest",s:ctx.rest,r:1}],restOnly:1,sec:ctx.rest});
  });

  const cards=[...warm,...mainCards,...finCards,...coolCards];
  const gearUsed=[...new Set(main.concat(fin).flatMap(x=>x.eq?[x.eq.split("|").find(g=>ctx.gear.includes(g))]:[]))];
  return {
    focus,mins,title:(opts.gym?"Gym · ":"")+F.title,short:F.short,cards,
    estMin:Math.round(cards.reduce((a,c)=>a+c.sec,0)/60),
    gear:gearUsed.map(g=>GEAR_NAMES[g]),
    exIds:main.concat(fin).map(x=>x.id)
  };
}

// ---------- feedback ----------
// fb = {rating:"easy"|"right"|"hard", ex:{[exerciseId]:"up"|"down"|"hurt"}}
function applyFeedback(p,adj,fb,opts){
  const a=JSON.parse(JSON.stringify({...newAdjust(),...adj})), notes=[];
  const ctx=context(p,a,opts);
  if(fb.rating==="easy"){a.int=clamp(a.int+1,-3,4);a.streak=0;notes.push("Reps and hold times go up about 10% across your plan.");}
  else if(fb.rating==="hard"){a.int=clamp(a.int-1,-3,4);a.streak=0;notes.push("Reps and hold times come down about 10% across your plan.");}
  else if(fb.rating==="right"){
    a.streak++;
    if(a.streak>=3){a.int=clamp(a.int+1,-3,4);a.streak=0;notes.push("Three sessions in a row felt about right, so the plan steps up a little.");}
  }
  for(const [id,v] of Object.entries(fb.ex||{})){
    const x=BY_ID[id]; if(!x) continue;
    if(v==="hurt"){ if(!a.ban.includes(id)) a.ban.push(id); notes.push(`${x.name} is removed from your plan.`); continue; }
    const dir=v==="up"?1:-1, lvls=EXERCISES.filter(y=>y.pat===x.pat&&allowed(y,ctx)).map(y=>y.lvl);
    const canMove=dir>0?lvls.some(l=>l>x.lvl):lvls.some(l=>l<x.lvl);
    if(canMove){a.pl[x.pat]=clamp((a.pl[x.pat]||0)+dir,-2,2);notes.push(`${x.name}: you'll get ${dir>0?"a harder":"an easier"} version.`);}
    else{a.xb[id]=clamp((a.xb[id]||0)+dir,-3,4);notes.push(`${x.name}: ${dir>0?"more":"fewer"} reps or a ${dir>0?"longer":"shorter"} hold.`);}
  }
  return {adjust:a,notes};
}
// What actually changed between two versions of the same session, for the "next time" summary.
function diffSessions(before,after){
  const out=[], b=before.exIds, n=after.exIds;
  b.forEach((id,i)=>{ if(n[i]&&n[i]!==id) out.push(`${BY_ID[id].name} → ${BY_ID[n[i]].name}`); });
  return out;
}

// ---------- everyday movement ----------
const WORKING=["drive","transit","home","feet"];
function hash(str){let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
// Suggestions for one day. dateStr (YYYY-MM-DD) makes the picks rotate day to day but stay stable within a day.
function dailyMoves(p,d,dateStr,count=4){
  const kids=p.kids||[], parent=kids.length>0;
  const off=!WORKING.includes(p.work)||!(p.workDays||[0,1,2,3,4]).includes(d);   // profiles from before the workdays question: Mon–Fri
  const fits=m=>(m.days==="any"||(m.days==="off")===off)
    &&(!m.work||m.work.includes(p.work))
    &&(!m.kids||m.kids.some(k=>kids.includes(k)))
    &&(!m.nokids||!parent);
  const pool=MOVES.filter(fits).map(m=>({m,k:hash(m.id+dateStr)})).sort((a,b)=>a.k-b.k).map(x=>x.m);
  // guaranteed places: kid-friendly ideas for parents (two on days off, one on workdays),
  // workday ideas on workdays (two), then anything else that fits
  const kidIdeas=pool.filter(m=>m.kids), workIdeas=pool.filter(m=>m.work);
  const pick=[...kidIdeas.slice(0,parent?(off?2:1):0),...workIdeas.slice(0,off?0:2)];
  for(const m of pool){ if(pick.length>=count) break; if(!pick.includes(m)) pick.push(m); }
  const onFeet=p.work==="feet"&&!off;
  const goal=onFeet||p.walk==="high"?0:p.walk==="mid"?30:20;
  return {goal,onFeet,items:pick.map(m=>({...m,video:m.q?"https://www.youtube.com/results?search_query="+encodeURIComponent(m.q):null}))};
}

// ---------- calendar file ----------
// Weekly repeating events for the training days, as an .ics file any calendar app can import.
// Times are "floating" (no time zone), so they stay at the same local time wherever the phone is.
const SLOT_TIMES={morning:[6,30],midday:[12,15],evening:[18,0],late:[20,30]}, DEFAULT_TIME=[18,0];
const ICS_DAYS=["MO","TU","WE","TH","FR","SA","SU"];
function calendarICS(p,week,{url,now=new Date(),uid="sc"}={}){   // uid: stable per install, so re-adding can update events
  const pad=n=>String(n).padStart(2,"0");
  const stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const esc=t=>String(t).replace(/\\/g,"\\\\").replace(/([,;])/g,"\\$1").replace(/\n/g,"\\n");
  const fold=l=>{const out=[];while(l.length>74){out.push(l.slice(0,74));l=" "+l.slice(74);}out.push(l);return out.join("\r\n");};
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Strength Coach//Workout schedule//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  for(const s of week.filter(s=>!s.rest)){
    const [h,m]=SLOT_TIMES[s.slot]||DEFAULT_TIME;
    const first=new Date(now); first.setHours(12,0,0,0);
    first.setDate(first.getDate()+((s.d-(first.getDay()+6)%7)+7)%7);   // next occurrence of this weekday, today included
    const title=`Workout: ${FOCUS[s.focus].title} (${s.mins} min)`;
    lines.push("BEGIN:VEVENT",
      `UID:${uid}-${ICS_DAYS[s.d].toLowerCase()}@strength-coach`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${first.getFullYear()}${pad(first.getMonth()+1)}${pad(first.getDate())}T${pad(h)}${pad(m)}00`,
      `DURATION:PT${s.mins}M`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAYS[s.d]}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc("Open Strength Coach to start."+(url?" "+url:""))}`,
      ...(url?[`URL:${url}`]:[]),
      "BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${esc(title)}`,"TRIGGER:-PT10M","END:VALARM",
      "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n")+"\r\n";
}

// ---------- creator matching ----------
const GOAL_STYLES={strength:["strength"],glutes:["lower","strength"],posture:["yoga","pilates","mobility"],core:["pilates","core"],mobility:["yoga","mobility"],feet:["yoga","walk"]};
const FOCUS_QUERY={L:"lower body",U:"upper body",F:"full body",C:"core"};
// day = {mins, focus, rest, slot}; prefs = {saved:[ids], hidden:[ids]}
// Returns three lists: workout creators ranked for this person, kid-friendly channels (households with kids only),
// and physical-therapy channels (only when they picked knee, back, shoulder or neck).
function matchCreators(p,day={},prefs={}){
  const saved=prefs.saved||[], hidden=prefs.hidden||[], goals=p.goals||[], lim=p.limits||[], kids=p.kids||[], gear=p.gear||[];
  const lvl=p.caution?1:({new:1,some:2,regular:3}[p.exp]||2), mins=day.mins||p.mins||30;
  const aches=["knee","back","shoulder","neck"].filter(l=>lim.includes(l));
  const GOAL_WORDS={strength:"strength",glutes:"glutes and legs",posture:"posture",core:"core",mobility:"mobility",feet:"balance"};
  const entry=(c,s,why)=>{
    const st=t=>c.styles.includes(t);
    const q=st("kids")?"kids yoga":st("rehab")?(aches[0]?aches[0]+" pain":"mobility"):st("walk")&&!st("strength")?`${mins} minute walk`
      :(st("yoga")||st("pilates"))&&!st("strength")?`${mins} minute ${st("pilates")?"pilates":"yoga"}`:`${mins} minute ${day.rest?"stretch":FOCUS_QUERY[day.focus]||"workout"}`;
    if(saved.includes(c.id)) why.unshift("Saved by you");
    return {c,score:s,reasons:why.slice(0,3),url:`https://www.youtube.com/@${c.handle}`,videoUrl:`https://www.youtube.com/@${c.handle}/search?query=${encodeURIComponent(q)}`,query:q,saved:saved.includes(c.id)};
  };
  const sort=a=>a.sort((x,y)=>(y.saved-x.saved)||y.score-x.score||x.c.name.localeCompare(y.c.name));   // saved ones always first
  const workout=[], kidList=[], rehab=[];
  for(const c of CREATORS){
    if(hidden.includes(c.id)) continue;
    const has=t=>c.tags.includes(t), st=t=>c.styles.includes(t), why=[];
    if(st("kids")){ if(kids.some(k=>k==="kids"||k==="little")) kidList.push(entry(c,kids.includes("kids")?2:1,[kids.includes("kids")?"Your kids can join in":"Good once your little one is 3 or so"])); continue; }
    if(st("rehab")){ if(aches.length) rehab.push(entry(c,(lvl>=c.lvl[0]?2:0)+(has("low")?1:0),[`Physical therapist tips for ${aches.join(" and ")} pain`])); continue; }
    let s=0;
    const hit=goals.filter(g=>(GOAL_STYLES[g]||[]).some(st));
    if(hit.length){s+=3*hit.length;why.push(`Fits your ${hit.length>1?"goals":"goal"}: ${hit.map(g=>GOAL_WORDS[g]).join(", ")}`);}
    if(lvl<c.lvl[0]) s-=6; else if(lvl<=c.lvl[1]){s+=2; if(lvl===1&&c.lvl[0]===1) why.push("Beginner-friendly");}
    if(mins>=c.len[0]-2&&mins<=c.len[1]+5){s+=2;why.push(`Has ${mins}-minute videos`);} else if(c.len[0]>mins+10) s-=3;
    if(c.eq.includes("db")){ if(gear.includes("db")){s+=2;why.push("Uses the dumbbells you have");} else s-=14; }
    else why.push("No equipment needed");
    if(lim.includes("core")){ if(has("pre")){s+=5;why.push("Pre- and postnatal qualified");} if(st("hiit")) s-=4; }
    if(aches.length){ if(has("pt")){s+=3;why.push("Physical therapists on the team");} if(has("low")) s+=2; if(st("hiit")) s-=3; }
    if(lim.includes("floor")&&st("pilates")) s-=3;
    if(has("mom")&&kids.length){s+=2;why.push("Made with busy moms in mind");}
    if(day.slot==="late"){ if(has("quiet")){s+=2;why.push("Quiet enough for after bedtime");} if(st("hiit")) s-=5; }   // jumping wakes kids; dumbbell work is fine
    if(p.walk==="low"&&st("walk")){s+=2;why.push("Great for adding more walking");}
    if(has("low")&&(p.exp==="new"||p.caution)) s+=1;
    workout.push(entry(c,s,why));
  }
  return {workout:sort(workout),kids:sort(kidList),rehab:sort(rehab)};
}

// ---------- phone reminders (app store version) ----------
// Weekly repeating local notifications. weekday uses the 1 = Sunday … 7 = Saturday convention of iOS/Android.
// ids: 100+day for workouts, 200+day for walk nudges, so re-scheduling replaces rather than duplicates.
const NUDGE_TIME={work:[12,30],home:[10,30]};
function reminderPlan(p,week,{lead=10,nudge=false}={}){
  const out=[], wd=d=>((d+1)%7)+1;
  for(const s of week.filter(s=>!s.rest)){
    const [h,m]=SLOT_TIMES[s.slot]||DEFAULT_TIME;
    let t=h*60+m-lead, day=s.d;
    if(t<0){t+=24*60;day=(s.d+6)%7;}                      // a reminder before midnight belongs to the previous day
    out.push({id:100+s.d,weekday:wd(day),hour:Math.floor(t/60),minute:t%60,
      title:lead?`Workout in ${lead} minutes`:"Time for your workout",
      body:`${FOCUS[s.focus].title}, ${s.mins} min. Tap to start.`});
  }
  if(nudge){
    const working=WORKING.includes(p.work), workDays=p.workDays||[0,1,2,3,4];
    for(let d=0;d<7;d++){
      const workday=working&&workDays.includes(d);
      if(working&&!workday) continue;                   // workers: nudge on workdays only
      if(p.work==="feet"&&workday) continue;             // on their feet all day already
      if(p.walk==="high") continue;
      const day=week[d]; if(day&&!day.rest&&day.slot==="midday") continue;   // midday workout already
      const [h,m]=NUDGE_TIME[workday?"work":"home"];
      out.push({id:200+d,weekday:wd(d),hour:h,minute:m,title:"Time for a short walk?",body:workday?"A 10-minute walk after lunch counts toward today's goal.":"A 10-minute walk counts toward today's goal."});
    }
  }
  return out;
}

window.SC.engine={reminderPlan,matchCreators,dailyMoves,calendarICS,SLOT_TIMES,DEFAULT_TIME,FOCUS,DAY_NAMES,GEAR_NAMES,BY_ID,newAdjust,buildWeek,buildSession,applyFeedback,diffSessions,focusOrder};
})();
