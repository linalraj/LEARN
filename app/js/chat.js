// ===== WhatsApp-style chat (dark), shared by students and staff =====
// A chat target is a course code ("ERG 303") or a staff group ("group:<id>").
const CH={target:"",back:"",reply:null};
S.msgs=Array.isArray(S.msgs)?S.msgs:[];S.groups=Array.isArray(S.groups)?S.groups:[];
const WA_COL=["#53bdeb","#ffa97c","#c9a0ff","#7fe0a0","#ff8fb1","#f5d26b","#7ad7e8"];
const waCol=n=>{let h=0;for(const c of String(n||"?"))h=(h*31+c.charCodeAt(0))>>>0;return WA_COL[h%WA_COL.length]};
const grpOf=t=>S.groups.find(g=>"group:"+g.id===t);
function chatMsgs(t){return S.msgs.filter(m=>{
 if(t.startsWith("group:"))return m.group===t;
 if(m.c===t||m.group===t||m.group==="all")return true;
 const g=grpOf(m.group);return !!(g&&g.c===t)}).sort((a,b)=>new Date(a.created)-new Date(b.created))}
const waTime=d=>new Date(d).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}).toLowerCase();
function waDay(d){const a=new Date(d),n=new Date(),y=new Date();y.setDate(n.getDate()-1);const k=x=>x.toDateString();
 return k(a)===k(n)?"Today":k(a)===k(y)?"Yesterday":a.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}
const waSize=b=>b>1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB";
function waBubble(m){const mine=m.from===S.user.name,txt=esc(m.text).replace(/\n/g,"<br>");
 return `<div class="wa-msg ${mine?"mine":"theirs"}" onclick="waReply(${m.id})">
 ${mine?"":`<div class="wa-name" style="color:${waCol(m.from)}">${esc(m.from||"Staff")}</div>`}
 ${m.reply?`<div class="wa-quote"><b>${esc(m.reply.from)}</b><span>${esc(m.reply.text)}</span></div>`:""}
 ${m.file?`<div class="wa-file" onclick="event.stopPropagation();openMaterial(${m.file.id})">${IC("file",24)}<span>${esc(m.file.name)}<small>${waSize(m.file.size||0)}</small></span></div>`:""}
 ${txt?`<span class="wa-text">${txt}</span>`:""}<span class="wa-meta">${waTime(m.created)}${mine?`<i class="wa-tick">${IC("dcheck",16,2)}</i>`:""}</span></div>`}
function chatScreen(){const t=CH.target,g=grpOf(t),s=SUBJ.find(x=>x.c===t),msgs=chatMsgs(t);
 const title=g?g.name:t,sub=g?(g.c+" group"):(s?s.n:"Course conversation");
 const av=g?IC("group",22):(s?IC(TH[s.c][0],22):IC("message",22));
 let last="",body="";for(const m of msgs){const d=waDay(m.created);if(d!==last){body+=`<div class="wa-day"><span>${d}</span></div>`;last=d}body+=waBubble(m)}
 const head=`<header class="wa-head"><button class="wa-ib" onclick="${CH.back}" aria-label="Back">${IC("back",24)}</button><span class="wa-av">${av}</span><div class="wa-ttl"><b>${esc(title)}</b><small>${esc(sub)}</small></div>
 <button class="wa-ib" onclick="toast('Video calls are not available in LEARN yet')" aria-label="Video call">${IC("video",22)}</button><button class="wa-ib" onclick="toast('Voice calls are not available in LEARN yet')" aria-label="Voice call">${IC("phone",21)}</button><button class="wa-ib" onclick="toast('No more chat options yet')" aria-label="More options">${IC("more",22)}</button></header>`;
 const QR=["Thank you","Okay, understood","Please repeat that","I have a doubt","Will do"];
 const foot=`<div class="wa-compose"><div id="wa_reply"></div><div id="wa_qr" class="wa-qr" hidden>${QR.map(q=>`<button onclick="waQ('${q}')">${q}</button>`).join("")}</div>
 <div class="wa-box"><textarea id="wa_text" rows="1" placeholder="Message" oninput="waInput()" onkeydown="waKey(event)"></textarea>
 <div class="wa-tools"><button class="wa-pill" onclick="waQR()">Quick reply</button><span class="wa-sp"></span><button class="wa-ib" onclick="waQR()" aria-label="Quick replies">${IC("smile",23)}</button><button class="wa-ib" onclick="$('wa_file').click()" aria-label="Attach file">${IC("clip",23)}</button><button class="wa-ib" onclick="$('wa_cam').click()" aria-label="Camera">${IC("camera",23)}</button><button id="wa_go" class="wa-go" onclick="waGo()" aria-label="Voice input or send">${IC("mic",24,2)}</button></div></div>
 <input id="wa_file" type="file" hidden onchange="waFile(this)"><input id="wa_cam" type="file" accept="image/*" capture="environment" hidden onchange="waFile(this)"></div>`;
 shell(`<div class="wa-wall">${body||'<p class="wa-empty">No messages yet. Say hello to start the conversation.</p>'}</div>`,{head,foot,cls:"wa-main"});
 const m=app.querySelector("main");m.id="wa_wall";m.scrollTop=m.scrollHeight}
function waInput(){const ta=$("wa_text");ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,110)+"px";$("wa_go").innerHTML=IC(ta.value.trim()?"send":"mic",24,2)}
function waKey(e){if(e.key==="Enter"&&!e.shiftKey&&!matchMedia("(pointer:coarse)").matches){e.preventDefault();waGo()}}
function waGo(){const ta=$("wa_text");if(ta.value.trim())return waSend();hear(t=>{ta.value=(ta.value+" "+t).trim();waInput()})}
function waQR(){const q=$("wa_qr");q.hidden=!q.hidden}
function waQ(t){const ta=$("wa_text");ta.value=(ta.value?ta.value+" ":"")+t;$("wa_qr").hidden=true;waInput();ta.focus()}
function waReply(id){const m=S.msgs.find(x=>x.id===id);if(!m)return;CH.reply={from:m.from===S.user.name?"You":(m.from||"Staff"),text:m.text||(m.file?m.file.name:"")};
 $("wa_reply").innerHTML=`<div class="wa-rp"><div class="wa-quote"><b>${esc(CH.reply.from)}</b><span>${esc(CH.reply.text)}</span></div><button class="wa-ib" onclick="waClr()" aria-label="Cancel reply">${IC("x",20)}</button></div>`;$("wa_text").focus()}
function waClr(){CH.reply=null;$("wa_reply").innerHTML=""}
function waSend(file){const ta=$("wa_text"),text=ta?ta.value.trim():"";if(!text&&!file)return;const t=CH.target,isG=t.startsWith("group:");
 const m={id:Date.now(),c:isG?"":t,group:t,from:S.user.name,text,created:new Date().toISOString(),kind:"chat"};
 if(CH.reply)m.reply=CH.reply;if(file)m.file=file;S.msgs.push(m);CH.reply=null;save();chatScreen()}
async function waFile(inp){const f=inp.files[0];inp.value="";if(!f)return;const id=Date.now();try{await saveMaterialFile(id,f)}catch(e){return toast("Browser storage failed: "+e.message)}waSend({id,name:f.name,size:f.size})}
// entry points
function studentCourseChat(c){CH.target=c;CH.back="go('course')";CH.reply=null;tab="coursechat";render()}
function coursechat(){CH.target=CH.target||SUBJ[S.cs].c;chatScreen()}
