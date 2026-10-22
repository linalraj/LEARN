// ===== other tabs =====
function arena(){shell(`<div class="card c empty-card"><i class="big-ic">${IC("arena",34)}</i><h3>Arena</h3><p class="sm">Team match · Individual · Room<br>Details coming soon.</p></div>`)}

// ===== League (Duolingo style): 10 leagues, weekly XP, top 10 move up, bottom 5 move down =====
let LGD=null,LGERR="";
async function league(){
 if(!LGD||Date.now()-(LGD.at||0)>20000){
  if(API.token()){try{LGD=await API.league();LGD.at=Date.now();LGERR="";S.leagueRank=1+LGD.rows.findIndex(r=>r.me);save()}catch(e){LGD=null;LGERR=e.message}}
  else LGERR="Log in while the server is running to compete with other students."}
 const D=LGD||{level:0,rows:[{name:S.user.name,xp:(S.wxp||{})[weekKey()]||0,me:true}],days_left:7-((new Date().getDay()+6)%7),promote:10,demote:0,last:null,local:true};
 const lv=D.level,L=LEAGUES[lv],rows=D.rows,n=rows.length;
 const badges=LEAGUES.map((x,i)=>`<button class="lgb ${i==lv?"cur":""} ${i>lv?"lock":""}" ${i==lv?'aria-current="true"':""} onclick="toast('${i<lv?"You have reached the "+x[0]+" League":i==lv?"Your league this week":"Reach the "+x[0]+" League to unlock"}')">${leagueBadge(i,i==lv?74:50,i>lv)}</button>`).join("");
 const medal=i=>i<3?`<i class="medal m${i}">${i+1}</i>`:`<span class="rk">${i+1}</span>`;
 let list="";
 rows.forEach((r,i)=>{
  if(D.demote&&i==n-D.demote&&i>D.promote)list+=`<div class="zone dn">${IC("arrowdown",16,2.6)} DEMOTION ZONE</div>`;
  list+=`<div class="lgrow ${r.me?"me":""}">${medal(i)}<span class="lgav" style="background:${waCol(r.name)}">${esc((r.name||"?")[0])}</span><b class="lgn">${esc(r.name)}${r.me?" (You)":""}</b><span class="lgxp">${r.xp} XP</span></div>`;
  if(i==D.promote-1&&lv<9&&n>D.promote)list+=`<div class="zone up">${IC("arrowup",16,2.6)} PROMOTION ZONE</div>`});
 const last=D.last&&S.lgSeen!==D.last.week?D.last:null;
 if(last){S.lgSeen=last.week;save()}
 const lastTxt=last?(last.to>last.from?`You finished #${last.rank} last week and moved up to the ${LEAGUES[last.to][0]} League.`:last.to<last.from?`You finished #${last.rank} last week and moved down to the ${LEAGUES[last.to][0]} League.`:`You finished #${last.rank} last week and stayed in the ${LEAGUES[last.from][0]} League.`):"";
 shell(`${lastTxt?`<div class="lgnote">${IC("award",18)} ${esc(lastTxt)}</div>`:""}<div class="lgbar" id="lgbar">${badges}</div>
 <h2 class="lgt">${L[0]} League</h2><p class="lgs">${lv<9?`Top ${D.promote} advance to the ${LEAGUES[lv+1][0]} League`:`Stay in the top ${D.promote} to remain in the Diamond League`}</p>
 <p class="lgd">${IC("clock",16,2.2)} ${D.days_left} ${D.days_left==1?"day":"days"}</p>
 ${LGERR&&!LGD?`<p class="sm c" style="margin:6px 0 10px">${esc(LGERR)}</p>`:""}
 <div class="lglist">${list}</div>${n<5?`<p class="sm c" style="margin-top:12px">More students join your league as they earn XP. Complete a level to earn 20 XP.</p>`:""}`);
 const cur=document.querySelector(".lgb.cur"),bar=$("lgbar");if(cur&&bar)bar.scrollLeft=cur.offsetLeft-bar.clientWidth/2+cur.clientWidth/2}

function themeSwitch(){const o=[["light","sun","Light"],["dark","moon","Dark"],["system","monitor","Auto"]];
 return `<h3 class="sec" style="margin-top:18px">Appearance</h3><div class="seg">${o.map(x=>`<button class="${S.theme==x[0]?"on":""}" onclick="setTheme('${x[0]}')">${IC(x[1],16)} ${x[2]}</button>`).join("")}</div>`}
function profile(){const u=S.user;
 shell(`<div class="c prof"><button class="av big" aria-label="Profile">${esc(u.name[0])}</button><h3 style="margin-top:10px">${esc(u.name)}</h3><div class="sm">ID ${esc(u.id)}<br>${esc(u.email)} · ${esc(u.phone)}<br>${COL}<br>${DEP}</div></div>
 <div class="kp" style="margin-top:14px"><div class="tilecard c"><b>${S.pts}</b><div class="sm">Points</div></div><div class="tilecard c"><b>${streakNow()}</b><div class="sm">Day streak</div></div></div>
 ${themeSwitch()}
 <button class="btn s" onclick="chk()">${IC("refresh",18)} Check for updates (v${CFG.version})</button><button class="btn s" onclick="doLogout()">${IC("logout",18)} Logout</button><p id="um" class="sm c" style="margin-top:8px"></p>`)}
function doLogout(){S.user=null;save();localStorage.removeItem("learn_token");lm="login";navReset();LGD=null;render()}
