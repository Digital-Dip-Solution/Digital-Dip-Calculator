function interp(data,v){for(let i=0;i<data.length-1;i++){let a=data[i],b=data[i+1];if(v==a[0])return a[1];if(v>=a[0]&&v<=b[0])return a[1]+(v-a[0])*(b[1]-a[1])/(b[0]-a[0]);}return null;}

function calc(id,data,res){
  const v=parseFloat(document.getElementById(id).value);
  const r=document.getElementById(res);
  const gaugeId='g'+id.slice(1);
  const pctId='p'+id.slice(1);
  const remId='rem'+id.slice(1);
  const gauge=document.getElementById(gaugeId);
  const pctEl=document.getElementById(pctId);
  const remEl=document.getElementById(remId);
  const readout=document.getElementById('readout'+id.slice(1));
  const maxLitres=data[data.length-1][1];

  r.classList.remove('is-error');

  if(isNaN(v)){
    r.innerText='0.00 L';
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='0% full';
    if(remEl) remEl.innerText='Rem. '+maxLitres.toLocaleString()+' L';
    if(readout) readout.classList.remove('has-value');
    return;
  }

  const x=interp(data,v);

  if(x==null){
    r.innerText='Out of range';
    r.classList.add('is-error');
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='check reading';
    if(remEl) remEl.innerText='Rem. —';
    if(readout) readout.classList.remove('has-value');
    return;
  }

  r.innerText=x.toFixed(1)+' L';
  const pct=Math.max(0,Math.min(100,(x/maxLitres)*100));
  if(gauge) gauge.style.height=pct.toFixed(1)+'%';
  if(pctEl) pctEl.innerText=pct.toFixed(0)+'% full';
  if(remEl){
    const remaining=Math.max(0,maxLitres-x);
    remEl.innerText='Rem. '+remaining.toLocaleString(undefined,{maximumFractionDigits:0})+' L';
  }

  if(readout){
    readout.classList.remove('has-value');
    void readout.offsetWidth; /* restart pop animation */
    readout.classList.add('has-value');
  }
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
  const dateStr=now.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
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
    time:new Date().toLocaleString(undefined,{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
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

/* ---------- Share or download helper ---------- */
async function shareOrDownloadBlob(blob,filename,mime){
  try{
    if(navigator.canShare && navigator.share){
      const file=new File([blob],filename,{type:mime});
      if(navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:filename});
        return;
      }
    }
  }catch(e){ /* user cancelled or share unsupported — fall back to download */ }

  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Export history as CSV ---------- */
function exportHistoryCSV(){
  const list=loadHistory();
  if(list.length===0){ alert('No readings saved yet.'); return; }

  let csv='Tank,Dip (mm),Volume,Date & Time\n';
  list.forEach(e=>{
    csv+='"'+e.tank+'","'+e.dip+'","'+e.volume+'","'+e.time+'"\n';
  });

  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const stamp=new Date().toISOString().slice(0,10);
  shareOrDownloadBlob(blob,'fuel-dip-history-'+stamp+'.csv','text/csv');
}

/* ---------- Export history as PDF ---------- */
function exportHistoryPDF(){
  const list=loadHistory();
  if(list.length===0){ alert('No readings saved yet.'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('PDF export needs an internet connection to load the first time. Please check your connection and try again.');
    return;
  }

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(37,99,235);
  doc.text('Khan Petroleum',14,18);
  doc.setFontSize(11);
  doc.setTextColor(100,100,100);
  doc.text('Fuel Dip Reading Report',14,25);
  doc.setFontSize(9);
  doc.text('Generated: '+new Date().toLocaleString(),14,31);

  const rows=list.map(e=>[e.tank,e.dip+' mm',e.volume,e.time]);

  doc.autoTable({
    startY:36,
    head:[['Tank','Dip','Volume','Date & Time']],
    body:rows,
    headStyles:{fillColor:[37,99,235]},
    styles:{fontSize:9}
  });

  const stamp=new Date().toISOString().slice(0,10);
  const blob=doc.output('blob');
  shareOrDownloadBlob(blob,'fuel-dip-history-'+stamp+'.pdf','application/pdf');
}

/* ---------- Export history as Excel ---------- */
function exportHistoryExcel(){
  const list=loadHistory();
  if(list.length===0){ alert('No readings saved yet.'); return; }
  if(!window.XLSX){
    alert('Excel export needs an internet connection to load the first time. Please check your connection and try again.');
    return;
  }

  const rows=[['Tank','Dip (mm)','Volume','Date & Time']];
  list.forEach(e=>rows.push([e.tank,e.dip,e.volume,e.time]));

  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:10},{wch:10},{wch:14},{wch:22}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Dip History');

  const stamp=new Date().toISOString().slice(0,10);
  const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([wbout],{type:'application/octet-stream'});
  shareOrDownloadBlob(blob,'fuel-dip-history-'+stamp+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

/* ---------- Theme toggle (controlled from Settings) ---------- */
const THEME_KEY='fuelDipTheme';

function applyTheme(theme){
  document.body.classList.toggle('dark-theme',theme==='dark');
  const toggle=document.getElementById('darkModeToggle');
  if(toggle) toggle.checked=(theme==='dark');
}

function onSettingsThemeToggle(checked){
  const next=checked?'dark':'light';
  applyTheme(next);
  try{ localStorage.setItem(THEME_KEY,next); }catch(e){}
}

(function initTheme(){
  let saved='light';
  try{ saved=localStorage.getItem(THEME_KEY)||'light'; }catch(e){}
  applyTheme(saved);
})();

/* ---------- PIN lock ---------- */
const PIN_KEY='fuelDipPin';
const PIN_ENABLED_KEY='fuelDipPinEnabled';

function getPin(){
  try{ return localStorage.getItem(PIN_KEY)||''; }catch(e){ return ''; }
}
function setPinStorage(pin){
  try{ localStorage.setItem(PIN_KEY,pin); }catch(e){}
}
function isPinEnabled(){
  try{ return localStorage.getItem(PIN_ENABLED_KEY)==='1'; }catch(e){ return false; }
}
function setPinEnabled(on){
  try{ localStorage.setItem(PIN_ENABLED_KEY,on?'1':'0'); }catch(e){}
}

/* ---- Settings modal ---- */
function openSettings(){
  renderSettings();
  document.getElementById('settingsOverlay').style.display='flex';
}
function closeSettings(){
  document.getElementById('settingsOverlay').style.display='none';
}

function renderSettings(){
  const body=document.getElementById('settingsBody');
  const hasPin=getPin()!=='';
  const enabled=isPinEnabled();
  const isDark=document.body.classList.contains('dark-theme');

  const themeRow=
    '<div class="settings-row">'+
      '<span>🌙 Dark Mode</span>'+
      '<label class="switch">'+
        '<input type="checkbox" id="darkModeToggle"'+(isDark?' checked':'')+' onchange="onSettingsThemeToggle(this.checked)">'+
        '<span class="switch-slider"></span>'+
      '</label>'+
    '</div>';

  if(!hasPin){
    body.innerHTML=
      themeRow+
      '<p class="settings-note">Set a 4–6 digit PIN to lock this app. Once set, you can turn the lock on or off any time from here.</p>'+
      '<input id="newPinInput" class="pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="New PIN">'+
      '<input id="confirmPinInput" class="pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="Confirm PIN">'+
      '<div id="settingsError" class="lock-error"></div>'+
      '<button type="button" class="settings-btn" onclick="saveNewPin()">Set PIN &amp; Enable Lock</button>';
    return;
  }

  body.innerHTML=
    themeRow+
    '<div class="settings-row">'+
      '<span>App Lock (PIN)</span>'+
      '<label class="switch">'+
        '<input type="checkbox" id="lockEnableToggle"'+(enabled?' checked':'')+' onchange="onToggleLock(this.checked)">'+
        '<span class="switch-slider"></span>'+
      '</label>'+
    '</div>'+
    '<p class="settings-note">When enabled, the app will ask for your PIN every time it is opened.</p>'+
    '<button type="button" class="settings-btn" onclick="showChangePin()">Change PIN</button>'+
    '<button type="button" class="settings-btn danger" onclick="removePin()">Remove PIN</button>'+
    '<div id="changePinArea"></div>';
}

function onToggleLock(checked){
  setPinEnabled(checked);
}

function showChangePin(){
  const area=document.getElementById('changePinArea');
  area.innerHTML=
    '<input id="newPinInput" class="pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="New PIN" style="margin-top:14px">'+
    '<input id="confirmPinInput" class="pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="Confirm PIN">'+
    '<div id="settingsError" class="lock-error"></div>'+
    '<button type="button" class="settings-btn" onclick="saveNewPin()">Save New PIN</button>';
}

function saveNewPin(){
  const p1=document.getElementById('newPinInput').value.trim();
  const p2=document.getElementById('confirmPinInput').value.trim();
  const err=document.getElementById('settingsError');

  if(!/^\d{4,6}$/.test(p1)){
    err.innerText='PIN must be 4–6 digits.';
    return;
  }
  if(p1!==p2){
    err.innerText='PINs do not match.';
    return;
  }

  setPinStorage(p1);
  setPinEnabled(true);
  err.innerText='';
  renderSettings();
}

function removePin(){
  if(!confirm('Remove the PIN and disable app lock?')) return;
  try{
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
  }catch(e){}
  renderSettings();
}

/* ---- Lock screen shown on load ---- */
function tryUnlock(){
  const input=document.getElementById('lockPinInput');
  const err=document.getElementById('lockError');
  if(input.value===getPin()){
    document.getElementById('lockOverlay').style.display='none';
    err.innerText='';
    input.value='';
  }else{
    err.innerText='Incorrect PIN, try again.';
    input.value='';
    input.focus();
  }
}

(function checkLockOnLoad(){
  if(isPinEnabled() && getPin()!==''){
    document.getElementById('lockOverlay').style.display='flex';
  }
})();

/* ---------- Bottom nav ---------- */
(function initBottomNav(){
  const items=document.querySelectorAll('.bottom-nav .nav-item[data-nav]');
  if(!items.length) return;
  items.forEach(function(item){
    item.addEventListener('click',function(){
      items.forEach(function(i){ i.classList.remove('is-active'); });
      item.classList.add('is-active');
    });
  });
})();
