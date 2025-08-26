/* ===== คีย์ LocalStorage ===== */
const LS = {
  FREE_DATE:     'tibet_free_used_on',      // YYYY-MM-DD วันที่ใช้สิทธิ์ฟรี
  SPREAD_CREDIT: 'tibet_spread_credits',    // จำนวนเครดิตสเปรด
  DAY_PASS_UNTIL:'tibet_day_until',         // ISO string หมดสิทธิ์ตลอดวัน
  SUB_MONTH_UNTIL:'tibet_month_until',      // ISO string หมดอายุรายเดือน
  SUB_YEAR_UNTIL: 'tibet_year_until'        // ISO string หมดอายุรายปี
};

/* ===== Utils เวลา/วันที่ ===== */
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('th-TH') : '—');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

/* ===== State UI ===== */
let MODE = 'one'; // 'one' | 'spread'

/* ===== โหลดไพ่ ===== */
async function loadCards() {
  const res = await fetch('cards.json');
  return res.json();
}

/* ===== ตัวช่วย LocalStorage ===== */
const getInt = (k, def=0) => parseInt(localStorage.getItem(k) ?? def, 10);
const setInt = (k, v) => localStorage.setItem(k, String(v));
const getStr = (k) => localStorage.getItem(k);
const setStr = (k,v) => localStorage.setItem(k,v);
const hasActivePass = () => {
  const now = new Date();
  const day = getStr(LS.DAY_PASS_UNTIL);
  const mth = getStr(LS.SUB_MONTH_UNTIL);
  const yr  = getStr(LS.SUB_YEAR_UNTIL);
  return (day && new Date(day) > now) || (mth && new Date(mth) > now) || (yr && new Date(yr) > now);
};

/* ===== UI refs ===== */
const $ = (s)=>document.querySelector(s);
const cardsEl = $('#cards');
const histEl  = $('#history');

/* ===== วาดไพ่ ===== */
function renderCards(items) {
  cardsEl.innerHTML = '';
  items.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'card-item';
    el.innerHTML = `
      <div class="card-title">${c.title}</div>
      <div class="card-key">${c.keywords?.join(' · ') ?? ''}</div>
      <div class="card-body">${c.meaning}</div>
    `;
    cardsEl.appendChild(el);
  });
}

/* ===== ประวัติแบบง่าย (เก็บเฉพาะวันนี้ล่าสุด) ===== */
function writeHistory(mode, items){
  const d = new Date().toLocaleString('th-TH');
  histEl.innerHTML = `<div>ล่าสุด (${d}) · โหมด: ${mode==='one'?'1 ใบ':'สเปรด'} — ได้ไพ่ ${items.length} ใบ</div>`;
}

/* ===== เปิดไพ่จริง ===== */
async function draw(mode, opts={forceOne:false}) {
  const all = await loadCards();
  const pick = (n) => {
    const src = [...all];
    const out = [];
    for (let i=0; i<n && src.length; i++){
      const r = Math.floor(Math.random()*src.length);
      out.push(src.splice(r,1)[0]);
    }
    return out;
  };

  const n = (mode==='spread' && !opts.forceOne) ? (Math.floor(Math.random()*4)+3) : 1;
  const result = pick(n);
  renderCards(result);
  writeHistory(mode, result);
}

/* ===== อัปเดตสถานะบนหน้าจอ ===== */
function refreshStatus() {
  // เครดิต
  $('#spread-credits').textContent = getInt(LS.SPREAD_CREDIT, 0);

  // วันหมดอายุ
  $('#day-until').textContent   = fmt(getStr(LS.DAY_PASS_UNTIL));
  $('#month-until').textContent = fmt(getStr(LS.SUB_MONTH_UNTIL));
  $('#year-until').textContent  = fmt(getStr(LS.SUB_YEAR_UNTIL));
}

/* ===== ปุ่ม/เหตุการณ์ ===== */
function setupUI(){
  // สลับโหมด
  $('#mode-one').addEventListener('click', ()=>{
    MODE='one';
    $('#mode-one').classList.add('chip-active');
    $('#mode-spread').classList.remove('chip-active');
    document.querySelector('.result').classList.add('one-card');
  });
  $('#mode-spread').addEventListener('click', ()=>{
    MODE='spread';
    $('#mode-spread').classList.add('chip-active');
    $('#mode-one').classList.remove('chip-active');
    document.querySelector('.result').classList.remove('one-card');
  });

  // เปิดไพ่ตามโหมด (เช็คสิทธิ์)
  $('#btn-draw').addEventListener('click', async ()=>{
    if (MODE==='one'){
      // 1) เปิดได้เสมอถ้ามี pass (day/month/year)
      // 2) ถ้าไม่มี pass → วันนี้ใช้ฟรีไปหรือยัง?
      if (hasActivePass()){
        draw('one');
      } else {
        const used = getStr(LS.FREE_DATE) === todayKey();
        if (!used){
          alert('วันนี้ยังไม่ได้ใช้สิทธิ์ฟรี กดปุ่ม "ใช้สิทธิ์วันนี้" ที่ส่วนอัปเกรดการเข้าถึงได้เลยค่ะ');
        } else {
          alert('วันนี้ใช้สิทธิ์ฟรีแล้วค่ะ · ซื้อแพ็กเพื่อเปิดเพิ่มได้ไม่จำกัด');
        }
      }
    } else {
      // โหมดสเปรด ต้องมีเครดิตหรือมี pass
      if (hasActivePass()){
        draw('spread');
      } else {
        const credits = getInt(LS.SPREAD_CREDIT, 0);
        if (credits > 0){
          setInt(LS.SPREAD_CREDIT, credits-1);
          refreshStatus();
          draw('spread');
        } else {
          alert('ยังไม่มีเครดิตสเปรด · ซื้อแพ็ก 29 บาทเพื่อเปิด 3–6 ใบได้ค่ะ');
        }
      }
    }
  });

  // ฟรี 1 ใบ (วันละครั้ง) — เปิดทันที และปักธงว่าใช้สิทธิ์แล้ว
  $('#btn-free-today').addEventListener('click', async ()=>{
    const used = getStr(LS.FREE_DATE) === todayKey();
    if (used && !hasActivePass()){
      alert('วันนี้ใช้สิทธิ์ฟรีแล้วค่ะ');
      return;
    }
    setStr(LS.FREE_DATE, todayKey());
    await draw('one', {forceOne:true});
  });

  // ใช้เครดิตที่มี (สเปรด)
  $('#btn-use-spread').addEventListener('click', ()=>{
    const credits = getInt(LS.SPREAD_CREDIT, 0);
    if (hasActivePass()){
      draw('spread');
    } else if (credits > 0){
      setInt(LS.SPREAD_CREDIT, credits-1);
      refreshStatus();
      draw('spread');
    } else {
      alert('ยังไม่มีเครดิตสเปรด · กดซื้อ 29 บาทได้เลยค่ะ');
    }
  });

  /* ===== ปุ่มซื้อแพ็ก (ตอนนี้เป็น placeholder) =====
     ขั้นตอนเชื่อม Payment Gateway:
     - สร้าง payment link ของ Omise/GB Prime Pay/ฯลฯ
     - แทนที่ URL ด้านล่างด้วยลิงก์ชำระเงินจริงของคุณ
     - เมื่อ webhook/redirect success → อัพเดท localStorage ตามแพ็ก
  */
  const openPay = (url)=>window.open(url, '_blank');

  // 29 บาท → เพิ่มเครดิตสเปรด 1 ครั้ง
  $('#btn-buy-spread').addEventListener('click', ()=>{
    openPay('https://example.com/pay/spread-29'); // แทนลิงก์จริง
    const cur = getInt(LS.SPREAD_CREDIT, 0);
    setInt(LS.SPREAD_CREDIT, cur+1);
    refreshStatus();
    alert('เพิ่มเครดิตสเปรด 1 ครั้งแล้ว (โหมดสเปรด)');
  });

  // 49 บาท → ตลอดวัน 24 ชม.
  $('#btn-buy-day').addEventListener('click', ()=>{
    openPay('https://example.com/pay/day-49'); // แทนลิงก์จริง
    const until = addDays(new Date(), 1).toISOString();
    setStr(LS.DAY_PASS_UNTIL, until);
    refreshStatus();
    alert('เปิดได้ไม่จำกัด 24 ชม. แล้วค่ะ');
  });

  // 199 บาท → รายเดือน
  $('#btn-buy-month').addEventListener('click', ()=>{
    openPay('https://example.com/pay/month-199'); // แทนลิงก์จริง
    const until = addDays(new Date(), 30).toISOString();
    setStr(LS.SUB_MONTH_UNTIL, until);
    refreshStatus();
    alert('อัปเกรดเป็นรายเดือนแล้วค่ะ');
  });

  // 1,999 บาท → รายปี
  $('#btn-buy-year').addEventListener('click', ()=>{
    openPay('https://example.com/pay/year-1999'); // แทนลิงก์จริง
    const until = addDays(new Date(), 365).toISOString();
    setStr(LS.SUB_YEAR_UNTIL, until);
    refreshStatus();
    alert('อัปเกรดเป็นรายปี + สิทธิพิเศษแล้วค่ะ');
  });

  refreshStatus();
}

/* ===== เริ่มทำงาน ===== */
window.addEventListener('DOMContentLoaded', ()=>{
  document.querySelector('.result').classList.add('one-card'); // เริ่มที่โหมด 1 ใบ
  setupUI();
});
