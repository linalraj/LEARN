// per-course logo + animation: [icon, colour, logo animation, background animation, three background icons]
const TH={"STA 301":["bars","#6c7bff","bob","drift",["bars","chart","target"]],"ARM 321":["sprout","#d4a017","bob","down",["coins","sprout","leaf"]],"ERG 301":["gear","#f07a24","spin","up",["flame","gear","wind"]],"ERG 302":["flame","#e5384f","flick","up",["flame","wind","flask"]],"ERG 303":["sun","#f2a900","spin","drift",["sun","bolt","cloud"]],"ERG 304":["flask","#18a870","bob","up",["bubble","flask","leaf"]],"SWE 311":["droplet","#2b8fe6","drip","down",["droplet","gear","waves"]],"SWE 312":["waves","#1ea3c6","drip","down",["cloud","droplet","waves"]],"SWE 313":["shield","#2eb48a","bob","drift",["droplet","shield","droplet"]]};
const bd=(s,z)=>{const t=TH[s.c];return `<i class="bd" style="--c:${t[1]};${z?`width:${z}px;height:${z}px`:""}"><b class="an-${t[2]}">${IC(t[0],z?Math.round(z*.6):18,1.9)}</b></i>`};
const op=s=>S.op[s.c]||[0,0];
const gU=()=>{try{return JSON.parse(localStorage.getItem(K+"us"))||{}}catch(x){return{}}},pU=o=>{try{localStorage.setItem(K+"us",JSON.stringify(o))}catch(x){}};
// pathway: dashed trail, gem every 5th level, trophy at the end
function mapHTML(s,k,n,d){const th=TH[s.c],o=op(s)[k=="T"?0:1],X=i=>180+Math.round(Math.sin(i*1.1)*85),Y=i=>50+i*100,H=n*100+30,e=th[4];
 let p=`M${X(0)} ${Y(0)}`;for(let i=1;i<n;i++){const m=(Y(i-1)+Y(i))/2;p+=`C${X(i-1)} ${m} ${X(i)} ${m} ${X(i)} ${Y(i)}`}
 const dc=Array.from({length:Math.ceil(n/3)},(_,j)=>`<span style="left:${(j*37+8)%88}%;top:${(j*53+5)%96}%;animation-delay:${(j%6)*.8}s">${IC(e[j%e.length],30,1.5)}</span>`).join("");
 const nd=Array.from({length:n},(_,i)=>{const ms=i%5==4&&i<n-1,la=i==n-1,st=i<d?"done":i==d?(i<o?"cur":"wait"):"lock",
  ic=la?IC("trophy",26):ms?IC("gem",24):i<d?IC("check",26,2.5):st=="wait"?IC("clock",24):i+1;
  return `<button class="node ${st}${ms||la?" ms":""}" style="left:${(X(i)/3.6).toFixed(1)}%;top:${Y(i)-31}px" onclick="lvl(${S.cs},'${k}',${i})" aria-label="Level ${i+1}">${ic}<small>${esc(k=="T"?tt(s,i):pt(s,i))}</small></button>`}).join("");
 return `<div class="mp" style="height:${H}px;--c:${th[1]}"><div class="dc ${th[3]}">${dc}</div><svg class="pth" viewBox="0 0 360 ${H}" preserveAspectRatio="none" style="height:${H}px"><path d="${p}" fill="none" stroke="${th[1]}" stroke-width="3" stroke-dasharray="3 10" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>${nd}</div>`}
// ===== pathways =====
function path(k){const s=SUBJ[S.cs],n=k=="T"?nT(s):17,d=pr(s)[k=="T"?0:1];
 shell(`<select onchange="S.cs=+this.value;save();render()">${SUBJ.map((x,i)=>`<option value="${i}" ${i==S.cs?"selected":""}>${x.c} – ${x.n}</option>`).join("")}</select><div class="row" style="margin-top:6px"><h3 class="h-ico">${bd(s)} ${k=="T"?"Theory":"Practical"} pathway</h3><span class="pill">${d}/${n}</span></div>
 ${mapHTML(s,k,n,d)}`)}
// Opens a level. The game comes from the server (built from the teacher's uploaded notes); ERG 303 lecture 1 also has a built-in sample.
async function lvl(si,k,i){const s=SUBJ[si],ix=k=="T"?0:1,d=pr(s)[ix];
 if(i>d)return toast("Finish the earlier levels first");
 let data=null;
 if(API.token()){toast("Loading level…");try{data=await API.lecture(s.c,k,i)}catch(e){}}
 if(!data&&s.c=="ERG 303"&&k=="T"&&i==0)data=SAMPLE_LECTURE;
 if(!data){if(i>=op(s)[ix])return toast("Waiting for your faculty to open this lecture");return toast("The game for this level is not ready yet. Your teacher needs to upload the lecture notes.")}
 begin(si,k,i,data)}
