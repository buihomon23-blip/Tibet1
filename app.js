/* =========================
   ทิเบตพยากรณ์ – Logic หลัก
   ========================= */

const LS = {
  FREE_USED: "tibet_free_used_v1",
  CREDITS: "tibet_credits_v1",
  DAY_PASS_UNTIL: "tibet_day_until_v1",
  MONTH_PASS_UNTIL: "tibet_month_until_v1",
  YEAR_PASS_UNTIL: "tibet_year_until_v1",
  HISTORY: "tibet_history_v1",
};

const dom = (id) => document.getElementById(id);
const $ = (sel) => document.querySelector(sel);

let mode = "one"; // one | spread

/* --------------------------
   ส่วนโหลด/บันทึกสถานะ
---------------------------*/
function getInt(key, def = 0) {
  const v = parseInt(localStorage.getItem(key) || "", 10);
  return Number.isFinite(v) ? v : def;
}
function setInt(key, val) {
  localStorage.setItem(key, String(val));
}
function getTime(key) {
  const v = parseInt(localStorage.getItem(key) || "", 10);
  return Number.isFinite(v) ? v : 0;
}
function setTime(key, t) {
  localStorage.setItem(key, String(t));
}
function now() {
  return Date.now();
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("th-TH");
}

/* --------------------------
   สิทธิ์เข้าถึง (แพ็กเกจ/เครดิต)
---------------------------*/
function hasUnlimited() {
  const t = now();
  return (
    getTime(LS.DAY_PASS_UNTIL) > t ||
    getTime(LS.MONTH_PASS_UNTIL) > t ||
    getTime(LS.YEAR_PASS_UNTIL) > t
  );
}
function getCredits() {
  return getInt(LS.CREDITS, 0);
}
function addCredits(n) {
  setInt(LS.CREDITS, Math.max(0, getCredits() + n));
  renderAccessUI();
}
function consumeCredit() {
  const c = getCredits();
  if (c > 0) {
    setInt(LS.CREDITS, c - 1);
    renderAccessUI();
    return true;
  }
  return false;
}
function grantPass(days) {
  const until = now() + days * 24 * 60 * 60 * 1000;
  if (days <= 1) setTime(LS.DAY_PASS_UNTIL, until);
  else if (days < 366) setTime(LS.MONTH_PASS_UNTIL, until);
  else setTime(LS.YEAR_PASS_UNTIL, until);
  renderAccessUI();
}

/* --------------------------
   ไพ่และคำทำนาย (โหลดจาก cards.json)
---------------------------*/
let ALL_CARDS = [];
async function loadCards() {
  if (ALL_CARDS.length) return ALL_CARDS;
  const res = await fetch("cards.json");
  ALL_CARDS = await res.json();
  return ALL_CARDS;
}
function sample(arr, n = 1) {
  const a = [...arr];
  const out = [];
  for (let i = 0; i < n && a.length; i++) {
    const k = Math.floor(Math.random() * a.length);
    out.push(a.splice(k, 1)[0]);
  }
  return out;
}

/* --------------------------
   วาดผล + ประวัติ
---------------------------*/
function pushHistory(item) {
  const raw = localStorage.getItem(LS.HISTORY);
  const hist = raw ? JSON.parse(raw) : [];
  hist.unshift(item);
  localStorage.setItem(LS.HISTORY, JSON.stringify(hist.slice(0, 50)));
  renderHistory();
}
function renderHistory() {
  const box = dom("history-list");
  if (!box) return;
  const raw = localStorage.getItem(LS.HISTORY);
  const hist = raw ? JSON.parse(raw) : [];
  if (!hist.length) {
    box.innerHTML = `<div class="muted">ยังไม่มีประวัติ</div>`;
    return;
  }
  box.innerHTML = hist
    .map(
      (h) => `
      <div class="history-item">
        <div class="time">${fmtDate(h.time)}</div>
        <div class="cards">${h.cards.map((c) => `<span>${c.title}</span>`).join(" • ")}</div>
        <div class="text muted">${h.text}</div>
      </div>
    `
    )
    .join("");
}

/* --------------------------
   การเปิดไพ่
---------------------------*/
async function doDraw(n, isFree = false) {
  // เงื่อนไขเข้า: ฟรีครั้งเดียว หรือมีเครดิต/พาสไม่จำกัด
  if (!isFree) {
    if (!hasUnlimited()) {
      if (!consumeCredit()) {
        alert("ยังไม่มีสิทธิ์ค่ะ • ใช้ปุ่มฟรี 1 ใบ หรือซื้อแพ็กก่อน");
        return;
      }
    }
  }

  const cards = await loadCards();
  const pick = sample(cards, n);
  // แสดงผล
  const area = dom("cards-area");
  const reading = dom("reading");
  area.innerHTML = pick
    .map(
      (c) => `
      <div class="card-tile">
        <div class="title">${c.title}</div>
        <div class="desc muted">${c.keywords || ""}</div>
      </div>`
    )
    .join("");
  const text =
    n === 1
      ? pick[0].meaning || "จงตั้งสติ และทำสิ่งที่ควรทำ"
      : pick.map((c, i) => `${i + 1}) ${c.title}: ${c.meaning || ""}`).join("<br/>");
  reading.innerHTML = text;

  // เก็บประวัติ
  pushHistory({ time: now(), cards: pick, text });

  // ถ้าเป็นการใช้สิทธิ์ฟรี: ปิดสิทธิ์ฟรีทันที
  if (isFree) {
    localStorage.setItem(LS.FREE_USED, "1");
    renderFreeUI();
  }
}

/* --------------------------
   ปุ่ม/เหตุการณ์
---------------------------*/
function bindUI() {
  // โหมด
  dom("btn-one")?.addEventListener("click", () => {
    mode = "one";
    $("#btn-one").classList.add("active");
    $("#btn-three").classList.remove("active");
  });
  dom("btn-three")?.addEventListener("click", () => {
    mode = "spread";
    $("#btn-three").classList.add("active");
    $("#btn-one").classList.remove("active");
  });

  // เปิดตามโหมด (ใช้เครดิต/พาส)
  dom("btn-draw")?.addEventListener("click", () => {
    const n = mode === "one" ? 1 : 3 + Math.floor(Math.random() * 4); // 3–6 ใบ
    doDraw(n, false);
  });

  // ✅ ฟรี 1 ใบ (ไม่ต้องจ่าย ไม่แตะเครดิต)
  dom("btn-free")?.addEventListener("click", () => {
    const used = localStorage.getItem(LS.FREE_USED) === "1";
    if (used) {
      alert("คุณใช้สิทธิ์ฟรีแล้วค่ะ");
      return;
    }
    doDraw(1, true);
  });

  // ซื้อแพ็ก (เชื่อม payment ทีหลัง) — ตอนนี้เดโม: เพิ่มสิทธิ์ให้ลองใช้งาน
  dom("btn-buy-29")?.addEventListener("click", () => {
    // TODO: เรียกหน้าเก็บเงินจริง (Omise/PromptPay/TrueMoney)
    addCredits(1); // เดโม: ให้เครดิตสเปรด 1 ครั้ง
    alert("เดโม: เติมเครดิตสเปรด 1 ครั้งแล้วค่ะ");
  });

  dom("btn-buy-49")?.addEventListener("click", () => {
    grantPass(1); // 1 วัน
    alert("เดโม: เปิดไม่จำกัด 24 ชม. แล้วค่ะ");
  });

  dom("btn-buy-199")?.addEventListener("click", () => {
    grantPass(30); // 30 วัน
    alert("เดโม: เปิดไม่จำกัด 30 วันแล้วค่ะ");
  });

  dom("btn-buy-1999")?.addEventListener("click", () => {
    grantPass(365); // 365 วัน
    alert("เดโม: เปิดไม่จำกัด 365 วัน + สิทธิพิเศษ");
  });

  dom("btn-use-credit")?.addEventListener("click", () => {
    if (hasUnlimited() || getCredits() > 0) {
      // ใช้โหมดสเปรดเสมอ
      doDraw(3 + Math.floor(Math.random() * 4), false);
    } else {
      alert("ไม่มีสิทธิ์ค่ะ • ซื้อแพ็กหรือใช้สิทธิ์ฟรี 1 ใบก่อน");
    }
  });
}

/* --------------------------
   แสดงสถานะบนหน้าจอ
---------------------------*/
function renderAccessUI() {
  const credits = getCredits();
  const day = getTime(LS.DAY_PASS_UNTIL);
  const mon = getTime(LS.MONTH_PASS_UNTIL);
  const yr = getTime(LS.YEAR_PASS_UNTIL);

  dom("credit-count").textContent = credits;
  dom("day-pass-status").textContent = day > now() ? "เปิดใช้งาน" : "ยังไม่เปิด";
  dom("month-pass-exp").textContent = fmtDate(mon);
  dom("year-pass-exp").textContent = fmtDate(yr);
}
function renderFreeUI() {
  const used = localStorage.getItem(LS.FREE_USED) === "1";
  const btn = dom("btn-free");
  const note = dom("free-note");
  if (btn) {
    btn.disabled = used;
    btn.textContent = used ? "ใช้สิทธิ์แล้ว" : "ใช้สิทธิ์วันนี้";
  }
  if (note) {
    note.textContent = used
      ? "คุณได้ใช้สิทธิ์เปิดไพ่ฟรีแล้ว"
      : "สิทธิ์นี้ใช้ได้ 1 ครั้งต่ออุปกรณ์";
  }
}

/* --------------------------
   เริ่มทำงาน
---------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  bindUI();
  renderFreeUI();
  renderAccessUI();
  renderHistory();
});// ===== Storage Keys
const LS_DAILY     = 'tib_oracle_daily';
const LS_HISTORY   = 'tib_oracle_hist';
const LS_PRO_UNTIL = 'tib_oracle_pro_until';   // timestamp millis for PRO (day/month/year)
const LS_SPREAD    = 'tib_oracle_spread_credits'; // int: จำนวนเครดิตสเปรด

// ===== Helpers
function todayKey(){ return new Date().toISOString().slice(0,10); }
function fmtTime(ts){ return new Date(ts).toLocaleString(); }

// PRO state
function isProActive(){
  const t = Number(localStorage.getItem(LS_PRO_UNTIL) || 0);
  return Date.now() < t;
}
function proUntil(){ return Number(localStorage.getItem(LS_PRO_UNTIL) || 0); }
function activateProHours(hours){
  const until = Date.now() + hours*60*60*1000;
  localStorage.setItem(LS_PRO_UNTIL, String(until));
  alert('ปลดล็อกสำเร็จ! สิทธิ์โปรหมดอายุ: ' + fmtTime(until));
  renderStatus();
}

// Spread credits
function getSpread(){ return parseInt(localStorage.getItem(LS_SPREAD) || '0', 10); }
function addSpread(n=1){
  localStorage.setItem(LS_SPREAD, String(getSpread()+n));
  alert('ได้รับเครดิตสเปรด +' + n + ' ครั้ง');
  renderStatus();
}
function useSpread(){
  const left = getSpread();
  if(left <= 0) return false;
  localStorage.setItem(LS_SPREAD, String(left-1));
  renderStatus();
  return true;
}

// Daily usage
function getDaily(){
  const raw = localStorage.getItem(LS_DAILY);
  let o = {date: todayKey(), count: 0, limit: 1};
  if(raw){
    try{
      const t = JSON.parse(raw);
      o = (t.date === todayKey()) ? t : {date: todayKey(), count: 0, limit: 1};
    }catch(e){}
  }
  if(isProActive()) o.limit = 9999; // โปรเปิดได้ไม่จำกัด
  return o;
}
function setDaily(o){ localStorage.setItem(LS_DAILY, JSON.stringify(o)); }

// Unlock via URL (?unlock=spread1|day|month|year)
(function handleUnlockFromURL(){
  const u = new URL(location.href);
  const v = u.searchParams.get('unlock');
  if(!v) return;
  if(v === 'spread1'){
    addSpread(1);
  }else if(v === 'day'){
    activateProHours(24);
  }else if(v === 'month'){
    activateProHours(24*30);
  }else if(v === 'year'){
    activateProHours(24*365);
  }
  u.searchParams.delete('unlock');
  history.replaceState(null,'',u.toString());
})();

// Load cards data
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

// Renderers
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
  q.textContent = `สิทธิ์วันนี้: ใช้ไป ${d.count}/${d.limit} ครั้ง`;
}
function renderStatus(){
  const s = document.getElementById('status');
  const parts = [];
  if(isProActive()){
    parts.push(`✨ PRO ถึง: ${new Date(proUntil()).toLocaleString()}`);
  }else{
    parts.push('บัญชีทั่วไป');
  }
  parts.push(`เครดิตสเปรด: ${getSpread()} ครั้ง`);
  s.textContent = parts.join(' • ');
  const elLeft = document.getElementById('spread-left');
  if(elLeft) elLeft.textContent = String(getSpread());
}

// UI: mode
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

// Draw helpers
async function doDraw(n, countAsDaily=true){
  const all = await loadCards();
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

  if(countAsDaily){
    const d = getDaily();
    setDaily({date: todayKey(), count: d.count + 1, limit: d.limit});
    updateQuota();
  }
  window.__lastDraw = chosen;
}
async function drawFreeOne(){
  const d = getDaily();
  if(d.count >= d.limit){
    alert('วันนี้ใช้สิทธิ์ฟรีครบแล้วค่ะ');
    return;
  }
  MODE='one';
  await doDraw(1, true);
}
async function drawNormal(){
  const d = getDaily();
  if(d.count >= d.limit){
    alert('สิทธิ์วันนี้หมดแล้ว • ซื้อแพ็กเพื่อเปิดเพิ่มได้ค่ะ');
    return;
  }
  const n = (MODE==='three') ? 3 : 1;
  await doDraw(n, true);
}
async function drawUsingSpread(){
  if(getSpread() <= 0){
    alert('ยังไม่มีเครดิตสเปรด • ซื้อแพ็ก 29 บาทก่อนนะคะ');
    return;
  }
  // ใช้ได้แม้สิทธิ์ฟรีหมด: ไม่นับโควตาวัน
  if(!useSpread()) return;
  const n = 3 + Math.floor(Math.random()*4); // 3..6
  await doDraw(n, false);
}

// Bind buttons
document.getElementById('btn-draw').onclick = drawNormal;
const freeBtn = document.getElementById('btn-free-one');
if(freeBtn) freeBtn.onclick = drawFreeOne;
const spreadUse = document.getElementById('btn-spread-open');
if(spreadUse) spreadUse.onclick = drawUsingSpread;

// Journal save
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

// Init
updateQuota();
renderStatus();
renderHistory();const LS_DAILY = 'tib_oracle_daily';
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

btnFree.disabled
