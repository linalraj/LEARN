// ===== CONFIG (edit data here, no code changes needed) =====
const CFG={version:"1.7.0",today:[["ERG 303","T",0],["STA 301","T",0],["SWE 311","T",0],["ERG 303","P",0],["STA 301","P",0]],
GT:"Duolingo|Kerbal Space Program|Brilliant|Human Resource Machine|GeoGuessr|Factorio|CodeCombat|Foldit|PhET|Civilization VI|Scratch|Tinkercad|NASA Earthdata|SQL Murder Mystery|Memrise|Drops|Grasshopper|Mimo|SoloLearn|Prodigy|DragonBox|Khan Academy|Kahoot!|Quizlet|Typing.com|TypeRacer|Simply Piano|Yousician|Chess.com|Lichess|Circuit Scramble|Minecraft Education|Spaced Review|Boss Test".split("|"),
GP:"Kerbal Space Program|PhET|Tinkercad|PhET|PhET|NASA Earthdata|Factorio|Circuit Scramble|Minecraft Education|Human Resource Machine|SQL Murder Mystery|Civilization VI|GeoGuessr|Brilliant|Scratch|Khan Academy|Foldit".split("|")};
// updates: host version.json beside this file; changing its version notifies every user
async function chk(){try{const j=await (await fetch("version.json?"+Date.now())).json();if(j.version!=CFG.version){upd=true;return render()}}catch(x){}if($("um"))$("um").textContent="You are up to date."}
