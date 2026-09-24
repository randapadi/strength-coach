// Exercise library. The plan generator (engine.js) only ever picks from this list.
// pat:   movement pattern the generator fills slots with
// eq:    gear needed ("" = none; "a|b" = either a or b). A wall, a chair and a towel are assumed.
// lvl:   1 easiest – 3 hardest; the generator picks the level that suits the person
// avoid: limitation flags from the quiz that rule this exercise out
// d:     dose at a normal intensity — {r:reps} {r:reps,side:1} {h:secs} {h:secs,side:1} {t:secs}
// v:     form video; when missing the app links a YouTube search for the exercise name
(function(){
const V={
  rdl:"Uc5rP5xs7qQ",bandBridge:"4oRkPYWV0B8",goblet:"MWHIs0zxkCU",clam:"6xDr8LvURMc",lunge:"xrPteyQLGAo",
  latwalk:"sguYZv1F62o",shortfoot:"z0-Vnmw2sxM",toeyoga:"QVZpBSVV9js",bigtoe:"xEFkqlrgVKI",heelraise:"ErIth-SWynY",
  chinwall:"AbtkOAgVwYk",chinsupine:"RQbDQgfKhBE",catcow:"xqZ2l7pJfCg",pullapart:"smSSXITNpCI",row:"pYcpY20QaE8",
  bandface:"AlTGQrDOd98",yt:"rKVuKuR4SA4",wallangel:"ywYi4rBhRBQ",birddog:"ZdAHe9_HeEw",doorway:"qv6el4OhHjA",
  thoracic:"4TAdFE6VbVE",wallsit:"JaZNYM3zAP0",bridge:"wPM8icPu6H8",sideplank:"ribtncUfriU",deadbug:"bxn9FBrt4-A",
  splitiso:"OtMPKY0JKJo",child:"2MJGg-dUKh0",hipthrust:"UVucPKyQVLU",cablerow:"f_r95UajQcg",legpress:"OIq-tsCx_9k",
  pulldown:"AOpi-p0cJkc",cableface:"eTCBSFlCJ_s",abduct:"01HilwRf8m8",pallof:"Te5VAYXy0wQ"
};
for(const k in V) V[k]="https://www.youtube.com/watch?v="+V[k];

const X=[
// ---- squat ----
{id:"sitstand",name:"Sit-to-stand",pat:"squat",eq:"",lvl:1,d:{r:10},cues:["Sit to the front of a chair","Stand up without using your hands","Lower slowly, tap the seat, stand again"]},
{id:"bwsquat",name:"Bodyweight squat",pat:"squat",eq:"",lvl:1,d:{r:12},cues:["Sit back and down to a comfortable depth","Knees track over your toes","Exhale as you stand"]},
{id:"wallsit",name:"Wall sit",pat:"squat",eq:"",lvl:2,d:{h:40},cues:["Slide down until the effort feels 6–7 out of 10","Knees over ankles","Breathe the whole time"],v:V.wallsit},
{id:"goblet",name:"Goblet squat",pat:"squat",eq:"kb|db",lvl:2,d:{r:12},cues:["Weight held at your chest","Sit back and down","Keep your foot arches lifted"],v:V.goblet},
{id:"legpress",name:"Leg press",pat:"squat",eq:"gym",lvl:2,d:{r:12},cues:["Feet high and wide on the plate","Don't let your low back round off the seat","Exhale as you push"],v:V.legpress},
// ---- hinge ----
{id:"hinge",name:"Hip hinge drill",pat:"hinge",eq:"",lvl:1,d:{r:12},cues:["Hands on hips, soft knees","Push hips back until you feel your hamstrings","Squeeze glutes to stand tall"]},
{id:"rdl",name:"Romanian deadlift",pat:"hinge",eq:"kb|db",lvl:2,avoid:["back"],d:{r:12},cues:["Hinge at the hips, soft knees, flat back","Weight stays close to your legs","Squeeze glutes to stand"],v:V.rdl},
{id:"slrdl",name:"Single-leg Romanian deadlift",pat:"hinge",eq:"",lvl:3,avoid:["back"],d:{r:8,side:1},cues:["Hold a wall or chair for balance if needed","Hips stay square to the floor","Reach the back leg long"]},
{id:"hipthrust",name:"Hip thrust machine",pat:"hinge",eq:"gym",lvl:2,d:{r:12},cues:["Chin tucked, ribs down","Squeeze glutes at the top","Exhale up"],v:V.hipthrust},
// ---- glute ----
{id:"bridge",name:"Glute bridge",pat:"glute",eq:"",lvl:1,avoid:["floor"],d:{r:15},cues:["Feet flat, hip-width apart","Push through heels, squeeze glutes","Ribs stay down"],v:V.bridge},
{id:"bandbridge",name:"Banded glute bridge",pat:"glute",eq:"band",lvl:2,avoid:["floor"],d:{r:15},cues:["Band above knees, push knees out","Exhale up, pause at the top"],v:V.bandBridge},
{id:"slbridge",name:"Single-leg glute bridge",pat:"glute",eq:"",lvl:3,avoid:["floor"],d:{r:10,side:1},cues:["One foot planted, other knee to chest","Hips stay level"]},
{id:"clam",name:"Banded clamshell",pat:"glute",eq:"band",lvl:1,avoid:["floor"],d:{r:15,side:1},cues:["Heels together","Don't roll your hips back"],v:V.clam},
{id:"standabd",name:"Standing side leg raise",pat:"glute",eq:"",lvl:1,d:{r:12,side:1},cues:["Hold a chair, stand tall","Lift the leg out to the side, toes forward","Slow on the way down"]},
{id:"latwalk",name:"Banded lateral walk",pat:"glute",eq:"band",lvl:2,d:{r:10,side:1},cues:["Stay low, toes forward","Keep the band tight"],v:V.latwalk},
{id:"abduct",name:"Hip abduction machine",pat:"glute",eq:"gym",lvl:2,d:{r:15},cues:["Slow out, slow back"],v:V.abduct},
// ---- lunge ----
{id:"supsplit",name:"Supported split squat",pat:"lunge",eq:"",lvl:1,avoid:["knee"],d:{r:8,side:1},cues:["Hold a chair or wall","Drop the back knee a few inches, straight down","Front knee tracks over your second toe"]},
{id:"stepup",name:"Step-up",pat:"lunge",eq:"",lvl:2,avoid:["knee"],d:{r:8,side:1},cues:["Use a sturdy step or the bottom stair","Push through the whole front foot","Step down slowly"]},
{id:"splitiso",name:"Split squat hold",pat:"lunge",eq:"",lvl:2,avoid:["knee"],d:{h:30,side:1},cues:["Back knee a few inches off the floor","Weight through the front foot's big toe"],v:V.splitiso},
{id:"revlunge",name:"Reverse lunge",pat:"lunge",eq:"",lvl:3,avoid:["knee"],d:{r:8,side:1},cues:["Step back, lower with control","Front knee tracks over your second toe"],v:V.lunge},
// ---- push ----
{id:"wallpush",name:"Wall push-up",pat:"push",eq:"",lvl:1,d:{r:12},cues:["Hands on the wall at chest height","Body in one line","Lower your chest toward the wall"]},
{id:"bandpress",name:"Band chest press",pat:"push",eq:"tube",lvl:1,d:{r:12},cues:["Band anchored behind you at chest height","Press forward, don't shrug"]},
{id:"inclinepush",name:"Incline push-up",pat:"push",eq:"",lvl:2,avoid:["wrist","shoulder"],d:{r:10},cues:["Hands on a counter or sturdy table","Body in one line, elbows at about 45°"]},
{id:"floorpress",name:"Dumbbell floor press",pat:"push",eq:"db",lvl:2,avoid:["floor","shoulder"],d:{r:12},cues:["Lie on your back, knees bent","Press up, lower until elbows touch the floor"]},
{id:"chestpress",name:"Chest press machine",pat:"push",eq:"gym",lvl:2,d:{r:12},cues:["Handles at mid-chest","Shoulders down and back"]},
{id:"kneepush",name:"Knee push-up",pat:"push",eq:"",lvl:3,avoid:["wrist","shoulder","floor","core"],d:{r:8},cues:["Knees down, body straight from knees to head","Stop if your belly domes"]},
// ---- pull ----
{id:"pullapart",name:"Band pull-apart",pat:"pull",eq:"band|tube",lvl:1,d:{r:15},cues:["Arms straight at chest height","Shoulder blades together and down"],v:V.pullapart},
{id:"bandrow",name:"Band row",pat:"pull",eq:"tube",lvl:1,d:{r:12},cues:["Band anchored at chest height","Pull elbows back to your ribs","Shoulders stay down"]},
{id:"dbrow",name:"Supported dumbbell row",pat:"pull",eq:"db|kb",lvl:2,d:{r:12,side:1},cues:["One hand on a chair or bench","Pull elbow to hip","Flat back"],v:V.row},
{id:"bandface",name:"Band face pull",pat:"pull",eq:"tube",lvl:2,d:{r:15},cues:["Pull toward your eyes, elbows high","Finish like a goalpost"],v:V.bandface},
{id:"cablerow",name:"Seated cable row",pat:"pull",eq:"gym",lvl:2,d:{r:12},cues:["Tall chest, pull to belly","Shoulders down and back"],v:V.cablerow},
{id:"pulldown",name:"Lat pulldown",pat:"pull",eq:"gym",lvl:2,d:{r:12},cues:["Bar to upper chest","Don't lean way back"],v:V.pulldown},
{id:"towelpull",name:"Towel pull-apart hold",pat:"pull",eq:"",lvl:1,d:{h:30},cues:["Hold a towel at chest height, arms straight","Pull the ends apart as hard as you can","Shoulder blades squeeze together and down"]},
{id:"doorrow",name:"Doorframe row",pat:"pull",eq:"",lvl:2,avoid:["shoulder"],d:{r:10,side:1},cues:["Hold the edge of a sturdy door frame, feet close to it","Lean back with a straight arm, then pull your chest to the frame","Keep your body in one line"]},
{id:"cableface",name:"Cable face pull",pat:"pull",eq:"gym",lvl:2,d:{r:15},cues:["Rope to eyes, elbows high"],v:V.cableface},
// ---- posture ----
{id:"chinwall",name:"Chin tucks on the wall",pat:"posture",eq:"",lvl:1,d:{r:10},cues:["Back of head to the wall","Glide chin straight back, don't tip down","Hold each for 5 seconds"],v:V.chinwall},
{id:"wallangel",name:"Wall angel",pat:"posture",eq:"",lvl:1,d:{r:10},cues:["Head, back and arms stay on the wall","Move slowly"],v:V.wallangel},
{id:"wraise",name:"Standing W squeeze",pat:"posture",eq:"",lvl:1,d:{r:12},cues:["Stand tall, elbows bent into a W","Squeeze shoulder blades back and down, hold 2 seconds","Keep your ribs down, don't arch your back"]},
{id:"yt",name:"Prone Y–T raise",pat:"posture",eq:"",lvl:2,avoid:["floor"],d:{r:8},cues:["Forehead on a folded towel, chin tucked","Thumbs up, lift arms a few inches","Do the Y, then the T"],v:V.yt},
// ---- core ----
{id:"standmarch",name:"Standing march with brace",pat:"core",eq:"",lvl:1,d:{h:40},cues:["Stand tall, brace like you're about to cough","Slow high knees, don't lean back"]},
{id:"deadbug",name:"Dead bug",pat:"core",eq:"",lvl:1,avoid:["floor"],d:{r:8,side:1},cues:["Low back gently down","Reach opposite arm and leg long","Exhale as you reach"],v:V.deadbug},
{id:"birddog",name:"Bird dog",pat:"core",eq:"",lvl:1,avoid:["floor","wrist"],d:{r:8,side:1},cues:["Back flat, core braced","Reach long, don't lift high","Pause 3 seconds each rep"],v:V.birddog},
{id:"pallof",name:"Pallof press",pat:"core",eq:"tube|gym",lvl:2,d:{r:10,side:1},cues:["Band or cable to your side at chest height","Press out and resist the twist","Breathe out as you press"],v:V.pallof},
{id:"suitcase",name:"Suitcase carry",pat:"core",eq:"db|kb",lvl:2,d:{h:40,side:1},cues:["Weight in one hand, walk tall","Don't lean toward or away from the weight"]},
{id:"sideplank",name:"Side plank from knees",pat:"core",eq:"",lvl:2,avoid:["floor","shoulder"],d:{h:25,side:1},cues:["Hips stacked, body in a line","Top arm up or on your hip"],v:V.sideplank},
{id:"plank",name:"Forearm plank",pat:"core",eq:"",lvl:3,avoid:["floor","core","shoulder"],d:{h:30},cues:["Elbows under shoulders","Squeeze glutes, ribs down","Stop if your belly domes"]},
// ---- foot finisher ----
{id:"shortfoot",name:"Short foot",pat:"foot",eq:"",lvl:1,d:{r:10},cues:["Seated, pull the ball of the foot toward the heel","Arch lifts, toes stay long (no curling)","Hold each for 5 seconds"],v:V.shortfoot},
{id:"toeyoga",name:"Toe yoga",pat:"foot",eq:"",lvl:1,d:{r:10},cues:["Lift only the big toe, others down","Then lift the others, big toe down"],v:V.toeyoga},
{id:"bigtoe",name:"Big-toe band pull",pat:"foot",eq:"band",lvl:1,d:{r:15},cues:["Band around both big toes, heels together","Pull big toes apart"],v:V.bigtoe},
{id:"heelraise",name:"Slow heel raises",pat:"foot",eq:"",lvl:1,d:{r:12},cues:["Hold the wall","Weight over the big toe, don't roll out"],v:V.heelraise},
// ---- cool-down / mobility ----
{id:"doorway",name:"Doorway chest stretch",pat:"stretch",eq:"",lvl:1,avoid:["shoulder"],d:{h:30,side:1},cues:["Forearm on the frame, step through gently"],v:V.doorway,for:["U","F"]},
{id:"thoracic",name:"Thoracic extension over towel",pat:"stretch",eq:"",lvl:1,avoid:["floor"],d:{t:60},cues:["Rolled towel across your mid-back","Hands behind head, let your chest open","Slow breaths"],v:V.thoracic,for:["U","C"]},
{id:"chinsupine",name:"Lying chin tuck",pat:"stretch",eq:"",lvl:1,avoid:["floor"],d:{r:10},cues:["Nod and press your head gently into the mat"],v:V.chinsupine,for:["U"]},
{id:"catcow",name:"Cat-cow",pat:"stretch",eq:"",lvl:1,avoid:["floor","wrist"],d:{r:8},cues:["Move with your breath"],v:V.catcow,for:["C","F","L"]},
{id:"child",name:"Child's pose",pat:"stretch",eq:"",lvl:1,avoid:["floor","knee"],d:{t:60},cues:["Knees wide, arms long","Slow breathing"],v:V.child,for:["L","C","F"]},
{id:"ham",name:"Seated hamstring stretch",pat:"stretch",eq:"",lvl:1,d:{h:30,side:1},cues:["Sit at the edge of a chair, one leg straight","Hinge forward with a flat back"],for:["L","F"]},
{id:"fig4",name:"Seated figure-4 stretch",pat:"stretch",eq:"",lvl:1,d:{h:30,side:1},cues:["Ankle over the opposite knee","Sit tall and lean forward gently"],for:["L","C"]},
{id:"hipflex",name:"Half-kneeling hip flexor stretch",pat:"stretch",eq:"",lvl:1,avoid:["floor","knee"],d:{h:30,side:1},cues:["Cushion under the back knee","Squeeze the back glute, tuck your pelvis"],for:["L","F"]},
{id:"necktilt",name:"Gentle neck side stretch",pat:"stretch",eq:"",lvl:1,d:{h:20,side:1},cues:["Ear toward shoulder, no pulling","Opposite shoulder stays down"],for:["U"]}
];

// Warm-ups by session focus. Two cards each; the 10-minute version uses only the first.
const WARM={
  L:[{name:"March in place",d:{t:120},cues:["Easy pace, swing your arms"]},{name:"Squats + leg swings",d:{r:10},cues:["10 slow squats, then 10 leg swings each side"]}],
  U:[{name:"March + arm circles",d:{t:120},cues:["Big slow circles, both directions"]},{name:"Chin tucks + shoulder rolls",d:{r:10},cues:["Glide chin back","Roll shoulders up, back and down"]}],
  F:[{name:"March in place",d:{t:120},cues:["Easy pace, swing your arms"]},{name:"Squats + arm circles",d:{r:10},cues:["10 slow squats, then 10 circles each way"]}],
  C:[{name:"March in place",d:{t:120},cues:["Easy pace, tall posture"]},{name:"Hip circles + side bends",d:{r:8},cues:["8 circles each way, 8 side bends each side"]}]
};

window.SC=window.SC||{};
Object.assign(window.SC,{EXERCISES:X,WARM});
})();
