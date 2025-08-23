const LS_DAILY = 'tib_oracle_daily';
const LS_HISTORY = 'tib_oracle_hist';

function todayKey(){ return new Date().toISOString().slice(0,10); }

function getDaily(){
  const raw = localStorage.getItem(LS_DAILY);
  if(!raw) return {date: todayKey(), count: 0};
  try{
    const o = JSON.parse(raw);
    return (o.date === todayKey()) ? o : {date: todayKey(), count: 0};
  }catch(e){ return {date: todayKey(), count: 0}; }
}
function setDaily(o){ localStorage.setItem(LS_DAILY, JSON.stringify(o)); }

async function loadCards(){
  const res = await fetch('cards.json');
  return await res.json();
}

function sample(arr, n=1){
  const pool=[...arr]; const out=[];
  while(out.length<n && pool.length){
    const i = Math.floor(Math.random()*pool.length);
    out.push(pool.splice(i,1)[0]);
  }
  return out;
}

function renderHistory(){
  const box = document.getElementById('history');
  const list = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  if(!list.length){ box.innerHTML = '<div class="item">ยังไม่มีประวัติ</div>'; return; }
  box.innerHTML = list.map(h=>{
    const dt = new Date(h.ts).toLocaleString();
    const names = h.cards.map(c=> c.name_th + (c.rev? ' (กลับหัว)':'' )).join(' • ');
    const note = h.note ? `<div>โน้ต: ${h.note}</div>` : '';
    return `<div class="item">
      <div style="opacity:.8;font-size:12px">${dt}</div>
      <div>${names}</div>${note}
    </div>`;
  }).join('');
}

function updateQuota(){
  const q = document.getElementById('quota');
  const d = getDaily();
  q.textContent = `สิทธิ์ฟรีวันนี้: ใช้ไป ${d.count}/1 ครั้ง`;
}

let MODE = 'one';
document.getElementById('btn-one').onclick = ()=>{
  MODE='one';
  document.getElementById('btn-one').classList.add('primary');
  document.getElementById('btn-three').classList.remove('primary');
};
document.getElementById('btn-three').onclick = ()=>{
  MODE='three';
  document.getElementById('btn-three').classList.add('primary');
  document.getElementById('btn-one').classList.remove('primary');
};

async function drawNow(){
  const d = getDaily();
  if(d.count >= 1){
    alert('เวอร์ชันทดลอง: ฟรีวันละ 1 ครั้ง');
    return;
  }
  const all = await loadCards();
  const n = MODE==='three' ? 3 : 1;
  const chosen = sample(all, n).map(c=>({...c, rev: Math.random() < 0.3 }));
  const box = document.getElementById('cards');
  box.innerHTML = chosen.map(c=>{
    const meaning = c.rev ? c.reversed : c.upright;
    const badge = c.rev ? '<span class="badge">กลับหัว</span>' : '<span class="badge">ปกติ</span>';
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h4>${c.name_th}</h4>${badge}
      </div>
      <div class="keywords">คีย์เวิร์ด: ${c.keywords.join(' • ')}</div>
      <div style="margin:6px 0">${meaning}</div>
      <div style="margin:6px 0"><em>มนตร์ยืนยัน:</em> ${c.affirmation}</div>
      <div style="opacity:.9">แอคชันวันนี้: ${c.action}</div>
    </div>`;
  }).join('');
  document.getElementById('journal').style.display='block';

  setDaily({date: todayKey(), count: d.count + 1});
  updateQuota();

  window.__lastDraw = chosen;
}
document.getElementById('btn-draw').onclick = drawNow;

document.getElementById('btn-save').onclick = ()=>{
  if(!window.__lastDraw) return;
  const note = document.getElementById('note').value.trim();
  const list = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  list.unshift({ ts: Date.now(), cards: window.__lastDraw, note });
  localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0,100)));
  document.getElementById('note').value='';
  renderHistory();
  alert('บันทึกแล้ว');
};

updateQuota();
renderHistory();
