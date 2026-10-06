const MODES={
  reasonable:{title:"Reasonable",hint:"Balanced, dynamic next step."},
  creative:{title:"Creative",hint:"Niche, hands-on, dream-job territory."},
  corporate:{title:"Corporate",hint:"Prestige, compensation, career leverage."},
  politics:{title:"Politics",hint:"Policy, institutions, influence and international network."}
};

const STORAGE_KEY="ujob:v20";
let state=loadState();
let activeMode=state.activeMode||"reasonable";
let busy=false;

const $=id=>document.getElementById(id);
const els={
  title:$("sectionTitle"),hint:$("sectionHint"),run:$("runButton"),results:$("results"),
  status:$("status"),lastUpdate:$("lastUpdate"),history:$("history"),
  historyToggle:$("historyToggle"),historyCount:$("historyCount")
};

function blankMode(){return{lastUpdate:null,latest:[],runs:[]}}
function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    return{
      activeMode:raw.activeMode||"reasonable",
      reasonable:raw.reasonable||blankMode(),
      creative:raw.creative||blankMode(),
      corporate:raw.corporate||blankMode(),
      politics:raw.politics||blankMode()
    };
  }catch{
    return{activeMode:"reasonable",reasonable:blankMode(),creative:blankMode(),corporate:blankMode(),politics:blankMode()};
  }
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function fmtDate(value,withTime=false){
  if(!value)return"Not run yet";
  return new Intl.DateTimeFormat("en-BE",withTime?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));
}
function allSeenUrls(){return Object.keys(MODES).flatMap(mode=>state[mode].runs.flatMap(run=>run.jobs.map(j=>j.url))).filter(Boolean)}

function setMode(mode){
  activeMode=mode;state.activeMode=mode;document.body.dataset.mode=mode;
  document.querySelectorAll(".mode").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));
  saveState();render();
}

function render(){
  const meta=MODES[activeMode],modeState=state[activeMode];
  els.title.textContent=meta.title;els.hint.textContent=meta.hint;
  els.lastUpdate.textContent=modeState.lastUpdate?`Updated ${fmtDate(modeState.lastUpdate,true)}`:"Not run yet";
  els.historyCount.textContent=modeState.runs.reduce((sum,run)=>sum+run.jobs.length,0);
  renderResults(modeState.latest);renderHistory(modeState.runs);
}

function renderResults(jobs){
  if(!jobs.length){els.results.innerHTML='<div class="empty">No results yet.</div>';return}
  els.results.innerHTML=jobs.map(job=>`
    <article class="job">
      <div class="score">${esc(Number(job.score).toFixed(1))}</div>
      <h2 class="job-title">${esc(job.title)}</h2>
      <div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · ${esc(job.publishedDate)}`:""}</div>
      <div class="why">${(job.whyFit||[]).map(esc).join(" ")}</div>
      <a class="apply" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">Apply ↗</a>
      ${job.languageCheck?`<div class="lang">${esc(job.languageCheck)}</div>`:""}
    </article>`).join("");
}

function renderHistory(runs){
  if(!runs.length){els.history.innerHTML='<div class="empty">No history.</div>';return}
  els.history.innerHTML=runs.map(run=>`
    <div class="run-group">
      <div class="run-date">${esc(fmtDate(run.at,true))}</div>
      ${run.jobs.map(job=>`
        <a class="history-row" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">
          <div class="history-score">${esc(Number(job.score).toFixed(1))}</div>
          <div><div class="history-main"><b>${esc(job.title)}</b> · ${esc(job.company)}</div><div class="history-sub">${esc(job.location)}</div></div>
        </a>`).join("")}
    </div>`).join("");
}

async function runSearch(){
  if(busy)return;
  busy=true;els.run.disabled=true;els.run.textContent="…";els.status.textContent="Searching live vacancies…";
  try{
    const response=await fetch("/api/search",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:activeMode,seenUrls:allSeenUrls()})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Search failed.");

    const jobs=Array.isArray(data.jobs)?data.jobs:[];
    const at=data.searchedAt||new Date().toISOString();

    state[activeMode].latest=jobs;state[activeMode].lastUpdate=at;
    state[activeMode].runs.unshift({at,jobs:jobs.map(({whyFit,languageCheck,...small})=>small)});
    state[activeMode].runs=state[activeMode].runs.slice(0,50);
    saveState();

    els.status.textContent=jobs.length
      ?`${jobs.length} verified match${jobs.length===1?"":"es"}.`
      :(data?.diagnostics?.webSearchCalls
        ?`Live search completed, but no vacancy passed the checks.`
        :"Search returned no verified vacancies.");
    render();
  }catch(error){
    els.status.textContent=error.message||"Search failed.";
  }finally{
    busy=false;els.run.disabled=false;els.run.textContent="Run";
  }
}

async function checkHealth(){
  try{
    const r=await fetch("/api/health?fresh=20",{cache:"no-store"});
    const h=await r.json();
    if(!h.configured)els.status.textContent="Add OPENAI_API_KEY in Railway Variables.";
  }catch{
    els.status.textContent="Server connection problem.";
  }
}

document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
els.run.addEventListener("click",runSearch);
els.historyToggle.addEventListener("click",()=>{
  const opening=els.history.hidden;els.history.hidden=!opening;els.historyToggle.setAttribute("aria-expanded",String(opening));
});
if("serviceWorker"in navigator)navigator.serviceWorker.register("/service-worker.js?v=20").catch(()=>{});
setMode(activeMode);checkHealth();
