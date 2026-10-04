/**
 * Pure business rules (no Apps Script services) so they can be unit-tested in Node.
 * In Apps Script every top-level function is global; in Node it is exported below.
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function onlyDigits(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}

function padMemberId(raw) {
  const d = onlyDigits(raw);
  return d.length >= 1 && d.length <= 5 ? ('00000' + d).slice(-5) : d;
}

function isValidCitizenId(raw) {
  const id = onlyDigits(raw);
  if (id.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id.charAt(i)) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id.charAt(12));
}

/** Wall-clock parts in Asia/Bangkok (UTC+7, no DST). */
function bangkokParts(date) {
  const d = new Date(date.getTime() + 7 * 3600 * 1000);
  const iso = d.toISOString();
  return {
    ymd: iso.slice(0, 10),
    ym: iso.slice(0, 7),
    hm: iso.slice(11, 16),
    dow: d.getUTCDay(), // 0 = Sunday
    stamp: iso.slice(0, 16).replace('T', ' '),
  };
}

function checkServiceOpen(settings, now) {
  if (settings.isMaintenanceMode) {
    return { open: false, message: settings.maintenanceMessage || 'ระบบปิดปรับปรุงชั่วคราว' };
  }
  const p = bangkokParts(now);
  if (!settings.allowWeekendTransactions && (p.dow === 0 || p.dow === 6)) {
    return { open: false, message: 'ระบบไม่เปิดให้ทำรายการในวันเสาร์-อาทิตย์' };
  }
  if (!settings.isServiceActive24h) {
    if (p.hm < settings.serviceStartTime || p.hm >= settings.serviceEndTime) {
      return {
        open: false,
        message: 'ระบบเปิดให้ทำรายการเวลา ' + settings.serviceStartTime + ' - ' + settings.serviceEndTime + ' น.',
      };
    }
  }
  return { open: true };
}

/** Special savings: first withdrawal of the month is free, then 3% fee. */
function calcWithdrawFee(accountType, amount, monthlyCount) {
  if (accountType === 'ออมทรัพย์พิเศษ' && monthlyCount >= 1) {
    return { fee: round2(amount * 0.03), feeRate: 3 };
  }
  return { fee: 0, feeRate: 0 };
}

function checkDeposit(amount, settings) {
  if (!(amount > 0) || !isFinite(amount)) return { ok: false, error: 'จำนวนเงินไม่ถูกต้อง' };
  if (amount < settings.minDepositAmount) {
    return { ok: false, error: 'ฝากขั้นต่ำ ' + settings.minDepositAmount + ' บาท' };
  }
  return { ok: true };
}

/**
 * input: {amount, accountType, balance, pendingHold, monthlyCount, dailyTotal}
 * pendingHold = sum of totalDeduction of this account's pending withdrawals.
 */
function checkWithdrawal(input, settings) {
  const amount = input.amount;
  if (!(amount > 0) || !isFinite(amount)) return { ok: false, error: 'จำนวนเงินไม่ถูกต้อง' };
  if (amount < settings.minWithdrawAmount) {
    return { ok: false, error: 'ถอนขั้นต่ำ ' + settings.minWithdrawAmount + ' บาท' };
  }
  if (input.dailyTotal + amount > settings.maxDailyWithdrawAmount) {
    return { ok: false, error: 'เกินวงเงินถอนต่อวัน ' + settings.maxDailyWithdrawAmount + ' บาท' };
  }
  const f = calcWithdrawFee(input.accountType, amount, input.monthlyCount);
  const totalDeduction = round2(amount + f.fee);
  const available = round2(input.balance - (input.pendingHold || 0));
  if (totalDeduction > available) {
    return { ok: false, error: 'ยอดเงินไม่เพียงพอ (ต้องใช้ ' + totalDeduction + ' บาท คงเหลือที่ถอนได้ ' + available + ' บาท)' };
  }
  if (available - totalDeduction < settings.minAccountBalance) {
    return { ok: false, error: 'ต้องคงเหลือในบัญชีขั้นต่ำ ' + settings.minAccountBalance + ' บาท' };
  }
  return {
    ok: true,
    fee: f.fee,
    feeRate: f.feeRate,
    totalDeduction: totalDeduction,
    needsApproval: amount > settings.highValueApprovalThreshold,
  };
}

function makeRefCode(now, rand) {
  const p = bangkokParts(now);
  return 'TXN-' + p.ymd.replace(/-/g, '') + '-' + String(1000 + Math.floor(rand * 9000));
}

/** Apply an approved/completed transaction to a balance. Returns null if it cannot be applied. */
function applyToBalance(type, balance, amount, totalDeduction) {
  if (type === 'deposit') return round2(balance + amount);
  const after = round2(balance - totalDeduction);
  return after < 0 ? null : after;
}

/** Undo a completed transaction. Returns null if it cannot be undone. */
function reverseFromBalance(type, balance, amount, totalDeduction) {
  if (type === 'deposit') {
    const after = round2(balance - amount);
    return after < 0 ? null : after;
  }
  return round2(balance + totalDeduction);
}

/** Iterated salted SHA-256. sha256Hex(string) -> hex is injected (Utilities in GAS, crypto in Node). */
function hashPassword(password, salt, sha256Hex) {
  let h = salt + ':' + password;
  for (let i = 0; i < 1000; i++) h = sha256Hex(salt + ':' + h);
  return h;
}

/** Constant-time-ish string compare. */
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Validate a data URL; returns {ok, mime, base64} or {ok:false,error}. */
function parseDataUrl(dataUrl) {
  const m = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(String(dataUrl || ''));
  if (!m) return { ok: false, error: 'รูปแบบไฟล์แนบไม่ถูกต้อง' };
  const mime = m[1].toLowerCase();
  if (ALLOWED_UPLOAD_TYPES.indexOf(mime) === -1) return { ok: false, error: 'ชนิดไฟล์ไม่รองรับ (ต้องเป็นรูปภาพหรือ PDF)' };
  const bytes = Math.floor(m[2].length * 3 / 4);
  if (bytes > MAX_UPLOAD_BYTES) return { ok: false, error: 'ไฟล์ใหญ่เกิน 5 MB' };
  return { ok: true, mime: mime, base64: m[2] };
}

if (typeof module !== 'undefined') {
  module.exports = {
    round2, onlyDigits, padMemberId, isValidCitizenId, bangkokParts, checkServiceOpen,
    calcWithdrawFee, hashPassword, safeEqual, parseDataUrl, checkDeposit, checkWithdrawal, makeRefCode, applyToBalance, reverseFromBalance,
  };
}
