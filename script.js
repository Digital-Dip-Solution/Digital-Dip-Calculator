function interp(data,v){for(let i=0;i<data.length-1;i++){let a=data[i],b=data[i+1];if(v==a[0])return a[1];if(v>=a[0]&&v<=b[0])return a[1]+(v-a[0])*(b[1]-a[1])/(b[0]-a[0]);}return null;}

function formatLiters(x){
  return x.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+' L';
}

/* ---------- Animated counter (smooth count-up for result values) ---------- */
function animateCounter(el, toValue, formatFn, duration){
  formatFn = formatFn || formatLiters;
  duration = duration || 450;
  const fromValue = parseFloat(el.dataset.rawValue);
  const start = isNaN(fromValue) ? 0 : fromValue;

  if(el._counterRaf) cancelAnimationFrame(el._counterRaf);
  el.dataset.rawValue = toValue;

  if(Math.abs(toValue - start) < 0.05){
    el.innerText = formatFn(toValue);
    return;
  }

  const startTime = performance.now();
  function step(now){
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = start + (toValue - start) * eased;
    el.innerText = formatFn(current);
    if(t < 1){
      el._counterRaf = requestAnimationFrame(step);
    }
  }
  el._counterRaf = requestAnimationFrame(step);
}

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
    if(r._counterRaf) cancelAnimationFrame(r._counterRaf);
    r.innerText=formatLiters(0);
    r.dataset.rawValue=0;
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='0% full';
    if(remEl) remEl.innerText='Rem. '+maxLitres.toLocaleString('en-US')+' L';
    if(readout) readout.classList.remove('has-value');
    return;
  }

  const x=interp(data,v);

  if(x==null){
    if(r._counterRaf) cancelAnimationFrame(r._counterRaf);
    r.innerText='Out of range';
    r.classList.add('is-error');
    r.dataset.rawValue=0;
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='check reading';
    if(remEl) remEl.innerText='Rem. —';
    if(readout) readout.classList.remove('has-value');
    return;
  }

  animateCounter(r, x);
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

/* ---------- Reverse lookup: litres -> dip (mm) ---------- */
function reverseCalc(inputId,data,resId,readoutId){
  const input=document.getElementById(inputId);
  const r=document.getElementById(resId);
  const readout=readoutId?document.getElementById(readoutId):null;
  const v=parseFloat(input.value);
  const minL=data[0][1];
  const maxL=data[data.length-1][1];

  r.classList.remove('is-error');

  if(isNaN(v)){
    if(r._counterRaf) cancelAnimationFrame(r._counterRaf);
    r.innerText='0.0 mm';
    r.dataset.rawValue=0;
    if(readout) readout.classList.remove('has-value');
    return;
  }

  if(v<minL||v>maxL){
    if(r._counterRaf) cancelAnimationFrame(r._counterRaf);
    r.innerText='Out of range';
    r.classList.add('is-error');
    r.dataset.rawValue=0;
    if(readout) readout.classList.remove('has-value');
    return;
  }

  const reversed=data.map(function(p){ return [p[1],p[0]]; });
  const mm=interp(reversed,v);

  if(mm==null){
    if(r._counterRaf) cancelAnimationFrame(r._counterRaf);
    r.innerText='Out of range';
    r.classList.add('is-error');
    r.dataset.rawValue=0;
    if(readout) readout.classList.remove('has-value');
    return;
  }

  animateCounter(r, mm, function(x){ return x.toFixed(1)+' mm'; });
  if(readout){
    readout.classList.remove('has-value');
    void readout.offsetWidth;
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

/* ---------- Consistent Date & Time format (user-configurable via Settings) ---------- */
const MONTHS_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DATE_FORMAT_KEY='fuelDipDateFormat';
const TIME_FORMAT_KEY='fuelDipTimeFormat';

function getDateFormat(){
  try{ return localStorage.getItem(DATE_FORMAT_KEY)||'dmy'; }catch(e){ return 'dmy'; }
}
function getTimeFormat(){
  try{ return localStorage.getItem(TIME_FORMAT_KEY)||'24'; }catch(e){ return '24'; }
}

function formatDateDMY(d){
  if(!(d instanceof Date) || isNaN(d.getTime())) d=new Date();
  const day=String(d.getDate()).padStart(2,'0');
  const month=MONTHS_SHORT[d.getMonth()];
  const year=d.getFullYear();
  const fmt=getDateFormat();
  if(fmt==='mdy') return month+'-'+day+'-'+year;
  if(fmt==='ymd') return year+'-'+month+'-'+day;
  return day+'-'+month+'-'+year;
}
function formatDateTimeDMY(d){
  if(!(d instanceof Date) || isNaN(d.getTime())) d=new Date();
  return formatDateDMY(d)+'  '+formatTimeHM(d,true);
}
function formatTimeHM(d,withSeconds){
  if(!(d instanceof Date) || isNaN(d.getTime())) d=new Date();
  const fmt=getTimeFormat();
  let h=d.getHours();
  const m=String(d.getMinutes()).padStart(2,'0');
  const s=String(d.getSeconds()).padStart(2,'0');
  if(fmt==='12'){
    const ampm=h>=12?'PM':'AM';
    h=h%12; if(h===0) h=12;
    return String(h).padStart(2,'0')+':'+m+(withSeconds?':'+s:'')+' '+ampm;
  }
  return String(h).padStart(2,'0')+':'+m+(withSeconds?':'+s:'');
}
function formatDayShort(d){
  if(!(d instanceof Date) || isNaN(d.getTime())) d=new Date();
  return d.toLocaleDateString(undefined,{weekday:'short'});
}
function onDateFormatChange(value){
  const valid=['dmy','mdy','ymd'];
  const v=valid.includes(value)?value:'dmy';
  try{ localStorage.setItem(DATE_FORMAT_KEY,v); }catch(e){}
  tickClock();
}
function onTimeFormatChange(value){
  const v=(value==='12')?'12':'24';
  try{ localStorage.setItem(TIME_FORMAT_KEY,v); }catch(e){}
  tickClock();
}
(function initDateTimeFormat(){
  const dSel=document.getElementById('dateFormatSelect');
  if(dSel) dSel.value=getDateFormat();
  const tSel=document.getElementById('timeFormatSelect');
  if(tSel) tSel.value=getTimeFormat();
})();

/* ---------- Live clock ---------- */
function tickClock(){
  const el=document.getElementById('clock');
  if(!el) return;
  const now=new Date();
  const dayStr=formatDayShort(now);
  const dateStr=formatDateDMY(now);
  const timeStr=formatTimeHM(now,true);
  el.innerText=dayStr+', '+dateStr+'  •  '+timeStr;
}
setInterval(tickClock,1000);
tickClock();

/* ---------- Reading history (persisted in localStorage) ---------- */
const HISTORY_KEY='fuelDipHistory';
const HISTORY_LIMIT=200;

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
  const noteInput=document.getElementById('note'+inputId.slice(1));
  const dip=input.value;
  const volumeText=resultEl.innerText;

  if(dip===''||isNaN(parseFloat(dip))){
    resultEl.classList.add('is-error');
    return;
  }
  if(volumeText.toLowerCase().includes('out of range')) return;

  const now=new Date();
  const entry={
    tank:tankLabel,
    dip:parseFloat(dip),
    volume:volumeText,
    note:noteInput?noteInput.value.trim():'',
    day:formatDayShort(now),
    time:String(now.getDate()).padStart(2,'0')+'-'+MONTHS_SHORT[now.getMonth()]+' '+formatTimeHM(now)
  };

  const list=loadHistory();
  list.unshift(entry);
  if(list.length>HISTORY_LIMIT) list.length=HISTORY_LIMIT;
  persistHistory(list);
  if(noteInput) noteInput.value='';
  renderHistory();
}

function clearHistory(){
  const list=loadHistory();
  if(list.length===0) return;
  if(!confirm('Clear all '+list.length+' saved readings?\n\nThis cannot be undone.')) return;
  persistHistory([]);
  renderHistory();
}

function deleteReading(index){
  const list=loadHistory();
  if(index<0||index>=list.length) return;
  const e=list[index];
  const label=e.tank+' — '+e.dip+'mm ('+(e.day?e.day+', ':'')+e.time+')'+(e.note?'\nNote: '+e.note:'');
  if(!confirm('Delete this reading?\n\n'+label)) return;
  list.splice(index,1);
  persistHistory(list);
  renderHistory();
}

/* ---------- Edit a saved reading entry ---------- */
let editingReadingIndex=-1;

function openEditReading(index){
  const list=loadHistory();
  const e=list[index];
  if(!e) return;
  editingReadingIndex=index;
  document.getElementById('editReadingTank').textContent=e.tank;
  document.getElementById('editReadingDip').value=e.dip;
  document.getElementById('editReadingNote').value=e.note||'';
  const msg=document.getElementById('editReadingMsg');
  if(msg) msg.textContent='';
  document.getElementById('editReadingModal').style.display='flex';
}
function closeEditReading(){
  document.getElementById('editReadingModal').style.display='none';
  editingReadingIndex=-1;
}
function closeEditReadingOnBg(evt){
  if(evt.target && evt.target.id==='editReadingModal') closeEditReading();
}
function saveEditReading(){
  if(editingReadingIndex<0) return;
  const list=loadHistory();
  const e=list[editingReadingIndex];
  if(!e) return;

  const newDipRaw=document.getElementById('editReadingDip').value;
  const newDip=parseFloat(newDipRaw);
  const newNote=document.getElementById('editReadingNote').value.trim();
  const msg=document.getElementById('editReadingMsg');

  if(newDipRaw===''||isNaN(newDip)){
    if(msg) msg.textContent='Sahi dip value darj karein.';
    return;
  }

  const newVolNum=interp(tank1,newDip);
  if(newVolNum==null){
    if(msg) msg.textContent='Ye dip value tank ki range se bahar hai.';
    return;
  }
  const newVolume=formatLiters(newVolNum);

  const changes=[];
  if(newDip!==e.dip) changes.push('Dip '+e.dip+'mm → '+newDip+'mm');
  if(newNote!==(e.note||'')) changes.push('Note updated');

  e.dip=newDip;
  e.volume=newVolume;
  e.note=newNote;

  if(changes.length){
    e.editedAt=formatDateDMY(new Date())+' '+formatTimeHM(new Date());
    e.editSummary=changes.join('; ');
  }

  persistHistory(list);
  renderHistory();
  closeEditReading();
}

function escapeHtml(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function renderHistory(){
  const container=document.getElementById('historyList');
  if(!container) return;
  const list=loadHistory();

  if(list.length===0){
    container.innerHTML='<div class="history-empty">No readings saved yet.</div>';
    return;
  }

  container.innerHTML=list.map((e,i)=>
    '<div class="history-row'+(e.note?' has-note':'')+'" onclick="showReadingImage('+i+')" role="button" tabindex="0" aria-label="View this reading as image">'+
      '<span class="history-tank">'+escapeHtml(e.tank)+'</span>'+
      '<span class="history-dip">'+e.dip+' mm</span>'+
      '<span class="history-vol">'+escapeHtml(e.volume)+'</span>'+
      '<span class="history-time">'+(e.day?e.day+', ':'')+escapeHtml(e.time)+'</span>'+
      '<button type="button" class="history-edit" onclick="event.stopPropagation();openEditReading('+i+')" aria-label="Edit this reading">✏️</button>'+
      '<button type="button" class="history-delete" onclick="event.stopPropagation();deleteReading('+i+')" aria-label="Delete this reading">✕</button>'+
      (e.note?'<span class="history-note">📝 '+escapeHtml(e.note)+'</span>':'')+
      (e.editedAt?'<span class="history-edited">✏️ Edited: '+escapeHtml(e.editSummary||'')+' — '+escapeHtml(e.editedAt)+'</span>':'')+
    '</div>'
  ).join('');
  renderEntryCounts();
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

/* ---------- Export CSV ---------- */
function csvEscape(val){
  const s=String(val==null?'':val);
  if(/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}

function exportHistoryCSV(){
  const list=loadHistory();
  if(list.length===0){
    alert('No readings saved yet — nothing to export.');
    return;
  }

  const rows=[['Tank','Dip (mm)','Volume','Day','Date & Time','Note']];
  list.forEach(e=>{
    rows.push([e.tank,e.dip,e.volume,e.day||'',e.time,e.note||'']);
  });

  const csvContent=rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csvContent],{type:'text/csv;charset=utf-8;'});
  const stamp=new Date().toISOString().slice(0,10);
  shareOrDownloadBlob(blob,'fuel-dip-history-'+stamp+'.csv','text/csv');
}

/* ---------- Export PDF ---------- */
function exportHistoryPDF(){
  const list=loadHistory();
  if(list.length===0){
    alert('No readings saved yet — nothing to export.');
    return;
  }
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
  doc.text('Generated: '+formatDateTimeDMY(new Date()),14,31);

  const rows=list.map(e=>[e.tank,e.dip+' mm',e.volume,e.day||'',e.time,e.note||'']);

  doc.autoTable({
    startY:36,
    head:[['Tank','Dip','Volume','Day','Date & Time','Note']],
    body:rows,
    headStyles:{fillColor:[37,99,235]},
    styles:{fontSize:9}
  });

  const stamp=new Date().toISOString().slice(0,10);
  const blob=doc.output('blob');
  shareOrDownloadBlob(blob,'fuel-dip-history-'+stamp+'.pdf','application/pdf');
}

/* ---------- Export Excel ---------- */
function exportHistoryExcel(){
  const list=loadHistory();
  if(list.length===0){
    alert('No readings saved yet — nothing to export.');
    return;
  }
  if(!window.XLSX){
    alert('Excel export needs an internet connection to load the first time. Please check your connection and try again.');
    return;
  }

  const rows=[['Tank','Dip (mm)','Volume','Day','Date & Time','Note']];
  list.forEach(e=>rows.push([e.tank,e.dip,e.volume,e.day||'',e.time,e.note||'']));

  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:10},{wch:10},{wch:14},{wch:8},{wch:20},{wch:28}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Dip History');

  const stamp=new Date().toISOString().slice(0,10);
  const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([wbout],{type:'application/octet-stream'});
  shareOrDownloadBlob(blob,'fuel-dip-history-'+stamp+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ---------- WhatsApp share ---------- */
function shareHistoryWhatsApp(){
  const list=loadHistory();
  if(list.length===0){
    alert('No readings saved yet — nothing to share.');
    return;
  }

  const recent=list.slice(0,20);
  let msg='*Khan Petroleum — Fuel Dip Readings*\n\n';
  recent.forEach(e=>{
    const dayPart=e.day?e.day+', ':'';
    const notePart=e.note?' — 📝 '+e.note:'';
    msg+='• '+e.tank+' — '+e.dip+'mm → '+e.volume+' ('+dayPart+e.time+')'+notePart+'\n';
  });
  msg+='\nSent from Fuel Dip Calculator app.';

  const url='https://api.whatsapp.com/send?text='+encodeURIComponent(msg);
  window.open(url,'_blank','noopener');
}

/* ---------- Copy Result to clipboard ---------- */
function copyResult(dipId, valueId, noteId, btnId, tankLabel){
  const dipEl = document.getElementById(dipId);
  const el = document.getElementById(valueId);
  const noteEl = noteId ? document.getElementById(noteId) : null;
  const btn = document.getElementById(btnId);
  if(!el) return;

  const dip = dipEl ? dipEl.value.trim() : '';
  const volume = el.textContent.trim();
  const note = noteEl ? noteEl.value.trim() : '';
  const now = new Date();
  const dayStr = formatDayShort(now);
  const dateTimeStr = formatDateTimeDMY(now);

  let text = 'Tank: '+(tankLabel||'')+'\n'+
    'Dip: '+(dip!==''?dip+' mm':'—')+'\n'+
    'Available Fuel: '+volume+'\n'+
    'Note: '+(note!==''?note:'—')+'\n'+
    'Date & Time: '+dayStr+', '+dateTimeStr;

  const showCopied = function(){
    if(!btn) return;
    if(!btn.dataset.label) btn.dataset.label = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('is-copied');
    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(function(){
      btn.innerHTML = btn.dataset.label;
      btn.classList.remove('is-copied');
    }, 1500);
  };

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(showCopied).catch(function(){
      fallbackCopy(text, showCopied);
    });
  } else {
    fallbackCopy(text, showCopied);
  }
}

function fallbackCopy(text, done){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  if(done) done();
}

/* ---------- Color scheme (Classic Blue / Shell / Premium Dark) — controlled from Settings ---------- */
const SCHEME_KEY='fuelDipColorScheme';

const SCHEME_ICONS={
  shell:   { 192:'icon-192-shell.png',   512:'icon-512-shell.png' },
  classic: { 192:'icon-192-classic.png', 512:'icon-512-classic.png' },
  v1:      { 192:'icon-192-v1.png',      512:'icon-512-v1.png' },
  win11:   { 192:'icon-192-win11.png',   512:'icon-512-win11.png' }
};

function applyScheme(scheme){
  const valid=['shell','classic','v1','win11'];
  const s = valid.includes(scheme) ? scheme : 'classic';
  document.body.classList.toggle('theme-shell', s==='shell');
  document.body.classList.toggle('theme-classic', s==='classic');
  document.body.classList.toggle('theme-v1', s==='v1');
  document.body.classList.toggle('theme-win11', s==='win11');

  const sel=document.getElementById('colorSchemeSelect');
  if(sel) sel.value=s;

  document.querySelectorAll('.theme-preview-card').forEach(function(card){
    card.classList.toggle('is-selected', card.dataset.scheme===s);
  });

  const icons=SCHEME_ICONS[s];
  if(icons){
    const favicon=document.getElementById('faviconLink');
    const appleIcon=document.getElementById('appleIconLink');
    if(favicon) favicon.setAttribute('href', icons[192]);
    if(appleIcon) appleIcon.setAttribute('href', icons[192]);
  }
}

function onSchemeChange(value){
  applyScheme(value);
  try{ localStorage.setItem(SCHEME_KEY,value); }catch(e){}
}

(function initScheme(){
  let saved='classic';
  try{ saved=localStorage.getItem(SCHEME_KEY)||'classic'; }catch(e){}
  applyScheme(saved);
})();

/* ---------- View Settings (Mobile View / Desktop View) ---------- */
const VIEW_KEY='fuelDipViewMode';

function applyViewMode(mode){
  const valid=['mobile','desktop'];
  const m = valid.includes(mode) ? mode : 'mobile';
  document.body.classList.toggle('view-mobile', m==='mobile');
  document.body.classList.toggle('view-desktop', m==='desktop');
  document.querySelectorAll('.view-toggle-btn').forEach(function(btn){
    btn.classList.toggle('is-selected', btn.dataset.view===m);
  });
}

function onViewModeChange(value){
  applyViewMode(value);
  try{ localStorage.setItem(VIEW_KEY,value); }catch(e){}
}

(function initViewMode(){
  let saved='mobile';
  try{ saved=localStorage.getItem(VIEW_KEY)||'mobile'; }catch(e){}
  applyViewMode(saved);
})();

/* ---------- Language (English / Urdu / Roman Urdu) ---------- */
const LANG_KEY='fuelDipLanguage';

const I18N={
  en:{
    'nav.home':'Home', 'nav.tanks':'Tanks', 'nav.reports':'Reports', 'nav.chart':'Dip Chart', 'nav.settings':'Settings',
    'tank.dipReading':'📏 Dip reading', 'tank.availableFuel':'⛽ Available Fuel', 'tank.note':'📝 Note (optional)',
    'tank.save':'💾 Save reading', 'tank.copy':'📋 Copy Result', 'tank.clear':'✕ Clear',
    'tank.reverseLookup':'🔄 Reverse Lookup — Litres → Dip', 'tank.enterLitres':'⛽ Enter litres', 'tank.estimatedDip':'📏 Estimated Dip',
    'settings.title':'⚙️ App Settings', 'settings.colorScheme':'🎨 Color Scheme', 'settings.language':'🌐 Language',
    'settings.pinLock':'🔒 PIN Lock', 'settings.about':'ℹ️ About Application', 'settings.viewMode':'📐 View Settings',
    'settings.mobileView':'Mobile View', 'settings.desktopView':'Desktop View',
    'settings.dateFormat':'🗓️ Date Format', 'settings.dateFormatSub':'Choose the order dates are shown in',
    'settings.timeFormat':'🕐 Time Format', 'settings.timeFormatSub':'12-Hour or 24-Hour clock',
    'home.tankInfo':'🛢 Fuel Storage Tank — Info', 'home.tagline':'Fuel Dip Calculator',
    'reports.title':'📊 Reading History', 'reports.noReadings':'No readings saved yet.', 'reports.clearAll':'Clear',
    'chart.title':'📋 Dip Calibration Chart',
    'edit.readingTitle':'✏️ Edit Reading', 'edit.dip':'📏 Dip (mm)', 'edit.saveChanges':'Save Changes',
    'lock.title':'Enter PIN', 'lock.sub':'This app is protected. Enter PIN to continue.', 'lock.unlock':'Unlock',
    'about.title':'ℹ️ About Application'
  },
  ru:{
    'nav.home':'Home', 'nav.tanks':'Tanks', 'nav.reports':'Reports', 'nav.chart':'Dip Chart', 'nav.settings':'Settings',
    'tank.dipReading':'📏 Dip Reading', 'tank.availableFuel':'⛽ Available Fuel', 'tank.note':'📝 Note (optional)',
    'tank.save':'💾 Reading Save Karein', 'tank.copy':'📋 Result Copy Karein', 'tank.clear':'✕ Clear Karein',
    'tank.reverseLookup':'🔄 Reverse Lookup — Litres → Dip', 'tank.enterLitres':'⛽ Litres Darj Karein', 'tank.estimatedDip':'📏 Takhmeeni Dip',
    'settings.title':'⚙️ App Settings', 'settings.colorScheme':'🎨 Color Theme', 'settings.language':'🌐 Zabaan',
    'settings.pinLock':'🔒 PIN Lock', 'settings.about':'ℹ️ App Ke Baare Mein', 'settings.viewMode':'📐 View Settings',
    'settings.mobileView':'Mobile View', 'settings.desktopView':'Desktop View',
    'settings.dateFormat':'🗓️ Date Format', 'settings.dateFormatSub':'Kis tarteeb mein date dikhani hai',
    'settings.timeFormat':'🕐 Time Format', 'settings.timeFormatSub':'12-Hour ya 24-Hour clock',
    'home.tankInfo':'🛢 Fuel Storage Tank — Maloomat', 'home.tagline':'Fuel Dip Calculator',
    'reports.title':'📊 Reading History', 'reports.noReadings':'Abhi tak koi reading save nahi hui.', 'reports.clearAll':'Clear Karein',
    'chart.title':'📋 Dip Calibration Chart',
    'edit.readingTitle':'✏️ Reading Edit Karein', 'edit.dip':'📏 Dip (mm)', 'edit.saveChanges':'Tabdeeliyan Save Karein',
    'lock.title':'PIN Darj Karein', 'lock.sub':'Ye app protected hai. Jari rakhne ke liye PIN darj karein.', 'lock.unlock':'Unlock Karein',
    'about.title':'ℹ️ App Ke Baare Mein'
  }
};

function applyLanguage(lang){
  const valid=['en','ru'];
  const l = valid.includes(lang) ? lang : 'en';
  const dict = I18N[l];

  document.querySelectorAll('[data-i18n]').forEach(function(el){
    const key=el.getAttribute('data-i18n');
    if(dict[key]) el.textContent=dict[key];
  });

  document.documentElement.setAttribute('dir', l==='ur' ? 'rtl' : 'ltr');
  document.body.classList.toggle('lang-urdu', l==='ur');

  const sel=document.getElementById('languageSelect');
  if(sel) sel.value=l;
}

function onLanguageChange(value){
  applyLanguage(value);
  try{ localStorage.setItem(LANG_KEY,value); }catch(e){}
}

(function initLanguage(){
  let saved='en';
  try{ saved=localStorage.getItem(LANG_KEY)||'en'; }catch(e){}
  applyLanguage(saved);
})();

/* ---------- PIN Lock ---------- */
const PIN_ENABLED_KEY='fuelDipPinEnabled';
const PIN_VALUE_KEY='fuelDipPinValue';

function getPinEnabled(){
  try{ return localStorage.getItem(PIN_ENABLED_KEY)==='1'; }catch(e){ return false; }
}
function getPinValue(){
  try{ return localStorage.getItem(PIN_VALUE_KEY)||''; }catch(e){ return ''; }
}

function checkLockOnLoad(){
  const enabled=getPinEnabled();
  const pin=getPinValue();
  const lockScreen=document.getElementById('lockScreen');
  const appContent=document.getElementById('appContent');
  if(enabled && pin){
    lockScreen.style.display='flex';
    appContent.style.display='none';
    setTimeout(()=>{ const inp=document.getElementById('lockInput'); if(inp) inp.focus(); },100);
  }else{
    lockScreen.style.display='none';
    appContent.style.display='block';
  }
}

function attemptUnlock(){
  const input=document.getElementById('lockInput');
  const err=document.getElementById('lockError');
  const entered=input.value;
  const correct=getPinValue();
  if(entered===correct && entered!==''){
    document.getElementById('lockScreen').style.display='none';
    document.getElementById('appContent').style.display='block';
    err.innerText='';
    input.value='';
  }else{
    err.innerText='Incorrect PIN. Try again.';
    input.value='';
    input.focus();
  }
}

// allow Enter key to submit PIN
(function(){
  const lockInput=document.getElementById('lockInput');
  if(lockInput){
    lockInput.addEventListener('keydown',function(e){
      if(e.key==='Enter') attemptUnlock();
    });
  }
})();

/* ---------- Settings modal ---------- */
function openSettings(){
  const modal=document.getElementById('settingsModal');
  const toggle=document.getElementById('pinEnabledToggle');
  toggle.checked=getPinEnabled();
  updatePinSetupVisibility();
  document.getElementById('pinSetupMsg').innerText='';
  document.getElementById('newPin').value='';
  document.getElementById('confirmPin').value='';

  const currentScheme = document.body.classList.contains('theme-shell') ? 'shell'
    : document.body.classList.contains('theme-v1') ? 'v1'
    : document.body.classList.contains('theme-win11') ? 'win11'
    : 'classic';
  document.querySelectorAll('.theme-preview-card').forEach(function(card){
    card.classList.toggle('is-selected', card.dataset.scheme===currentScheme);
  });

  const currentView = document.body.classList.contains('view-desktop') ? 'desktop' : 'mobile';
  document.querySelectorAll('.view-toggle-btn').forEach(function(btn){
    btn.classList.toggle('is-selected', btn.dataset.view===currentView);
  });

  const langSel=document.getElementById('languageSelect');
  if(langSel){
    let savedLang='en';
    try{ savedLang=localStorage.getItem(LANG_KEY)||'en'; }catch(e){}
    langSel.value=savedLang;
  }

  renderLastBackupInfo();
  loadSiteDetailsIntoSettings();
  renderEntryCounts();

  modal.style.display='flex';
}

function closeSettings(){
  document.getElementById('settingsModal').style.display='none';
}

function closeSettingsOnBg(e){
  if(e.target.id==='settingsModal') closeSettings();
}

function openAbout(){
  renderEntryCounts();
  document.getElementById('aboutModal').style.display='flex';
}

function closeAbout(){
  document.getElementById('aboutModal').style.display='none';
}

function closeAboutOnBg(e){
  if(e.target.id==='aboutModal') closeAbout();
}

function updatePinSetupVisibility(){
  const enabled=document.getElementById('pinEnabledToggle').checked;
  document.getElementById('pinSetupBlock').setAttribute('data-hidden', enabled ? 'false' : 'true');
}

function togglePinEnabled(){
  const enabled=document.getElementById('pinEnabledToggle').checked;
  const existingPin=getPinValue();

  if(enabled && !existingPin){
    // no pin set yet — force setup, don't enable until a PIN is saved
    updatePinSetupVisibility();
    document.getElementById('pinSetupMsg').innerText='Please set a PIN below to enable lock.';
    document.getElementById('pinSetupMsg').className='pin-setup-msg';
    return;
  }

  try{ localStorage.setItem(PIN_ENABLED_KEY, enabled ? '1' : '0'); }catch(e){}
  updatePinSetupVisibility();
}

function savePin(){
  const newPin=document.getElementById('newPin').value;
  const confirmPin=document.getElementById('confirmPin').value;
  const msg=document.getElementById('pinSetupMsg');

  if(newPin===''){
    msg.innerText='PIN cannot be empty.';
    msg.className='pin-setup-msg err';
    return;
  }
  if(newPin!==confirmPin){
    msg.innerText='PINs do not match.';
    msg.className='pin-setup-msg err';
    return;
  }

  try{
    localStorage.setItem(PIN_VALUE_KEY, newPin);
    localStorage.setItem(PIN_ENABLED_KEY, '1');
  }catch(e){}

  document.getElementById('pinEnabledToggle').checked=true;
  msg.innerText='PIN saved. Lock is now enabled.';
  msg.className='pin-setup-msg ok';
  document.getElementById('newPin').value='';
  document.getElementById('confirmPin').value='';
}

/* ---------- Backup & Restore ---------- */
const BACKUP_TIME_KEY='fuelDipLastBackup';

function formatBackupDate(ts){
  if(!ts) return null;
  try{
    const d=new Date(Number(ts));
    if(isNaN(d.getTime())) return null;
    return formatDateTimeDMY(d);
  }catch(e){ return null; }
}

function renderLastBackupInfo(){
  const el=document.getElementById('lastBackupInfo');
  if(!el) return;
  let ts=null;
  try{ ts=localStorage.getItem(BACKUP_TIME_KEY); }catch(e){}
  const formatted=formatBackupDate(ts);
  el.innerText='Last backup: '+(formatted || 'Never');
}

/* ---------- Live saved-entry counts (Reading / Stock / Unload) ---------- */
function renderEntryCounts(){
  let readingCount=0, stockCount=0, unloadCount=0;
  try{ readingCount=loadHistory().length; }catch(e){}
  try{ stockCount=loadStockHistory().length; }catch(e){}
  try{ unloadCount=(typeof loadUnloadHistory==='function')?loadUnloadHistory().length:0; }catch(e){}

  ['countReading','countReadingAbout'].forEach(function(id){
    const el=document.getElementById(id); if(el) el.textContent=readingCount;
  });
  ['countStock','countStockAbout'].forEach(function(id){
    const el=document.getElementById(id); if(el) el.textContent=stockCount;
  });
  ['countUnload','countUnloadAbout'].forEach(function(id){
    const el=document.getElementById(id); if(el) el.textContent=unloadCount;
  });
}

function downloadBackup(){
  try{
    const data={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      data[k]=localStorage.getItem(k);
    }
    const nowTs=Date.now();
    const backup={
      app:'Fuel Dip Calculator',
      exportedAt:new Date(nowTs).toISOString(),
      data:data
    };
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const stamp=new Date(nowTs).toISOString().slice(0,19).replace(/[:T]/g,'-');
    const a=document.createElement('a');
    a.href=url;
    a.download='fuel-dip-backup-'+stamp+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },1000);

    try{ localStorage.setItem(BACKUP_TIME_KEY,String(nowTs)); }catch(e){}
    renderLastBackupInfo();
  }catch(e){
    alert('Backup download nahi ho saka. Dobara koshish karein.');
  }
}

function triggerRestoreFile(){
  const input=document.getElementById('restoreFileInput');
  if(input) input.click();
}

function restoreBackupFile(input){
  const file=input.files && input.files[0];
  if(!file) return;

  const reader=new FileReader();
  reader.onload=function(e){
    let parsed;
    try{
      parsed=JSON.parse(e.target.result);
    }catch(err){
      alert('Ye sahi backup file nahi hai.');
      input.value='';
      return;
    }

    if(!parsed || typeof parsed.data!=='object' || parsed.data===null){
      alert('Ye sahi backup file nahi hai.');
      input.value='';
      return;
    }

    const itemCount=Object.keys(parsed.data).length;
    const whenText=parsed.exportedAt ? (formatBackupDate(new Date(parsed.exportedAt).getTime())||parsed.exportedAt) : 'unknown date';
    const ok=confirm('Backup file mili — '+whenText+' ki ('+itemCount+' items).\n\nYe maujooda data ko replace kar dega. Continue karein?');
    if(!ok){
      input.value='';
      return;
    }

    try{
      Object.keys(parsed.data).forEach(function(k){
        localStorage.setItem(k,parsed.data[k]);
      });
      alert('Backup restore ho gayi! App ab reload ho raha hai.');
      location.reload();
    }catch(err){
      alert('Restore karte waqt masla hua. Dobara koshish karein.');
    }
    input.value='';
  };
  reader.onerror=function(){
    alert('File parh nahi saki. Dobara koshish karein.');
    input.value='';
  };
  reader.readAsText(file);
}

/* ---------- Site Name & Address ---------- */
const SITE_NAME_KEY='fuelDipSiteName';
const SITE_ADDRESS_KEY='fuelDipSiteAddress';

function applySiteDetails(){
  let name='', address='';
  try{
    name=localStorage.getItem(SITE_NAME_KEY)||'';
    address=localStorage.getItem(SITE_ADDRESS_KEY)||'';
  }catch(e){}

  const nameEl=document.getElementById('customerNameDisplay');
  if(nameEl && name){ nameEl.textContent=name; }

  const addrEl=document.getElementById('plateAddress');
  if(addrEl){
    if(address){
      addrEl.textContent=address;
      addrEl.style.display='block';
    }else{
      addrEl.style.display='none';
    }
  }
}

function loadSiteDetailsIntoSettings(){
  const nameInput=document.getElementById('siteNameInput');
  const addrInput=document.getElementById('siteAddressInput');
  if(!nameInput || !addrInput) return;

  let savedName='', savedAddress='';
  try{
    savedName=localStorage.getItem(SITE_NAME_KEY)||'';
    savedAddress=localStorage.getItem(SITE_ADDRESS_KEY)||'';
  }catch(e){}

  const nameEl=document.getElementById('customerNameDisplay');
  nameInput.value=savedName || (nameEl ? nameEl.textContent.trim() : '');
  addrInput.value=savedAddress;

  const msg=document.getElementById('siteDetailsMsg');
  if(msg){ msg.innerText=''; msg.className='pin-setup-msg'; }
}

function saveSiteDetails(){
  const nameInput=document.getElementById('siteNameInput');
  const addrInput=document.getElementById('siteAddressInput');
  const msg=document.getElementById('siteDetailsMsg');

  const name=nameInput.value.trim();
  const address=addrInput.value.trim();

  if(name===''){
    msg.innerText='Site name khali nahi ho sakta.';
    msg.className='pin-setup-msg err';
    return;
  }

  try{
    localStorage.setItem(SITE_NAME_KEY,name);
    localStorage.setItem(SITE_ADDRESS_KEY,address);
  }catch(e){}

  applySiteDetails();
  msg.innerText='Site details save ho gayi.';
  msg.className='pin-setup-msg ok';
}

/* ---------- Bismillah splash screen ---------- */
function hideSplashAndReveal(){
  const splash=document.getElementById('splashScreen');
  applySiteDetails();
  checkLockOnLoad();
  if(!splash) return;
  splash.classList.add('splash-hide');
  setTimeout(function(){ splash.style.display='none'; },650);
}
applySiteDetails();
setTimeout(hideSplashAndReveal,4800);

/* ---------- Dip Chart page (full calibration reference table) ---------- */
function renderChartTable(data,containerId,numCols){
  const container=document.getElementById(containerId);
  if(!container) return;

  numCols=numCols||2;
  const perCol=Math.ceil(data.length/numCols);
  const chunks=[];
  for(let c=0;c<numCols;c++){
    chunks.push(data.slice(c*perCol,c*perCol+perCol));
  }

  let html='<table class="chart-table"><thead><tr>';
  for(let c=0;c<numCols;c++){
    html+='<th>Fill (mm)</th><th>Volume (L)</th>';
  }
  html+='</tr></thead><tbody>';

  for(let row=0;row<perCol;row++){
    html+='<tr>';
    for(let c=0;c<numCols;c++){
      const pair=chunks[c][row];
      if(pair){
        html+='<td data-mm="'+pair[0]+'">'+pair[0]+'</td><td>'+pair[1].toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'</td>';
      }else{
        html+='<td></td><td></td>';
      }
    }
    html+='</tr>';
  }
  html+='</tbody></table>';

  container.innerHTML=html;
}

renderChartTable(tank1,'chartTableWrap',2);

/* ---------- Dip Chart search box (search by dip mm OR litres) ---------- */
let chartSearchMode='mm';

function setChartSearchMode(mode){
  chartSearchMode=mode;
  document.querySelectorAll('.mode-btn').forEach(function(b){
    b.classList.toggle('is-active', b.dataset.mode===mode);
  });

  const input=document.getElementById('chartSearchInput');
  const icon=document.getElementById('chartSearchIcon');
  const suffix=document.getElementById('chartSearchSuffix');

  if(mode==='mm'){
    input.placeholder='Enter dip in mm';
    icon.innerText='📏';
    suffix.innerText='mm';
  }else{
    input.placeholder='Enter litres';
    icon.innerText='⛽';
    suffix.innerText='L';
  }

  input.value='';
  document.getElementById('chartSearchResult').innerHTML='';
  clearChartHighlight();
  input.focus();
}

function onChartSearch(){
  const input=document.getElementById('chartSearchInput');
  const resultEl=document.getElementById('chartSearchResult');
  const v=parseFloat(input.value);

  clearChartHighlight();

  if(isNaN(v)){
    resultEl.innerHTML='';
    return;
  }

  if(chartSearchMode==='mm'){
    const minMm=tank1[0][0], maxMm=tank1[tank1.length-1][0];
    if(v<minMm||v>maxMm){
      resultEl.innerHTML='<span class="chart-search-error">Out of range</span>';
      return;
    }
    const litres=interp(tank1,v);
    resultEl.innerHTML='📏 '+v+' mm&nbsp;→&nbsp;<strong>'+litres.toFixed(2)+' L</strong>';
    highlightNearestMm(v);
  }else{
    const minL=tank1[0][1], maxL=tank1[tank1.length-1][1];
    if(v<minL||v>maxL){
      resultEl.innerHTML='<span class="chart-search-error">Out of range</span>';
      return;
    }
    const reversed=tank1.map(function(p){ return [p[1],p[0]]; });
    const mm=interp(reversed,v);
    resultEl.innerHTML='⛽ '+v+' L&nbsp;→&nbsp;<strong>'+mm.toFixed(1)+' mm</strong>';
    highlightNearestMm(mm);
  }
}

function highlightNearestMm(mmValue){
  const wrap=document.getElementById('chartTableWrap');
  if(!wrap) return;

  let nearestTd=null, nearestDiff=Infinity;
  wrap.querySelectorAll('td[data-mm]').forEach(function(td){
    const diff=Math.abs(parseFloat(td.dataset.mm)-mmValue);
    if(diff<nearestDiff){ nearestDiff=diff; nearestTd=td; }
  });

  if(nearestTd){
    const tr=nearestTd.closest('tr');
    tr.classList.add('row-highlight');
    tr.scrollIntoView({block:'center',behavior:'smooth'});
  }
}

function clearChartHighlight(){
  document.querySelectorAll('.chart-table tr.row-highlight').forEach(function(tr){
    tr.classList.remove('row-highlight');
  });
}

/* ---------- Bottom nav — tab panel switcher ---------- */
function showPanel(navId){
  document.querySelectorAll('.app-panel[data-panel]').forEach(function(panel){
    panel.style.display=(panel.dataset.panel===navId)?'flex':'none';
  });
  document.querySelectorAll('.bottom-nav .nav-item[data-nav]').forEach(function(item){
    item.classList.toggle('is-active', item.dataset.nav===navId);
  });
}


/* ================= Stock Management ================= */
function drawDashedLine(ctx,x1,x2,y){
  ctx.save();
  ctx.strokeStyle='#9aa0a6';
  ctx.lineWidth=1;
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  ctx.moveTo(x1,y);
  ctx.lineTo(x2,y);
  ctx.stroke();
  ctx.restore();
}

const STOCK_HISTORY_KEY='fuelStockHistory';
const STOCK_HISTORY_LIMIT=500;

function fmtStockNum(x){
  if(x==null||isNaN(x)) return '0.00';
  return x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function calcStock(){
  const opening=parseFloat(document.getElementById('sk_opening').value)||0;
  const arrival=parseFloat(document.getElementById('sk_arrival').value)||0;
  const sale=parseFloat(document.getElementById('sk_sale').value)||0;
  const dipInput=parseFloat(document.getElementById('sk_dipStock').value);

  const total=opening+arrival;
  const balance=total-sale;
  const dipStock=isNaN(dipInput)?null:dipInput;
  const stEx=dipStock!=null?(dipStock-balance):null;

  document.getElementById('sk_total').innerText=fmtStockNum(total);
  document.getElementById('sk_balance').innerText=fmtStockNum(balance);
  const stExEl=document.getElementById('sk_stEx');
  stExEl.innerText=stEx!=null?(stEx>=0?'+':'')+fmtStockNum(stEx):'0.00';
  stExEl.classList.toggle('is-excess', stEx!=null && stEx>0);
  stExEl.classList.toggle('is-short', stEx!=null && stEx<0);
}

function gatherStockData(){
  return {
    date: document.getElementById('sk_date').value || new Date().toISOString().slice(0,10),
    product: document.getElementById('sk_product').value.trim(),
    desc: document.getElementById('sk_desc').value.trim(),
    opening: document.getElementById('sk_opening').value || '0',
    arrival: document.getElementById('sk_arrival').value || '0',
    total: document.getElementById('sk_total').innerText,
    sale: document.getElementById('sk_sale').value || '0',
    balance: document.getElementById('sk_balance').innerText,
    dipStock: document.getElementById('sk_dipStock').value || '',
    stEx: document.getElementById('sk_stEx').innerText,
    savedAt: formatDateDMY(new Date())+' '+formatTimeHM(new Date())
  };
}

function clearStockForm(){
  document.getElementById('sk_date').value=new Date().toISOString().slice(0,10);
  document.getElementById('sk_desc').value='';
  document.getElementById('sk_opening').value='';
  document.getElementById('sk_arrival').value='';
  document.getElementById('sk_sale').value='';
  document.getElementById('sk_dipStock').value='';
  document.getElementById('sk_dipMM').value='';
  calcStock();
  autoFillOpeningFromLastBalance();
}

function loadStockHistory(){
  try{ return JSON.parse(localStorage.getItem(STOCK_HISTORY_KEY))||[]; }catch(e){ return []; }
}
function persistStockHistory(list){
  try{ localStorage.setItem(STOCK_HISTORY_KEY,JSON.stringify(list)); }catch(e){}
}

function saveStockEntry(){
  calcStock();
  const d=gatherStockData();
  if(!d.product){
    alert('Product ka naam zaroor darj karein.');
    return;
  }
  const list=loadStockHistory();
  list.unshift(d);
  if(list.length>STOCK_HISTORY_LIMIT) list.length=STOCK_HISTORY_LIMIT;
  persistStockHistory(list);
  renderStockHistory();
  alert('Stock entry save ho gayi.');
}

function clearStockHistory(){
  const list=loadStockHistory();
  if(list.length===0) return;
  if(!confirm('Clear all '+list.length+' stock entries?\n\nThis cannot be undone.')) return;
  persistStockHistory([]);
  renderStockHistory();
}

function deleteStockEntry(index){
  const list=loadStockHistory();
  if(index<0||index>=list.length) return;
  const e=list[index];
  if(!confirm('Delete this stock entry?\n\n'+(e.product||'')+' — '+e.date)) return;
  list.splice(index,1);
  persistStockHistory(list);
  renderStockHistory();
}

function renderStockHistory(){
  const container=document.getElementById('stockHistoryList');
  if(!container) return;
  const list=loadStockHistory();

  if(list.length===0){
    container.innerHTML='<div class="history-empty">No stock entries saved yet.</div>';
    return;
  }

  container.innerHTML=list.map((e,i)=>{
    const isShort=(e.stEx||'').trim().startsWith('-');
    return '<div class="history-row" onclick="showStockImage('+i+')" role="button" tabindex="0" aria-label="View this stock entry as image">'+
      '<span class="history-tank">'+escapeHtml(e.product||'—')+'</span>'+
      '<span class="history-dip">Bal: '+escapeHtml(e.balance||'0.00')+'</span>'+
      '<span class="history-vol'+(isShort?' is-short-text':' is-excess-text')+'">'+escapeHtml(e.stEx||'0.00')+'</span>'+
      '<span class="history-time">'+escapeHtml(e.date||'')+'</span>'+
      '<button type="button" class="history-edit" onclick="event.stopPropagation();openEditStock('+i+')" aria-label="Edit this entry">✏️</button>'+
      '<button type="button" class="history-delete" onclick="event.stopPropagation();deleteStockEntry('+i+')" aria-label="Delete this entry">✕</button>'+
      (e.editedAt?'<span class="history-edited">✏️ Edited: '+escapeHtml(e.editSummary||'')+' — '+escapeHtml(e.editedAt)+'</span>':'')+
    '</div>';
  }).join('');
  renderEntryCounts();
}

/* ---------- Edit a saved stock entry ---------- */
let editingStockIndex=-1;

function openEditStock(index){
  const list=loadStockHistory();
  const e=list[index];
  if(!e) return;
  editingStockIndex=index;
  document.getElementById('es_date').value=e.date||'';
  const prodSel=document.getElementById('es_product');
  if(e.product && ![...prodSel.options].some(function(o){return o.value===e.product;})){
    const opt=document.createElement('option');
    opt.value=e.product; opt.textContent=e.product+' (removed)';
    prodSel.appendChild(opt);
  }
  prodSel.value=e.product||'';
  document.getElementById('es_desc').value=e.desc||'';
  document.getElementById('es_opening').value=(e.opening||'0').toString().replace(/,/g,'');
  document.getElementById('es_arrival').value=(e.arrival||'0').toString().replace(/,/g,'');
  document.getElementById('es_sale').value=(e.sale||'0').toString().replace(/,/g,'');
  document.getElementById('es_dipStock').value=(e.dipStock||'').toString().replace(/,/g,'');
  document.getElementById('es_dipMM').value='';
  const msg=document.getElementById('editStockMsg');
  if(msg) msg.textContent='';
  document.getElementById('editStockModal').style.display='flex';
}
function closeEditStock(){
  document.getElementById('editStockModal').style.display='none';
  editingStockIndex=-1;
}
function closeEditStockOnBg(evt){
  if(evt.target && evt.target.id==='editStockModal') closeEditStock();
}
function saveEditStock(){
  if(editingStockIndex<0) return;
  const list=loadStockHistory();
  const old=list[editingStockIndex];
  if(!old) return;

  const rawDate=document.getElementById('es_date').value;
  const product=document.getElementById('es_product').value.trim();
  const desc=document.getElementById('es_desc').value.trim();
  const opening=parseFloat(document.getElementById('es_opening').value)||0;
  const arrival=parseFloat(document.getElementById('es_arrival').value)||0;
  const sale=parseFloat(document.getElementById('es_sale').value)||0;
  const dipInput=parseFloat(document.getElementById('es_dipStock').value);
  const msg=document.getElementById('editStockMsg');

  if(!product){
    if(msg) msg.textContent='Product ka naam zaroor darj karein.';
    return;
  }

  const total=opening+arrival;
  const balance=total-sale;
  const dipStock=isNaN(dipInput)?null:dipInput;
  const stEx=dipStock!=null?(dipStock-balance):null;

  const updated={
    date: rawDate||old.date,
    product: product,
    desc: desc,
    opening: document.getElementById('es_opening').value||'0',
    arrival: document.getElementById('es_arrival').value||'0',
    total: fmtStockNum(total),
    sale: document.getElementById('es_sale').value||'0',
    balance: fmtStockNum(balance),
    dipStock: document.getElementById('es_dipStock').value||'',
    stEx: stEx!=null?(stEx>=0?'+':'')+fmtStockNum(stEx):'0.00',
    savedAt: old.savedAt
  };

  const changedFields=[];
  const labels={date:'Date',product:'Product',desc:'Description',opening:'Opening',arrival:'Arrival',sale:'Sale',dipStock:'Dip Stock'};
  Object.keys(labels).forEach(function(k){
    if(String(old[k]||'')!==String(updated[k]||'')) changedFields.push(labels[k]);
  });

  if(changedFields.length){
    updated.editedAt=formatDateDMY(new Date())+' '+formatTimeHM(new Date());
    updated.editSummary='Updated: '+changedFields.join(', ');
  }else{
    updated.editedAt=old.editedAt;
    updated.editSummary=old.editSummary;
  }

  list[editingStockIndex]=updated;
  persistStockHistory(list);
  renderStockHistory();
  closeEditStock();
}

/* ---------- Stock exports (CSV / PDF / Excel / WhatsApp) ---------- */
function exportStockCSV(){
  const list=loadStockHistory();
  if(list.length===0){ alert('No stock entries saved yet — nothing to export.'); return; }

  const rows=[['Date','Product','Description','Opening','Arrival','Total','Sale','Balance','Dip Stock','Short/Excess']];
  list.forEach(e=>rows.push([e.date,e.product,e.desc||'',e.opening,e.arrival,e.total,e.sale,e.balance,e.dipStock,e.stEx]));

  const csvContent=rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csvContent],{type:'text/csv;charset=utf-8;'});
  const stamp=new Date().toISOString().slice(0,10);
  shareOrDownloadBlob(blob,'stock-register-'+stamp+'.csv','text/csv');
}

function exportStockPDF(){
  const list=loadStockHistory();
  if(list.length===0){ alert('No stock entries saved yet — nothing to export.'); return; }
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
  doc.text('Stock Management Register',14,25);
  doc.setFontSize(9);
  doc.text('Generated: '+formatDateTimeDMY(new Date()),14,31);

  const rows=list.map(e=>[e.date,e.product,e.desc||'',e.opening,e.arrival,e.total,e.sale,e.balance,e.dipStock,e.stEx]);

  doc.autoTable({
    startY:36,
    head:[['Date','Product','Description','Opening','Arrival','Total','Sale','Balance','Dip Stock','Sh/Ex']],
    body:rows,
    headStyles:{fillColor:[37,99,235]},
    styles:{fontSize:8}
  });

  const stamp=new Date().toISOString().slice(0,10);
  const blob=doc.output('blob');
  shareOrDownloadBlob(blob,'stock-register-'+stamp+'.pdf','application/pdf');
}

function exportStockExcel(){
  const list=loadStockHistory();
  if(list.length===0){ alert('No stock entries saved yet — nothing to export.'); return; }
  if(!window.XLSX){
    alert('Excel export needs an internet connection to load the first time. Please check your connection and try again.');
    return;
  }

  const rows=[['Date','Product','Description','Opening','Arrival','Total','Sale','Balance','Dip Stock','Short/Excess']];
  list.forEach(e=>rows.push([e.date,e.product,e.desc||'',e.opening,e.arrival,e.total,e.sale,e.balance,e.dipStock,e.stEx]));

  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:16},{wch:16},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Stock Register');

  const stamp=new Date().toISOString().slice(0,10);
  const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([wbout],{type:'application/octet-stream'});
  shareOrDownloadBlob(blob,'stock-register-'+stamp+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function shareStockWhatsApp(){
  const list=loadStockHistory();
  if(list.length===0){ alert('No stock entries saved yet — nothing to share.'); return; }

  const recent=list.slice(0,20);
  let msg='*Khan Petroleum — Stock Register*\n\n';
  recent.forEach(e=>{
    msg+='• '+e.product+' ('+e.date+') — Bal: '+e.balance+' | Dip: '+(e.dipStock||'-')+' | Sh/Ex: '+e.stEx+'\n';
  });
  msg+='\nSent from Fuel Dip Calculator app.';

  const url='https://api.whatsapp.com/send?text='+encodeURIComponent(msg);
  window.open(url,'_blank','noopener');
}

/* ---------- Print stock entry ---------- */
function printStock(){
  calcStock();
  const d=gatherStockData();
  const w=window.open('','_blank');
  if(!w){ alert('Popup blocked. Please allow popups to print.'); return; }

  const html='<!doctype html><html><head><meta charset="utf-8"><title>Stock Entry</title>'+
    '<style>'+
    'body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1a1a1a;}'+
    'h2{background:#37474f;color:#fff;padding:12px 14px;margin:0 0 16px;border-radius:6px;font-size:18px;}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:16px;}'+
    'td,th{border:1px solid #999;padding:8px 10px;font-size:14px;}'+
    'td:first-child{font-weight:700;background:#f3f3f3;width:42%;}'+
    '.total-row td{font-weight:800;background:#fff8e1;}'+
    'p.foot{font-size:11px;color:#777;margin-top:20px;}'+
    '</style></head><body>'+
    '<h2>Stock Management Entry</h2>'+
    '<table>'+
      '<tr><td>Date</td><td>'+escapeHtml(isoToDMY(d.date))+'</td></tr>'+
      '<tr><td>Product</td><td>'+escapeHtml(d.product||'-')+'</td></tr>'+
      '<tr><td>Description</td><td>'+escapeHtml(d.desc||'-')+'</td></tr>'+
    '</table>'+
    '<table>'+
      '<tr><td>Opening</td><td>'+d.opening+'</td></tr>'+
      '<tr><td>Arrival</td><td>'+d.arrival+'</td></tr>'+
      '<tr class="total-row"><td>TOTAL</td><td>'+d.total+'</td></tr>'+
      '<tr><td>Sale</td><td>'+d.sale+'</td></tr>'+
      '<tr class="total-row"><td>BALANCE</td><td>'+d.balance+'</td></tr>'+
      '<tr><td>Dip Stock (Ltrs)</td><td>'+(d.dipStock||'-')+'</td></tr>'+
      '<tr class="total-row"><td>SHORT / EXCESS</td><td>'+d.stEx+'</td></tr>'+
    '</table>'+
    '<p class="foot">Generated: '+formatDateTimeDMY(new Date())+'</p>'+
    '</body></html>';

  w.document.write(html);
  w.document.close();
  w.onload=function(){ w.focus(); w.print(); };
}

function isoToDMY(iso){
  if(!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso||'-';
  const p=iso.split('-');
  const dd=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
  return isNaN(dd.getTime()) ? iso : formatDateDMY(dd);
}

/* ---------- Share stock entry as image (thermal-invoice style, drawn on canvas) ---------- */
function buildStockReceiptCanvas(dataOverride){
  const d=dataOverride||gatherStockData();
  const isShort=(d.stEx||'').trim().startsWith('-');

  const W=576;
  const PAD=26;
  const rowH=32;

  const headRows=[
    ['Date', isoToDMY(d.date)],
    ['Product', d.product||'-'],
    ['Description', d.desc||'-']
  ];
  const figRows=[
    ['Opening', d.opening],
    ['Arrival', d.arrival],
    ['TOTAL', d.total],
    ['Sale', d.sale],
    ['BALANCE', d.balance],
    ['Dip Stock (Ltrs)', d.dipStock||'-'],
    ['SHORT / EXCESS', d.stEx]
  ];

  let H=PAD;
  H+=34;
  H+=16; H+=54;
  H+=16;
  H+=headRows.length*rowH;
  H+=16;
  H+=figRows.length*rowH;
  H+=16;
  H+=48+PAD;

  const scale=2;
  const canvas=document.createElement('canvas');
  canvas.width=W*scale;
  canvas.height=H*scale;
  const ctx=canvas.getContext('2d');
  ctx.scale(scale,scale);

  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#1a1a1a';
  ctx.textBaseline='alphabetic';

  let y=PAD;
  ctx.textAlign='center';
  ctx.font='800 21px Arial, Helvetica, sans-serif';
  ctx.fillText('Khan Petroleum', W/2, y);
  y+=20;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=30;
  ctx.font='800 17px Arial, Helvetica, sans-serif';
  ctx.fillText('STOCK MANAGEMENT ENTRY', W/2, y);
  y+=24;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  ctx.textAlign='left';
  ctx.font='600 14.5px Arial, Helvetica, sans-serif';
  headRows.forEach(function(r){
    ctx.fillStyle='#5f6368';
    ctx.fillText(r[0], PAD, y);
    ctx.fillStyle='#1a1a1a';
    ctx.textAlign='right';
    ctx.fillText(String(r[1]), W-PAD, y);
    ctx.textAlign='left';
    y+=rowH;
  });

  drawDashedLine(ctx,PAD,W-PAD,y-10);
  y+=18;

  figRows.forEach(function(r,i){
    const isFinal=i===figRows.length-1;
    const isTotalLike = r[0]==='TOTAL' || r[0]==='BALANCE';
    ctx.font=(isFinal||isTotalLike?'800 15.5px Arial, Helvetica, sans-serif':'500 14.5px Arial, Helvetica, sans-serif');
    ctx.fillStyle = isFinal ? (isShort?'#dc2626':'#16a34a') : '#1a1a1a';
    ctx.fillText(r[0], PAD, y);
    ctx.textAlign='right';
    ctx.fillText(String(r[1]), W-PAD, y);
    ctx.textAlign='left';
    ctx.fillStyle='#1a1a1a';
    y+=rowH;
  });

  y+=6;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  ctx.textAlign='center';
  ctx.font='400 12px Arial, Helvetica, sans-serif';
  ctx.fillStyle='#777';
  ctx.fillText('Generated: '+(d.savedAt||formatDateTimeDMY(new Date())), W/2, y);
  y+=18;
  ctx.fillText(d.editedAt?('Edited: '+(d.editSummary||'')+' — '+d.editedAt):'Khan Pump Dip Calculator', W/2, y);

  return canvas;
}

function shareStockImage(){
  calcStock();
  try{
    const canvas=buildStockReceiptCanvas();
    canvas.toBlob(function(blob){
      if(!blob){ alert('Image nahi ban saki. Dobara koshish karein.'); return; }
      const stamp=formatDateDMY(new Date()).replace(/-/g,'');
      shareOrDownloadBlob(blob,'stock-entry-'+stamp+'.png','image/png');
    },'image/png');
  }catch(e){
    alert('Image banate waqt masla hua. Dobara koshish karein.');
  }
}

/* ---------- View a saved stock entry as an image (click on history row) ---------- */
function showStockImage(index){
  const list=loadStockHistory();
  const e=list[index];
  if(!e) return;
  try{
    const canvas=buildStockReceiptCanvas(e);
    const stamp=(e.date||formatDateDMY(new Date())).toString().replace(/[^0-9A-Za-z]/g,'');
    openImagePreview(canvas,'stock-entry-'+stamp+'.png');
  }catch(err){
    alert('Image banate waqt masla hua. Dobara koshish karein.');
  }
}

/* ---------- Build a receipt-style image for a saved reading (Tank dip) entry ---------- */
function buildReadingReceiptCanvas(e){
  const W=576;
  const PAD=26;
  const rowH=32;

  const rows=[
    ['Tank', e.tank||'-'],
    ['Dip', e.dip+' mm'],
    ['Available Fuel', e.volume||'-'],
    ['Day', e.day||'-'],
    ['Date & Time', e.time||'-']
  ];
  if(e.note) rows.push(['Note', e.note]);

  let H=PAD;
  H+=34;
  H+=16; H+=54;
  H+=16;
  H+=rows.length*rowH;
  H+=16;
  H+=48+PAD;
  if(e.editedAt) H+=18;

  const scale=2;
  const canvas=document.createElement('canvas');
  canvas.width=W*scale;
  canvas.height=H*scale;
  const ctx=canvas.getContext('2d');
  ctx.scale(scale,scale);

  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#1a1a1a';
  ctx.textBaseline='alphabetic';

  let y=PAD;
  ctx.textAlign='center';
  ctx.font='800 21px Arial, Helvetica, sans-serif';
  ctx.fillText('Khan Petroleum', W/2, y);
  y+=20;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=30;
  ctx.font='800 17px Arial, Helvetica, sans-serif';
  ctx.fillText('DIP READING ENTRY', W/2, y);
  y+=24;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  ctx.textAlign='left';
  rows.forEach(function(r,i){
    const isVol = r[0]==='Available Fuel';
    ctx.font=(isVol?'800 15.5px Arial, Helvetica, sans-serif':'600 14.5px Arial, Helvetica, sans-serif');
    ctx.fillStyle = isVol ? '#16a34a' : '#5f6368';
    ctx.fillText(r[0], PAD, y);
    ctx.fillStyle = isVol ? '#16a34a' : '#1a1a1a';
    ctx.textAlign='right';
    const maxW=W-PAD*2-140;
    let val=String(r[1]);
    while(ctx.measureText(val).width>maxW && val.length>3){ val=val.slice(0,-1); }
    if(val!==String(r[1])) val=val.replace(/\s*$/,'')+'…';
    ctx.fillText(val, W-PAD, y);
    ctx.textAlign='left';
    y+=rowH;
  });

  y+=6;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  ctx.textAlign='center';
  ctx.font='400 12px Arial, Helvetica, sans-serif';
  ctx.fillStyle='#777';
  ctx.fillText('Saved: '+(e.day?e.day+', ':'')+(e.time||''), W/2, y);
  y+=18;
  ctx.fillText('Khan Pump Dip Calculator', W/2, y);
  if(e.editedAt){
    y+=18;
    ctx.fillText('✏️ Edited: '+(e.editSummary||'')+' — '+e.editedAt, W/2, y);
  }

  return canvas;
}

/* ---------- View a saved reading entry as an image (click on history row) ---------- */
function showReadingImage(index){
  const list=loadHistory();
  const e=list[index];
  if(!e) return;
  try{
    const canvas=buildReadingReceiptCanvas(e);
    const stamp=(e.time||formatDateDMY(new Date())).toString().replace(/[^0-9A-Za-z]/g,'');
    openImagePreview(canvas,'reading-'+stamp+'.png');
  }catch(err){
    alert('Image banate waqt masla hua. Dobara koshish karein.');
  }
}

/* ---------- Generic image preview modal ---------- */
let previewImageBlob=null;
let previewImageFilename='entry.png';

function openImagePreview(canvas,filename){
  previewImageFilename=filename||'entry.png';
  canvas.toBlob(function(blob){
    if(!blob){ alert('Image nahi ban saki. Dobara koshish karein.'); return; }
    previewImageBlob=blob;
    const url=URL.createObjectURL(blob);
    const img=document.getElementById('imagePreviewImg');
    if(img){
      if(img.dataset.prevUrl) URL.revokeObjectURL(img.dataset.prevUrl);
      img.src=url;
      img.dataset.prevUrl=url;
    }
    const modal=document.getElementById('imagePreviewModal');
    if(modal) modal.style.display='flex';
  },'image/png');
}

function closeImagePreview(evt){
  if(evt && evt.target && evt.target.id!=='imagePreviewModal') return;
  const modal=document.getElementById('imagePreviewModal');
  if(modal) modal.style.display='none';
}

function downloadPreviewImage(){
  if(!previewImageBlob) return;
  const url=URL.createObjectURL(previewImageBlob);
  const a=document.createElement('a');
  a.href=url;
  a.download=previewImageFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sharePreviewImage(){
  if(!previewImageBlob) return;
  shareOrDownloadBlob(previewImageBlob,previewImageFilename,'image/png');
}

/* ---------- Init ---------- */
(function initStock(){
  const dateInput=document.getElementById('sk_date');
  if(dateInput && !dateInput.value){
    dateInput.value=new Date().toISOString().slice(0,10);
  }
  calcStock();
  renderStockHistory();
})();

/* ================= Stock Product List (Add / Edit / Remove) ================= */
const PRODUCT_LIST_KEY='stockProductList';
const DEFAULT_PRODUCTS=['Diesel Ultra','Diesel Storage','Super Plus'];

function loadProductList(){
  try{
    const list=JSON.parse(localStorage.getItem(PRODUCT_LIST_KEY));
    if(Array.isArray(list) && list.length) return list;
  }catch(e){}
  return DEFAULT_PRODUCTS.slice();
}
function persistProductList(list){
  try{ localStorage.setItem(PRODUCT_LIST_KEY,JSON.stringify(list)); }catch(e){}
}

function populateProductSelects(selectedValue){
  const list=loadProductList();
  ['sk_product','es_product'].forEach(function(id){
    const sel=document.getElementById(id);
    if(!sel) return;
    const prev=selectedValue!==undefined?selectedValue:sel.value;
    sel.innerHTML=list.map(function(p){ return '<option value="'+escapeHtml(p)+'">'+escapeHtml(p)+'</option>'; }).join('');
    if(list.indexOf(prev)!==-1) sel.value=prev;
  });
}

function openManageProducts(){
  renderProductManageList();
  const msg=document.getElementById('manageProductsMsg');
  if(msg) msg.textContent='';
  document.getElementById('newProductInput').value='';
  document.getElementById('manageProductsModal').style.display='flex';
}
function closeManageProducts(){
  document.getElementById('manageProductsModal').style.display='none';
  populateProductSelects();
  calcStock();
}
function closeManageProductsOnBg(evt){
  if(evt.target && evt.target.id==='manageProductsModal') closeManageProducts();
}

function renderProductManageList(){
  const container=document.getElementById('productManageList');
  if(!container) return;
  const list=loadProductList();

  if(list.length===0){
    container.innerHTML='<div class="history-empty">No products added yet.</div>';
    return;
  }

  container.innerHTML=list.map(function(p,i){
    return '<div class="product-manage-row">'+
      '<input type="text" class="settings-input product-edit-input" value="'+escapeHtml(p)+'" onchange="renameProduct('+i+',this.value)">'+
      '<button type="button" class="history-delete" onclick="removeProduct('+i+')" aria-label="Remove product">✕</button>'+
    '</div>';
  }).join('');
}

function addNewProduct(){
  const input=document.getElementById('newProductInput');
  const name=input.value.trim();
  const msg=document.getElementById('manageProductsMsg');
  if(!name){
    if(msg) msg.textContent='Product ka naam darj karein.';
    return;
  }
  const list=loadProductList();
  if(list.some(function(p){ return p.toLowerCase()===name.toLowerCase(); })){
    if(msg) msg.textContent='Ye product pehle se list mein maujood hai.';
    return;
  }
  list.push(name);
  persistProductList(list);
  input.value='';
  if(msg) msg.textContent='';
  renderProductManageList();
}

function renameProduct(index,newName){
  const name=newName.trim();
  const list=loadProductList();
  if(index<0||index>=list.length) return;
  if(!name){ renderProductManageList(); return; }
  list[index]=name;
  persistProductList(list);
}

function removeProduct(index){
  const list=loadProductList();
  if(index<0||index>=list.length) return;
  if(!confirm('Remove product "'+list[index]+'" from the list?\n\n(Saved stock entries won\'t be affected.)')) return;
  list.splice(index,1);
  persistProductList(list);
  renderProductManageList();
}

/* ---------- Dip (mm) → auto Dip Stock (Ltrs) ---------- */
function onStockDipMM(){
  const mmRaw=document.getElementById('sk_dipMM').value;
  const mm=parseFloat(mmRaw);
  if(mmRaw!=='' && !isNaN(mm)){
    const ltrs=interp(tank1,mm);
    if(ltrs!=null) document.getElementById('sk_dipStock').value=ltrs.toFixed(2);
  }
  calcStock();
}
function onEditStockDipMM(){
  const mmRaw=document.getElementById('es_dipMM').value;
  const mm=parseFloat(mmRaw);
  if(mmRaw!=='' && !isNaN(mm)){
    const ltrs=interp(tank1,mm);
    if(ltrs!=null) document.getElementById('es_dipStock').value=ltrs.toFixed(2);
  }
}

(function initStockProducts(){
  populateProductSelects();
  autoFillOpeningFromLastBalance();
})();

/* ================= Stock: auto-fill Opening from last saved Balance ================= */
function getStockOpeningHintEl(){
  return document.getElementById('sk_openingHint');
}

function autoFillOpeningFromLastBalance(){
  const productSel=document.getElementById('sk_product');
  const openingInput=document.getElementById('sk_opening');
  if(!productSel||!openingInput) return;
  const product=productSel.value;
  const hint=getStockOpeningHintEl();
  if(!product){ if(hint) hint.textContent=''; return; }
  const list=loadStockHistory();
  const last=list.find(function(e){ return e.product===product; });
  if(last){
    const bal=parseFloat(String(last.balance||'').replace(/,/g,''));
    if(!isNaN(bal) && openingInput.value===''){
      openingInput.value=bal.toFixed(2);
      calcStock();
      if(hint) hint.textContent='Auto-filled from last balance ('+(last.date||'')+')';
      return;
    }
  }
  if(hint) hint.textContent='';
}

function onStockProductChange(){
  const openingInput=document.getElementById('sk_opening');
  if(openingInput) openingInput.value='';
  autoFillOpeningFromLastBalance();
  calcStock();
}

/* ================= Tank Unloading (Vehicle Unloading) ================= */
const UNLOAD_HISTORY_KEY='fuelUnloadHistory';
const UNLOAD_HISTORY_LIMIT=500;

function getSiteName(){
  try{ return localStorage.getItem(SITE_NAME_KEY)||'Khan Petroleum'; }catch(e){ return 'Khan Petroleum'; }
}
function getSiteAddress(){
  try{ return localStorage.getItem(SITE_ADDRESS_KEY)||'Bypass Road, Rahim Yar Khan'; }catch(e){ return 'Bypass Road, Rahim Yar Khan'; }
}

function calcUnload(){
  const curDipRaw=document.getElementById('ul_curDip').value;
  const prvDipRaw=document.getElementById('ul_prvDip').value;
  const curDip=parseFloat(curDipRaw);
  const prvDip=parseFloat(prvDipRaw);

  const curLtrs= (curDipRaw!=='' && !isNaN(curDip)) ? interp(tank1,curDip) : null;
  const prvLtrs= (prvDipRaw!=='' && !isNaN(prvDip)) ? interp(tank1,prvDip) : null;

  document.getElementById('ul_curLtrs').value = curLtrs!=null ? curLtrs.toFixed(2) : '';
  document.getElementById('ul_prvLtrs').value = prvLtrs!=null ? prvLtrs.toFixed(2) : '';

  const balance = (curLtrs!=null && prvLtrs!=null) ? (curLtrs-prvLtrs) : 0;
  const sale = parseFloat(document.getElementById('ul_sale').value)||0;
  const total = balance - sale;
  const totalStock = total;

  const invRaw=document.getElementById('ul_invStock').value;
  const invNum=parseFloat(invRaw);
  const invStock = (invRaw!=='' && !isNaN(invNum)) ? invNum : null;
  const stEx = invStock!=null ? (totalStock-invStock) : null;

  document.getElementById('ul_balance').innerText=fmtStockNum(balance);
  document.getElementById('ul_saleOut').innerText=fmtStockNum(sale);
  document.getElementById('ul_total').innerText=fmtStockNum(total);
  document.getElementById('ul_totalStock').innerText=fmtStockNum(totalStock);
  document.getElementById('ul_invStockOut').innerText= invStock!=null ? fmtStockNum(invStock) : '0.00';
  const stExEl=document.getElementById('ul_stEx');
  stExEl.innerText= stEx!=null ? (stEx>=0?'+':'')+fmtStockNum(stEx) : '0.00';
  stExEl.classList.toggle('is-excess', stEx!=null && stEx>0);
  stExEl.classList.toggle('is-short', stEx!=null && stEx<0);
}

function gatherUnloadData(){
  return {
    date: document.getElementById('ul_date').value || new Date().toISOString().slice(0,10),
    vendor: document.getElementById('ul_vendor').value.trim(),
    vehicle: document.getElementById('ul_vehicle').value.trim(),
    driver: document.getElementById('ul_driver').value.trim(),
    contact: document.getElementById('ul_contact').value.trim(),
    tank: document.getElementById('ul_tank').value,
    curDip: document.getElementById('ul_curDip').value || '0',
    curLtrs: document.getElementById('ul_curLtrs').value || '0.00',
    prvDip: document.getElementById('ul_prvDip').value || '0',
    prvLtrs: document.getElementById('ul_prvLtrs').value || '0.00',
    balance: document.getElementById('ul_balance').innerText,
    sale: document.getElementById('ul_sale').value || '0',
    total: document.getElementById('ul_total').innerText,
    totalStock: document.getElementById('ul_totalStock').innerText,
    invStock: document.getElementById('ul_invStock').value || '',
    stEx: document.getElementById('ul_stEx').innerText,
    savedAt: formatDateDMY(new Date())+' '+formatTimeHM(new Date())
  };
}

function loadUnloadHistory(){
  try{ return JSON.parse(localStorage.getItem(UNLOAD_HISTORY_KEY))||[]; }catch(e){ return []; }
}
function persistUnloadHistory(list){
  try{ localStorage.setItem(UNLOAD_HISTORY_KEY,JSON.stringify(list)); }catch(e){}
}

function autoFillPrevDipFromLastUnload(){
  const prvDipInput=document.getElementById('ul_prvDip');
  if(!prvDipInput || prvDipInput.value!=='') return;
  const list=loadUnloadHistory();
  if(list.length===0) return;
  const last=list[0];
  if(last && last.curDip!=null && last.curDip!==''){
    prvDipInput.value=last.curDip;
    calcUnload();
  }
}

function clearUnloadForm(){
  document.getElementById('ul_date').value=new Date().toISOString().slice(0,10);
  document.getElementById('ul_vendor').value='';
  document.getElementById('ul_vehicle').value='';
  document.getElementById('ul_driver').value='';
  document.getElementById('ul_contact').value='';
  document.getElementById('ul_curDip').value='';
  document.getElementById('ul_curLtrs').value='';
  document.getElementById('ul_prvDip').value='';
  document.getElementById('ul_prvLtrs').value='';
  document.getElementById('ul_sale').value='';
  document.getElementById('ul_invStock').value='';
  calcUnload();
  autoFillPrevDipFromLastUnload();
}

function saveUnloadEntry(){
  calcUnload();
  const d=gatherUnloadData();
  if(!d.vehicle && !d.vendor){
    alert('Vendor Name ya Vehicle No zaroor darj karein.');
    return;
  }
  const list=loadUnloadHistory();
  list.unshift(d);
  if(list.length>UNLOAD_HISTORY_LIMIT) list.length=UNLOAD_HISTORY_LIMIT;
  persistUnloadHistory(list);
  renderUnloadHistory();
  alert('Unloading entry save ho gayi.');
}

function clearUnloadHistory(){
  const list=loadUnloadHistory();
  if(list.length===0) return;
  if(!confirm('Clear all '+list.length+' unloading entries?\n\nThis cannot be undone.')) return;
  persistUnloadHistory([]);
  renderUnloadHistory();
}

function deleteUnloadEntry(index){
  const list=loadUnloadHistory();
  if(index<0||index>=list.length) return;
  const e=list[index];
  if(!confirm('Delete this unloading entry?\n\n'+(e.vendor||e.vehicle||'')+' — '+e.date)) return;
  list.splice(index,1);
  persistUnloadHistory(list);
  renderUnloadHistory();
}

function renderUnloadHistory(){
  const container=document.getElementById('unloadHistoryList');
  if(!container) return;
  const list=loadUnloadHistory();

  if(list.length===0){
    container.innerHTML='<div class="history-empty">No unloading entries saved yet.</div>';
    return;
  }

  container.innerHTML=list.map(function(e,i){
    const isShort=(e.stEx||'').trim().startsWith('-');
    return '<div class="history-row" onclick="showUnloadImage('+i+')" role="button" tabindex="0" aria-label="View this unloading entry as image">'+
      '<span class="history-tank">'+escapeHtml(e.vendor||e.vehicle||'—')+'</span>'+
      '<span class="history-dip">'+escapeHtml(e.vehicle||'')+'</span>'+
      '<span class="history-vol'+(isShort?' is-short-text':' is-excess-text')+'">'+escapeHtml(e.stEx||'0.00')+'</span>'+
      '<span class="history-time">'+escapeHtml(e.date||'')+'</span>'+
      '<button type="button" class="history-edit" onclick="event.stopPropagation();openEditUnload('+i+')" aria-label="Edit this entry">✏️</button>'+
      '<button type="button" class="history-delete" onclick="event.stopPropagation();deleteUnloadEntry('+i+')" aria-label="Delete this entry">✕</button>'+
      (e.editedAt?'<span class="history-edited">✏️ Edited: '+escapeHtml(e.editSummary||'')+' — '+escapeHtml(e.editedAt)+'</span>':'')+
    '</div>';
  }).join('');
  renderEntryCounts();
}

/* ---------- Edit a saved unloading entry ---------- */
let editingUnloadIndex=-1;

function onEditUnloadDipChange(){ /* recompute happens on save */ }

function openEditUnload(index){
  const list=loadUnloadHistory();
  const e=list[index];
  if(!e) return;
  editingUnloadIndex=index;
  document.getElementById('eu_date').value=e.date||'';
  document.getElementById('eu_vendor').value=e.vendor||'';
  document.getElementById('eu_vehicle').value=e.vehicle||'';
  document.getElementById('eu_driver').value=e.driver||'';
  document.getElementById('eu_contact').value=e.contact||'';
  document.getElementById('eu_curDip').value=e.curDip||'';
  document.getElementById('eu_prvDip').value=e.prvDip||'';
  document.getElementById('eu_sale').value=(e.sale||'0').toString().replace(/,/g,'');
  document.getElementById('eu_invStock').value=(e.invStock||'').toString().replace(/,/g,'');
  const msg=document.getElementById('editUnloadMsg');
  if(msg) msg.textContent='';
  document.getElementById('editUnloadModal').style.display='flex';
}
function closeEditUnload(){
  document.getElementById('editUnloadModal').style.display='none';
  editingUnloadIndex=-1;
}
function closeEditUnloadOnBg(evt){
  if(evt.target && evt.target.id==='editUnloadModal') closeEditUnload();
}
function saveEditUnload(){
  if(editingUnloadIndex<0) return;
  const list=loadUnloadHistory();
  const old=list[editingUnloadIndex];
  if(!old) return;

  const rawDate=document.getElementById('eu_date').value;
  const vendor=document.getElementById('eu_vendor').value.trim();
  const vehicle=document.getElementById('eu_vehicle').value.trim();
  const driver=document.getElementById('eu_driver').value.trim();
  const contact=document.getElementById('eu_contact').value.trim();
  const curDipRaw=document.getElementById('eu_curDip').value;
  const prvDipRaw=document.getElementById('eu_prvDip').value;
  const curDip=parseFloat(curDipRaw);
  const prvDip=parseFloat(prvDipRaw);
  const sale=parseFloat(document.getElementById('eu_sale').value)||0;
  const invRaw=document.getElementById('eu_invStock').value;
  const invNum=parseFloat(invRaw);
  const msg=document.getElementById('editUnloadMsg');

  if(!vendor && !vehicle){
    if(msg) msg.textContent='Vendor Name ya Vehicle No zaroor darj karein.';
    return;
  }

  const curLtrs=(curDipRaw!=='' && !isNaN(curDip)) ? interp(tank1,curDip) : null;
  const prvLtrs=(prvDipRaw!=='' && !isNaN(prvDip)) ? interp(tank1,prvDip) : null;
  if((curDipRaw!=='' && curLtrs==null) || (prvDipRaw!=='' && prvLtrs==null)){
    if(msg) msg.textContent='Dip value tank ki range se bahar hai.';
    return;
  }
  const balance=(curLtrs!=null && prvLtrs!=null) ? (curLtrs-prvLtrs) : 0;
  const total=balance-sale;
  const totalStock=total;
  const invStock=(invRaw!=='' && !isNaN(invNum)) ? invNum : null;
  const stEx=invStock!=null ? (totalStock-invStock) : null;

  const updated={
    date: rawDate||old.date,
    vendor: vendor,
    vehicle: vehicle,
    driver: driver,
    contact: contact,
    tank: old.tank,
    curDip: curDipRaw||'0',
    curLtrs: curLtrs!=null?curLtrs.toFixed(2):'0.00',
    prvDip: prvDipRaw||'0',
    prvLtrs: prvLtrs!=null?prvLtrs.toFixed(2):'0.00',
    balance: fmtStockNum(balance),
    sale: document.getElementById('eu_sale').value||'0',
    total: fmtStockNum(total),
    totalStock: fmtStockNum(totalStock),
    invStock: document.getElementById('eu_invStock').value||'',
    stEx: stEx!=null?(stEx>=0?'+':'')+fmtStockNum(stEx):'0.00',
    savedAt: old.savedAt
  };

  const changedFields=[];
  const labels={date:'Date',vendor:'Vendor',vehicle:'Vehicle No',driver:'Driver',contact:'Contact',curDip:'Current Dip',prvDip:'Prv Dip',sale:'Sale',invStock:'Inv Stock'};
  Object.keys(labels).forEach(function(k){
    if(String(old[k]||'')!==String(updated[k]||'')) changedFields.push(labels[k]);
  });

  if(changedFields.length){
    updated.editedAt=formatDateDMY(new Date())+' '+formatTimeHM(new Date());
    updated.editSummary='Updated: '+changedFields.join(', ');
  }else{
    updated.editedAt=old.editedAt;
    updated.editSummary=old.editSummary;
  }

  list[editingUnloadIndex]=updated;
  persistUnloadHistory(list);
  renderUnloadHistory();
  closeEditUnload();
}

/* ---------- Export Unloading history ---------- */
function exportUnloadCSV(){
  const list=loadUnloadHistory();
  if(list.length===0){ alert('No unloading entries saved yet — nothing to export.'); return; }

  const rows=[['Date','Vendor','Vehicle No','Driver','Contact','Tank','Current Dip','Current Ltrs','Prv Dip','Prv Ltrs','Balance','Sale','Total','Inv Stock','St/Ex']];
  list.forEach(function(e){
    rows.push([e.date,e.vendor,e.vehicle,e.driver,e.contact,e.tank,e.curDip,e.curLtrs,e.prvDip,e.prvLtrs,e.balance,e.sale,e.total,e.invStock,e.stEx]);
  });

  const csvContent=rows.map(function(r){ return r.map(csvEscape).join(','); }).join('\r\n');
  const blob=new Blob(['\ufeff'+csvContent],{type:'text/csv;charset=utf-8;'});
  const stamp=new Date().toISOString().slice(0,10);
  shareOrDownloadBlob(blob,'unloading-register-'+stamp+'.csv','text/csv');
}

function exportUnloadPDF(){
  const list=loadUnloadHistory();
  if(list.length===0){ alert('No unloading entries saved yet — nothing to export.'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('PDF export needs an internet connection to load the first time. Please check your connection and try again.');
    return;
  }

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(37,99,235);
  doc.text(getSiteName(),14,18);
  doc.setFontSize(11);
  doc.setTextColor(100,100,100);
  doc.text('Vehicle Unloading Register',14,25);
  doc.setFontSize(9);
  doc.text('Generated: '+formatDateTimeDMY(new Date()),14,31);

  const rows=list.map(function(e){ return [e.date,e.vendor,e.vehicle,e.driver,e.curDip,e.prvDip,e.balance,e.sale,e.total,e.invStock,e.stEx]; });

  doc.autoTable({
    startY:36,
    head:[['Date','Vendor','Vehicle','Driver','Cur Dip','Prv Dip','Balance','Sale','Total','Inv Stock','St/Ex']],
    body:rows,
    headStyles:{fillColor:[37,99,235]},
    styles:{fontSize:7.5}
  });

  const stamp=new Date().toISOString().slice(0,10);
  const blob=doc.output('blob');
  shareOrDownloadBlob(blob,'unloading-register-'+stamp+'.pdf','application/pdf');
}

function exportUnloadExcel(){
  const list=loadUnloadHistory();
  if(list.length===0){ alert('No unloading entries saved yet — nothing to export.'); return; }
  if(!window.XLSX){
    alert('Excel export needs an internet connection to load the first time. Please check your connection and try again.');
    return;
  }

  const rows=[['Date','Vendor','Vehicle No','Driver','Contact','Tank','Current Dip','Current Ltrs','Prv Dip','Prv Ltrs','Balance','Sale','Total','Inv Stock','St/Ex']];
  list.forEach(function(e){
    rows.push([e.date,e.vendor,e.vehicle,e.driver,e.contact,e.tank,e.curDip,e.curLtrs,e.prvDip,e.prvLtrs,e.balance,e.sale,e.total,e.invStock,e.stEx]);
  });

  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:14},{wch:12},{wch:14},{wch:14},{wch:12},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Unloading Register');

  const stamp=new Date().toISOString().slice(0,10);
  const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([wbout],{type:'application/octet-stream'});
  shareOrDownloadBlob(blob,'unloading-register-'+stamp+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function shareUnloadWhatsApp(){
  const list=loadUnloadHistory();
  if(list.length===0){ alert('No unloading entries saved yet — nothing to share.'); return; }

  const recent=list.slice(0,20);
  let msg='*'+getSiteName()+' — Vehicle Unloading Register*\n\n';
  recent.forEach(function(e){
    msg+='• '+(e.vendor||'-')+' ('+(e.vehicle||'-')+') '+e.date+' — Total: '+e.total+' | Inv: '+(e.invStock||'-')+' | St/Ex: '+e.stEx+'\n';
  });
  msg+='\nSent from Khan Pump Dip Calculator app.';

  const url='https://api.whatsapp.com/send?text='+encodeURIComponent(msg);
  window.open(url,'_blank','noopener');
}

/* ---------- Print unloading entry ---------- */
function printUnload(){
  calcUnload();
  const d=gatherUnloadData();
  const w=window.open('','_blank');
  if(!w){ alert('Popup blocked. Please allow popups to print.'); return; }

  const html='<!doctype html><html><head><meta charset="utf-8"><title>Unloading Entry</title>'+
    '<style>'+
    'body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1a1a1a;}'+
    'h2{background:#37474f;color:#fff;padding:12px 14px;margin:0 0 4px;border-radius:6px;font-size:18px;}'+
    'p.addr{margin:0 0 16px;color:#666;font-size:12px;}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:16px;}'+
    'td,th{border:1px solid #999;padding:8px 10px;font-size:14px;}'+
    'td:first-child{font-weight:700;background:#f3f3f3;width:42%;}'+
    '.total-row td{font-weight:800;background:#fff8e1;}'+
    'p.foot{font-size:11px;color:#777;margin-top:20px;}'+
    '</style></head><body>'+
    '<h2>'+escapeHtml(getSiteName())+' — Vehicle Unloading / Tank Status</h2>'+
    '<p class="addr">'+escapeHtml(getSiteAddress())+'</p>'+
    '<table>'+
      '<tr><td>Date</td><td>'+escapeHtml(isoToDMY(d.date))+'</td></tr>'+
      '<tr><td>Vendor Name</td><td>'+escapeHtml(d.vendor||'-')+'</td></tr>'+
      '<tr><td>Vehicle No</td><td>'+escapeHtml(d.vehicle||'-')+'</td></tr>'+
      '<tr><td>Driver Name</td><td>'+escapeHtml(d.driver||'-')+'</td></tr>'+
      '<tr><td>Contact No</td><td>'+escapeHtml(d.contact||'-')+'</td></tr>'+
      '<tr><td>Unloading Tank</td><td>'+escapeHtml(d.tank||'-')+'</td></tr>'+
    '</table>'+
    '<table>'+
      '<tr><th>Description</th><th>Dips</th><th>Ltrs</th></tr>'+
      '<tr><td>Current Dip &amp; Ltrs.</td><td>'+d.curDip+' mm</td><td>'+d.curLtrs+' L</td></tr>'+
      '<tr><td>Prv Dip &amp; Ltrs</td><td>'+d.prvDip+' mm</td><td>'+d.prvLtrs+' L</td></tr>'+
      '<tr><td>Balance Liters</td><td colspan="2">'+d.balance+'</td></tr>'+
      '<tr><td>Sale Liters</td><td colspan="2">'+d.sale+'</td></tr>'+
      '<tr class="total-row"><td>TOTAL LITERS</td><td colspan="2">'+d.total+'</td></tr>'+
    '</table>'+
    '<table>'+
      '<tr><td>TOTAL STOCK</td><td>'+d.totalStock+'</td></tr>'+
      '<tr><td>INV STOCK</td><td>'+(d.invStock||'-')+'</td></tr>'+
      '<tr class="total-row"><td>ST/EX LITER</td><td>'+d.stEx+'</td></tr>'+
    '</table>'+
    '<p class="foot">Generated: '+formatDateTimeDMY(new Date())+'</p>'+
    '</body></html>';

  w.document.write(html);
  w.document.close();
  w.onload=function(){ w.focus(); w.print(); };
}

/* ---------- Share/View unloading entry as image (thermal-invoice style, drawn on canvas) ---------- */
function buildUnloadReceiptCanvas(dataOverride){
  const d=dataOverride||gatherUnloadData();
  const isShort=(d.stEx||'').trim().startsWith('-');

  const W=576;
  const PAD=26;
  const rowH=32;

  const headRows=[
    ['Date', isoToDMY(d.date)],
    ['Vendor Name', d.vendor||'-'],
    ['Vehicle No', d.vehicle||'-'],
    ['Driver Name', d.driver||'-'],
    ['Contact No', d.contact||'-'],
    ['Unloading Tank', d.tank||'-']
  ];
  const tableRows=[
    ['Current Dip & Ltrs.', d.curDip+' mm', d.curLtrs+' L'],
    ['Prv Dip & Ltrs', d.prvDip+' mm', d.prvLtrs+' L']
  ];
  const figRows=[
    ['Balance Liters', d.balance],
    ['Sale Liters', d.sale],
    ['TOTAL LITERS', d.total]
  ];
  const stockRows=[
    ['TOTAL STOCK', d.totalStock],
    ['INV STOCK', d.invStock||'-'],
    ['ST/ EX LITER', d.stEx]
  ];

  let H=PAD;
  H+=34; H+=18; H+=16;
  H+=54; H+=16;
  H+=headRows.length*rowH; H+=16;
  H+=(tableRows.length+1)*rowH; H+=16;
  H+=figRows.length*rowH; H+=16;
  H+=stockRows.length*rowH; H+=16;
  H+=36+PAD;

  const scale=2;
  const canvas=document.createElement('canvas');
  canvas.width=W*scale;
  canvas.height=H*scale;
  const ctx=canvas.getContext('2d');
  ctx.scale(scale,scale);

  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#1a1a1a';
  ctx.textBaseline='alphabetic';

  let y=PAD;
  ctx.textAlign='center';
  ctx.font='800 21px Arial, Helvetica, sans-serif';
  ctx.fillText(getSiteName(), W/2, y);
  y+=20;
  ctx.font='400 11.5px Arial, Helvetica, sans-serif';
  ctx.fillStyle='#777';
  ctx.fillText(getSiteAddress(), W/2, y);
  ctx.fillStyle='#1a1a1a';
  y+=16;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=30;
  ctx.font='800 16px Arial, Helvetica, sans-serif';
  ctx.fillText('VEHICLE UNLOADING — TANK STATUS', W/2, y);
  y+=24;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  ctx.textAlign='left';
  ctx.font='600 14.5px Arial, Helvetica, sans-serif';
  headRows.forEach(function(r){
    ctx.fillStyle='#5f6368';
    ctx.fillText(r[0], PAD, y);
    ctx.fillStyle='#1a1a1a';
    ctx.textAlign='right';
    ctx.fillText(String(r[1]), W-PAD, y);
    ctx.textAlign='left';
    y+=rowH;
  });

  drawDashedLine(ctx,PAD,W-PAD,y-10);
  y+=18;

  const colA=PAD, colB=W-PAD-150, colC=W-PAD;
  ctx.font='700 13px Arial, Helvetica, sans-serif';
  ctx.fillStyle='#37474f';
  ctx.fillRect(PAD-6,y-16,W-2*(PAD-6),24);
  ctx.fillStyle='#ffffff';
  ctx.textAlign='left'; ctx.fillText('Description', colA, y);
  ctx.textAlign='center'; ctx.fillText('Dips', (colB+colC)/2-45, y);
  ctx.textAlign='right'; ctx.fillText('Ltrs', colC, y);
  y+=rowH;

  ctx.fillStyle='#1a1a1a';
  tableRows.forEach(function(r){
    ctx.font='500 14px Arial, Helvetica, sans-serif';
    ctx.textAlign='left'; ctx.fillText(r[0], colA, y);
    ctx.textAlign='center'; ctx.fillText(r[1], (colB+colC)/2-45, y);
    ctx.textAlign='right'; ctx.fillText(r[2], colC, y);
    y+=rowH;
  });

  y+=6;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  ctx.textAlign='left';
  figRows.forEach(function(r,i){
    const isFinal=i===figRows.length-1;
    ctx.font=(isFinal?'800 15.5px Arial, Helvetica, sans-serif':'500 14.5px Arial, Helvetica, sans-serif');
    ctx.fillStyle=isFinal?'#1a1a1a':'#1a1a1a';
    ctx.fillText(r[0], PAD, y);
    ctx.textAlign='right';
    ctx.fillText(String(r[1]), W-PAD, y);
    ctx.textAlign='left';
    y+=rowH;
  });

  y+=6;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=26;

  stockRows.forEach(function(r,i){
    const isFinal=i===stockRows.length-1;
    ctx.font=(isFinal?'800 15.5px Arial, Helvetica, sans-serif':'600 14.5px Arial, Helvetica, sans-serif');
    ctx.fillStyle=isFinal?(isShort?'#dc2626':'#16a34a'):'#1a1a1a';
    ctx.fillText(r[0], PAD, y);
    ctx.textAlign='right';
    ctx.fillText(String(r[1]), W-PAD, y);
    ctx.textAlign='left';
    ctx.fillStyle='#1a1a1a';
    y+=rowH;
  });

  y+=6;
  drawDashedLine(ctx,PAD,W-PAD,y);
  y+=22;

  ctx.textAlign='center';
  ctx.font='400 11px Arial, Helvetica, sans-serif';
  ctx.fillStyle='#777';
  ctx.fillText('Saved: '+(d.savedAt||formatDateTimeDMY(new Date()))+' | Viewed: '+formatDateTimeDMY(new Date()), W/2, y);

  return canvas;
}

function shareUnloadImage(){
  calcUnload();
  try{
    const canvas=buildUnloadReceiptCanvas();
    canvas.toBlob(function(blob){
      if(!blob){ alert('Image nahi ban saki. Dobara koshish karein.'); return; }
      const stamp=formatDateDMY(new Date()).replace(/-/g,'');
      shareOrDownloadBlob(blob,'unloading-entry-'+stamp+'.png','image/png');
    },'image/png');
  }catch(e){
    alert('Image banate waqt masla hua. Dobara koshish karein.');
  }
}

function showUnloadImage(index){
  const list=loadUnloadHistory();
  const e=list[index];
  if(!e) return;
  try{
    const canvas=buildUnloadReceiptCanvas(e);
    const stamp=(e.date||formatDateDMY(new Date())).toString().replace(/[^0-9A-Za-z]/g,'');
    openImagePreview(canvas,'unloading-entry-'+stamp+'.png');
  }catch(err){
    alert('Image banate waqt masla hua. Dobara koshish karein.');
  }
}

/* ---------- Init Unload ---------- */
(function initUnload(){
  const dateInput=document.getElementById('ul_date');
  if(dateInput && !dateInput.value){
    dateInput.value=new Date().toISOString().slice(0,10);
  }
  calcUnload();
  renderUnloadHistory();
  autoFillPrevDipFromLastUnload();
})();
