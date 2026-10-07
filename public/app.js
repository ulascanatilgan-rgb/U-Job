const MODES={reasonable:{title:"Reasonable",hint:"Balanced, dynamic next step."},creative:{title:"Creative",hint:"Niche, hands-on, dream-job territory."},corporate:{title:"Corporate",hint:"Prestige, compensation, career leverage."},politics:{title:"Politics",hint:"Policy, institutions, influence and international network."}};
const STORAGE_KEY="ujob:data";let state=loadState();let activeMode=state.activeMode||"reasonable";const busyModes={reasonable:false,creative:false,corporate:false,politics:false};const modeStatus={reasonable:"",creative:"",corporate:"",politics:""};
const $=id=>document.getElementById(id);const els={today:$("todayDate"),title:$("sectionTitle"),hint:$("sectionHint"),run:$("runButton"),results:$("results"),status:$("status"),lastUpdate:$("lastUpdate"),history:$("history"),historyToggle:$("historyToggle"),historyCount:$("historyCount")};
function blankMode(){return{lastUpdate:null,latest:[],runs:[]}}function emptyState(){return{activeMode:"reasonable",reasonable:blankMode(),creative:blankMode(),corporate:blankMode(),politics:blankMode()}}function mergeRuns(a,b){const seen=new Set();return[...(a||[]),...(b||[])].filter(r=>r&&r.at&&Array.isArray(r.jobs)).sort((x,y)=>new Date(y.at)-new Date(x.at)).filter(r=>{const k=r.at+"|"+r.jobs.map(j=>j.url||j.title||"").join("|");if(seen.has(k))return false;seen.add(k);return true}).slice(0,250)}function mergeState(base,raw){if(!raw||typeof raw!=="object")return base;const out={...base};if(raw.activeMode&&MODES[raw.activeMode])out.activeMode=raw.activeMode;for(const mode of Object.keys(MODES)){const a=out[mode]||blankMode();const b=raw[mode]||blankMode();const at=a.lastUpdate?new Date(a.lastUpdate).getTime():0;const bt=b.lastUpdate?new Date(b.lastUpdate).getTime():0;out[mode]={lastUpdate:bt>at?b.lastUpdate:a.lastUpdate,latest:bt>at?(Array.isArray(b.latest)?b.latest:[]):(Array.isArray(a.latest)?a.latest:[]),runs:mergeRuns(a.runs,b.runs)}}return out}function loadState(){let merged=emptyState();try{const stable=localStorage.getItem(STORAGE_KEY);if(stable)merged=mergeState(merged,JSON.parse(stable))}catch{}try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||key===STORAGE_KEY||!key.startsWith("ujob:"))continue;try{merged=mergeState(merged,JSON.parse(localStorage.getItem(key)||"{}"))}catch{}}}catch{}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(merged))}catch{}return merged}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function fmtDate(value,withTime=false){if(!value)return"Not run yet";return new Intl.DateTimeFormat("en-BE",withTime?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value))}function renderToday(){if(!els.today)return;els.today.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}
function seenUrlsForMode(mode){return (state[mode]?.runs||[]).flatMap(run=>run.jobs.map(j=>j.url)).filter(Boolean)}
function syncRunButton(){const busy=busyModes[activeMode];els.run.disabled=busy;els.run.textContent=busy?"…":"Run"}function setMode(mode){activeMode=mode;state.activeMode=mode;document.body.dataset.mode=mode;document.querySelectorAll(".mode").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));saveState();render();syncRunButton()}
function render(){const meta=MODES[activeMode],modeState=state[activeMode];els.title.textContent=meta.title;els.hint.textContent=meta.hint;els.lastUpdate.textContent=modeState.lastUpdate?`Updated ${fmtDate(modeState.lastUpdate,true)}`:"";els.historyCount.textContent=modeState.runs.reduce((sum,run)=>sum+run.jobs.length,0);els.status.textContent=modeStatus[activeMode]||"";renderResults(modeState.latest);renderHistory(modeState.runs);syncRunButton()}
function renderResults(jobs){if(!jobs.length){els.results.innerHTML='<div class="empty">Run a search to find current vacancies.</div>';return}els.results.innerHTML=jobs.map(job=>`<article class="job"><div class="score">${esc(Number(job.score).toFixed(1))}</div><h2 class="job-title">${esc(job.title)}</h2><div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div><div class="why">${(job.whyFit||[]).map(esc).join(" ")}</div><a class="apply" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">Apply ↗</a>${job.languageCheck?`<div class="lang">${esc(job.languageCheck)}</div>`:""}</article>`).join("")}
function renderHistory(runs){if(!runs.length){els.history.innerHTML='<div class="empty">No history.</div>';return}els.history.innerHTML=runs.map(run=>`<div class="run-group"><div class="run-date">${esc(fmtDate(run.at,true))}</div>${run.jobs.map(job=>`<a class="history-row" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer"><div class="history-score">${esc(Number(job.score).toFixed(1))}</div><div><div class="history-main"><b>${esc(job.title)}</b> · ${esc(job.company)}</div><div class="history-sub">${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div></div></a>`).join("")}</div>`).join("")}
async function fetchSearchOnce(mode){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),70000);
  try{
    return await fetch("/api/search",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:mode,seenUrls:seenUrlsForMode(mode)}),
      signal:controller.signal,
      cache:"no-store"
    });
  }finally{
    clearTimeout(timeout);
  }
}

async function runSearch(){
  const runMode=activeMode;
  if(busyModes[runMode])return;

  busyModes[runMode]=true;
  modeStatus[runMode]="Searching and verifying 5 live vacancies…";
  if(activeMode===runMode){
    els.status.textContent=modeStatus[runMode];
    syncRunButton();
  }

  try{
    let response;
    try{
      response=await fetchSearchOnce(runMode);
    }catch(firstError){
      if(firstError?.name==="AbortError"||/load failed|failed to fetch/i.test(String(firstError?.message||""))){
        modeStatus[runMode]="Connection interrupted. Retrying once…";
        if(activeMode===runMode)els.status.textContent=modeStatus[runMode];
        response=await fetchSearchOnce(runMode);
      }else{
        throw firstError;
      }
    }

    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Search failed.");

    const jobs=Array.isArray(data.jobs)?data.jobs:[];
    const at=data.searchedAt||new Date().toISOString();

    state[runMode].latest=jobs;
    state[runMode].lastUpdate=at;
    state[runMode].runs.unshift({
      at:at,
      jobs:jobs.map(({whyFit,languageCheck,...small})=>small)
    });
    state[runMode].runs=mergeRuns(state[runMode].runs,[]);
    saveState();

    if(jobs.length===5){
      modeStatus[runMode]="5 verified matches.";
    }else if(jobs.length>0){
      modeStatus[runMode]=String(jobs.length)+" verified matches found.";
    }else{
      modeStatus[runMode]="Search completed but no verified roles were returned.";
    }

    if(activeMode===runMode){
      els.status.textContent=modeStatus[runMode];
      render();
    }
  }catch(error){
    const message=error?.name==="AbortError"
      ?"Search timed out. Please run again."
      :(error.message||"Search failed.");
    modeStatus[runMode]=message;

    if(activeMode===runMode){
      els.status.textContent=message;
      els.results.innerHTML='<div class="empty"><b>Search error:</b> '+esc(message)+'</div>';
    }
  }finally{
    busyModes[runMode]=false;
    if(activeMode===runMode)syncRunButton();
  }
}

async function checkHealth(){try{const r=await fetch("/api/health?fresh=25",{cache:"no-store"});const h=await r.json();if(!h.configured)els.status.textContent="Add OPENAI_API_KEY in Railway Variables."}catch{els.status.textContent="Server connection problem."}}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));els.run.addEventListener("click",runSearch);els.historyToggle.addEventListener("click",()=>{const opening=els.history.hidden;els.history.hidden=!opening;els.historyToggle.setAttribute("aria-expanded",String(opening))});if("serviceWorker"in navigator)navigator.serviceWorker.register("/service-worker.js?v=25").catch(()=>{});renderToday();setInterval(renderToday,60000);setMode(activeMode);checkHealth();
