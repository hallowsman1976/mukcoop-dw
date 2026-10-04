const test = require('node:test');
const assert = require('node:assert');
const L = require('../Logic.js');

const S = {
  minDepositAmount: 100, minWithdrawAmount: 100, maxDailyWithdrawAmount: 100000,
  minAccountBalance: 500, highValueApprovalThreshold: 50000,
  isServiceActive24h: true, serviceStartTime: '06:00', serviceEndTime: '22:00',
  allowWeekendTransactions: true, isMaintenanceMode: false, maintenanceMessage: 'ปิดปรับปรุง',
};
const base = { amount: 1000, accountType: 'ออมทรัพย์', balance: 10000, pendingHold: 0, monthlyCount: 0, dailyTotal: 0 };

test('citizen id checksum', () => {
  assert.ok(L.isValidCitizenId('1101700230678'));
  assert.ok(!L.isValidCitizenId('1101700230679'));
  assert.ok(!L.isValidCitizenId('123'));
  assert.ok(L.isValidCitizenId('1-1017-00230-67-8'));
});

test('padMemberId', () => {
  assert.strictEqual(L.padMemberId('128'), '00128');
  assert.strictEqual(L.padMemberId('00128'), '00128');
});

test('special savings: first withdrawal free, then 3%', () => {
  assert.deepStrictEqual(L.calcWithdrawFee('ออมทรัพย์พิเศษ', 1000, 0), { fee: 0, feeRate: 0 });
  assert.deepStrictEqual(L.calcWithdrawFee('ออมทรัพย์พิเศษ', 1000, 1), { fee: 30, feeRate: 3 });
  assert.deepStrictEqual(L.calcWithdrawFee('ออมทรัพย์', 1000, 5), { fee: 0, feeRate: 0 });
});

test('fee rounds to satang', () => {
  assert.strictEqual(L.calcWithdrawFee('ออมทรัพย์พิเศษ', 333.33, 1).fee, 10);
});

test('withdraw ok and totals include fee', () => {
  const r = L.checkWithdrawal({ ...base, accountType: 'ออมทรัพย์พิเศษ', monthlyCount: 1 }, S);
  assert.ok(r.ok);
  assert.strictEqual(r.totalDeduction, 1030);
  assert.strictEqual(r.needsApproval, false);
});

test('withdraw rejects bad amounts', () => {
  for (const amount of [0, -5, NaN, Infinity, 50]) {
    assert.ok(!L.checkWithdrawal({ ...base, amount }, S).ok, String(amount));
  }
});

test('withdraw respects daily limit', () => {
  assert.ok(!L.checkWithdrawal({ ...base, dailyTotal: 99500 }, S).ok);
  assert.ok(L.checkWithdrawal({ ...base, dailyTotal: 99000, balance: 500000 }, S).ok);
});

test('withdraw needs available balance incl. pending hold and fee', () => {
  assert.ok(!L.checkWithdrawal({ ...base, balance: 1000 }, S).ok);
  assert.ok(!L.checkWithdrawal({ ...base, balance: 10000, pendingHold: 9500 }, S).ok);
  assert.ok(!L.checkWithdrawal({ ...base, accountType: 'ออมทรัพย์พิเศษ', monthlyCount: 1, balance: 1500 }, S).ok);
});

test('withdraw keeps minimum balance', () => {
  assert.ok(!L.checkWithdrawal({ ...base, balance: 1400 }, S).ok);
  assert.ok(L.checkWithdrawal({ ...base, balance: 1500 }, S).ok);
});

test('high value needs approval', () => {
  const r = L.checkWithdrawal({ ...base, amount: 60000, balance: 200000 }, S);
  assert.ok(r.ok);
  assert.strictEqual(r.needsApproval, true);
});

test('deposit minimum', () => {
  assert.ok(L.checkDeposit(100, S).ok);
  assert.ok(!L.checkDeposit(99, S).ok);
  assert.ok(!L.checkDeposit(-1, S).ok);
});

test('service hours use Bangkok time', () => {
  const s = { ...S, isServiceActive24h: false };
  // 2026-10-05 Mon 05:59 BKK = 22:59Z Sun
  assert.ok(!L.checkServiceOpen(s, new Date('2026-10-04T22:59:00Z')).open);
  assert.ok(L.checkServiceOpen(s, new Date('2026-10-04T23:00:00Z')).open);
  assert.ok(!L.checkServiceOpen(s, new Date('2026-10-05T15:00:00Z')).open); // 22:00 BKK
});

test('weekend and maintenance', () => {
  const sat = new Date('2026-10-10T05:00:00Z');
  assert.ok(!L.checkServiceOpen({ ...S, allowWeekendTransactions: false }, sat).open);
  assert.ok(L.checkServiceOpen(S, sat).open);
  assert.strictEqual(L.checkServiceOpen({ ...S, isMaintenanceMode: true }, sat).message, 'ปิดปรับปรุง');
});

test('balance apply / reverse', () => {
  assert.strictEqual(L.applyToBalance('deposit', 100, 50, 50), 150);
  assert.strictEqual(L.applyToBalance('withdraw', 100, 50, 80), 20);
  assert.strictEqual(L.applyToBalance('withdraw', 100, 90, 120), null);
  assert.strictEqual(L.reverseFromBalance('withdraw', 20, 50, 80), 100);
  assert.strictEqual(L.reverseFromBalance('deposit', 150, 50, 50), 100);
  assert.strictEqual(L.reverseFromBalance('deposit', 10, 50, 50), null);
});

test('ref code format', () => {
  assert.match(L.makeRefCode(new Date('2026-10-04T05:00:00Z'), 0.5), /^TXN-20261004-\d{4}$/);
});

test('hashPassword is deterministic, salted and sensitive', () => {
  const crypto = require('node:crypto');
  const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
  const a = L.hashPassword('secret', 's1', sha);
  assert.strictEqual(a, L.hashPassword('secret', 's1', sha));
  assert.notStrictEqual(a, L.hashPassword('secret', 's2', sha));
  assert.notStrictEqual(a, L.hashPassword('secreT', 's1', sha));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('safeEqual', () => {
  assert.ok(L.safeEqual('abc', 'abc'));
  assert.ok(!L.safeEqual('abc', 'abd'));
  assert.ok(!L.safeEqual('abc', 'abcd'));
});

test('parseDataUrl validates type and size', () => {
  assert.ok(L.parseDataUrl('data:image/png;base64,iVBORw0KGgo=').ok);
  assert.ok(!L.parseDataUrl('data:text/html;base64,PGI+').ok);
  assert.ok(!L.parseDataUrl('not a data url').ok);
  assert.ok(!L.parseDataUrl('data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024)).ok);
});
