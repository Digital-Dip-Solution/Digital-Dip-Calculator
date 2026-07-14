function interp(data,v){for(let i=0;i<data.length-1;i++){let a=data[i],b=data[i+1];if(v==a[0])return a[1];if(v>=a[0]&&v<=b[0])return a[1]+(v-a[0])*(b[1]-a[1])/(b[0]-a[0]);}return null;}

function calc(id,data,res){
  const v=parseFloat(document.getElementById(id).value);
  const r=document.getElementById(res);
  const gaugeId='g'+id.slice(1);
  const pctId='p'+id.slice(1);
  const gauge=document.getElementById(gaugeId);
  const pctEl=document.getElementById(pctId);
  const maxLitres=data[data.length-1][1];

  r.classList.remove('is-error');

  if(isNaN(v)){
    r.innerText='0.00 L';
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='0% full';
    return;
  }

  const x=interp(data,v);

  if(x==null){
    r.innerText='Out of range';
    r.classList.add('is-error');
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='check reading';
    return;
  }

  r.innerText=x.toFixed(1)+' L';
  const pct=Math.max(0,Math.min(100,(x/maxLitres)*100));
  if(gauge) gauge.style.height=pct.toFixed(1)+'%';
  if(pctEl) pctEl.innerText=pct.toFixed(0)+'% full';
}

/* ---------- Clear a single tank's input ---------- */
function clearInput(inputId,data,res){
  const input=document.getElementById(inputId);
  input.value='';
  input.focus();
  calc(inputId,data,res);
}

/* ---------- Live clock ---------- */
function tickClock(){
  const el=document.getElementById('clock');
  if(!el) return;
  const now=new Date();
  const dateStr=now.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
  const timeStr=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  el.innerText=dateStr+'  •  '+timeStr;
}
setInterval(tickClock,1000);
tickClock();

/* ---------- Reading history (persisted in localStorage) ---------- */
const HISTORY_KEY='fuelDipHistory';

function loadHistory(){
  try{
    return JSON.parse(localStorage.getItem(HISTORY_KEY))||[];
  }catch(e){
    return [];
  }
}

function persistHistory(list){
  try{
    localStorage.setItem(HISTORY_KEY,JSON.stringify(list));
  }catch(e){ /* storage unavailable, ignore */ }
}

function saveReading(inputId,tankLabel){
  const input=document.getElementById(inputId);
  const resultEl=document.getElementById('r'+inputId.slice(1));
  const dip=input.value;
  const volumeText=resultEl.innerText;

  if(dip===''||isNaN(parseFloat(dip))){
    resultEl.classList.add('is-error');
    return;
  }
  if(volumeText.toLowerCase().includes('out of range')) return;

  const entry={
    tank:tankLabel,
    dip:parseFloat(dip),
    volume:volumeText,
    time:new Date().toLocaleString(undefined,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
  };

  const list=loadHistory();
  list.unshift(entry);
  if(list.length>200) list.length=200;
  persistHistory(list);
  renderHistory();
}

function clearHistory(){
  persistHistory([]);
  renderHistory();
}

function renderHistory(){
  const container=document.getElementById('historyList');
  if(!container) return;
  const list=loadHistory();

  if(list.length===0){
    container.innerHTML='<div class="history-empty">No readings saved yet.</div>';
    return;
  }

  container.innerHTML=list.map(e=>
    '<div class="history-row">'+
      '<span class="history-tank">'+e.tank+'</span>'+
      '<span class="history-dip">'+e.dip+' mm</span>'+
      '<span class="history-vol">'+e.volume+'</span>'+
      '<span class="history-time">'+e.time+'</span>'+
    '</div>'
  ).join('');
}

renderHistory();

/* ---------- Export history as CSV ---------- */
function exportHistoryCSV(){
  const list=loadHistory();
  if(list.length===0){ alert('No readings saved yet.'); return; }

  let csv='Tank,Dip (mm),Volume,Date & Time\n';
  list.forEach(e=>{
    csv+='"'+e.tank+'","'+e.dip+'","'+e.volume+'","'+e.time+'"\n';
  });

  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,10);
  a.href=url;
  a.download='fuel-dip-history-'+stamp+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Share history via WhatsApp ---------- */
function shareHistoryWhatsApp(){
  const list=loadHistory();
  if(list.length===0){ alert('No readings saved yet.'); return; }

  const recent=list.slice(0,20);
  let text='*Fuel Dip Reading History*\n\n';
  recent.forEach(e=>{
    text+=e.time+' | '+e.tank+' | Dip: '+e.dip+'mm | '+e.volume+'\n';
  });
  if(list.length>20) text+='\n...and '+(list.length-20)+' more (export CSV for full list).';

  const url='https://api.whatsapp.com/send?text='+encodeURIComponent(text);
  window.open(url,'_blank');
}

/* ---------- Theme toggle ---------- */
const THEME_KEY='fuelDipTheme';

function applyTheme(theme){
  document.body.classList.toggle('light-theme',theme==='light');
  const icon=document.getElementById('themeIcon');
  if(icon) icon.innerText=theme==='light'?'☀️':'🌙';
}

function toggleTheme(){
  const isLight=document.body.classList.contains('light-theme');
  const next=isLight?'dark':'light';
  applyTheme(next);
  try{ localStorage.setItem(THEME_KEY,next); }catch(e){}
}

(function initTheme(){
  let saved='dark';
  try{ saved=localStorage.getItem(THEME_KEY)||'dark'; }catch(e){}
  applyTheme(saved);
})();
