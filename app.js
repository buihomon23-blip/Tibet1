/* ===== คีย์ LocalStorage ===== */
const LS = {
  FREE_DATE: 'tibet_free_used_on',      // YYYY-MM-DD วันที่ใช้สิทธิ์ฟรีไปแล้ว
  SPREAD_CREDIT: 'tibet_spread_credits',// จำนวนเครดิตสเปรดคงเหลือ
  DAY_PASS_UNTIL: 'tibet_day_until',    // ISO string ถึงเวลาหมดสิทธิ์รายวัน
  SUB_MONTH_UNTIL: 'tibet_month_until', // ISO string หมดอายุรายเดือน
  SUB_YEAR_UNTIL: 'tibet_year_until'    // ISO string หมดอายุรายปี
};

/* ===== Utils เวลา/วันที่ ===== */
const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};

const nowIso = () => new Date().toISOString();
const isActiveUntil = (iso) => iso && new Date(iso) > new Date();

/* ===== สถานะโหมดเปิดไพ่ ===== */
let mode = 'one'; // 'one' | 'spread'
const $ = (sel) => document.querySelector(sel);

/* ====== การ์ด / ผลลัพธ์ (ตัวอย่างเรียก API/JSON ได้ภายหลัง) ====== */
function drawOneCard() {
  // ตัวอย่าง: สุ่มข้อความ (คุณสามารถดึงจาก cards.json ได้)
  const samples = [
    'มณเทลศักดิ์สิทธิ์ — โครงสร้างและระบบใหม่จะช่วยคุณ',
    'ไพ่แห่งสติ — ทำใจนิ่งๆ แล้วคำตอบจะชัด',
    'ไพ่กระจก — สะท้อนบทเรียนเก่าเพื่อก้าวหน้า',
    'ไพ่ผสาน — ทีม/คนรอบตัวคือคีย์สำคัญวันนี้'
  ];
  return samples[Math.floor(Math.random()*samples.length)];
}

function drawSpread() {
  // สุ่ม 3–6 ใบ
  const n = 3 + Math.floor(Math.random()*4); // 3..6
  const out = [];
  for (let i=0;i<n;i++) out.push(drawOneCard());
  return out;
}

function renderResult(texts) {
  const box = $('#card-result');
  box.innerHTML = '';
  if (Array.isArray(texts)) {
    texts.forEach(t=>{
      const p = document.createElement('p');
      p.textContent = '• ' + t;
      box.appendChild(p);
    });
  } else {
    const p = document.createElement('p');
    p.textContent = texts;
    box.appendChild(p);
  }
}

/* ===== จัดการสิทธิ์ ===== */
function getInt(key, def=0) {
  const v = parseInt(localStorage.getItem(key) || '', 10);
  return Number.isFinite(v) ? v : def;
}
function setInt(key, val) {
  localStorage.setItem(key, String(val));
}

function canUseFreeToday() {
  const used = localStorage.getItem(LS.FREE_DATE);
  return used !== todayKey(); // ใช้ได้ถ้ายังไม่ใช่วันนี้
}

function markFreeUsedToday() {
  localStorage.setItem(LS.FREE_DATE, todayKey());
}

function getSpreadCredits() {
  return getInt(LS.SPREAD_CREDIT, 0);
}
function addSpreadCredits(n) {
  setInt(LS.SPREAD_CREDIT, getSpreadCredits() + n);
}
function consumeSpreadCredit() {
  const cur = getSpreadCredits();
  if (cur > 0) setInt(LS.SPREAD_CREDIT, cur-1);
}

function setDayPass(hours=24) {
  const d = new Date();
  d.setHours(d.getHours()+hours);
  localStorage.setItem(LS.DAY_PASS_UNTIL, d.toISOString());
}
function hasDayPass() {
  return isActiveUntil(localStorage.getItem(LS.DAY_PASS_UNTIL));
}

function setMonthSub(months=1) {
  const d = new Date();
  d.setMonth(d.getMonth()+months);
  localStorage.setItem(LS.SUB_MONTH_UNTIL, d.toISOString());
}
function hasMonthSub() {
  return isActiveUntil(localStorage.getItem(LS.SUB_MONTH_UNTIL));
}

function setYearSub(years=1) {
  const d = new Date();
  d.setFullYear(d.getFullYear()+years);
  localStorage.setItem(LS.SUB_YEAR_UNTIL, d.toISOString());
}
function hasYearSub() {
  return isActiveUntil(localStorage.getItem(LS.SUB_YEAR_UNTIL));
}

function hasUnlimitedOpen() {
  // ถ้ามี day pass / month / year = ถือว่าไม่จำกัด
  return hasDayPass() || hasMonthSub() || hasYearSub();
}

/* ===== อัปเดต UI เครดิต ===== */
function refreshUI() {
  const creditSpan = document.querySelector('#spread-credit');
  if (creditSpan) creditSpan.textContent = String(getSpreadCredits());

  const freeBtn = $('#btn-free');
  if (freeBtn) {
    freeBtn.disabled = !canUseFreeToday();
    freeBtn.textContent = canUseFreeToday() ? 'ใช้สิทธิ์วันนี้' : 'ใช้ไปแล้ววันนี้';
  }
}

/* ===== ปุ่มโมด ===== */
function attachModeButtons() {
  $('#btn-one')?.addEventListener('click', ()=>{
    mode = 'one';
    $('#btn-one').classList.add('active');
    $('#btn-spread').classList.remove('active');
  });
  $('#btn-spread')?.addEventListener('click', ()=>{
    mode = 'spread';
    $('#btn-spread').classList.add('active');
    $('#btn-one').classList.remove('active');
  });
}

/* ===== ปุ่มเปิดไพ่ ===== */
function attachDrawButton() {
  $('#btn-draw')?.addEventListener('click', ()=>{
    if (mode === 'one') {
      // 1 ใบ — ใช้ได้ถ้า: ยังมีสิทธิ์ฟรีวันนี้ หรือ มี unlimited
      if (canUseFreeToday()) {
        const card = drawOneCard();
        renderResult(card);
        markFreeUsedToday();
        refreshUI();
      } else if (hasUnlimitedOpen()) {
        renderResult(drawOneCard());
      } else {
        alert('ใช้สิทธิ์ฟรีวันนี้แล้วค่ะ — เลือกซื้อแพ็กเพื่อเปิดเพิ่มได้');
      }
    } else {
      // spread — ต้องมีเครดิต หรือ unlimited
      if (getSpreadCredits() > 0 || hasUnlimitedOpen()) {
        renderResult(drawSpread());
        if (!hasUnlimitedOpen()) consumeSpreadCredit();
        refreshUI();
      } else {
        alert('ยังไม่มีเครดิตสเปรด — ซื้อแพ็ก 29 บาทเพื่อเปิด 3–6 ใบ');
      }
    }
  });
}

/* ===== ปุ่มฟรี ===== */
function attachFreeButton() {
  $('#btn-free')?.addEventListener('click', ()=>{
    if (!canUseFreeToday()) {
      alert('วันนี้ใช้สิทธิ์ฟรีไปแล้วค่ะ');
      return;
    }
    const card = drawOneCard();
    renderResult(card);
    markFreeUsedToday();
    refreshUI();
  });
}

/* ===== ปุ่มชำระเงิน (Stub ทดสอบก่อนเชื่อม Omise) ===== */
function attachPayButtons() {
  document.querySelectorAll('.pay-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const plan = btn.getAttribute('data-plan');
      switch(plan) {
        case 'spread':      // 29 บาท
          addSpreadCredits(1);
          alert('เติมเครดิตสเปรด +1 (ทดสอบ)');
          break;
        case 'daily':       // 49 บาท
          setDayPass(24);
          alert('เปิดไม่จำกัด 24 ชั่วโมง (ทดสอบ)');
          break;
        case 'monthly':     // 199 บาท
          setMonthSub(1);
          alert('เปิดไม่จำกัด 30 วัน (ทดสอบ)');
          break;
        case 'yearly':      // 1,999 บาท
          setYearSub(1);
          alert('เปิดไม่จำกัด 1 ปี + สิทธิพิเศษ (ทดสอบ)');
          break;
      }
      refreshUI();
    });
  });
}

/* ===== เริ่มทำงาน ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  attachModeButtons();
  attachDrawButton();
  attachFreeButton();
  attachPayButtons();

  // ใส่ span แสดงเครดิต (ถ้าไม่มี ให้สร้างเพิ่มใต้แพ็กสเปรด)
  if (!document.querySelector('#spread-credit')) {
    const plan = Array.from(document.querySelectorAll('.plan')).find(p => p.textContent.includes('3–6'));
    if (plan) {
      const p = document.createElement('p');
      p.style.marginTop = '8px';
      p.innerHTML = `เครดิตคงเหลือ: <b id="spread-credit">0</b> ครั้ง`;
      plan.appendChild(p);
    }
  }

  refreshUI();
});/* ===== คีย์ LocalStorage ===== */
const LS = {
  FREE_DATE: 'tibet_free_used_on',        // YYYY-MM-DD ของวันที่ใช้สิทธิ์ฟรี
  SPREAD_CREDIT: 'tibet_spread_credits',  // จำนวนเครดิตสเปรด 29 บาท/ครั้ง
  DAY_PASS_UNTIL: 'tibet_day_until',      // ISO string เวลาหมดอายุสิทธิ์ตลอดวัน
  SUB_MONTH_UNTIL: 'tibet_month_until',   // ISO string หมดอายุรายเดือน
  SUB_YEAR_UNTIL: 'tibet_year_until'      // ISO string หมดอายุรายปี
};

/* ===== Utils เวลา/วันที่ ===== */
const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};
const now = () => new Date();
const parse = s => s ? new Date(s) : null;
const isActive = until => until && now() < parse(until);

/* ===== สถานะแอป ===== */
const state = {
  mode: 'one',  // 'one' | 'spread'
  cards: []
};

/* ===== โหลดไพ่ ===== */
async function loadCards(){
  const res = await fetch('cards.json');
  state.cards = await res.json();
}

/* ===== สุ่มไพ่ ===== */
function sample(arr, n=1){
  const tmp = [...arr];
  const out = [];
  for(let i=0;i<n;i++){
    if(tmp.length===0) break;
    const idx = Math.floor(Math.random()*tmp.length);
    out.push(tmp.splice(idx,1)[0]);
  }
  return out;
}

/* ===== LocalStorage helpers ===== */
const getSpreadCredits = () =>
  Number(localStorage.getItem(LS.SPREAD_CREDIT) || '0');
const setSpreadCredits = v =>
  localStorage.setItem(LS.SPREAD_CREDIT, String(v));

const markFreeUsedToday = () =>
  localStorage.setItem(LS.FREE_DATE, todayKey());
const freeUsedToday = () =>
  localStorage.getItem(LS.FREE_DATE) === todayKey();

const setDayPass = (hours=24) => {
  const until = new Date(Date.now()+hours*60*60*1000).toISOString();
  localStorage.setItem(LS.DAY_PASS_UNTIL, until);
};
const hasDayPass = () => isActive(localStorage.getItem(LS.DAY_PASS_UNTIL));

const setMonthSub = (months=1) => {
  const until = new Date();
  until.setMonth(until.getMonth()+months);
  localStorage.setItem(LS.SUB_MONTH_UNTIL, until.toISOString());
};
const hasMonthSub = () => isActive(localStorage.getItem(LS.SUB_MONTH_UNTIL));

const setYearSub = (years=1) => {
  const until = new Date();
  until.setFullYear(until.getFullYear()+years);
  localStorage.setItem(LS.SUB_YEAR_UNTIL, until.toISOString());
};
const hasYearSub = () => isActive(localStorage.getItem(LS.SUB_YEAR_UNTIL));

const unlimitedAccess = () => hasDayPass() || hasMonthSub() || hasYearSub();

/* ===== แสดงผลบนหน้าจอเดิม ===== */
function renderCards(cards){
  const panel = document.getElementById('result') || document.getElementById('result-panel');
  if(panel) panel.classList.remove('hidden');

  const title = document.getElementById('card-title');
  const keys  = document.getElementById('card-keys');
  const desc  = document.getElementById('card-desc');

  if(cards.length===1){
    if(title) title.textContent = cards[0].name || cards[0].title || 'ไพ่ 1 ใบ';
    if(keys)  keys.textContent  = (cards[0].keys || cards[0].keywords || '').toString();
    if(desc)  desc.textContent  = cards[0].desc || cards[0].meaning || '';
  }else{
    if(title) title.textContent = `ไพ่ ${cards.length} ใบ`;
    if(keys)  keys.textContent  = cards.map(c=>c.name||c.title).join(' • ');
    if(desc)  desc.textContent  = 'เซตสเปรด 3–6 ใบ';
  }
}

/* ===== ปุ่ม/โหมดเดิม ===== */
function setupModeButtons(){
  const b1 = document.getElementById('btn-one');
  const b2 = document.getElementById('btn-three') || document.getElementById('btn-spread');
  if(b1) b1.addEventListener('click', ()=> state.mode='one');
  if(b2) b2.addEventListener('click', ()=> state.mode='spread');
}

/* ===== กติกาเปิดไพ่ ===== */
function canDrawOneNow(){
  // เปิด 1 ใบได้เสมอ ถ้ายังไม่ใช้สิทธิ์ฟรีวันนี้
  if(!freeUsedToday()) return true;
  // ถ้าใช้ฟรีแล้ว แต่มีสิทธิ์ไม่อั้นก็ได้
  if(unlimitedAccess()) return true;
  return false;
}

async function drawOne(){
  if(!canDrawOneNow()){
    const pick = prompt(
      'วันนี้ใช้สิทธิ์ฟรีแล้วค่ะ ❤️\nพิมพ์เลขเพื่อปลดล็อก:\n1) ตลอดวัน 49 บาท\n2) รายเดือน 199 บาท\n3) รายปี 1,999 บาท\n(กด Cancel เพื่อยกเลิก)'
    );
    if(pick==='1'){ setDayPass(24); alert('ปลดล็อกตลอดวันแล้ว!'); }
    else if(pick==='2'){ setMonthSub(1); alert('สมัครรายเดือนสำเร็จ!'); }
    else if(pick==='3'){ setYearSub(1); alert('สมัครรายปีสำเร็จ!'); }
    else { return; }
  }

  if(!freeUsedToday() && !unlimitedAccess()){
    // นับเป็นสิทธิ์ฟรีของวันนี้
    markFreeUsedToday();
  }
  const [c] = sample(state.cards, 1);
  renderCards([c]);
}

async function drawSpread(){
  if(unlimitedAccess()){
    const n = 3 + Math.floor(Math.random()*4); // 3–6
    renderCards(sample(state.cards, n));
    return;
  }
  const left = getSpreadCredits();
  if(left>0){
    setSpreadCredits(left-1);
    const n = 3 + Math.floor(Math.random()*4);
    renderCards(sample(state.cards, n));
    return;
  }
  const ok = confirm('ยังไม่มีเครดิตสเปรด • ซื้อ 29 บาท เพิ่ม 1 ครั้ง?');
  if(ok){
    setSpreadCredits(getSpreadCredits()+1);
    alert('เพิ่มเครดิตแล้ว! ลองกดอีกครั้งเพื่อเปิดสเปรด');
  }
}

/* ===== ปุ่ม "เปิดไพ่ (ตามโหมด)" เดิม ===== */
function setupDrawButton(){
  const btn = document.getElementById('btn-draw');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    if(state.mode==='one') await drawOne();
    else await drawSpread();
  });
}

/* ===== เริ่มทำงาน ===== */
(async function init(){
  await loadCards();
  setupModeButtons();
  setupDrawButton();
})();
