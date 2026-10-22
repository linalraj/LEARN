// ===== voice (browser speech; needs Chrome/Android and mic permission) =====
function say(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="en-IN";speechSynthesis.speak(u)}catch(e){toast("Voice output is not supported here")}}
function hear(cb){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("Voice input is not supported here. Type instead.");const r=new R();r.lang="en-IN";r.onresult=e=>cb(e.results[0][0].transcript);r.onerror=()=>toast("Could not hear you. Try again.");r.start();toast("Listening…")}
function vtype(){hear(t=>{G.u.v=t.toLowerCase().replace(/[^a-z0-9 ]/g,"");LV()})}
function skp(){G.done++;G.q.shift();sv();if(!G.q.length)return fin();ini();LV()}
function sv(){S.res={key:G.key,si:G.si,k:G.k,i:G.i,ph:G.ph,ls:G.ls,q:G.q,done:G.done,h:G.h};save()}
// learn first, then game; progress is saved so the student resumes where they stopped
function begin(si,k,i,data){$("ts").style.display="none";LRN=data.LRN;LES=data.LES;const key=SUBJ[si].c+"|"+k+"|"+i;
 if(S.res&&S.res.key==key&&S.res.q&&S.res.q.length&&Math.max(...S.res.q)<LES.length){G={...S.res,n:LES.length,ps:0};toast("Continuing where you stopped")}
 else G={key,si,k,i,ph:"L",ls:0,ps:0,q:LES.map((_,j)=>j),n:LES.length,done:0,h:5};
 if(G.ph=="L")return G.ls>0?nxs(G.ls):LN();ini();LV()}
function nxs(l){G.ls=l;if(l==1)G.c2=LRN.s.map(x=>({o:sh(x[1]),a:x[1][0],v:null}));if(l==2){G.p3=sh(LRN.o);G.s3=[]}sv();LN()}
function strt(){G.ph="G";G.ls=3;sv();ini();LV()}
const lessonHead=(back,mid,end)=>`<header class="top lhead"><button class="av" onclick="${back}" aria-label="Close">${IC("x",18,2.2)}</button>${mid}${end}</header>`;
function LN(){const L=LRN,st=G.ls,F=h=>`<div class="ft">${h}</div>`;let b,ft;
 if(st==0){const c=L.c[G.ps],n=L.c.length,pic=`<figure class="limg"><span class="ph">${IC("image",32,1.6)}</span>${c[3]?`<img src="${esc(c[3])}" alt="${esc(c[0])}" loading="lazy" onerror="this.remove()">`:""}${c[3]&&c[4]?`<figcaption>${esc(c[4])}</figcaption>`:""}</figure>`,
  pts=String(c[1]).split(/(?<=[.!?])\s+/).filter(x=>x.trim());
  b=`<div class="lkick">${esc(L.t)} · Concept ${G.ps+1} of ${n}</div><h2>${esc(c[0])}</h2>${pic}<ul class="lbul">${pts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="lkey"><i>${IC("sparkle",18)}</i><div><small>Remember</small><b>${esc(c[2])}</b></div></div><button class="btn s" onclick="say(LRN.c[${G.ps}][0]+'. '+LRN.c[${G.ps}][1])">${IC("volume",18)} Listen</button>`;ft=F(`<div class="dots">${L.c.map((_,j)=>`<i class="${j==G.ps?"on":j<G.ps?"d":""}"></i>`).join("")}</div><button class="btn" style="margin:8px 0 0" onclick="G.ps<${L.c.length-1}?(G.ps++,LN()):nxs(1)">Continue</button>`)} if(st==1){const all=G.c2.every(x=>x.v),ok=G.c2.every(x=>x.ck&&x.v==x.a);b=`<h2>Skill check</h2><p class="sm">Pick the right answer for each question.</p>`+G.c2.map((x,i)=>`<div class="card"><b>${esc(L.s[i][0])}</b>${x.o.map((o,j)=>`<button class="opt ${x.v==o?(x.ck?(o==x.a?"ok":"no"):"sel"):""}" onclick="G.c2[${i}].v=G.c2[${i}].o[${j}];G.c2[${i}].ck=0;LN()">${esc(o)}</button>`).join("")}</div>`).join("");
  ft=ok?`<div class="ft ok"><b>All correct</b><button class="btn" onclick="nxs(2)">Continue</button></div>`:F(`<button class="btn" style="margin:0" ${all?"":"disabled"} onclick="G.c2.forEach(x=>x.ck=1);LN()">Check</button>`)}
 if(st==2){const s=G.s3,n=L.o.length,full=s.length==n,ok=full&&s.every((x,i)=>x==L.o[i]);b=`<h2>Build the sequence</h2><p class="sm">Tap the steps in the order they happen. Tap a placed step to remove it.</p><div class="card" style="min-height:64px">${s.map((x,i)=>`<div class="lp" onclick="G.s3.splice(${i},1);LN()"><i>${i+1}</i><span>${esc(x)}</span></div>`).join("")||'<span class="sm">Your sequence appears here</span>'}</div>${G.p3.map((x,i)=>s.includes(x)?"":`<button class="opt" onclick="G.s3.push(G.p3[${i}]);LN()">${esc(x)}</button>`).join("")}`;
  ft=ok?`<div class="ft ok"><b>Sequence correct</b><button class="btn" onclick="strt()">Start the game</button></div>`:full?`<div class="ft no"><b>Not quite. Try again.</b><button class="btn" onclick="G.s3=[];LN()">Reset</button></div>`:F(`<button class="btn" style="margin:0" disabled>Place all ${n} steps</button>`)}
 shell(b,{head:lessonHead("go('theory')",`<div class="bar" style="flex:1;margin:0"><i style="width:${(st+1)/3*100}%"></i></div>`,`<b class="lstep">${st+1}/3 · ${["Guided","Skill check","Build"][st]}</b>`),foot:ft})}
// ===== Duolingo-style lesson =====
function ini(){const it=LES[G.q[0]];G.r=null;G.u={sel:[],v:"",a:null,m:{}};
 if(it.k=="bank"||it.k=="listen")G.u.pool=sh([...it.a.split(" "),...it.x]).map((w,i)=>({w,i}));
 if(it.k=="match"){G.u.L=sh(it.p.map((_,i)=>i));G.u.R=sh(it.p.map((_,i)=>i))}if(it.k=="listen")setTimeout(()=>say(it.a),400)}
function LV(){const it=LES[G.q[0]],u=G.u;let b="",rd=true;
 if(it.k=="match"){rd=false;b=`<div class="q">Tap the matching pairs</div><div class="row" style="align-items:flex-start"><div style="flex:1">${u.L.map((p,j)=>`<button class="opt ${u.m[p]?"ok":u.a===j?"sel":""}" ${u.m[p]?"disabled":""} onclick="mL(${j})">${esc(it.p[p][0])}</button>`).join("")}</div><div style="flex:1">${u.R.map((p,j)=>`<button class="opt ${u.m[p]?"ok":""}" ${u.m[p]?"disabled":""} onclick="mR(${j})">${esc(it.p[p][1])}</button>`).join("")}</div></div>`}
 if(it.k=="bank"||it.k=="listen"){rd=u.sel.length>0;b=`<div class="q">${esc(it.q||"Tap what you hear")}</div>${it.k=="listen"?`<button class="tile" onclick="say(LES[G.q[0]].a)">${IC("volume",17)} Play</button>`:""}<div class="ans">${u.sel.map(i=>`<button class="tile" onclick="bk(${i},0)">${esc(u.pool[i].w)}</button>`).join("")}</div><div>${u.pool.map(o=>`<button class="tile ${u.sel.includes(o.i)?"gh":""}" onclick="bk(${o.i},1)">${esc(o.w)}</button>`).join("")}</div>`}
 if(it.k=="fill"){rd=!!u.v;b=`<div class="q">${esc(it.q).replace("___",`<u class="bl">${u.v?esc(u.v):"&nbsp;"}</u>`)}</div>${it.o.map((o,j)=>`<button class="tile ${u.v==o?"sel":""}" onclick="G.u.v=LES[G.q[0]].o[${j}];LV()">${esc(o)}</button>`).join("")}`}
 if(it.k=="type")b=`<div class="q">${esc(it.q)}</div><input id="ti" placeholder="Type your answer" value="${esc(u.v)}" oninput="G.u.v=this.value"><button class="btn s" onclick="vtype()">${IC("mic",18)} Answer by voice</button>`;
 if(it.k=="speak"){rd=false;b=`<div class="q">Say this sentence out loud</div><div class="card c" style="font-size:19px">${esc(it.a)}</div><button class="btn" onclick="hear(t=>{G.u.v=t;ck()})">${IC("mic",18)} Tap and speak</button><button class="btn s" onclick="skp()">Cannot speak now</button>`}
 if(it.k=="tf"){rd=u.a!=null;b=`<div class="q">True or false?</div><div class="card tfcard"><p>${esc(it.q)}</p></div><button class="opt ${u.a===1?"sel":""}" onclick="G.u.a=1;LV()">True</button><button class="opt ${u.a===0?"sel":""}" onclick="G.u.a=0;LV()">False</button>`}
 if(it.k=="pick"){rd=u.a!=null;b=`<div class="q">${esc(it.q)}</div>${it.o.map((o,j)=>`<button class="opt ${u.a===j?"sel":""}" onclick="G.u.a=${j};LV()">${esc(o)}</button>`).join("")}`}
 const ft=G.r?`<div class="ft ${G.r.ok?"ok":"no"}"><b>${G.r.ok?"Correct":"Correct answer:"}</b><div style="margin-top:4px">${G.r.ok?"":esc(G.r.ans)}</div><button class="btn" onclick="nx()">Continue</button></div>`:`<div class="ft"><button class="btn" style="margin:0" ${rd?"":"disabled"} onclick="ck()">${it.k=="match"?"Match all pairs":it.k=="speak"?"Speak to continue":"Check"}</button></div>`;
 shell(`${b}${it.q?`<button class="btn s" onclick="say(LES[G.q[0]].q.replace('___','blank'))">${IC("volume",18)} Read aloud</button>`:""}<button class="btn s" onclick="doubt()">${IC("help",18)} I have a doubt</button>`,{head:lessonHead("go('theory')",`<div class="bar" style="flex:1;margin:0"><i style="width:${G.done/G.n*100}%"></i></div>`,`<b class="lives">${IC("heart",18)} ${G.h}</b>`),foot:ft})}
function bk(i,add){const s=G.u.sel;if(add){if(!s.includes(i))s.push(i)}else G.u.sel=s.filter(x=>x!=i);LV()}
function mL(j){G.u.a=j;LV()}
function mR(j){const u=G.u,it=LES[G.q[0]];if(u.a==null)return;
 if(u.L[u.a]==u.R[j]){u.m[u.R[j]]=1;if(Object.keys(u.m).length==it.p.length)G.r={ok:true}}else{G.h--;if(G.h<=0)return fail();toast("Not a match")}u.a=null;LV()}
function ck(){const it=LES[G.q[0]],u=G.u;let ok,ans;
 if(it.k=="bank"||it.k=="listen"){ans=it.a;ok=u.sel.map(i=>u.pool[i].w).join(" ")==ans}
 if(it.k=="speak"){ans=it.a;const n=s=>s.toLowerCase().replace(/[^a-z ]/g,"").split(" "),a=n(it.a),h=n(u.v);ok=a.filter(w=>h.includes(w)).length/a.length>=.7}
 if(it.k=="fill"){ans=it.a;ok=u.v==ans}
 if(it.k=="type"){ans=it.a[0];ok=it.a.includes(u.v.trim().toLowerCase().replace(/[.!?,;:]+$/,""))}
 if(it.k=="pick"){ans=it.o[it.a];ok=u.a==it.a}
 if(it.k=="tf"){ans=it.a?"True":"False";ok=(u.a===1)===it.a}
 if(!ok){G.h--;if(G.h<=0)return fail()}G.r={ok,ans};LV()}
function nx(){if(G.r.ok){G.done++;G.q.shift()}else G.q.push(G.q.shift());sv();if(!G.q.length)return fin();ini();LV()}
const resultPage=(ic,cls,h,p,btns)=>shell(`<div class="result"><i class="res-ic ${cls}">${IC(ic,40,1.8)}</i><h2 class="c">${h}</h2><p class="sm c" style="margin:8px 0 18px">${p}</p>${btns}</div>`,{nobar:1,nonav:1});
function fail(){S.res={key:G.key,si:G.si,k:G.k,i:G.i,ph:"G",ls:3,q:LES.map((_,j)=>j),done:0,h:5};save();resultPage("xcircle","bad","Out of hearts","Review the lecture notes and try again.",`<button class="btn" onclick="lvl(${G.si},'${G.k}',${G.i})">Try again</button><button class="btn s" onclick="go('theory')">Back to path</button>`)}
// Completing a level is what counts towards the day streak (opening the app never does).
function fin(){const s=SUBJ[G.si],ix=G.k=="P"?1:0,p=pr(s).slice();p[ix]=Math.max(p[ix],G.i+1);S.pr[s.c]=p;S.pts+=20;S.res=null;weeklyXp(20);recordCompletedActivity("level");save();
 resultPage("award","good",`Level ${G.i+1} complete`,`+20 points · ${G.h} ${IC("heart",13)} left · ${streakNow()} day streak`,`<button class="btn" onclick="go('${G.k=="P"?"practical":"theory"}')">Continue</button>`)}
// ===== doubts =====
function doubt(){const s=SUBJ[G.si];shell(`<p class="sm">${s.c} · ${G.k=="P"?"Practical":"Theory"} level ${G.i+1}</p><textarea id="dt" rows="5" placeholder="Type your doubt about this question…"></textarea><button class="btn" onclick="sendD()">Send to teacher</button>`,{head:lessonHead("LV()",`<b style="flex:1;text-align:center">Ask your teacher</b>`,`<span style="width:38px"></span>`),nonav:1})}
function sendD(){const t=$("dt").value.trim();if(!t)return;S.doubts.unshift({t,lv:SUBJ[G.si].c+" · "+(G.k=="P"?"Practical ":"Theory ")+(G.i+1),st:"Sent to teacher"});save();toast("Doubt sent to your teacher");LV()}
function doubts(){shell(`<div class="row" style="justify-content:flex-start;gap:10px"><button class="av" onclick="go('profile')" aria-label="Back">${IC("back",18,2.2)}</button><h3>My doubts</h3></div>${S.doubts.map(d=>`<div class="card"><span class="pill">${esc(d.lv)}</span><p style="margin:6px 0">${esc(d.t)}</p><div class="sm">${esc(d.r||d.st)}</div></div>`).join("")||'<p class="sm">No doubts yet.</p>'}`)}
