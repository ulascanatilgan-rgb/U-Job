const MODES={reasonable:{title:"Reasonable",hint:"Balanced, dynamic next step."},creative:{title:"Creative",hint:"Niche, hands-on, dream-job territory."},corporate:{title:"Corporate",hint:"Prestige, compensation, career leverage."},politics:{title:"Politics",hint:"Policy, institutions, influence and international network."}};
const STORAGE_KEY="ujob:data";let state=loadState();let activeMode=state.activeMode||"reasonable";const modeStatus={reasonable:"",creative:"",corporate:"",politics:""};const pollTimers={reasonable:null,creative:null,corporate:null,politics:null};
const $=id=>document.getElementById(id);const els={today:$("todayDate"),title:$("sectionTitle"),hint:$("sectionHint"),run:$("runButton"),results:$("results"),status:$("status"),lastUpdate:$("lastUpdate"),history:$("history"),historyToggle:$("historyToggle"),historyCount:$("historyCount")};
function blankMode(){return{lastUpdate:null,latest:[],runs:[],pendingSearch:null}}function emptyState(){return{activeMode:"reasonable",reasonable:blankMode(),creative:blankMode(),corporate:blankMode(),politics:blankMode()}}function mergeRuns(a,b){const seen=new Set();return[...(a||[]),...(b||[])].filter(r=>r&&r.at&&Array.isArray(r.jobs)).sort((x,y)=>new Date(y.at)-new Date(x.at)).filter(r=>{const k=r.at+"|"+r.jobs.map(j=>j.url||j.title||"").join("|");if(seen.has(k))return false;seen.add(k);return true}).slice(0,250)}function mergeState(base,raw){if(!raw||typeof raw!=="object")return base;const out={...base};if(raw.activeMode&&MODES[raw.activeMode])out.activeMode=raw.activeMode;for(const mode of Object.keys(MODES)){const a=out[mode]||blankMode();const b=raw[mode]||blankMode();const at=a.lastUpdate?new Date(a.lastUpdate).getTime():0;const bt=b.lastUpdate?new Date(b.lastUpdate).getTime():0;out[mode]={lastUpdate:bt>at?b.lastUpdate:a.lastUpdate,latest:bt>at?(Array.isArray(b.latest)?b.latest:[]):(Array.isArray(a.latest)?a.latest:[]),runs:mergeRuns(a.runs,b.runs),pendingSearch:b.pendingSearch||a.pendingSearch||null}}return out}function loadState(){let merged=emptyState();try{const stable=localStorage.getItem(STORAGE_KEY);if(stable)merged=mergeState(merged,JSON.parse(stable))}catch{}try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||key===STORAGE_KEY||!key.startsWith("ujob:"))continue;try{merged=mergeState(merged,JSON.parse(localStorage.getItem(key)||"{}"))}catch{}}}catch{}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(merged))}catch{}return merged}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function fmtDate(value,withTime=false){if(!value)return"Not run yet";return new Intl.DateTimeFormat("en-BE",withTime?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value))}function renderToday(){if(!els.today)return;els.today.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}
function seenUrlsForMode(mode){return (state[mode]?.runs||[]).flatMap(run=>run.jobs.map(j=>j.url)).filter(Boolean)}
function isModeBusy(mode){return Boolean(state[mode]?.pendingSearch?.id)}function syncRunButton(){const busy=isModeBusy(activeMode);els.run.disabled=busy;els.run.textContent=busy?"Running…":"Run"}function setMode(mode){activeMode=mode;state.activeMode=mode;document.body.dataset.mode=mode;document.querySelectorAll(".mode").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));saveState();render();syncRunButton()}
function render(){const meta=MODES[activeMode],modeState=state[activeMode];els.title.textContent=meta.title;els.hint.textContent=meta.hint;els.lastUpdate.textContent=modeState.lastUpdate?`Updated ${fmtDate(modeState.lastUpdate,true)}`:"";els.historyCount.textContent=modeState.runs.reduce((sum,run)=>sum+run.jobs.length,0);els.status.textContent=modeStatus[activeMode]||"";renderResults(modeState.latest);renderHistory(modeState.runs);syncRunButton()}
function renderResults(jobs){if(!jobs.length){els.results.innerHTML='<div class="empty">Run a search to find current vacancies.</div>';return}els.results.innerHTML=jobs.map(job=>`<article class="job"><div class="score">${esc(Number(job.score).toFixed(1))}</div><h2 class="job-title">${esc(job.title)}</h2><div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div><div class="why">${(job.whyFit||[]).map(esc).join(" ")}</div><a class="apply" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">Apply ↗</a>${job.languageCheck?`<div class="lang">${esc(job.languageCheck)}</div>`:""}</article>`).join("")}
function renderHistory(runs){if(!runs.length){els.history.innerHTML='<div class="empty">No history.</div>';return}els.history.innerHTML=runs.map(run=>`<div class="run-group"><div class="run-date">${esc(fmtDate(run.at,true))}</div>${run.jobs.map(job=>`<a class="history-row" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer"><div class="history-score">${esc(Number(job.score).toFixed(1))}</div><div><div class="history-main"><b>${esc(job.title)}</b> · ${esc(job.company)}</div><div class="history-sub">${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div></div></a>`).join("")}</div>`).join("")}
async function apiFetch(url, options={}, timeoutMs=15000){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:controller.signal,cache:"no-store"});
  }finally{
    clearTimeout(timeout);
  }
}

function clearPoll(mode){
  if(pollTimers[mode]){
    clearTimeout(pollTimers[mode]);
    pollTimers[mode]=null;
  }
}

function schedulePoll(mode, delay=3500){
  clearPoll(mode);
  if(document.visibilityState==="hidden")return;
  pollTimers[mode]=setTimeout(()=>pollSearch(mode),delay);
}

function completeModeSearch(mode,data){
  const jobs=Array.isArray(data.jobs)?data.jobs:[];
  const at=data.searchedAt||new Date().toISOString();

  state[mode].latest=jobs;
  state[mode].lastUpdate=at;
  state[mode].pendingSearch=null;
  state[mode].runs.unshift({
    at,
    jobs:jobs.map(({whyFit,languageCheck,...small})=>small)
  });
  state[mode].runs=mergeRuns(state[mode].runs,[]);
  saveState();
  clearPoll(mode);

  modeStatus[mode]=jobs.length===5
    ?"5 verified matches."
    :jobs.length>0
      ?String(jobs.length)+" verified matches found."
      :"Search completed but no verified roles were returned.";

  if(activeMode===mode)render();
}

async function pollSearch(mode){
  const pending=state[mode]?.pendingSearch;
  if(!pending?.id)return;

  try{
    const response=await apiFetch("/api/search/status?id="+encodeURIComponent(pending.id),{},12000);

    if(response.status===404){
      const restarts=Number(pending.restarts||0);
      state[mode].pendingSearch=null;
      saveState();
      clearPoll(mode);

      if(restarts<1){
        modeStatus[mode]="Server refreshed. Restarting search automatically…";
        if(activeMode===mode)render();
        await startModeSearch(mode,restarts+1);
      }else{
        modeStatus[mode]="Search session expired. Tap Run to start again.";
        if(activeMode===mode)render();
      }
      return;
    }

    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Could not read search status.");

    if(data.status==="done"){
      completeModeSearch(mode,data);
      return;
    }

    if(data.status==="error"){
      state[mode].pendingSearch=null;
      saveState();
      clearPoll(mode);
      modeStatus[mode]=data.error||"Search failed.";
      if(activeMode===mode)render();
      return;
    }

    modeStatus[mode]="Search is running in background…";
    if(activeMode===mode){
      els.status.textContent=modeStatus[mode];
      syncRunButton();
    }
    schedulePoll(mode);
  }catch(error){
    modeStatus[mode]="Search is still running. Reconnecting…";
    if(activeMode===mode){
      els.status.textContent=modeStatus[mode];
      syncRunButton();
    }
    schedulePoll(mode,6000);
  }
}

async function startModeSearch(mode,restarts=0){
  if(state[mode]?.pendingSearch?.id){
    schedulePoll(mode,250);
    return;
  }

  modeStatus[mode]="Starting background search…";
  if(activeMode===mode){
    els.status.textContent=modeStatus[mode];
    syncRunButton();
  }

  try{
    const response=await apiFetch("/api/search/start",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode,seenUrls:seenUrlsForMode(mode)})
    },15000);

    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Could not start search.");

    state[mode].pendingSearch={
      id:data.searchId,
      startedAt:new Date().toISOString(),
      restarts
    };
    saveState();

    modeStatus[mode]="Search is running in background…";
    if(activeMode===mode)render();
    schedulePoll(mode,1200);
  }catch(error){
    state[mode].pendingSearch=null;
    saveState();
    const message=error?.name==="AbortError"
      ?"Could not start search. Please try again."
      :(error.message||"Could not start search.");
    modeStatus[mode]=message;
    if(activeMode===mode)render();
  }
}

async function runSearch(){
  const runMode=activeMode;
  await startModeSearch(runMode,0);
}

function resumePendingSearches(){
  for(const mode of Object.keys(MODES)){
    if(state[mode]?.pendingSearch?.id){
      modeStatus[mode]="Search is running in background…";
      schedulePoll(mode,300);
    }
  }
  if(activeMode)render();
}

async function checkHealth(){try{const r=await fetch("/api/health?fresh=25",{cache:"no-store"});const h=await r.json();if(!h.configured)els.status.textContent="Add OPENAI_API_KEY in Railway Variables."}catch{els.status.textContent="Server connection problem."}}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));els.run.addEventListener("click",runSearch);els.historyToggle.addEventListener("click",()=>{const opening=els.history.hidden;els.history.hidden=!opening;els.historyToggle.setAttribute("aria-expanded",String(opening))});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")resumePendingSearches()});window.addEventListener("focus",resumePendingSearches);if("serviceWorker"in navigator)navigator.serviceWorker.register("/service-worker.js?v=26").catch(()=>{});renderToday();setInterval(renderToday,60000);setMode(activeMode);checkHealth();resumePendingSearches();
