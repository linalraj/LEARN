// ===== course detail (current stage) =====
const COURSE_TABS=[["ov","Overview"],["ln","Lecture Notes"],["as","Assignment"],["rs","Resource"],["mt","Mock Test"]];
const courseTabsHTML=(cur,fn)=>`<div class="utabs" role="tablist">${COURSE_TABS.map(x=>`<button role="tab" class="${cur==x[0]?"on":""}" onclick="${fn(x[0])}">${x[1]}</button>`).join("")}</div>`;
function course(){const s=SUBJ[S.cs],t=pr(s)[0],p=pct(s),st=[t-1,t,t+1,t+2].filter(i=>i>=0&&i<nT(s));
 const resources=(S.resources||[]).filter(m=>m.c===s.c&&m.visible!==false),assignments=(S.asg||[]).filter(a=>a.c===s.c),tests=(S.mockTests||[]).filter(a=>a.c===s.c);
 shell(`<div class="ban" style="--c:${TH[s.c][1]}">${bd(s,64)}</div>
 <div class="row2"><div><b class="cname">${s.c}</b><div class="sm">${esc(s.n)}</div></div><button class="chat-icon-btn" onclick="studentCourseChat('${s.c}')" aria-label="Open course messages" title="Messages">${IC("message",21)}</button></div>
 <div class="bar"><i style="width:${p}%"></i></div><div class="sm">${p}% complete</div>
 ${courseTabsHTML(ct,k=>`ct='${k}';render()`)}
 ${ct=="ov"?`<h3 class="sec">Learning path</h3>`+st.map(i=>`<div class="lp" onclick="lvl(${S.cs},'T',${i})"><i class="${i<t?"d":i==t?"c":""}">${i<t?IC("check",16,2.5):i+1}</i><span>${esc(tt(s,i))}</span><b class="lp-s">${i<t?IC("check",18,2.2):i==t?(i<op(s)[0]?IC("chev",18,2.2):IC("clock",17)):IC("lock",16)}</b></div>`).join("")+`<button class="btn" onclick="go('theory')">Continue</button>`:
 ct=="ln"?studentResourceList(resources.filter(x=>x.type==="Lecture Notes")):
 ct=="as"?`${assignments.map(a=>`<div class="lp"><i>${IC("clipboard",16)}</i><span>${esc(a.t)}<div class="sm">Due ${a.due||"–"} · ${a.pts||50} points</div>${a.i?`<div class="sm">${esc(a.i)}</div>`:""}</span></div>`).join("")||'<p class="sm empty">No assignments published yet.</p>'}`:
 ct=="rs"?studentResourceList(resources.filter(x=>x.type==="Resource"||x.type==="Reference")):
 `<div class="card"><h3>Mock test</h3>${tests.map(x=>`<div class="lp"><i>${IC("check",16,2.4)}</i><span>${esc(x.title)}<div class="sm">${(x.questions||[]).length} questions</div></span><b class="lp-s">${IC("chev",18,2.2)}</b></div>`).join("")||'<p class="sm">No mock tests published yet.</p>'}<p class="sm" style="margin-top:8px">Staff can upload question files to prepare mock tests. Automatic question generation requires the AI server and review before publishing.</p></div>`}`)}
const lecLabel=m=>{const t=(m.type==="Lecture Notes"||m.type==="Mock Test")&&m.lecture?String(m.lecture):"",r=/^(Theory|Practical)\s+(\d+)$/.exec(t);return r?(r[1]=="Theory"?"LECTURE ":"PRACTICAL ")+r[2]:""};
const lecTag=m=>lecLabel(m)?`<div class="lec-tag">${lecLabel(m)}</div>`:"";
function studentResourceList(items){return items.map(m=>`<div class="lp"><i>${IC("file",16)}</i><span>${esc(m.title)}${lecTag(m)}<div class="sm">${esc(m.type)}${m.fileName?" · "+esc(m.fileName):""}</div>${m.note?`<div class="sm">${esc(m.note)}</div>`:""}${m.fileName?`<button class="pill" onclick="openMaterial(${m.id})">Open file</button>`:""}</span></div>`).join("")||'<p class="sm empty">Your teacher has not added materials here yet.</p>'}
