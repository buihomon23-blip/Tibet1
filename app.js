/* ====== คีย์สำหรับเก็บสถานะใน LocalStorage ====== */
const LS = {
  FREE_DATE: 'tibet_free_used_on',        // string (YYYY-MM-DD)
  SPREAD_CREDIT: 'tibet_spread_credits',  // number
  DAY_PASS_UNTIL: 'tibet_day_until',      // ISO string
  SUB_MONTH_UNTIL: 'tibet_month_until',   // ISO string
  SUB_YEAR_UNTIL: 'tibet_year_until'      // ISO string
};

/* ====== ตัวช่วยวันที่/เวลา ====== */
const todayKey = () => {
  const d = new Date();
  // ปรับเป็นวันที่ท้องถิ่นแบบ YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};
const now = () => new Date();
const parse = s => s ? new Date(s) : null;
const isActive = until => until && now() < parse(until);

/* ====== สถานะปัจจุบัน ====== */
const state = {
  mode: 'one', // 'one' | 'spread'
  cards: [],
};

/* ====== โหลดไพ่ ====== */
async function loadCards(){
  const res = await fetch('cards.json');
  state.cards = await res.json();
}

/* ====== สุ่มไพ่ ====== */
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

/* ====== สิทธิ์ใช้งาน ====== */
function getSpreadCredits(){
  return Number(localStorage.getItem(LS.SPREAD_CREDIT)||'0');
}
function setSpreadCredits(v){
  localStorage.setItem(LS.SPREAD_CREDIT, String(v));
}
function markFreeUsedToday(){
  localStorage.setItem(LS.FREE_DATE, todayKey());
}
function freeUsedToday(){
  return localStorage.getItem(LS.FREE_DATE) === todayKey();
}
function setDayPass(hours=24){
  const until = new Date(Date.now()+hours*60*60*1000).toISOString();
  localStorage.setItem(LS.DAY_PASS_UNTIL, until);
}
function hasDayPass(){
  return isActive(localStorage.getItem(LS.DAY_PASS_UNTIL));
}
function setMonthSub(months=1){
  const until = new Date();
  until.setMonth(until.getMonth()+months);
  localStorage.setItem(LS.SUB_MONTH_UNTIL, until.toISOString());
}
function hasMonthSub(){
  return isActive(localStorage.getItem(LS.SUB_MONTH_UNTIL));
}
function setYearSub(years=1){
  const until = new Date();
  until.setFullYear(until.getFullYear()+years);
  localStorage.setItem(LS.SUB_YEAR_UNTIL, until.toISOString());
}
function hasYearSub(){
  return isActive(localStorage.getItem(LS.SUB_YEAR_UNTIL));
}
function unlimitedAccess(){
  return hasDayPass() || hasMonthSub() || hasYearSub();
}

/* ====== แสดงผลไพ่ ====== */
function renderCards(cards){
  const panel = document.getElementById('result');
  panel.classList.remove('hidden');

  const title = document.getElementById('card-title');
  const keys  = document.getElementById('card-keys');
  const desc  = document.getElementById('card-desc');

  if(cards.length===1){
    title.textContent = cards[0].name || cards[0].title || 'ไพ่ 1 ใบ';
    keys.textContent  = (cards[0].keys || cards[0].keywords || '').toString();
    desc.textContent  = cards[0].desc || cards[0].meaning || '';
  }else{
    title.textContent = `ไพ่ ${cards.length} ใบ`;
    keys.textContent  = cards.map(c=>c.name||c.title).join(' • ');
    desc.textContent  = 'เซตสเปรด 3–6 ใบ';
  }
}

/* ====== ปุ่ม/สถานะ UI ====== */
function refreshUI(){
  // โหมดปุ่ม
  document.getElementById('btn-one').classList.toggle('active', state.mode==='one');
  document.getElementById('btn-spread').classList.toggle('active', state.mode==='spread');

  // ฟรีวันนี้
  const freeBtn = document.getElementById('btn-free');
  const freeNote = document.getElementById('free-note');
  if(freeUsedToday()){
    freeBtn.disabled = true;
    freeBtn.textContent = 'ใช้แล้ววันนี้';
    freeNote.textContent = 'สิทธิ์ฟรีจะรีเซ็ตอัตโนมัติเที่ยงคืน';
  }else{
    freeBtn.disabled = false;
    freeBtn.textContent = 'ใช้สิทธิ์วันนี้';
    freeNote.textContent = '';
  }

  // เครดิตสเปรด
  const left = getSpreadCredits();
  document.getElementById('spread-left').textContent = `เครดิตคงเหลือ: ${left} ครั้ง`;
  document.getElementById('btn-use-spread').disabled = left<=0;

  // ตลอดวัน / สมัคร
  document.getElementById('day-pass-note').textContent =
    hasDayPass() ? 'เปิดได้ไม่อั้นจนถึง: ' + new Date(localStorage.getItem(LS.DAY_PASS_UNTIL)).toLocaleString()
                 : '';

  document.getElementById('sub-month-note').textContent =
    hasMonthSub() ? 'สถานะสมาชิกถึง: ' + new Date(localStorage.getItem(LS.SUB_MONTH_UNTIL)).toLocaleDateString()
                  : '';

  document.getElementById('sub-year-note').textContent =
    hasYearSub() ? 'สถานะสมาชิกรายปีถึง: ' + new Date(localStorage.getItem(LS.SUB_YEAR_UNTIL)).toLocaleDateString()
                 : '';
}

/* ====== ตรรกะการเปิดไพ่ ====== */
function canDrawOneNow(){
  // เปิด 1 ใบ: ถ้าฟรีวันนี้ยังไม่ใช้ => ได้เลย
  if(!freeUsedToday()) return true;
  // ถ้าใช้ฟรีแล้ว แต่มีสิทธิ์ไม่อั้น => ได้
  if(unlimitedAccess()) return true;
  // อื่น ๆ ต้องซื้อเพิ่ม (แต่ปุ่ม "เปิดไพ่" จะยังทำงานกรณีใช้สิทธิ์ฟรี)
  return false;
}

async function drawOne(){
  if(!canDrawOneNow()){
    alert('วันนี้ใช้สิทธิ์ฟรีแล้ว • ซื้อแพ็กเพื่อเปิดเพิ่มได้ค่ะ');
    return;
  }
  if(!freeUsedToday() && !unlimitedAccess()){
    // นับเป็นสิทธิ์ฟรีวันนี้
    markFreeUsedToday();
  }
  const [card] = sample(state.cards, 1);
  renderCards([card]);
  refreshUI();
}

async function drawSpread(){
  if(unlimitedAccess()){
    const n = 3 + Math.floor(Math.random()*4); // 3-6
    renderCards(sample(state.cards, n));
    return;
  }
  // ต้องใช้เครดิตสเปรด
  const left = getSpreadCredits();
  if(left<=0){
    alert('ยังไม่มีเครดิตสเปรด • ซื้อแพ็ก 29 บาทเพื่อเพิ่ม 1 ครั้ง');
    return;
  }
  setSpreadCredits(left-1);
  const n = 3 + Math.floor(Math.random()*4);
  renderCards(sample(state.cards, n));
  refreshUI();
}

/* ====== ซื้อ (ยังไม่เชื่อมชำระจริง) ======
   ปุ่มเหล่านี้ตอนนี้จะ "จำลอง" การซื้อด้วยการเพิ่มสิทธิ์/อายุสมาชิก
   เมื่อคุณได้คีย์ Omise/PromptPay/TrueMoney ค่อยแทนที่ให้เรียกจ่ายจริง
================================================ */
function simulatePay(action){
  // ใช้ confirm() เป็นตัวแทนหน้าเช็คเอาต์ชั่วคราว
  return new Promise(resolve=>{
    const ok = confirm(`ทดสอบชำระเงิน: ${action}\n(ชั่วคราว — ยังไม่ตัดเงินจริง)`);
    resolve(ok);
  });
}

async function buySpread(){
  const ok = await simulatePay('ซื้อเครดิตสเปรด 29 บาท (เพิ่ม 1 ครั้ง)');
  if(!ok) return;
  setSpreadCredits(getSpreadCredits()+1);
  refreshUI();
}

async function buyDay(){
  const ok = await simulatePay('ตลอดวัน 49 บาท (ปลดล็อก 24 ชั่วโมง)');
  if(!ok) return;
  setDayPass(24);
  refreshUI();
}

async function buyMonth(){
  const ok = await simulatePay('รายเดือน 199 บาท');
  if(!ok) return;
  setMonthSub(1);
  refreshUI();
}

async function buyYear(){
  const ok = await simulatePay('รายปี 1,999 บาท');
  if(!ok) return;
  setYearSub(1);
  refreshUI();
}

/* ====== ตั้งค่าอีเวนต์ ====== */
function setupEvents(){
  document.getElementById('btn-one').addEventListener('click', ()=>{
    state.mode = 'one';
    refreshUI();
  });
  document.getElementById('btn-spread').addEventListener('click', ()=>{
    state.mode = 'spread';
    refreshUI();
  });

  document.getElementById('btn-draw').addEventListener('click', async ()=>{
    if(state.mode==='one') await drawOne();
    else await drawSpread();
  });

  document.getElementById('btn-free').addEventListener('click', drawOne);

  document.getElementById('btn-buy-spread').addEventListener('click', buySpread);
  document.getElementById('btn-use-spread').addEventListener('click', drawSpread);

  document.getElementById('btn-buy-day').addEventListener('click', buyDay);
  document.getElementById('btn-buy-month').addEventListener('click', buyMonth);
  document.getElementById('btn-buy-year').addEventListener('click', buyYear);
}

/* ====== เริ่มทำงาน ====== */
(async function init(){
  await loadCards();
  setupEvents();
  refreshUI();
})();
