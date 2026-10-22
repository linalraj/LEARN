// ===== STAFF APP (from the StaffLearn mockup) =====
let sk="T",sf="home",sc="ov",sw="Today";
S.mat=S.mat||[];S.asg=S.asg||[];S.cls=S.cls||[];S.msgs=S.msgs||[];S.groups=S.groups||[];S.resources=S.resources||[];S.mockTests=S.mockTests||[];
// ---- files are kept in IndexedDB on this browser ----
function learnFileDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open("learn-materials",1);r.onupgradeneeded=()=>r.result.createObjectStore("files");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveMaterialFile(id,file){if(!file)return;const db=await learnFileDB();return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").put({name:file.name,type:file.type,blob:file},String(id));tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function openMaterial(id){try{const db=await learnFileDB(),entry=await new Promise((resolve,reject)=>{const r=db.transaction("files").objectStore("files").get(String(id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(!entry)return toast("File is not saved on this browser");const url=URL.createObjectURL(entry.blob);window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){toast("Could not open saved file: "+e.message)}}
// ---- class reminders (best effort: only while the app is open) ----
function checkClassReminders(){if(!S||!S.user||S.user.role!=="staff"||!Array.isArray(S.cls))return;const now=new Date(),day=now.toLocaleDateString("en-US",{weekday:"long"}),time=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0"),stamp=now.toISOString().slice(0,10)+" "+time;for(const c of S.cls){if(!c.notify||!(c.days||[]).includes(day)||c.t!==time)continue;S.reminded=S.reminded||{};const key=c.id+"@"+stamp;if(S.reminded[key])continue;S.reminded[key]=true;save();if("Notification" in window&&Notification.permission==="granted")new Notification("LEARN · Class reminder",{body:`${c.n} · ${c.r||"Room not set"}`});else toast("Class reminder: "+c.n+" · "+(c.r||"Room not set"))}}
if(!window.learnReminderTimer)window.learnReminderTimer=setInterval(checkClassReminders,30000);

const td=()=>new Date().toISOString().slice(0,10),f12=t=>{const[h,m]=t.split(":");return((h%12)||12)+":"+m+" "+(+h<12?"AM":"PM")};
const wkd=()=>new Date().toLocaleDateString("en-US",{weekday:"long"});
const onToday=c=>c.d?c.d===td():(c.days&&c.days.length?c.days.includes(wkd()):true);
const stt=c=>{if(c.d&&c.d>td())return"Upcoming";if(c.d&&c.d<td())return"Done";if(!c.d&&c.days&&c.days.length&&!c.days.includes(wkd()))return"Weekly";const n=new Date(),m=n.getHours()*60+n.getMinutes(),[h,mm]=c.t.split(":"),s=h*60+ +mm;return m>=s&&m<s+60?"Ongoing":m>=s+60?"Done":"Upcoming"};
const SNAV=[["home","home","Home"],["classes","classes","Classes"],["students","students","Students"],["res","resources","Resources"],["messages","message","Messages"]];
const snav=()=>`<nav class="bottom-nav staff-nav">${SNAV.map(x=>`<button class="${sf==x[0]?"on":""}" onclick="sf='${x[0]}';staff()"><b>${IC(x[1],22)}</b><span>${x[2]}</span></button>`).join("")}</nav>`;
const sh2=b=>shell(b,{foot:snav()}),hd=(t,b)=>`<div class="row hdr"><h3>${esc(t)}</h3></div>`;
const bk2=b=>`sf='${b}';staff()`;
const sel=(id,fn)=>`<select id="${id}" ${fn||""}>${SUBJ.map((x,i)=>`<option value="${x.c}" ${i==S.cs?"selected":""}>${x.c} – ${x.n}</option>`).join("")}</select>`;
const clsRow=c=>{const s=SUBJ.find(x=>x.c==c.c)||SUBJ[0],st=stt(c);return `<div class="lp" onclick="openSC('${c.c}')">${bd(s)}<span><b>${esc(c.n)}</b><div class="sm">${f12(c.t)} · Room ${esc(c.r)} · ${esc((c.days||[]).map(d=>d.slice(0,3)).join(", ")||c.d||"Schedule not set")} · Sem ${esc(c.sem)}</div></span><small class="pill ${st=="Ongoing"?"":"P"}">${st}</small><button class="icbtn danger" onclick="event.stopPropagation();delClass(${c.id})" aria-label="Remove class" title="Remove class">${IC("trash",18)}</button></div>`};
function delClass(id){const c=S.cls.find(x=>x.id===id);if(!c||!confirm("Remove this class?\n\n"+c.n+" · "+c.c))return;S.cls=S.cls.filter(x=>x.id!==id);save();toast("Class removed");staff()}
function openSC(c){S.cs=SUBJ.findIndex(x=>x.c==c);sc="ov";sf="course";staff()}
function staff(){
 // Normalize older saved browser state before rendering any staff screen.
 S.doubts=Array.isArray(S.doubts)?S.doubts:[];S.cls=Array.isArray(S.cls)?S.cls:[];S.mat=Array.isArray(S.mat)?S.mat:[];S.asg=Array.isArray(S.asg)?S.asg:[];
 S.msgs=Array.isArray(S.msgs)?S.msgs:[];S.groups=Array.isArray(S.groups)?S.groups:[];S.resources=Array.isArray(S.resources)?S.resources:[];S.mockTests=Array.isArray(S.mockTests)?S.mockTests:[];
 if(!Number.isInteger(S.cs)||S.cs<0||S.cs>=SUBJ.length)S.cs=0;
 if(["home","classes","course","create","upload","assign","students","res","profile","doubts","messages","chat"].indexOf(sf)<0)sf="home";
 tab="home";navTrack();resumeGamePolls();
 const screen={home:sHome,classes:sCls,course:sCourse,create:sCreate,upload:sUp,assign:staffAssignmentScreen,students:sStu,res:sRes,profile:sProfile,doubts:sDb,messages:sMessages,chat:sChat};(screen[sf]||sHome)()}
const greet=()=>{const h=new Date().getHours();return h<12?"Good morning,":h<17?"Good afternoon,":"Good evening,"};
function sHome(){const tc=S.cls.filter(onToday),pend=S.doubts.filter(d=>!d.r).length;
 sh2(`<div class="sm">${greet()}</div><h2>${esc(S.user.name)}</h2><div class="sm" style="margin-bottom:12px">Faculty · ${DEP.replace("Department of ","")}</div>
 <div class="kp"><div class="tilecard kc" onclick="sf='classes';staff()"><i style="background:var(--t-blue);color:var(--f-blue)">${IC("classes",19)}</i><div><small>My classes</small><b>${tc.length} today</b></div></div><div class="tilecard kc" onclick="sf='doubts';staff()"><i style="background:var(--t-yellow);color:var(--f-yellow)">${IC("pending",19)}</i><div><small>Pending doubts</small><b>${pend}</b></div></div></div>
 <h3 class="sec">Quick actions</h3><div class="qa4">${[["create","plus","Add class","var(--t-blue)"],["upload","upload","Upload material","var(--t-green)"],["assign","clipboard","Add assignment","var(--t-yellow)"],["students","chart","View reports","var(--t-purple)"]].map(a=>`<button class="qtile" style="background:${a[3]}" onclick="sf='${a[0]}';staff()">${IC(a[1],24)}<span>${a[2]}</span></button>`).join("")}</div>
 <div class="row"><h3 class="sec">Upcoming classes</h3><a onclick="sf='classes';staff()">View all</a></div>${tc.map(clsRow).join("")||`<p class="sm empty">No classes today.</p><button class="btn s" onclick="sf='create';staff()">${IC("plus",18,2.4)} Add class</button>`}`)}
function sCls(){const w=new Date(Date.now()+6048e5).toISOString().slice(0,10),L=S.cls.filter(c=>sw=="All"||(sw=="Today"?onToday(c):(!c.d||(c.d>=td()&&c.d<=w))));
 sh2(`<div class="row"><h3 class="sec">My classes</h3></div><button class="btn addcls" onclick="sf='create';staff()">${IC("plus",20,2.4)} Add class</button><div class="seg">${["Today","This Week","All"].map(x=>`<button class="${sw==x?"on":""}" onclick="sw='${x}';staff()">${x}</button>`).join("")}</div>${L.map(clsRow).join("")||`<p class="sm empty">No classes here yet.</p>`}`)}
function sCourse(){const s=SUBJ[S.cs],k=sk=="T"?0:1,n=k?17:nT(s),o=op(s)[k],th=TH[s.c],resources=(S.resources||[]).filter(m=>m.c===s.c),assignments=(S.asg||[]).filter(a=>a.c===s.c);
 sh2(`${hd(s.c,bk2("classes"))}<div class="ban" style="--c:${th[1]}">${bd(s,64)}</div><div class="row2"><div><b class="cname">${esc(s.n)}</b><div class="sm">B.Tech · Semester V</div></div><button class="chat-icon-btn" title="Open course messages" aria-label="Open course messages" onclick="openChat('${s.c}')">${IC("message",21)}</button></div>
 ${courseTabsHTML(sc,x=>`sc='${x}';staff()`)}
 ${sc=="ov"?`<div class="seg"><button class="${k?"":"on"}" onclick="sk='T';staff()">Theory</button><button class="${k?"on":""}" onclick="sk='P';staff()">Practical</button></div><p class="sm">Tap a lecture you taught to open it. Students unlock it after finishing the previous level.</p>`+Array.from({length:n},(_,i)=>`<div class="lp" onclick="tog(${i})"><i class="${i<o?"d":""}">${i<o?IC("check",16,2.5):i+1}</i><span>${esc(k?pt(s,i):tt(s,i))}</span><b class="state ${i<o?"open":""}">${i<o?"Open":"Closed"}</b></div>`).join(""):
 sc=="ln"?resourceList(resources.filter(m=>m.type==="Lecture Notes")):
 sc=="as"?`${assignments.map(a=>`<div class="lp"><i>${IC("clipboard",16)}</i><span>${esc(a.t)}<div class="sm">Due ${a.due||"–"} · ${a.pts||50} points</div></span></div>`).join("")||'<p class="sm empty">No assignments published yet.</p>'}`:
 sc=="rs"?resourceList(resources.filter(m=>m.type==="Resource"||m.type==="Reference")):
 `<div class="card"><h3>Mock test</h3><p class="sm">${(S.mockTests||[]).filter(x=>x.c===s.c).length} mock test(s) available.</p>${(S.mockTests||[]).filter(x=>x.c===s.c).map(x=>`<div class="lp"><i>${IC("check",16,2.4)}</i><span>${esc(x.title)}<div class="sm">${(x.questions||[]).length} MCQs · generated ${x.generated?"from uploaded question file":"manually"}</div></span></div>`).join("")||"<p class='sm'>Upload a question file from Resources, Add resource, to prepare a mock test. AI generation requires the server and a configured model.</p>"}</div>`}`)}
const gameTag=m=>{const g=m.game;if(!g)return"";
 if(g.state=="working")return `<div class="gtag work">${IC("sparkle",14)} Creating Level ${m.gi+1} game…</div>`;
 if(g.state=="ready")return `<div class="gtag ok">${IC("check",14,2.4)} Level ${m.gi+1} game ready${g.by?" · "+esc(g.by):""}</div>`;
 return `<div class="gtag bad">${IC("xcircle",14)} Game not created: ${esc(g.msg||"error")} <a onclick="event.stopPropagation();retryGame(${m.id})">Try again</a></div>`};
function resourceList(items){return items.map(m=>`<div class="lp"><i>${IC(m.type==="Assignment"?"clipboard":"file",16)}</i><span>${esc(m.title)}${lecTag(m)}<div class="sm">${esc(m.type)}${m.fileName?" · "+esc(m.fileName):""}</div>${m.note?`<div class="sm">${esc(m.note)}</div>`:""}${m.visible===false?`<div class="sm hid">Hidden from students</div>`:""}${gameTag(m)}${m.fileName?`<button class="pill" onclick="openMaterial(${m.id})">Open file</button>`:""}</span><button class="icbtn eye ${m.visible===false?"off":""}" onclick="toggleVis(${m.id})" aria-label="${m.visible===false?"Show to students":"Hide from students"}" title="${m.visible===false?"Hidden: tap to show to students":"Visible: tap to hide from students"}">${IC(m.visible===false?"eyeoff":"eye",20)}</button></div>`).join("")||'<p class="sm empty">Nothing has been uploaded here yet.</p>'}
function toggleVis(id){const m=(S.resources||[]).find(x=>x.id===id);if(!m)return;m.visible=m.visible===false;save();toast(m.visible?"Now visible to students":"Hidden from students");staff()}
// ---- Level game: the server reads the lecture file, asks a free AI (or its built-in generator) and publishes the game ----
const GAME_POLLS={};
function pollGame(id){const m=(S.resources||[]).find(x=>x.id===id);if(!m||GAME_POLLS[id])return;let tries=0;const t0=Date.now();
 GAME_POLLS[id]=setInterval(async()=>{tries++;const stop=()=>{clearInterval(GAME_POLLS[id]);delete GAME_POLLS[id];save();if(sf=="res"||sf=="course")staff()};
  if(Date.now()-t0>20*60*1000){m.game={state:"error",msg:"timed out"};return stop()}
  try{const r=await API.gameStatus(m.c,m.gk,m.gi),j=r.job;
   if(j&&j.state=="done"){m.game={state:"ready",by:j.provider};toast("Level "+(m.gi+1)+" game is ready for students");stop()}
   else if(j&&j.state=="error"){m.game={state:"error",msg:j.error};stop()}
   else if(!j&&tries>10){m.game={state:"error",msg:"the server did not start the job"};stop()}}catch(e){}},3000)}
async function makeGame(m,file){m.game={state:"working"};save();
 if(!API.token()){m.game={state:"error",msg:"log in again while the server is running"};return}
 try{await API.uploadLecture(m.c,m.gk,m.gi,m.title,file);pollGame(m.id)}catch(e){m.game={state:"error",msg:e.message==="Failed to fetch"?"server not reachable":e.message}}}
async function retryGame(id){const m=(S.resources||[]).find(x=>x.id===id);if(!m)return;m.game={state:"working"};save();staff();
 try{await API.regenerate(m.c,m.gk,m.gi);pollGame(id)}catch(e){m.game={state:"error",msg:e.message};save();staff()}}
function resumeGamePolls(){(S.resources||[]).forEach(m=>{if(m.game&&m.game.state=="working"&&API.token())pollGame(m.id)})}
// ---- create class: search course -> department -> days -> room -> notify me -> create ----
function sCreate(){sh2(`${hd("Create class",bk2("home"))}<label class="sm">Class name (optional)</label><input id="f_n" placeholder="Defaults to the course name">
 <label class="sm">Course</label><input id="f_q" type="search" placeholder="Search course by code or name" oninput="filterCourses()">${sel("f_c")}
 <label class="sm">Department</label><input id="f_dep" value="${DEP.replace(/"/g,"&quot;")}" placeholder="Department name">
 <label class="sm">Semester</label><select id="f_s">${["I","II","III","IV","V","VI","VII","VIII"].map(x=>`<option ${x=="V"?"selected":""}>${x}</option>`).join("")}</select>
 <label class="sm">Days of the week (select all that apply)</label><div class="days">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d=>`<label class="daychip"><input type="checkbox" name="f_days" value="${d}"><span>${d.slice(0,3)}</span></label>`).join("")}</div>
 <div class="row2f"><div><label class="sm">Class time</label><input id="f_t" type="time" value="10:00"></div><div><label class="sm">Classroom number</label><input id="f_r" placeholder="e.g. LH-12"></div></div>
 <label class="check"><input id="f_nf" type="checkbox" checked><span>Notify me at class time</span></label><button class="btn" onclick="mkC()">Create class</button>`)}
function filterCourses(){const q=($("f_q").value||"").toLowerCase(),s=$("f_c"),cur=s.value;s.innerHTML=SUBJ.filter(x=>(x.c+" "+x.n).toLowerCase().includes(q)).map(x=>`<option value="${x.c}" ${x.c==cur?"selected":""}>${x.c} – ${x.n}</option>`).join("")||'<option value="">No matching course</option>'}
function mkC(){const g=i=>($("f_"+i)?$("f_"+i).value:"").trim(),days=[...document.querySelectorAll('input[name="f_days"]:checked')].map(x=>x.value),code=g("c");
 if(!code)return toast("Select a course");if(!days.length)return toast("Select at least one class day");
 const sub=SUBJ.find(x=>x.c==code),c={id:Date.now(),n:g("n")||sub.n,c:code,sem:g("s"),dep:g("dep")||DEP,d:"",days,t:g("t")||"10:00",r:g("r")||"–",notify:$("f_nf").checked};
 S.cls.push(c);save();if(c.notify&&"Notification" in window&&Notification.permission==="default")Notification.requestPermission();
 toast("Class created"+(c.notify?" · reminder works while this app is open":""));sw="All";sf="classes";staff()}
// ---- add course material: file (optional) -> course -> type -> note (goes to course messages) ----
function sUp(){const s=SUBJ[S.cs];sh2(`${hd("Add course material",bk2("home"))}<div class="card c dropzone"><i class="big-ic">${IC("upload",30)}</i><p class="sm">Choose a file (optional). PDF, PPT/PPTX, DOC/DOCX, TXT, image or video.</p><input id="f_f" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.mp4,.webm"></div>
 <label class="sm">Course</label>${sel("f_c","onchange=\"lecFor(this.value)\"")}
 <label class="sm">Material type</label><select id="f_k" onchange="toggleAssignFields()"><option>Lecture Notes</option><option>Assignment</option><option>Resource</option><option>Mock Test</option></select>
 <label class="sm">Title</label><input id="f_t" placeholder="Enter a title (required)">
 <div id="lectureWrap"><label class="sm">Lecture / level</label><select id="f_l">${lecOptions(s)}</select></div>
 <div id="assignWrap" style="display:none"><label class="sm">Due date (optional)</label><input id="f_due" type="date"><label class="sm">Points</label><input id="f_pts" type="number" min="1" value="50"></div>
 <label class="sm">Note to students (optional)</label><textarea id="f_note" rows="3" placeholder="Anything you want to convey. This is sent to the course messages."></textarea>
 <label class="check"><input id="f_v" type="checkbox" checked><span>Visible to students</span></label><label class="check" id="f_gw"><input id="f_g" type="checkbox" checked><span>Create the Level game from these lecture notes (free AI; needs the server)</span></label>
 <button class="btn" onclick="mkU()">Save and publish</button><p class="sm">PPTX, PDF, DOCX, TXT or MD files can become a game: the notes are turned into learning cards with pictures, then Duolingo-style exercises. Games appear for students when ready (about a minute).</p>`)}
const lecOptions=s=>Array.from({length:nT(s)},(_,i)=>`<option value="Theory ${i+1}">Level ${i+1} · ${esc(tt(s,i))}</option>`).join("")+Array.from({length:17},(_,i)=>`<option value="Practical ${i+1}">Practical ${i+1} · ${esc(pt(s,i))}</option>`).join("");
function lecFor(code){const i=SUBJ.findIndex(x=>x.c==code);if(i<0)return;S.cs=i;$("f_l").innerHTML=lecOptions(SUBJ[i])}
function toggleAssignFields(){const k=$("f_k").value;$("f_gw").style.display=k==="Lecture Notes"?"flex":"none";$("assignWrap").style.display=k==="Assignment"?"block":"none";$("lectureWrap").style.display=(k==="Lecture Notes"||k==="Mock Test")?"block":"none"}
async function mkU(){const g=i=>($("f_"+i)?$("f_"+i).value:"").trim(),f=$("f_f").files[0],type=g("k"),title=g("t");if(!title)return toast("Enter a title");
 const hasLec=type==="Lecture Notes"||type==="Mock Test",item={id:Date.now(),c:g("c"),type,title,lecture:hasLec?g("l"):"",fileName:f?f.name:"",fileSize:f?f.size:0,note:g("note"),visible:$("f_v").checked,generated:false,created:new Date().toISOString(),due:g("due"),pts:g("pts")||50};
 S.resources=S.resources||[];S.resources.push(item);
 if(f){try{await saveMaterialFile(item.id,f)}catch(e){toast("Browser storage failed: "+e.message);return}}
 if(type==="Assignment"){S.asg=S.asg||[];S.asg.push({c:item.c,t:title,i:item.note,due:item.due,pts:item.pts,fileName:item.fileName})}
 if(type==="Mock Test"){S.mockTests=S.mockTests||[];S.mockTests.push({c:item.c,title,questions:[],generated:false,source:item.fileName})}
 if(item.note){S.msgs=S.msgs||[];S.msgs.push({id:Date.now()+1,c:item.c,group:item.c,from:S.user.name,text:item.note,created:new Date().toISOString(),kind:"announcement"})}
 const lm2=/^(Theory|Practical) (\d+)$/.exec(item.lecture||"");
 if(type==="Lecture Notes"&&f&&$("f_g").checked&&lm2){item.gk=lm2[1]=="Theory"?"T":"P";item.gi=+lm2[2]-1;await makeGame(item,f)}
 save();toast((f?"File saved: "+f.name+". ":"Text-only item saved. ")+"Course item published"+(item.note?"; note sent to course messages.":".")+(item.game&&item.game.state=="working"?" The Level game is being created.":""));sf="res";staff()}
function staffAssignmentScreen(){sh2(`${hd("Add assignment",bk2("home"))}<label class="sm">Course</label>${sel("f_c","onchange=\"S.cs=SUBJ.findIndex(x=>x.c==this.value)\"")}<label class="sm">Assignment title</label><input id="asg_title" placeholder="Enter assignment title"><label class="sm">Instructions (optional)</label><textarea id="asg_note" rows="4" placeholder="Describe the task for students"></textarea><label class="sm">Due date (optional)</label><input id="asg_due" type="date"><label class="sm">Points</label><input id="asg_pts" type="number" min="1" value="50"><button class="btn" onclick="saveAssignment()">Publish assignment</button>`)}
function saveAssignment(){const title=$("asg_title").value.trim();if(!title)return toast("Enter an assignment title");const c=$("f_c").value;S.asg.push({c,t:title,i:$("asg_note").value.trim(),due:$("asg_due").value,pts:$("asg_pts").value||50});save();toast("Assignment published");sf="res";window.resFilter="Assignment";staff()}
function sStu(){const R=[["A. Aravind",92],["Priya M",88],["Karthik D",76],["Meena S",68],["Suresh R",65],["Divya K",58]];
 sh2(`<h3 class="sec">Student performance</h3>${sel("f_c","onchange=\"S.cs=SUBJ.findIndex(x=>x.c==this.value)\"")}<div class="kp" style="margin-top:8px">${[["grid","Total students","42","var(--t-blue)","var(--f-blue)"],["chart","Average score","78%","var(--t-green)","var(--f-green)"],["check","Submitted","38","var(--t-purple)","var(--f-purple)"],["pending","Pending","4","var(--t-yellow)","var(--f-yellow)"]].map(k=>`<div class="tilecard kc"><i style="background:${k[3]};color:${k[4]}">${IC(k[0],19)}</i><div><small>${k[1]}</small><b>${k[2]}</b></div></div>`).join("")}</div><p class="sm" style="margin-bottom:6px">Sample data until students are connected to the server.</p><div class="card">${R.map(r=>`<div class="tk" style="cursor:default"><span>${r[0]}</span><span><div class="bar"><i style="width:${r[1]}%;background:${r[1]>74?"var(--ok)":r[1]>62?"var(--amber)":"var(--red)"}"></i></div></span><b>${r[1]}%</b></div>`).join("")}</div>`)}
function sRes(){const items=S.resources||[];sh2(`<div class="row"><h3 class="sec">Course materials</h3><button class="pill" onclick="sf='upload';staff()">${IC("plus",13,2.4)} Add resource</button></div><div class="utabs">${["All","Lecture Notes","Assignment","Resource","Mock Test"].map(x=>`<button class="${(!window.resFilter&&x==="All")||window.resFilter===x?"on":""}" onclick="window.resFilter='${x==="All"?"":x}';staff()">${x}</button>`).join("")}</div>${resourceList(items.filter(x=>!window.resFilter||x.type===window.resFilter))}`)}
// ---- create message: announcements + staff groups ----
function sMessages(){S.msgs=S.msgs||[];S.groups=S.groups||[];
 sh2(`${hd("Create message",bk2("home"))}<div class="card"><h3>Message students</h3><p class="sm">Send an announcement to a course, a group or all students.</p><label class="sm">Send to</label><select id="msg_group"><option value="all">All students</option>${SUBJ.map(x=>`<option value="${x.c}">${x.c} · ${esc(x.n)}</option>`).join("")}${S.groups.map(g=>`<option value="group:${g.id}">Group · ${esc(g.name)}</option>`).join("")}</select><label class="sm">Message</label><textarea id="msg_text" rows="4" placeholder="Type your message…"></textarea><button class="btn" onclick="sendStaffMessage()">Send message</button></div>
 <div class="card"><h3>Create student group</h3><input id="group_name" placeholder="Group name"><label class="sm">Course</label>${sel("group_course")}<button class="btn s" onclick="createStudentGroup()">Create group</button></div>
 <h3 class="sec">Your groups</h3>${S.groups.map(g=>`<div class="lp" onclick="openGroupChat('${g.id}')"><i>${IC("group",16)}</i><span>${esc(g.name)}<div class="sm">${esc(g.c)}</div></span><b class="lp-s">${IC("chev",18,2.2)}</b></div>`).join("")||'<p class="sm empty">No groups yet. Create one above.</p>'}
 <h3 class="sec">Recent messages</h3>${S.msgs.slice().reverse().slice(0,12).map(m=>`<div class="lp"><i>${IC("message",16)}</i><span>${esc(m.text||(m.file?m.file.name:""))}<div class="sm">${esc(m.c||(grpOf(m.group)||{}).name||"All students")} · ${new Date(m.created).toLocaleString()}</div></span></div>`).join("")||'<p class="sm empty">No messages sent yet.</p>'}`)}
function sendStaffMessage(){const text=$("msg_text").value.trim(),target=$("msg_group").value;if(!text)return toast("Type a message first");S.msgs=S.msgs||[];S.msgs.push({id:Date.now(),c:SUBJ.some(x=>x.c===target)?target:"",group:target,from:S.user.name,text,created:new Date().toISOString(),kind:"message"});save();toast("Message sent");staff()}
function createStudentGroup(){const name=$("group_name").value.trim();if(!name)return toast("Enter a group name");S.groups=S.groups||[];S.groups.push({id:Date.now(),name,c:$("group_course").value});save();toast("Group created");staff()}
function openChat(c){CH.target=c;CH.back=bk2("course");CH.reply=null;sf="chat";staff()}
function openGroupChat(id){CH.target="group:"+id;CH.back=bk2("messages");CH.reply=null;sf="chat";staff()}
function sChat(){if(!CH.target)CH.target=SUBJ[S.cs].c;chatScreen()}
// ---- doubts, profile ----
function sDb(){sh2(`${hd("Student doubts",bk2("home"))}${S.doubts.map((d,i)=>`<div class="card"><span class="pill">${esc(d.lv)}</span><p style="margin:6px 0">${esc(d.t)}</p>${d.r?`<div class="sm">Your reply: ${esc(d.r)}</div>`:`<textarea id="r${i}" rows="2" placeholder="Type your reply"></textarea><button class="btn" onclick="rep(${i})">Reply</button>`}</div>`).join("")||'<p class="sm empty">No doubts yet.</p>'}`)}
function rep(i){const t=$("r"+i).value.trim();if(!t)return;S.doubts[i].r=t;S.doubts[i].st="Answered";save();toast("Reply sent");staff()}
function sProfile(){const u=S.user;sh2(`${hd("Profile",bk2("home"))}<div class="c prof"><button class="av big" aria-label="Profile">${esc(u.name[0])}</button><h3 style="margin-top:10px">${esc(u.name)}</h3><div class="sm">Faculty · ID ${esc(u.id)}<br>${esc(u.email)} · ${esc(u.phone)}<br>${COL}<br>${DEP}</div></div>${themeSwitch()}<button class="btn s" onclick="chk()">${IC("refresh",18)} Check for updates (v${CFG.version})</button><button class="btn s" onclick="doLogout()">${IC("logout",18)} Logout</button><p id="um" class="sm c" style="margin-top:8px"></p>`)}
function tog(i){const s=SUBJ[S.cs],k=sk=="T"?0:1,a=op(s).slice();a[k]=i<a[k]?i:i+1;S.op[s.c]=a;save();staff()}
