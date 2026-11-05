const MODES={search:{title:"Search",hint:"Best 12 opportunities across every U-Job theme, ranked together."},reasonable:{title:"Reasonable",hint:"Realistic next-step roles across fintech, startups, investment/product, transformation and operations — aiming for 5-10 verified matches."},creative:{title:"Creative",hint:"Interior, renovation, finishing, workshop and hands-on project roles."},dogs:{title:"Dogs",hint:"Dog, pet and animal-sector roles where Hondinn gives you a real edge."},kapellen:{title:"Kapellen",hint:"Strong-fit jobs close to Kapellen, Brasschaat, Kalmthout, Stabroek, Schoten and Ekeren."},corporate:{title:"Corporate",hint:"Banking-focused senior and strategic roles."},startup:{title:"Startup",hint:"High-potential Belgian tech startups and scale-ups, Antwerp first."},familyoffice:{title:"Family O.",hint:"Family offices, family capital, owner offices and boutique investment/operations roles."},investment:{title:"Investment",hint:"Investment, wealth, research and economics roles matching your business + analytics + tech profile."},fintech:{title:"Fintech",hint:"Belgium fintech roles matched to your banking, operations and tech profile."},ai:{title:"AI",hint:"AI, GenAI, transformation, product and operations roles."},linkedin:{title:"LinkedIn",hint:"Best-fit LinkedIn roles posted in the last 7 days."},global:{title:"Global",hint:"Elite international remote roles open to Belgium/Europe."},swmo:{title:"SW-MO",hint:"Strong-fit Switzerland and Monaco roles with English sufficient."},prestige:{title:"Prestige",hint:"Power-track institutions, defence, EU/NATO, policy and international influence — up to 10 verified roles."},highpaid:{title:"High Paid",hint:"Compensation upside, seniority and financial leverage."},turkish:{title:"Turkish",hint:"Belgium roles where Turkish or Turkey-market knowledge is an advantage."}};
const STORAGE_KEY="ujob:data";const SYNC_MIGRATED_KEY="ujob:sync-migrated-v2-watchlist-import";let syncReady=false;let syncRevision=0;let syncTimer=null;let syncInFlight=false;const SEARCH_TARGET=12;const SEARCH_FILL_MAX_ROUNDS=4;const DETAIL_MIN_TARGET=3;const DETAIL_FILL_MAX_ROUNDS=3;let state=loadState();let activeMode="search";let activeView="search";let detailsOpen=false;let searchFillRound=0;let searchSessionJobs=[];const detailFillRounds={};const detailSessionJobs={};const msBusy=new Set();const cvBusy=new Set();let askBusy=false;const modeStatus={search:"",reasonable:"",creative:"",dogs:"",kapellen:"",corporate:"",startup:"",familyoffice:"",investment:"",fintech:"",ai:"",linkedin:"",global:"",swmo:"",prestige:"",highpaid:"",turkish:""};const pollTimers={search:null,reasonable:null,creative:null,dogs:null,kapellen:null,corporate:null,startup:null,familyoffice:null,investment:null,fintech:null,ai:null,linkedin:null,global:null,swmo:null,prestige:null,highpaid:null,turkish:null};
function detailMinTargetFor(mode){return mode==="reasonable"?5:DETAIL_MIN_TARGET}
function detailFillMaxRoundsFor(mode){return mode==="reasonable"?5:DETAIL_FILL_MAX_ROUNDS}
const $=id=>document.getElementById(id);const els={today:$("todayDate"),title:$("sectionTitle"),hint:$("sectionHint"),run:$("runButton"),results:$("results"),status:$("status"),lastUpdate:$("lastUpdate"),history:$("history"),historyWrap:document.querySelector(".history-wrap"),historyToggle:$("historyToggle"),historyCount:$("historyCount"),actionsButton:$("actionsMode"),actionsCount:$("actionsCount"),askButton:$("askButton"),askPanel:$("askPanel"),askClose:$("askClose"),askUrl:$("askUrl"),askRun:$("askRun"),askResult:$("askResult"),askHistory:$("askHistory"),primarySearch:$("primarySearch"),primaryDetails:$("primaryDetails"),detailsPanel:$("detailsPanel"),formatButton:$("formatButton")};
function blankMode(){return{lastUpdate:null,latest:[],runs:[],pendingSearch:null}}function isBlockedTarget(job){
  const company=String(job?.company||"").trim();
  return /^(?:ING|ING Bank|ING Belgium|ING Group)(?:\b|\s|[-–—])/i.test(company)||/\bING\s+(?:Bank|Belgium|Group)\b/i.test(company);
}
function cleanModeData(modeData){
  const m=modeData||blankMode();
  return {
    ...m,
    latest:(Array.isArray(m.latest)?m.latest:[]).filter(job=>!isBlockedTarget(job)),
    runs:(Array.isArray(m.runs)?m.runs:[]).map(run=>({...run,jobs:(run.jobs||[]).filter(job=>!isBlockedTarget(job))}))
  };
}

function emptyState(){return{activeMode:"search",activeView:"search",actions:{},msNotes:{},askHistory:[],search:blankMode(),reasonable:blankMode(),creative:blankMode(),dogs:blankMode(),kapellen:blankMode(),corporate:blankMode(),startup:blankMode(),familyoffice:blankMode(),investment:blankMode(),fintech:blankMode(),ai:blankMode(),linkedin:blankMode(),global:blankMode(),swmo:blankMode(),prestige:blankMode(),highpaid:blankMode(),turkish:blankMode()}}
function mergeRuns(a,b){const seen=new Set();return[...(a||[]),...(b||[])].filter(r=>r&&r.at&&Array.isArray(r.jobs)).sort((x,y)=>new Date(y.at)-new Date(x.at)).filter(r=>{const k=r.at+"|"+r.jobs.map(j=>j.url||j.title||"").join("|");if(seen.has(k))return false;seen.add(k);return true}).slice(0,250)}
function mergeModeData(a,b){
  a=a||blankMode();b=b||blankMode();
  const at=a.lastUpdate?new Date(a.lastUpdate).getTime():0;
  const bt=b.lastUpdate?new Date(b.lastUpdate).getTime():0;
  return cleanModeData({lastUpdate:bt>at?b.lastUpdate:a.lastUpdate,latest:bt>at?(Array.isArray(b.latest)?b.latest:[]):(Array.isArray(a.latest)?a.latest:[]),runs:mergeRuns(a.runs,b.runs),pendingSearch:b.pendingSearch||a.pendingSearch||null});
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
  out.actions=Object.fromEntries(Object.entries({...(base.actions||{}),...(raw.actions||{})}).filter(([,job])=>!isBlockedTarget(job)));
  out.msNotes={...(base.msNotes||{}),...(raw.msNotes||{})};
  out.askHistory=mergeAskHistory(base.askHistory,raw.askHistory).filter(item=>!isBlockedTarget(item.job));
  for(const mode of Object.keys(MODES))out[mode]=mergeModeData(out[mode],raw[mode]);
  if(raw.politics)out.prestige=mergeModeData(out.prestige,raw.politics);
  return out;
}
function loadState(){let merged=emptyState();try{const stable=localStorage.getItem(STORAGE_KEY);if(stable)merged=mergeState(merged,JSON.parse(stable))}catch{}try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||key===STORAGE_KEY||!key.startsWith("ujob:"))continue;try{merged=mergeState(merged,JSON.parse(localStorage.getItem(key)||"{}"))}catch{}}}catch{}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(merged))}catch{}return merged}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}if(syncReady)scheduleRemoteSave()}function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}function cleanAskUi(v){return String(v??"").replace(/https?:\/\/\S+/gi,"").replace(/www\.\S+/gi,"").replace(/cite[^]+/g,"").replace(/【[^】]+】/g,"").replace(/\s+/g," ").replace(/\s*[|·•-]\s*$/g,"").trim()}
function fmtDate(value,withTime=false){if(!value)return"Not run yet";return new Intl.DateTimeFormat("en-BE",withTime?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value))}function renderToday(){if(!els.today)return;els.today.textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}
function seenUrlsForMode(mode){const runs=state[mode]?.runs||[];const urls=runs.flatMap(run=>run.jobs.map(j=>j.url)).filter(Boolean);if(mode==="search")urls.push(...searchSessionJobs.map(j=>j.url).filter(Boolean));else urls.push(...(detailSessionJobs[mode]||[]).map(j=>j.url).filter(Boolean));return [...new Set(urls)].slice(-60)}
function isRecentPublishedClient(job,maxDays=30){
  const value=String(job?.publishedDate||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const published=new Date(value+"T00:00:00Z").getTime();
  const now=Date.now();
  const age=(now-published)/86400000;
  return Number.isFinite(age)&&age>=-1&&age<=maxDays+1;
}
function searchJobKey(job){
  const url=String(job?.url||"").trim();
  return url||((String(job?.company||"").trim().toLowerCase())+"|"+(String(job?.title||"").trim().toLowerCase()));
}
function mergeSearchJobs(...lists){
  const map=new Map();
  for(const list of lists){
    for(const raw of list||[]){
      const job={...raw};
      if(isBlockedTarget(job)||!job.title||!job.company||!/^https?:\/\//i.test(String(job.url||"")))continue;
      if(!isRecentPublishedClient(job,30))continue;
      if(Number(job.score||0)<6.2)continue;
      const key=searchJobKey(job);
      const old=map.get(key);
      if(!old||Number(job.score||0)>Number(old.score||0))map.set(key,job);
    }
  }
  return [...map.values()].sort((a,b)=>Number(b.score||0)-Number(a.score||0));
}
function collectSearchCandidatePool(){
  const pool=[];
  for(const mode of Object.keys(MODES)){
    if(mode==="search")continue;
    for(const job of state[mode]?.latest||[])pool.push({...job,sourceMode:mode});
    for(const run of (state[mode]?.runs||[]).slice(0,3)){
      for(const job of run.jobs||[])pool.push({...job,sourceMode:mode});
    }
  }
  const deduped=new Map();
  for(const job of pool){
    if(isBlockedTarget(job)||!job.title||!job.company||!/^https?:\/\//i.test(String(job.url||"")))continue;
    if(!isRecentPublishedClient(job,30))continue;
    if(Number(job.score||0)<6.0)continue;
    const key=searchJobKey(job);
    const old=deduped.get(key);
    if(!old||Number(job.score||0)>Number(old.score||0))deduped.set(key,job);
  }
  return [...deduped.values()].sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,48);
}
function collectTodayVerifiedDetailJobs(){
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const jobs=[];
  for(const mode of Object.keys(MODES)){
    if(mode==="search")continue;
    for(const job of state[mode]?.latest||[]){
      const open=String(job?.openCheck||"");
      const match=String(job?.matchCheck||"");
      const lang=String(job?.languageCheck||"");
      if(!open.includes("CURRENTLY_OPEN")||!open.includes(today))continue;
      if(!/^NO_HARD_GAP\b/i.test(match))continue;
      if(!/english/i.test(lang))continue;
      if(/\b(dutch|french)\b.{0,30}\b(required|mandatory|fluent|professional|native)\b/i.test(lang.replace(/\bnot\s+(mandatory|required)\b/gi,"")))continue;
      if(!Array.isArray(job.whyFit)||job.whyFit.length<3)continue;
      jobs.push({...job,sourceMode:mode});
    }
  }
  return mergeSearchJobs(jobs);
}
const RELATED_MODE_POOLS={
  reasonable:["fintech","startup","investment","familyoffice","corporate","ai","highpaid","kapellen","linkedin","search"],
  fintech:["reasonable","startup","investment","corporate","ai","search"],
  startup:["reasonable","fintech","ai","highpaid","creative","search"],
  investment:["familyoffice","fintech","corporate","reasonable","highpaid","search"],
  familyoffice:["investment","highpaid","corporate","reasonable","startup","search"],
  corporate:["reasonable","fintech","investment","highpaid","search"],
  ai:["startup","fintech","reasonable","highpaid","search"],
  prestige:["highpaid","corporate","familyoffice","global","search"],
  highpaid:["reasonable","startup","investment","familyoffice","corporate","ai","global","search"],
  linkedin:["reasonable","startup","fintech","investment","highpaid","search"],
  global:["startup","fintech","ai","highpaid","prestige","search"],
  swmo:["familyoffice","investment","highpaid","global","prestige","search"],
  kapellen:["reasonable","creative","dogs","startup","corporate","search"],
  creative:["kapellen","startup","familyoffice","highpaid","search"],
  dogs:["kapellen","creative","startup","reasonable","search"],
  turkish:["reasonable","fintech","corporate","startup","search"]
};
function candidateModesFor(mode){
  return mode==="search"?Object.keys(MODES).filter(m=>m!=="search"):(RELATED_MODE_POOLS[mode]||["search","reasonable","startup","fintech"]);
}
function collectCandidatePoolForMode(mode){
  const pool=[];
  for(const sourceMode of candidateModesFor(mode)){
    for(const job of state[sourceMode]?.latest||[])pool.push({...job,sourceMode});
    for(const run of (state[sourceMode]?.runs||[]).slice(0,3)){
      for(const job of run.jobs||[])pool.push({...job,sourceMode});
    }
  }
  const deduped=new Map();
  for(const job of pool){
    if(isBlockedTarget(job)||!job.title||!job.company||!/^https?:\/\//i.test(String(job.url||"")))continue;
    if(!isRecentPublishedClient(job,30))continue;
    if(Number(job.score||0)<6.0)continue;
    const key=searchJobKey(job),old=deduped.get(key);
    if(!old||Number(job.score||0)>Number(old.score||0))deduped.set(key,job);
  }
  return [...deduped.values()].sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,48);
}
function collectTodayVerifiedRelatedJobs(mode){
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const jobs=[];
  for(const sourceMode of candidateModesFor(mode)){
    for(const job of state[sourceMode]?.latest||[]){
      const open=String(job?.openCheck||""),match=String(job?.matchCheck||""),lang=String(job?.languageCheck||"");
      if(!/\b(currently[_ -]?open|open|active|accepting applications|live vacancy)\b/i.test(open))continue;
      if(!open.includes(today)&&!state[sourceMode]?.lastUpdate?.startsWith(today))continue;
      if(!/\b(NO_HARD_GAP|no hard gap|no material gap|requirements realistically matched|transferable fit|mandatory experience matched)\b/i.test(match))continue;
      if(!/english/i.test(lang))continue;
      if(/\b(dutch|french)\b.{0,30}\b(required|mandatory|fluent|professional|native)\b/i.test(lang.replace(/\bnot\s+(mandatory|required)\b/gi,"")))continue;
      if(!Array.isArray(job.whyFit)||job.whyFit.length<3)continue;
      jobs.push({...job,sourceMode});
    }
  }
  return mergeSearchJobs(jobs);
}
function mergeDetailJobs(mode,...lists){
  const all=mergeSearchJobs(...lists);
  const floor=(mode==="global"?7.5:mode==="swmo"?7.2:mode==="reasonable"?6.0:6.2);
  return all.filter(job=>Number(job.score||0)>=floor).slice(0,(mode==="reasonable"||mode==="prestige")?10:5);
}

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
function setDetailsOpen(open){
  detailsOpen=Boolean(open);
  if(els.detailsPanel)els.detailsPanel.hidden=!detailsOpen;
  els.primaryDetails?.classList.toggle("active",detailsOpen||activeMode!=="search");
  els.primaryDetails?.setAttribute("aria-expanded",String(detailsOpen));
  els.primarySearch?.classList.toggle("active",activeView==="search");
}
function showSearchHome(){
  setDetailsOpen(false);
  setMode("search");
}
function isModeBusy(mode){return Boolean(state[mode]?.pendingSearch?.id)}
function syncRunButton(){
  if(activeView==="actions"){els.run.hidden=true;return}
  els.run.hidden=false;
  const busy=isModeBusy(activeMode);
  els.run.disabled=busy;
  els.run.textContent=busy?"Running…":(activeMode==="search"?"Search":"Run");
}
function setMode(mode){
  activeMode=mode;
  activeView=mode;
  state.activeMode=mode;
  state.activeView=mode;
  document.body.dataset.mode=mode;
  document.querySelectorAll(".mode").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));
  els.actionsButton?.classList.remove("active");
  if(mode!=="search")detailsOpen=true;
  if(els.detailsPanel)els.detailsPanel.hidden=!detailsOpen;
  els.primarySearch?.classList.toggle("active",mode==="search");
  els.primaryDetails?.classList.toggle("active",detailsOpen||mode!=="search");
  saveState();
  render();
}
function showActions(){
  activeView="actions";
  state.activeView="actions";
  document.body.dataset.mode="actions";
  document.querySelectorAll(".mode").forEach(btn=>btn.classList.remove("active"));
  els.actionsButton?.classList.add("active");
  els.primarySearch?.classList.remove("active");
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
  els.primarySearch?.classList.toggle("active",activeMode==="search");
  els.primaryDetails?.classList.toggle("active",detailsOpen||activeMode!=="search");
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
  jobs=(jobs||[]).filter(job=>!isBlockedTarget(job));
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
function cvFilename(job){
  const slug=[job.company,job.title].filter(Boolean).join("_").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,90);
  return "Ulas_Atilgan_"+(slug||"Tailored")+"_CV.pdf";
}
function downloadPdfBlob(blob,filename){
  const blobUrl=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=blobUrl;
  a.download=filename;
  a.style.display="none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(blobUrl),120000);
}
async function downloadMasterCvFormat(){
  const button=els.formatButton;
  if(!button)return;
  const old=button.textContent;
  button.disabled=true;button.textContent="…";
  try{
    const response=await apiFetch("/api/cv/format",{method:"GET"},45000);
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||"Could not load CV format.");
    }
    const blob=await response.blob();
    if(blob.type!=="application/pdf")throw new Error("The server did not return a PDF.");
    downloadPdfBlob(blob,"Ulas_Atilgan_UJob_Master_CV_Format.pdf");
  }catch(error){
    alert(error.message||"Could not download CV format.");
  }finally{
    button.disabled=false;button.textContent=old;
  }
}
async function generateCv(key,button){
  const job=state.actions?.[key];
  if(!job||cvBusy.has(key))return;
  const card=button.closest(".action-job");
  const noteEl=card?.querySelector("textarea[data-ms-note-key]");
  const statusEl=card?.querySelector("[data-ms-status]");
  const note=noteEl?.value||state.msNotes?.[key]||"";
  if(!state.msNotes)state.msNotes={};
  state.msNotes[key]=note;
  saveState();

  cvBusy.add(key);
  button.disabled=true;
  button.textContent="Generating CV…";
  if(statusEl)statusEl.textContent="Reading the vacancy and tailoring your CV from the saved base version…";
  try{
    const response=await apiFetch("/api/cv/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({job,note})
    },90000);
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||"Could not generate tailored CV.");
    }
    const blob=await response.blob();
    if(blob.type!=="application/pdf")throw new Error("The server did not return a PDF.");
    downloadPdfBlob(blob,cvFilename(job));
    if(statusEl)statusEl.textContent="Tailored CV downloaded.";
  }catch(error){
    if(statusEl)statusEl.textContent=error?.name==="AbortError"?"CV generation took too long. Try again.":(error.message||"Could not generate tailored CV.");
  }finally{
    cvBusy.delete(key);
    button.disabled=false;
    button.textContent="Generate CV";
  }
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
  if(statusEl)statusEl.textContent="Reading the vacancy, your note and tailoring 7 direct points…";

  try{
    const response=await apiFetch("/api/ms/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({job,note})
    },90000);
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||"Could not generate motivation statements.");
    }
    const blob=await response.blob();
    if(blob.type!=="application/pdf")throw new Error("The server did not return a PDF.");
    downloadPdfBlob(blob,msFilename(job));
    if(statusEl)statusEl.textContent="Motivation Statements downloaded.";
  }catch(error){
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
  root.querySelectorAll("button[data-generate-cv]").forEach(button=>{
    button.addEventListener("click",()=>generateCv(button.dataset.generateCv,button));
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
  jobs=(jobs||[]).filter(job=>!isBlockedTarget(job));
  if(!jobs.length){
    els.results.innerHTML='<div class="empty">Tick Watch on any vacancy to keep it here.</div>';
    return;
  }
  els.results.innerHTML=jobs.map(job=>{
    const key=actionKey(job);
    const note=state.msNotes?.[key]||"";
    const busy=msBusy.has(key),cvBusyNow=cvBusy.has(key);
    return `<article class="job action-job action-compact">
      <h2 class="job-title"><a class="action-title-link" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a></h2>
      <div class="job-meta">${esc(job.company)} · ${esc(job.location)}${job.publishedDate?` · Published ${esc(job.publishedDate)}`:""}</div>
      <div class="ms-tools">
        <div class="doc-buttons"><button class="generate-ms" type="button" data-generate-ms="${esc(key)}"${busy?" disabled":""}>${busy?"Generating PDF…":"Generate MS"}</button><button class="update-cv" type="button" data-generate-cv="${esc(key)}"${cvBusyNow?" disabled":""}>${cvBusyNow?"Generating CV…":"Generate CV"}</button></div>
        <div class="application-note-label">Application note · used for both MS and CV</div>
        <textarea class="ms-note" data-ms-note-key="${esc(key)}" maxlength="1200" rows="3" placeholder="Türkçe veya English yazabilirsin — örn. AI tarafımı öne çıkar, Hondinn'den bahsetme, investments ilgimi ekle…">${esc(note)}</textarea>
        <div class="ms-status" data-ms-status aria-live="polite"></div>
      </div>
      ${appliedControl(job,job.sourceMode||"",false)}
    </article>`;
  }).join("");
  bindAppliedControls(els.results);
  bindMsControls(els.results);
}
function renderHistory(runs,mode){
  runs=(runs||[]).map(run=>({...run,jobs:(run.jobs||[]).filter(job=>!isBlockedTarget(job))})).filter(run=>run.jobs.length);
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
function syncLocalCache(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}
}
function markSyncMigrated(){
  try{localStorage.setItem(SYNC_MIGRATED_KEY,"1")}catch{}
}
function hasSyncMigrated(){
  try{return localStorage.getItem(SYNC_MIGRATED_KEY)==="1"}catch{return false}
}
function scheduleRemoteSave(delay=350){
  if(!syncReady)return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>pushRemoteState(),delay);
}
async function pushRemoteState(){
  if(!syncReady||syncInFlight)return;
  syncInFlight=true;
  clearTimeout(syncTimer);
  syncTimer=null;
  try{
    const response=await apiFetch("/api/sync",{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({baseRevision:syncRevision,state})
    },15000);
    const data=await response.json().catch(()=>({}));
    if(response.status===409&&data.state){
      syncRevision=Number(data.revision||0);
      state=mergeState(mergeState(emptyState(),data.state),state);
      syncLocalCache();
      const retry=await apiFetch("/api/sync",{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({baseRevision:syncRevision,state})
      },15000);
      const retryData=await retry.json().catch(()=>({}));
      if(retry.ok)syncRevision=Number(retryData.revision||syncRevision);
      return;
    }
    if(!response.ok)throw new Error(data.error||"Could not sync U-Job.");
    syncRevision=Number(data.revision||syncRevision);
  }catch(error){
    console.warn("U-Job sync push failed:",error);
    if(syncReady)scheduleRemoteSave(5000);
  }finally{
    syncInFlight=false;
  }
}
async function pullRemoteState(){
  if(syncInFlight)return;
  syncInFlight=true;
  try{
    const response=await apiFetch("/api/sync",{method:"GET"},12000);
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Could not load synced U-Job data.");
    syncRevision=Number(data.revision||0);
    if(data.state&&typeof data.state==="object"){
      state=mergeState(emptyState(),data.state);
      activeMode=state.activeMode&&MODES[state.activeMode]?state.activeMode:"search";
      activeView=state.activeView==="actions"?"actions":(MODES[state.activeView]?state.activeView:activeMode);
      syncLocalCache();
      renderAsk();
      render();
    }
  }catch(error){
    console.warn("U-Job sync pull failed:",error);
  }finally{
    syncInFlight=false;
  }
}
async function bootstrapSync(){
  try{
    // Keep the complete device-local state available for the one-time v2 import.
    const localState=mergeState(emptyState(),state);
    const response=await apiFetch("/api/sync",{method:"GET"},12000);
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Could not start U-Job sync.");
    syncRevision=Number(data.revision||0);

    if(!hasSyncMigrated()){
      // One-time import per device: union existing mobile/desktop history + Watchlist
      // into the central store before remote becomes authoritative.
      state=data.state&&typeof data.state==="object"
        ?mergeState(mergeState(emptyState(),data.state),localState)
        :localState;
      syncLocalCache();
      syncReady=true;
      await pushRemoteState();
      markSyncMigrated();
      return;
    }

    // After the v2 import, central state is authoritative across devices.
    if(data.state&&typeof data.state==="object"){
      state=mergeState(emptyState(),data.state);
      syncLocalCache();
    }else{
      state=localState;
      syncReady=true;
      await pushRemoteState();
      return;
    }
    syncReady=true;
  }catch(error){
    console.warn("U-Job sync bootstrap failed:",error);
    syncReady=true;
  }
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
  let jobs=Array.isArray(data.jobs)?data.jobs:[];
  const at=data.searchedAt||new Date().toISOString();

  if(mode==="search"){
    searchSessionJobs=mergeSearchJobs(searchSessionJobs,jobs,collectTodayVerifiedDetailJobs());
    jobs=searchSessionJobs.slice(0,SEARCH_TARGET);

    state.search.latest=jobs;
    state.search.lastUpdate=at;
    state.search.pendingSearch=null;
    saveState();
    clearPoll("search");

    if(jobs.length<SEARCH_TARGET&&searchFillRound<SEARCH_FILL_MAX_ROUNDS){
      searchFillRound+=1;
      modeStatus.search=String(jobs.length)+" verified so far. Expanding across Details…";
      if(activeView==="search")render();
      setTimeout(()=>startModeSearch("search",0),150);
      return;
    }
  }

  if(mode!=="search"){
    detailSessionJobs[mode]=mergeDetailJobs(mode,detailSessionJobs[mode]||[],jobs,collectTodayVerifiedRelatedJobs(mode));
    jobs=detailSessionJobs[mode];
    state[mode].latest=jobs;
    state[mode].lastUpdate=at;
    state[mode].pendingSearch=null;
    saveState();
    clearPoll(mode);

    const round=Number(detailFillRounds[mode]||0);
    const minTarget=detailMinTargetFor(mode);
    const maxRounds=detailFillMaxRoundsFor(mode);
    if(jobs.length<minTarget&&round<maxRounds){
      detailFillRounds[mode]=round+1;
      modeStatus[mode]=String(jobs.length)+" verified so far. Expanding related sources"+(mode==="reasonable"?" across fintech, startup, investment, transformation and local roles":"")+"…";
      if(activeView===mode)render();
      setTimeout(()=>startModeSearch(mode,0),150);
      return;
    }
  }

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

  const targetMax=mode==="search"?SEARCH_TARGET:(mode==="reasonable"||mode==="prestige")?10:5;
  modeStatus[mode]=jobs.length===targetMax
    ?String(targetMax)+" verified matches."
    :jobs.length>0
      ?String(jobs.length)+" verified matches found after full search expansion."
      :(mode==="search"?"Search expansion completed without enough verified roles.":mode==="reasonable"?"Reasonable exhausted all expanded waves; no current role passed the hard eligibility filters.":"Full expanded search completed; no role passed every hard filter.");

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
      body:JSON.stringify({mode,seenUrls:seenUrlsForMode(mode),candidatePool:collectCandidatePoolForMode(mode)})
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
  if(runMode==="search"){searchFillRound=0;searchSessionJobs=[];}else{detailFillRounds[runMode]=0;detailSessionJobs[runMode]=[];}
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

async function checkHealth(){try{const r=await fetch("/api/health?fresh=56",{cache:"no-store"});const h=await r.json();if(!h.configured)els.status.textContent="Add OPENAI_API_KEY in Railway Variables."}catch{els.status.textContent="Server connection problem."}}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
els.primarySearch?.addEventListener("click",showSearchHome);
els.primaryDetails?.addEventListener("click",()=>setDetailsOpen(!detailsOpen));
els.actionsButton?.addEventListener("click",showActions);
els.formatButton?.addEventListener("click",downloadMasterCvFormat);
els.run.addEventListener("click",runSearch);
els.historyToggle.addEventListener("click",()=>{const opening=els.history.hidden;els.history.hidden=!opening;els.historyToggle.setAttribute("aria-expanded",String(opening))});
els.askButton?.addEventListener("click",()=>setAskOpen(Boolean(els.askPanel?.hidden)));
els.askClose?.addEventListener("click",()=>setAskOpen(false));
els.askRun?.addEventListener("click",analyzeAsk);
els.askUrl?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();analyzeAsk()}});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!els.askPanel?.hidden)setAskOpen(false)});
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){
    pullRemoteState().finally(resumePendingSearches);
  }else if(syncReady){
    pushRemoteState();
  }
});
window.addEventListener("focus",()=>pullRemoteState().finally(resumePendingSearches));
renderToday();setInterval(renderToday,60000);
async function initUJob(){
  await bootstrapSync();
  activeMode="search";
  activeView="search";
  state.activeMode="search";
  state.activeView="search";
  syncLocalCache();
  setDetailsOpen(false);
  render();
  renderAsk();
  checkHealth();
  resumePendingSearches();
}
initUJob();