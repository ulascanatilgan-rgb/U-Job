const MODES={reasonable:{title:"Reasonable",hint:"Balanced, dynamic next step."},creative:{title:"Creative",hint:"Niche, hands-on, dream-job territory."},corporate:{title:"Corporate",hint:"Prestige, compensation, career leverage."},politics:{title:"Politics",hint:"Policy, institutions, influence and international network."}};
const STORAGE_KEY="ujob:data";let state=loadState();let activeMode=state.activeMode||"reasonable";let activeView=state.activeView||activeMode;const modeStatus={reasonable:"",creative:"",corporate:"",politics:""};const pollTimers={reasonable:null,creative:null,corporate:null,politics:null};
const $=id=>document.getElementById(id);const els={today:$("todayDate"),title:$("sectionTitle"),hint:$("sectionHint"),run:$("runButton"),results:$("results"),status:$("status"),lastUpdate:$("lastUpdate"),history:$("history"),historyWrap:document.querySelector(".history-wrap"),historyToggle:$("historyToggle"),historyCount:$("historyCount"),actionsButton:$("actionsMode"),actionsCount:$("actionsCount")};
function blankMode(){return{lastUpdate:null,latest:[],runs:[],pendingSearch:null}}function emptyState(){return{activeMode:"reasonable",activeView:"reasonable",actions:{},reasonable:blankMode(),creative:blankMode(),corporate:blankMode(),politics:blankMode()}}function mergeRuns(a,b){const seen=new Set();return[...(a||[]),...(b||[])].filter(r=>r&&r.at&&Array.isArray(r.jobs)).sort((x,y)=>new Date(y.at)-new Date(x.at)).filter(r=>{const k=r.at+"|"+r.jobs.map(j=>j.url||j.title||"").join("|");if(seen.has(k))return false;seen.add(k);return true}).slice(0,250)}function mergeState(base,raw){if(!raw||typeof raw!=="object")return base;const out={...base};if(raw.activeMode&&MODES[raw.activeMode])out.activeMode=raw.activeMode;if(raw.activeView&&(MODES[raw.activeView]||raw.activeView==="actions"))out.activeView=raw.activeView;out.actions={...(base.actions||{}),...(raw.actions||{})};for(const mode of Object.keys(MODES)){const a=out[mode]||blankMode();const b=raw[mode]||blankMode();const at=a.lastUpdate?new Date(a.lastUpdate).getTime():0;const bt=b.lastUpdate?new Date(b.lastUpdate).getTime():0;out[mode]={lastUpdate:bt>at?b.lastUpdate:a.lastUpdate,latest:bt>at?(Array.isArray(b.latest)?b.latest:[]):(Array.isArray(a.latest)?a.latest:[]),runs:mergeRuns(a.runs,b.runs),pendingSearch:b.pendingSearch||a.pendingSearch||null}}return out}function loadState(){let merged=emptyState();try{const stable=localStorage.getItem(STORAGE_KEY);if(stable)merged=mergeState(merged,JSON.parse(stable))}catch{}try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||key===STORAGE_KEY||!key.startsWith("ujob:"))continue;try{merged=mergeState(merged,JSON.parse(localStorage.getItem(key)||"{}"))}catch{}}}catch{}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(merged))}catch{}return merged}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function fmtDate(value,withTime=false){if(!value)return"Not run yet";return new Intl.DateTimeFormat("en-BE",withTime?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value))}function renderToday(){if(!els.today)return;els.today.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}
function seenUrlsForMode(mode){return (state[mode]?.runs||[]).flatMap(run=>run.jobs.map(j=>j.url)).filter(Boolean)}
function actionKey(job){return String(job?.url||"").trim()}
function actionCount(){return Object.keys(state.actions||{}).length}
function findJobByKey(key,preferredMode){
  const modes=preferredMode&&MODES[preferredMode]?[preferredMode,...Object.keys(MODES).filter(m=>m!==preferredMode)]:Object.keys(MODES);
  for(const mode of modes){
    const latest=(state[mode]?.latest||[]).find(job=>actionKey(job)===key);
    if(latest)return{...latest,sourceMode:mode};
    for(const run of state[mode]?.runs||[]){
      const found=(run.jobs||[]).find(job=>actionKey(job)===key);
      if(found)return{...found,sourceMode:mode};
    }
  }
  return state.actions?.[key]||null;
}
function toggleApplied(key,mode,checked){
  if(!state.actions)state.actions={};
  if(checked){
    const job=findJobByKey(key,mode);
    if(job){
      const existing=state.actions[key];
      state.actions[key]={...job,sourceMode:mode||job.sourceMode||activeMode,appliedAt:existing?.appliedAt||new Date().toISOString()};
    }
  }else{
    delete state.actions[key];
  }
  saveState();
  render();
}
function appliedControl(job,mode,history=false){
  const key=actionKey(job);
  if(!key)return"";
  const checked=state.actions?.[key]?" checked":"";
  return `<label class="applied-control${history?" history-applied":""}"><input type="checkbox" data-applied-key="${esc(key)}" data-mode="${esc(mode||"")}"${checked}><span>Applied</span></label>`;
}
function bindAppliedControls(root){
  root.querySelectorAll("input[data-applied-key]").forEach(input=>{
    input.addEventListener("click",event=>event.stopPropagation());
    input.addEventListener("change",event=>{
      event.stopPropagation();
      toggleApplied(input.dataset.appliedKey,input.dataset.mode,input.checked);
    });
  });
}
function isModeBusy(mode){return Boolean(state[mode]?.pendingSearch?.id)}
function syncRunButton(){
  if(activeView==="actions"){els.run.hidden=true;return}
  els.run.hidden=false;
  const busy=isModeBusy(activeMode);
  els.run.disabled=busy;
  els.run.textContent=busy?"Running…":"Run";
}
function setMode(mode){
  activeMode=mode;
  activeView=mode;
  state.activeMode=mode;
  state.activeView=mode;
  document.body.dataset.mode=mode;
  document.querySelectorAll(".mode").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));
  els.actionsButton?.classList.remove("active");
  saveState();
  render();
}
function showActions(){
  activeView="actions";
  state.activeView="actions";
  document.body.dataset.mode="actions";
  document.querySelectorAll(".mode").forEach(btn=>btn.classList.remove("active"));
  els.actionsButton?.classList.add("active");
  saveState();
  render();
}
function renderActions(){
  const jobs=Object.values(state.actions||{}).sort((a,b)=>new Date(b.appliedAt||0)-new Date(a.appliedAt||0));
  els.title.textContent="Actions";
  els.hint.textContent="Roles you applied to or contacted.";
  els.lastUpdate.textContent="";
  els.status.textContent=jobs.length?String(jobs.length)+" actioned role"+(jobs.length===1?"":"s")+".":"";
  els.historyWrap.hidden=true;
  els.actionsCount.textContent=String(jobs.length);
  renderActionResults(jobs);
  syncRunButton();
}
function render(){
  els.actionsCount.textContent=String(actionCount());
  if(activeView==="actions"){renderActions();return}
  els.historyWrap.hidden=false;
  els.actionsButton?.classList.remove("active");
  const meta=MODES[activeMode],modeState=state[activeMode];
  els.title.textContent=meta.title;
  els.hint.textContent=meta.hint;
  els.lastUpdate.textContent=modeState.lastUpdate?`Updated ${fmtDate(modeState.lastUpdate,true)}`:"";
  els.historyCount.textContent=modeState.runs.reduce((sum,run)=>sum+run.jobs.length,0);
  els.status.textContent=modeStatus[activeMode]||"";
  renderResults(modeState.latest,activeMode);
  renderHistory(modeState.runs,activeMode);
  syncRunButton();
}
function renderResults(jobs,mode){
  if(!jobs.length){
    els.results.innerHTML='<div class="empty">Run a search to find current vacancies.</div>';
    return;
  }
  els.results.innerHTML=jobs.map(job=>`<article class="job">
    <div class="score">${esc(Number(job.score).toFixed(1))}</div>
    <h2 class="job-title">${esc(job.title)}</h2>
    <div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div>
    <div class="why">${(job.whyFit||[]).map(esc).join(" ")}</div>
    <a class="apply" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">Apply ↗</a>
    ${job.languageCheck?`<div class="lang">${esc(job.languageCheck)}</div>`:""}
    ${appliedControl(job,mode,false)}
  </article>`).join("");
  bindAppliedControls(els.results);
}
function renderActionResults(jobs){
  if(!jobs.length){
    els.results.innerHTML='<div class="empty">Tick Applied on any vacancy to keep it here.</div>';
    return;
  }
  els.results.innerHTML=jobs.map(job=>`<article class="job action-job action-compact">
    <h2 class="job-title"><a class="action-title-link" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a></h2>
    <div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div>
    ${appliedControl(job,job.sourceMode||"",false)}
  </article>`).join("");
  bindAppliedControls(els.results);
}
function renderHistory(runs,mode){
  if(!runs.length){
    els.history.innerHTML='<div class="empty">No history.</div>';
    return;
  }
  els.history.innerHTML=runs.map(run=>`<div class="run-group">
    <div class="run-date">${esc(fmtDate(run.at,true))}</div>
    ${run.jobs.map(job=>`<div class="history-row">
      <div class="history-score">${esc(Number(job.score).toFixed(1))}</div>
      <a class="history-link" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">
        <div class="history-main"><b>${esc(job.title)}</b> · ${esc(job.company)}</div>
        <div class="history-sub">${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div>
      </a>
      ${appliedControl(job,mode,true)}
    </div>`).join("")}
  </div>`).join("");
  bindAppliedControls(els.history);
}
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

  if(activeView===mode)render();
}

async function pollSearch(mode){
  const pending=state[mode]?.pendingSearch;
  if(!pending?.id)return;

  try{
    const response=await apiFetch("/api/search/status?id="+encodeURIComponent(pending.id)+"&mode="+encodeURIComponent(mode),{},12000);

    if(response.status===404){
      const restarts=Number(pending.restarts||0);
      state[mode].pendingSearch=null;
      saveState();
      clearPoll(mode);

      if(restarts<1){
        modeStatus[mode]="Server refreshed. Restarting search automatically…";
        if(activeView===mode)render();
        await startModeSearch(mode,restarts+1);
      }else{
        modeStatus[mode]="Search session expired. Tap Run to start again.";
        if(activeView===mode)render();
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
      if(activeView===mode)render();
      return;
    }

    modeStatus[mode]="Search is running in background…";
    if(activeView===mode){
      els.status.textContent=modeStatus[mode];
      syncRunButton();
    }
    schedulePoll(mode);
  }catch(error){
    modeStatus[mode]="Search is still running. Reconnecting…";
    if(activeView===mode){
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
  if(activeView===mode){
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
    if(activeView===mode)render();
    schedulePoll(mode,1200);
  }catch(error){
    state[mode].pendingSearch=null;
    saveState();
    const message=error?.name==="AbortError"
      ?"Could not start search. Please try again."
      :(error.message||"Could not start search.");
    modeStatus[mode]=message;
    if(activeView===mode)render();
  }
}

async function runSearch(){
  if(activeView==="actions")return;
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
  render();
}

async function checkHealth(){try{const r=await fetch("/api/health?fresh=27",{cache:"no-store"});const h=await r.json();if(!h.configured)els.status.textContent="Add OPENAI_API_KEY in Railway Variables."}catch{els.status.textContent="Server connection problem."}}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));els.actionsButton?.addEventListener("click",showActions);els.run.addEventListener("click",runSearch);els.historyToggle.addEventListener("click",()=>{const opening=els.history.hidden;els.history.hidden=!opening;els.historyToggle.setAttribute("aria-expanded",String(opening))});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")resumePendingSearches()});window.addEventListener("focus",resumePendingSearches);renderToday();setInterval(renderToday,60000);if(activeView==="actions")showActions();else setMode(activeMode);checkHealth();resumePendingSearches();
