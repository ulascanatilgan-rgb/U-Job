const MODES={reasonable:{title:"Reasonable",hint:"Fintech-first Business Operations & Strategy roles — up to 10 verified matches."},creative:{title:"Creative",hint:"Interior, renovation, finishing, workshop and hands-on project roles."},kapellen:{title:"Kapellen",hint:"Strong-fit jobs close to Kapellen, Brasschaat, Kalmthout, Stabroek, Schoten and Ekeren."},corporate:{title:"Corporate",hint:"Banking-focused senior and strategic roles."},fintech:{title:"Fintech",hint:"Belgium fintech roles matched to your banking, operations and tech profile."},ai:{title:"AI",hint:"AI, GenAI, transformation, product and operations roles."},linkedin:{title:"LinkedIn",hint:"Best-fit LinkedIn roles posted in the last 7 days."},global:{title:"Global",hint:"Elite international remote roles open to Belgium/Europe."},swmo:{title:"SW-MO",hint:"Strong-fit Switzerland and Monaco roles with English sufficient."},prestige:{title:"Prestige",hint:"Power-track institutions, defence, EU/NATO, policy and international influence — up to 10 verified roles."},highpaid:{title:"High Paid",hint:"Compensation upside, seniority and financial leverage."},turkish:{title:"Turkish",hint:"Belgium roles where Turkish or Turkey-market knowledge is an advantage."}};
const STORAGE_KEY="ujob:data";let state=loadState();let activeMode=state.activeMode||"reasonable";let activeView=state.activeView||activeMode;const msBusy=new Set();let askBusy=false;const modeStatus={reasonable:"",creative:"",kapellen:"",corporate:"",fintech:"",ai:"",linkedin:"",global:"",swmo:"",prestige:"",highpaid:"",turkish:""};const pollTimers={reasonable:null,creative:null,kapellen:null,corporate:null,fintech:null,ai:null,linkedin:null,global:null,swmo:null,prestige:null,highpaid:null,turkish:null};
const $=id=>document.getElementById(id);const els={today:$("todayDate"),title:$("sectionTitle"),hint:$("sectionHint"),run:$("runButton"),results:$("results"),status:$("status"),lastUpdate:$("lastUpdate"),history:$("history"),historyWrap:document.querySelector(".history-wrap"),historyToggle:$("historyToggle"),historyCount:$("historyCount"),actionsButton:$("actionsMode"),actionsCount:$("actionsCount"),askButton:$("askButton"),askPanel:$("askPanel"),askClose:$("askClose"),askUrl:$("askUrl"),askRun:$("askRun"),askResult:$("askResult"),askHistory:$("askHistory")};
function blankMode(){return{lastUpdate:null,latest:[],runs:[],pendingSearch:null}}
function emptyState(){return{activeMode:"reasonable",activeView:"reasonable",actions:{},msNotes:{},askHistory:[],reasonable:blankMode(),creative:blankMode(),kapellen:blankMode(),corporate:blankMode(),fintech:blankMode(),ai:blankMode(),linkedin:blankMode(),global:blankMode(),swmo:blankMode(),prestige:blankMode(),highpaid:blankMode(),turkish:blankMode()}}
function mergeRuns(a,b){const seen=new Set();return[...(a||[]),...(b||[])].filter(r=>r&&r.at&&Array.isArray(r.jobs)).sort((x,y)=>new Date(y.at)-new Date(x.at)).filter(r=>{const k=r.at+"|"+r.jobs.map(j=>j.url||j.title||"").join("|");if(seen.has(k))return false;seen.add(k);return true}).slice(0,250)}
function mergeModeData(a,b){
  a=a||blankMode();b=b||blankMode();
  const at=a.lastUpdate?new Date(a.lastUpdate).getTime():0;
  const bt=b.lastUpdate?new Date(b.lastUpdate).getTime():0;
  return{lastUpdate:bt>at?b.lastUpdate:a.lastUpdate,latest:bt>at?(Array.isArray(b.latest)?b.latest:[]):(Array.isArray(a.latest)?a.latest:[]),runs:mergeRuns(a.runs,b.runs),pendingSearch:b.pendingSearch||a.pendingSearch||null};
}
function mergeAskHistory(a,b){
  const seen=new Set();
  return [...(a||[]),...(b||[])].filter(item=>item&&item.job&&item.job.url).sort((x,y)=>new Date(y.analyzedAt||0)-new Date(x.analyzedAt||0)).filter(item=>{
    const k=(item.analyzedAt||"")+"|"+item.job.url;
    if(seen.has(k))return false;
    seen.add(k);return true;
  }).slice(0,100);
}
function mergeState(base,raw){
  if(!raw||typeof raw!=="object")return base;
  const out={...base};
  if(raw.activeMode==="politics")out.activeMode="prestige";else if(raw.activeMode&&MODES[raw.activeMode])out.activeMode=raw.activeMode;
  if(raw.activeView==="politics")out.activeView="prestige";else if(raw.activeView&&(MODES[raw.activeView]||raw.activeView==="actions"))out.activeView=raw.activeView;
  out.actions={...(base.actions||{}),...(raw.actions||{})};
  out.msNotes={...(base.msNotes||{}),...(raw.msNotes||{})};
  out.askHistory=mergeAskHistory(base.askHistory,raw.askHistory);
  for(const mode of Object.keys(MODES))out[mode]=mergeModeData(out[mode],raw[mode]);
  if(raw.politics)out.prestige=mergeModeData(out.prestige,raw.politics);
  return out;
}
function loadState(){let merged=emptyState();try{const stable=localStorage.getItem(STORAGE_KEY);if(stable)merged=mergeState(merged,JSON.parse(stable))}catch{}try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||key===STORAGE_KEY||!key.startsWith("ujob:"))continue;try{merged=mergeState(merged,JSON.parse(localStorage.getItem(key)||"{}"))}catch{}}}catch{}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(merged))}catch{}return merged}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}function cleanAskUi(v){return String(v??"").replace(/https?:\/\/\S+/gi,"").replace(/www\.\S+/gi,"").replace(/cite[^]+/g,"").replace(/【[^】]+】/g,"").replace(/\s+/g," ").replace(/\s*[|·•-]\s*$/g,"").trim()}
function fmtDate(value,withTime=false){if(!value)return"Not run yet";return new Intl.DateTimeFormat("en-BE",withTime?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value))}function renderToday(){if(!els.today)return;els.today.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}
function seenUrlsForMode(mode){return (state[mode]?.runs||[]).flatMap(run=>run.jobs.map(j=>j.url)).filter(Boolean).slice(-60)}
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
  return `<label class="applied-control${history?" history-applied":""}"><input type="checkbox" data-applied-key="${esc(key)}" data-mode="${esc(mode||"")}"${checked}><span>Watch</span></label>`;
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
  els.title.textContent="Watchlist";
  els.hint.textContent="Roles you want to follow or act on.";
  els.lastUpdate.textContent="";
  els.status.textContent=jobs.length?String(jobs.length)+" watched role"+(jobs.length===1?"":"s")+".":"";
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
    ${mode==="global"&&job.remoteCheck?`<div class="remote-check">◉ ${esc(job.remoteCheck)}</div>`:""}
    ${mode==="swmo"&&job.mobilityCheck?`<div class="mobility-check">✦ ${esc(job.mobilityCheck)}</div>`:""}
    ${appliedControl(job,mode,false)}
  </article>`).join("");
  bindAppliedControls(els.results);
}
function msFilename(job){
  const slug=[job.company,job.title].filter(Boolean).join("_").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,90);
  return "Ulas_Atilgan_"+(slug||"Motivation_Statement")+"_MSVersion1.pdf";
}
async function generateMs(key,button){
  const job=state.actions?.[key];
  if(!job||msBusy.has(key))return;
  const card=button.closest(".action-job");
  const noteEl=card?.querySelector("textarea[data-ms-note-key]");
  const statusEl=card?.querySelector("[data-ms-status]");
  const note=noteEl?.value||state.msNotes?.[key]||"";
  if(!state.msNotes)state.msNotes={};
  state.msNotes[key]=note;
  saveState();

  msBusy.add(key);
  button.disabled=true;
  button.textContent="Generating PDF…";
  if(statusEl)statusEl.textContent="Reading the vacancy and tailoring 7 points…";

  let preview=null;
  try{preview=window.open("","_blank");}catch{}
  try{
    const response=await apiFetch("/api/ms/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({job,note})
    },90000);

    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||"Could not generate motivation statement.");
    }
    const blob=await response.blob();
    if(blob.type!=="application/pdf")throw new Error("The server did not return a PDF.");
    const blobUrl=URL.createObjectURL(blob);
    if(preview){
      preview.location.href=blobUrl;
    }else{
      const a=document.createElement("a");
      a.href=blobUrl;a.download=msFilename(job);document.body.appendChild(a);a.click();a.remove();
    }
    if(statusEl)statusEl.textContent="PDF ready.";
    setTimeout(()=>URL.revokeObjectURL(blobUrl),120000);
  }catch(error){
    try{preview?.close()}catch{}
    if(statusEl)statusEl.textContent=error?.name==="AbortError"?"Generation took too long. Try again.":(error.message||"Could not generate PDF.");
  }finally{
    msBusy.delete(key);
    button.disabled=false;
    button.textContent="Generate MS";
  }
}
function bindMsControls(root){
  root.querySelectorAll("textarea[data-ms-note-key]").forEach(area=>{
    area.addEventListener("input",()=>{
      if(!state.msNotes)state.msNotes={};
      state.msNotes[area.dataset.msNoteKey]=area.value.slice(0,1200);
      saveState();
    });
  });
  root.querySelectorAll("button[data-generate-ms]").forEach(button=>{
    button.addEventListener("click",()=>generateMs(button.dataset.generateMs,button));
  });
}
function addAskToWatchlist(job){
  const key=actionKey(job);if(!key)return;
  if(!state.actions)state.actions={};
  const existing=state.actions[key];
  state.actions[key]={...job,title:cleanAskUi(job.title),company:cleanAskUi(job.company),location:cleanAskUi(job.location),whyFit:(job.whyFit||[]).map(cleanAskUi),sourceMode:"ask",appliedAt:existing?.appliedAt||new Date().toISOString()};
  saveState();renderAsk();if(activeView==="actions")render();
}
function askResultCard(item,history=false){
  const job=item&&item.job;if(!job)return"";
  const key=actionKey(job),watched=Boolean(state.actions?.[key]);
  const title=cleanAskUi(job.title),company=cleanAskUi(job.company);
  const reasons=(job.whyFit||[]).map(v=>"<p>"+esc(cleanAskUi(v))+"</p>").join("");
  return "<article class=\"ask-result-card"+(history?" ask-history-card":"")+"\">"+
    "<div class=\"ask-score\">"+esc(Number(job.score||0).toFixed(1))+"</div>"+
    "<div class=\"ask-result-main\"><h3>"+esc(title)+"</h3>"+
    "<div class=\"ask-meta\">"+esc(company)+"</div>"+
    "<div class=\"ask-reasons\">"+reasons+"</div>"+
    "<div class=\"ask-actions\"><a href=\""+esc(job.url)+"\" target=\"_blank\" rel=\"noopener noreferrer\">Open job ↗</a>"+
    "<button type=\"button\" data-ask-watch=\""+esc(key)+"\" "+(watched?"disabled":"")+">"+(watched?"In Watchlist":"Add to Watchlist")+"</button></div></div></article>";
}
function renderAsk(){
  if(!els.askResult||!els.askHistory)return;
  const items=Array.isArray(state.askHistory)?state.askHistory:[];
  els.askResult.innerHTML=items.length?askResultCard(items[0],false):"<div class=\"ask-empty\">Paste a vacancy link to score it against your profile.</div>";
  els.askHistory.innerHTML=items.slice(1).map(item=>askResultCard(item,true)).join("")||"<div class=\"ask-empty small\">No previous Ask analyses yet.</div>";
  document.querySelectorAll("[data-ask-watch]").forEach(btn=>btn.addEventListener("click",()=>{
    const item=(state.askHistory||[]).find(x=>actionKey(x.job)===btn.dataset.askWatch);
    if(item?.job)addAskToWatchlist(item.job);
  }));
}
function setAskOpen(open){
  if(!els.askPanel)return;els.askPanel.hidden=!open;els.askButton?.setAttribute("aria-expanded",String(open));
  if(open){renderAsk();setTimeout(()=>els.askUrl?.focus(),50)}
}
async function analyzeAsk(){
  if(askBusy)return;
  const url=String(els.askUrl?.value||"").trim();
  if(!/^https?:\/\//i.test(url)){els.askResult.innerHTML="<div class=\"ask-error\">Enter a valid job vacancy link.</div>";return}
  askBusy=true;els.askRun.disabled=true;els.askRun.textContent="Analyzing…";
  els.askResult.innerHTML="<div class=\"ask-loading\">Reading the vacancy and scoring your fit…</div>";
  try{
    const response=await apiFetch("/api/ask/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})},60000);
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Could not analyze this vacancy.");
    const item={job:data.job,analyzedAt:data.analyzedAt||new Date().toISOString()};
    state.askHistory=mergeAskHistory([item],state.askHistory||[]);saveState();renderAsk();
  }catch(error){
    const msg=error?.name==="AbortError"?"Analysis took too long. Try again.":(error.message||"Could not analyze this vacancy.");
    els.askResult.innerHTML="<div class=\"ask-error\">"+esc(msg)+"</div>";
  }finally{askBusy=false;els.askRun.disabled=false;els.askRun.textContent="Analyze"}
}
function renderActionResults(jobs){
  if(!jobs.length){
    els.results.innerHTML='<div class="empty">Tick Watch on any vacancy to keep it here.</div>';
    return;
  }
  els.results.innerHTML=jobs.map(job=>{
    const key=actionKey(job);
    const note=state.msNotes?.[key]||"";
    const busy=msBusy.has(key);
    return `<article class="job action-job action-compact">
      <h2 class="job-title"><a class="action-title-link" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a></h2>
      <div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div>
      <div class="ms-tools">
        <button class="generate-ms" type="button" data-generate-ms="${esc(key)}"${busy?" disabled":""}>${busy?"Generating PDF…":"Generate MS"}</button>
        <textarea class="ms-note" data-ms-note-key="${esc(key)}" maxlength="1200" rows="2" placeholder="MS note — e.g. emphasize AI, mention investments, do not mention Hondinn…">${esc(note)}</textarea>
        <div class="ms-status" data-ms-status aria-live="polite"></div>
      </div>
      ${appliedControl(job,job.sourceMode||"",false)}
    </article>`;
  }).join("");
  bindAppliedControls(els.results);
  bindMsControls(els.results);
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

  const targetMax=(mode==="reasonable"||mode==="prestige")?10:5;
  modeStatus[mode]=jobs.length===targetMax
    ?String(targetMax)+" verified matches."
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

async function checkHealth(){try{const r=await fetch("/api/health?fresh=45",{cache:"no-store"});const h=await r.json();if(!h.configured)els.status.textContent="Add OPENAI_API_KEY in Railway Variables."}catch{els.status.textContent="Server connection problem."}}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
els.actionsButton?.addEventListener("click",showActions);
els.run.addEventListener("click",runSearch);
els.historyToggle.addEventListener("click",()=>{const opening=els.history.hidden;els.history.hidden=!opening;els.historyToggle.setAttribute("aria-expanded",String(opening))});
els.askButton?.addEventListener("click",()=>setAskOpen(Boolean(els.askPanel?.hidden)));
els.askClose?.addEventListener("click",()=>setAskOpen(false));
els.askRun?.addEventListener("click",analyzeAsk);
els.askUrl?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();analyzeAsk()}});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!els.askPanel?.hidden)setAskOpen(false)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")resumePendingSearches()});
window.addEventListener("focus",resumePendingSearches);
renderToday();setInterval(renderToday,60000);if(activeView==="actions")showActions();else setMode(activeMode);renderAsk();checkHealth();resumePendingSearches();
