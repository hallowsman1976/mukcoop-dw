/** Google Sheets as the database. One tab per table; row 1 = headers. */

const SPREADSHEET_ID = '1QMBLGXKGtVBbMkRiaQ0xn2YYcYxZLJAu3Og2G9Ph1S4';

const SCHEMA = {
  Members: ['memberId', 'citizenId', 'fullName', 'contact', 'phone', 'lineUserId', 'registeredDate', 'notificationSettings', 'pdpaConsentAt', 'pdpaVersion'],
  Accounts: ['accountNo', 'memberId', 'citizenId', 'accountName', 'accountType', 'balance', 'accruedInterest', 'contact', 'interestRate', 'lastUpdated'],
  Transactions: [
    'id', 'refCode', 'type', 'accountNo', 'accountName', 'accountType', 'memberId', 'citizenId',
    'amount', 'fee', 'feeRate', 'totalDeduction', 'balanceBefore', 'balanceAfter', 'dateTime', 'status',
    'reviewedBy', 'reviewNote', 'reviewedAt', 'createdAt', 'monthlyWithdrawalCount',
    'destinationBank', 'destinationAccountNo', 'destinationAccountName',
    'depositDateTime', 'slipVerification', 'files', 'note',
  ],
  Admins: ['username', 'fullName', 'role', 'email', 'department', 'salt', 'hash', 'active'],
  Settings: ['key', 'value'],
};

// Columns whose value is JSON text.
const JSON_COLUMNS = { notificationSettings: 1, slipVerification: 1, files: 1 };
// Columns that must stay text (leading zeros): Sheets would otherwise turn "00128" into 128.
const TEXT_COLUMNS = { memberId: 1, citizenId: 1, accountNo: 1, phone: 1, contact: 1, refCode: 1, id: 1, destinationAccountNo: 1 };

function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('ยังไม่ได้ตั้งค่าระบบ: ไม่พบแท็บ ' + name + ' (รัน setup() ก่อน)');
  return sh;
}

function ensureSheets_() {
  const ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = SCHEMA[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    headers.forEach(function (h, i) {
      if (TEXT_COLUMNS[h]) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });
  });
}

function parseCell_(col, v) {
  if (JSON_COLUMNS[col]) {
    if (v === '' || v == null) return undefined;
    try { return JSON.parse(v); } catch (e) { return undefined; }
  }
  if (v === '' || v == null) return undefined;
  if (TEXT_COLUMNS[col]) return String(v);
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
  return v;
}

function serializeCell_(col, v) {
  if (v === undefined || v === null) return '';
  if (JSON_COLUMNS[col]) return JSON.stringify(v);
  return v;
}

/** All rows as objects. Each carries a hidden __row (1-based sheet row). */
function readAll_(name) {
  const headers = SCHEMA[name];
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values.map(function (row, i) {
    const obj = { __row: i + 2 };
    headers.forEach(function (h, c) {
      const v = parseCell_(h, row[c]);
      if (v !== undefined) obj[h] = v;
    });
    return obj;
  });
}

function toRow_(name, obj) {
  return SCHEMA[name].map(function (h) { return serializeCell_(h, obj[h]); });
}

function appendRow_(name, obj) {
  const sh = sheet_(name);
  const row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, SCHEMA[name].length).setValues([toRow_(name, obj)]);
  return row;
}

function appendRows_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name);
  const row = sh.getLastRow() + 1;
  sh.getRange(row, 1, objs.length, SCHEMA[name].length).setValues(objs.map(function (o) { return toRow_(name, o); }));
}

function writeRow_(name, rowNo, obj) {
  sheet_(name).getRange(rowNo, 1, 1, SCHEMA[name].length).setValues([toRow_(name, obj)]);
}

function stripRow_(obj) {
  const copy = {};
  Object.keys(obj).forEach(function (k) { if (k !== '__row') copy[k] = obj[k]; });
  return copy;
}

// ---- Settings (key/value JSON) ----

function getSettings_() {
  const out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
  const sh = ss_().getSheetByName('Settings');
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[0] in DEFAULT_SETTINGS) {
      try { out[r[0]] = JSON.parse(r[1]); } catch (e) { /* keep default */ }
    }
  });
  return out;
}

function saveSettings_(settings) {
  const sh = sheet_('Settings');
  const keys = Object.keys(DEFAULT_SETTINGS);
  const rows = keys.map(function (k) {
    return [k, JSON.stringify(settings[k] !== undefined ? settings[k] : DEFAULT_SETTINGS[k])];
  });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
}
