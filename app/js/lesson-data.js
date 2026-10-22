// Level 1 sample lesson for ERG 303 Lecture 1 (the real app builds this from the teacher's upload)
let LES=[
{k:"match",p:[["Sun","Source of solar energy"],["Fusion","Hydrogen turns into helium"],["Earth–Sun distance","About 150 million km"],["National Solar Mission","India’s solar programme (2010)"]]},
{k:"listen",a:"The Sun is a star",x:["moon","planet"]},
{k:"bank",q:"How does the Sun make its energy? Build the sentence.",a:"The Sun produces energy by nuclear fusion",x:["burning","wind"]},
{k:"fill",q:"India launched the National ___ Mission in 2010.",o:["Solar","Wind","Hydro"],a:"Solar"},
{k:"type",q:"About how many minutes does sunlight take to reach Earth?",a:["8","8 minutes","eight"]},
{k:"pick",q:"Which statement is true?",o:["Solar energy is available only in summer","Most of India receives strong sunshine through the year","The Sun is made of solid rock"],a:1},
{k:"bank",q:"Build the sentence about India’s solar potential.",a:"India has high solar energy potential",x:["little","no"]},
{k:"speak",a:"Sunlight is a renewable energy source"},
{k:"fill",q:"Energy from the Sun reaches Earth as ___ radiation.",o:["electromagnetic","sound","chemical"],a:"electromagnetic"}];
// ===== Green Scholar style learning (3 stages) for ERG 303 lecture 1 =====
let LRN={t:"Solar energy in India & basics of sun and earth",
c:[["The Sun powers everything","The Sun is a giant ball of hot gas. Inside it, hydrogen fuses into helium and releases huge energy. That energy leaves the Sun as light and heat, called electromagnetic radiation.","Key idea: solar energy starts with nuclear fusion in the Sun."],["From Sun to Earth","Sunlight travels about 150 million km and reaches Earth in roughly 8 minutes.","Key idea: the Earth–Sun distance decides how much energy arrives."],["Solar energy in India","Most of India receives strong sunshine through the year. India started the National Solar Mission in 2010 to grow solar power.","Key idea: India has high solar potential, so we learn to measure and use it."]],
s:[["What releases the Sun’s energy?",["Nuclear fusion","Burning coal","Friction"]],["How does solar energy travel to Earth?",["Electromagnetic radiation","Sound waves","Water flow"]],["Which programme was launched in 2010 to grow solar power in India?",["National Solar Mission","Green Revolution","Smart Cities"]]],
o:["Hydrogen fuses inside the Sun","Energy leaves the Sun as radiation","Radiation travels about 150 million km","It reaches Earth in about 8 minutes","Solar panels and collectors capture it"]};

// Built-in sample (ERG 303 lecture 1), used until a teacher uploads real notes. Uploaded lectures replace LRN/LES at play time.
const SAMPLE_LECTURE={LRN:LRN,LES:LES};
