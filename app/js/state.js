// ===== state =====
const K="learn_v2";let S;try{S=JSON.parse(localStorage.getItem(K))}catch(e){}
S=S||{user:null,pr:{},pts:0,streak:0,lastActiveDay:null,doubts:[],cs:4};S.op=S.op||{"ERG 303":[1,1],"STA 301":[1,1],"SWE 311":[1,0]};
if(S.user&&typeof S.user.role==="string")S.user.role=S.user.role.toLowerCase();
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
let tab="home",ct="ov",lm="reg",rl="student",upd=false,G,app=document.getElementById("app");
const sh=a=>[...a].sort(()=>Math.random()-.5),$=id=>document.getElementById(id);

// ===== day streak =====
// The streak counts ONLY days on which the student completed a daily challenge, a level or an arena match.
// Opening the app never changes it. S.act holds the dates (yyyy-mm-dd) of completed activities.
// Older builds stored a bare counter that could rise on its own, so it is reset once (streakVer 2).
if(S.streakVer!==2){S.streakVer=2;S.streak=0;S.lastActiveDay=null;S.act=[];save()}
S.act=Array.isArray(S.act)?S.act:[];
const dayKey=d=>(d||new Date()).toLocaleDateString("en-CA");
function streakNow(){const set=new Set(S.act),d=new Date();if(!set.has(dayKey(d)))d.setDate(d.getDate()-1);let n=0;while(set.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
// Call this when a daily challenge, a level or an arena match is COMPLETED (lesson.js fin() does it for levels).
function recordCompletedActivity(kind){const t=dayKey();if(!S.act.includes(t))S.act.push(t);S.act=S.act.slice(-400);S.lastActiveDay=t;S.streak=streakNow();save()}

// weekly XP (for the league): kept here and also sent to the server when logged in
const weekKey=()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return dayKey(d)};
function weeklyXp(n){S.wxp=S.wxp||{};const w=weekKey();S.wxp[w]=(S.wxp[w]||0)+n;save();if(API.token())API.addXp(n).catch(()=>{})}
// ===== shared helpers =====
// ===== appearance: light / dark / follow the phone =====
S.theme=S.theme||"system";
function applyTheme(){const dark=S.theme=="dark"||(S.theme!="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
 document.documentElement.dataset.theme=dark?"dark":"light";const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=dark?"#0f0c18":"#ffffff"}
function setTheme(t){S.theme=t;save();applyTheme();render()}
applyTheme();try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(S.theme=="system")applyTheme()})}catch(e){}

// ===== back button: remembers the screens you opened, so Back works on every tab =====
let HIST=[],CUR=null,NAVBACK=false;
const navSig=()=>S.user&&S.user.role=="staff"?JSON.stringify({sf,cs:sf=="course"||sf=="chat"?S.cs:0,ch:sf=="chat"?CH.target:""}):JSON.stringify({tab,cs:tab=="course"||tab=="coursechat"?S.cs:0,ch:tab=="coursechat"?CH.target:""});
const navSnap=()=>({sig:navSig(),tab,sf,cs:S.cs,ct,sc,ch:CH.target,chb:CH.back});
function navTrack(){if(NAVBACK){NAVBACK=false;CUR=navSnap();return}const g=navSig();if(CUR&&CUR.sig!==g){HIST.push(CUR);if(HIST.length>40)HIST.shift()}if(!CUR||CUR.sig!==g)CUR=navSnap()}
function goBack(){if(!HIST.length)return;const p=HIST.pop();tab=p.tab;sf=p.sf;S.cs=p.cs;ct=p.ct;sc=p.sc;CH.target=p.ch;CH.back=p.chb;NAVBACK=true;render()}
function navReset(){HIST=[];CUR=null}

const nT=s=>s.cr=="1+1"?17:34,pr=s=>S.pr[s.c]||[0,0];
const tt=(s,i)=>s.T?s.T[i]:s.U[Math.min(4,Math.floor(i*5/nT(s)))]+" · lecture "+(i+1);
const pt=(s,i)=>s.P?s.P[i]:i==16?"Final practical exam":"Practical "+(i+1);
const pct=s=>Math.round((pr(s)[0]+pr(s)[1])/(nT(s)+17)*100);
const esc=t=>String(t==null?"":t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(m){const t=$("ts");t.textContent=m;t.style.display="block";clearTimeout(t.h);t.h=setTimeout(()=>t.style.display="none",2600)}

// top bar: profile (top-left), brand, points + streak chips
function topbar(){const st=S.user.role=="staff";
 return `<header class="top"><button class="bk" onclick="goBack()" ${HIST.length?"":"disabled"} aria-label="Back">${IC("back",22,2.2)}</button><button class="av" onclick="${st?"sf='profile';staff()":"go('profile')"}" aria-label="Profile">${esc((S.user.name||"U")[0])}</button><div class="lg">${LOGO(24)}<span>LEARN</span></div>${st?"":`<div class="chips"><span class="chip" title="Points">${IC("star",15)}<b>${S.pts}</b></span><span class="chip" title="Day streak">${IC("flame",15)}<b>${streakNow()}</b></span></div>`}</header>`}
const NAV=[["home","home","Home"],["theory","book","Theory"],["practical","practice","Practicals"],["arena","arena","Arena"],["league","league","League"]];
const navBar=()=>`<nav class="bottom-nav">${NAV.map(x=>`<button class="${tab==x[0]||(x[0]=="home"&&tab=="course")?"on":""}" onclick="go('${x[0]}')"><b>${IC(x[1],22)}</b><span>${x[2]}</span></button>`).join("")}</nav>`;
function shell(body,o={}){
 const top=o.head!==undefined?o.head:(o.nobar?"":topbar());
 app.innerHTML=(upd?`<div class="banner">New version available <button onclick="location.reload()">Update</button></div>`:"")+top+`<main class="${o.cls||""}">${body}</main>`+(o.foot!==undefined?o.foot:(o.nonav?"":navBar()))}
function go(t){tab=t;render()}
function render(){if(!S.user)return auth();navTrack();if(S.user.role=="staff")return staff();({home,theory:()=>path("T"),practical:()=>path("P"),arena,league,profile,doubts,course,coursechat})[tab]()}
