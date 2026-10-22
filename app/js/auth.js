// ===== page 1: register / login =====
const isNet=e=>/Failed to fetch|NetworkError|Load failed|fetch/i.test((e&&e.message)||"");
function auth(){const r=lm=="reg";
 app.innerHTML=`<main class="authpage"><div class="c auth-brand">${LOGO(72)}<div class="logo">LEARN</div><p class="sm">${COL}<br>${DEP}</p></div>
 <h2 class="auth-h">${r?"Create your account":"Welcome back"}</h2>
 ${r?`<div class="seg"><button class="${rl=="student"?"on":""}" onclick="rl='student';auth()">Student</button><button class="${rl=="staff"?"on":""}" onclick="rl='staff';auth()">Staff</button></div>`:""}
 <input id="em" type="email" placeholder="Email" autocomplete="email"><input id="pw" type="password" placeholder="Password" autocomplete="${r?"new-password":"current-password"}">
 ${r?`<input id="nm" placeholder="NAME (IN CAPITALS)" oninput="this.value=this.value.toUpperCase()"><input id="id" placeholder="${rl=="staff"?"Staff ID":"ID number"}"><input id="ph" inputmode="numeric" maxlength="10" placeholder="Phone number">`:""}
 <p id="er" class="er"></p><button class="btn" onclick="sub()">${r?"Register":"Login"}</button>
 <p class="sm c" style="margin-top:16px">${r?"Already registered?":"New here?"} <a onclick="lm='${r?"login":"reg"}';auth()">${r?"Login":"Register"}</a></p></main>`}

async function sub(){
 const v=i=>($(i)?$(i).value.trim():""),e=v("em").toLowerCase(),p=v("pw"),r=lm=="reg",er=m=>{if($("er"))$("er").textContent=m};
 if(!/^\S+@\S+\.\S+$/.test(e))return er("Enter a valid email");if(p.length<6)return er("Password needs 6+ characters");
 const setServerUser=sv=>{S.user={...sv,id:sv.id_number||sv.id};if(S.user&&typeof S.user.role==="string")S.user.role=S.user.role.toLowerCase()};
 if(r){
  if(!v("nm"))return er("Enter your name");if(!v("id"))return er("Enter your ID number");if(!/^\d{10}$/.test(v("ph")))return er("Phone must be 10 digits");
  const user={email:e,password:p,name:v("nm").toUpperCase(),id_number:v("id"),phone:v("ph"),role:rl};
  try{
   await API.register(user);
   const sv=await API.login(e,p);
   setServerUser(sv);
   const local={email:e,pw:p,name:user.name,id:user.id_number,phone:user.phone,role:user.role},U=gU();U[e]=local;pU(U);
  }catch(err){
   if(isNet(err))return er("Cannot reach the LEARN server. Keep the server running, then try again.");
   return er(err.message||"Could not register");
  }
 }else{
  try{
   const sv=await API.login(e,p);
   setServerUser(sv);
   // Keep a local compatibility copy, but the server session is the source of truth.
   const local={email:e,pw:p,name:S.user.name,id:S.user.id_number,phone:S.user.phone,role:S.user.role},U=gU();U[e]=local;pU(U);
  }catch(serverErr){
   if(isNet(serverErr))return er("Cannot reach the LEARN server. Keep the server running, then try again.");
   // Migrate a browser-only account to the server once. Never enter the app without a server token.
   const u=gU()[e];
   if(u&&u.pw===p){
    try{
     await API.register({email:e,password:p,name:u.name,id_number:u.id,phone:u.phone,role:(u.role||"student").toLowerCase()});
     const sv=await API.login(e,p);setServerUser(sv);
    }catch(migrationErr){
     if(isNet(migrationErr))return er("Cannot reach the LEARN server. Keep the server running, then try again.");
     if(/Already registered/i.test(migrationErr.message||""))return er("This email already exists on the server with a different password. Use the password for your server account.");
     return er(migrationErr.message||"Could not migrate this browser-only account.");
    }
   }else{
    return er(serverErr.message||"Wrong email or password");
   }
  }
 }
 if(!API.token())return er("Login did not create a server session. Please try again.");
 tab="home";sf="home";save();render()
}
