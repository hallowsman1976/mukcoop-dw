const test = require('node:test');
const assert = require('node:assert');
const { createEnv } = require('./harness.js');

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const att = { name: 'a.png', size: 8, type: 'image/png', dataUrl: PNG };

function boot() {
  const env = createEnv();
  env.x.setup();
  env.props.ALLOW_SANDBOX_MEMBER_AUTH = 'true';
  env.props.LINE_CHANNEL_ACCESS_TOKEN = 'tok';
  const adminPw = env.props.BOOTSTRAP_PASSWORD_ONCE;
  env.x.appendRow_('Members', { memberId: '00128', citizenId: '1101700230678', fullName: 'สมชาย', lineUserId: 'Uabc' });
  env.x.appendRow_('Members', { memberId: '00405', citizenId: '3100100456786', fullName: 'อีกคน' });
  env.x.appendRow_('Accounts', { accountNo: '101-2-00128-1', memberId: '00128', citizenId: '1101700230678', accountName: 'สมชาย', accountType: 'ออมทรัพย์', balance: 100000, accruedInterest: 0, lastUpdated: '' });
  env.x.appendRow_('Accounts', { accountNo: '201-5-00128-2', memberId: '00128', citizenId: '1101700230678', accountName: 'สมชาย พิเศษ', accountType: 'ออมทรัพย์พิเศษ', balance: 50000, accruedInterest: 0, lastUpdated: '' });
  env.x.appendRow_('Accounts', { accountNo: '101-2-00405-1', memberId: '00405', citizenId: '3100100456786', accountName: 'อีกคน', accountType: 'ออมทรัพย์', balance: 9000, accruedInterest: 0, lastUpdated: '' });
  return { env, adminPw };
}

function memberToken(env, id = '00128', cid = '1101700230678', idToken) {
  const r = env.call('memberLogin', { memberId: id, citizenId: cid, idToken });
  assert.ok(r.ok, JSON.stringify(r));
  return r.data.token;
}

function adminToken(env, pw) {
  const r = env.call('adminLogin', { username: 'admin', password: pw });
  assert.ok(r.ok, JSON.stringify(r));
  return r.data.token;
}

const wd = (over = {}) => ({
  accountNo: '101-2-00128-1', amount: 1000,
  destinationBank: 'KBank', destinationAccountNo: '123', destinationAccountName: 'สมชาย',
  ownerSignature: att, recipientSignature: att,
  attachments: { idCard: att, sourcePassbook: att, destinationPassbook: att },
  ...over,
});

test('setup creates sheets, private folder and hashed admin only', () => {
  const { env, adminPw } = boot();
  assert.ok(adminPw && adminPw.length === 16);
  const admin = env.read('Admins')[0];
  assert.notStrictEqual(admin.hash, adminPw);
  assert.ok(!JSON.stringify(env.sheets.Admins.data).includes(adminPw));
  assert.strictEqual(env.props.DRIVE_FOLDER_ID, 'FOLDER_ID_0000');
});

test('requests without a valid token are rejected', () => {
  const { env } = boot();
  assert.strictEqual(env.call('getMyData', {}, 'nope').code, 'SESSION_EXPIRED');
  assert.strictEqual(env.call('adminGetData', {}, 'nope').code, 'SESSION_EXPIRED');
  assert.strictEqual(env.call('bogus', {}).code, 'UNKNOWN_ACTION');
});

test('member login: wrong citizen id fails, throttles after 5 tries', () => {
  const { env } = boot();
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(env.call('memberLogin', { memberId: '128', citizenId: '0000000000000' }).code, 'BAD_CREDENTIALS');
  }
  assert.strictEqual(env.call('memberLogin', { memberId: '128', citizenId: '1101700230678' }).code, 'LOCKED');
});

test('LINE auto login: linked LINE user gets a session without member/citizen id', () => {
  const { env } = boot();
  env.props.LINE_LOGIN_CHANNEL_ID = 'chan';
  env.lineVerify = (p) => ({ sub: p.id_token });
  const r = env.call('memberLoginByLine', { idToken: 'Uabc' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.data.member.memberId, '00128');
  assert.ok(env.call('getMyData', {}, r.data.token).ok);
});

test('LINE auto login: unlinked LINE user or missing token is refused', () => {
  const { env } = boot();
  env.props.LINE_LOGIN_CHANNEL_ID = 'chan';
  env.lineVerify = (p) => ({ sub: p.id_token });
  assert.strictEqual(env.call('memberLoginByLine', { idToken: 'Unobody' }).code, 'NOT_LINKED');
  assert.strictEqual(env.call('memberLoginByLine', {}).code, 'NOT_LINKED');
});

test('member login without LINE is refused unless sandbox flag is on', () => {
  const { env } = boot();
  delete env.props.ALLOW_SANDBOX_MEMBER_AUTH;
  assert.strictEqual(env.call('memberLogin', { memberId: '128', citizenId: '1101700230678' }).code, 'LINE_REQUIRED');
});

test('LINE binding: first login binds, other LINE account is refused', () => {
  const { env } = boot();
  env.props.LINE_LOGIN_CHANNEL_ID = 'chan';
  env.lineVerify = (p) => ({ sub: p.id_token });
  const first = env.call('memberLogin', { memberId: '405', citizenId: '3100100456786', idToken: 'Unew' });
  assert.strictEqual(first.data.newlyLinked, true);
  const again = env.call('memberLogin', { memberId: '405', citizenId: '3100100456786', idToken: 'Unew' });
  assert.strictEqual(again.data.newlyLinked, false);
  assert.strictEqual(env.read('Members').find((m) => m.memberId === '00405').lineUserId, 'Unew');
  const r = env.call('memberLogin', { memberId: '405', citizenId: '3100100456786', idToken: 'Uother' });
  assert.strictEqual(r.code, 'LINE_MISMATCH');
  assert.ok(env.call('memberLogin', { memberId: '405', citizenId: '3100100456786', idToken: 'Unew' }).ok);
});

test('a member cannot touch another member\'s account', () => {
  const { env } = boot();
  const t = memberToken(env);
  const r = env.call('submitWithdraw', wd({ accountNo: '101-2-00405-1' }), t);
  assert.strictEqual(r.code, 'NOT_FOUND');
});

test('getMyData only returns own data', () => {
  const { env } = boot();
  const d = env.call('getMyData', {}, memberToken(env)).data;
  assert.strictEqual(d.accounts.length, 2);
  assert.ok(d.accounts.every((a) => a.memberId === '00128'));
});

test('withdrawal below threshold completes immediately and updates balance + notifies owner', () => {
  const { env } = boot();
  const r = env.call('submitWithdraw', wd(), memberToken(env));
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.data.transaction.status, 'completed');
  assert.strictEqual(env.read('Accounts')[0].balance, 99000);
  assert.strictEqual(env.pushes.length, 1);
  assert.strictEqual(env.pushes[0].to, 'Uabc'); // push to owner, never broadcast
});

test('client cannot dictate status, fee, or balances', () => {
  const { env } = boot();
  const r = env.call('submitWithdraw', wd({ status: 'completed', fee: -500, balanceAfter: 1e9, totalDeduction: 1, memberId: '00405' }), memberToken(env));
  assert.ok(r.ok);
  const t = env.read('Transactions')[0];
  assert.strictEqual(t.memberId, '00128');
  assert.strictEqual(t.fee, 0);
  assert.strictEqual(t.balanceAfter, 99000);
});

test('special savings: 2nd withdrawal in the month pays 3% fee', () => {
  const { env } = boot();
  const t = memberToken(env);
  assert.ok(env.call('submitWithdraw', wd({ accountNo: '201-5-00128-2', amount: 1000 }), t).ok);
  const r = env.call('submitWithdraw', wd({ accountNo: '201-5-00128-2', amount: 1000 }), t);
  assert.strictEqual(r.data.transaction.fee, 30);
  assert.strictEqual(env.read('Accounts')[1].balance, 50000 - 1000 - 1030);
});

test('overdraft, min balance, daily limit and missing documents are rejected', () => {
  const { env } = boot();
  const t = memberToken(env);
  assert.strictEqual(env.call('submitWithdraw', wd({ amount: 100001 }), t).code, 'INVALID');
  assert.strictEqual(env.call('submitWithdraw', wd({ accountNo: '201-5-00128-2', amount: 49600 }), t).code, 'INVALID');
  assert.strictEqual(env.call('submitWithdraw', wd({ amount: -5 }), t).code, 'INVALID');
  assert.strictEqual(env.call('submitWithdraw', wd({ attachments: {} }), t).code, 'INVALID');
  assert.strictEqual(env.call('submitWithdraw', wd({ ownerSignature: null }), t).code, 'INVALID');
  assert.strictEqual(env.call('submitWithdraw', wd({ ownerSignature: { dataUrl: 'data:text/html;base64,PGI+' } }), t).code, 'BAD_FILE');
  assert.strictEqual(env.read('Accounts')[0].balance, 100000);
});

test('high value withdrawal is pending, reserves funds, and approval moves money once', () => {
  const { env, adminPw } = boot();
  const t = memberToken(env);
  const r = env.call('submitWithdraw', wd({ amount: 60000 }), t);
  assert.strictEqual(r.data.transaction.status, 'pending');
  assert.strictEqual(env.read('Accounts')[0].balance, 100000);
  // pending hold prevents double spending
  assert.strictEqual(env.call('submitWithdraw', wd({ amount: 45000 }), t).code, 'INVALID');
  const a = adminToken(env, adminPw);
  const ok = env.call('reviewTransaction', { id: r.data.transaction.id, status: 'completed' }, a);
  assert.ok(ok.ok, JSON.stringify(ok));
  assert.strictEqual(env.read('Accounts')[0].balance, 40000);
  assert.ok(!env.call('reviewTransaction', { id: r.data.transaction.id, status: 'completed' }, a).ok);
  assert.strictEqual(env.read('Accounts')[0].balance, 40000);
});

test('deposit stays pending until approved; reject leaves balance; members cannot review', () => {
  const { env, adminPw } = boot();
  const t = memberToken(env);
  const d = env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 500, slipImage: att, depositDateTime: '2026-10-04 10:00' }, t);
  assert.strictEqual(d.data.transaction.status, 'pending');
  assert.strictEqual(env.read('Accounts')[0].balance, 100000);
  assert.strictEqual(env.call('reviewTransaction', { id: d.data.transaction.id, status: 'completed' }, t).code, 'SESSION_EXPIRED');
  const a = adminToken(env, adminPw);
  assert.ok(env.call('reviewTransaction', { id: d.data.transaction.id, status: 'completed' }, a).ok);
  assert.strictEqual(env.read('Accounts')[0].balance, 100500);
  // reverse a completed deposit
  assert.ok(env.call('reviewTransaction', { id: d.data.transaction.id, status: 'rejected' }, a).ok);
  assert.strictEqual(env.read('Accounts')[0].balance, 100000);
  // reject pending
  const d2 = env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 700, slipImage: att }, t);
  assert.ok(env.call('reviewTransaction', { id: d2.data.transaction.id, status: 'rejected' }, a).ok);
  assert.strictEqual(env.read('Accounts')[0].balance, 100000);
});

test('deposit needs slip and respects minimum', () => {
  const { env } = boot();
  const t = memberToken(env);
  assert.strictEqual(env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 500 }, t).code, 'INVALID');
  assert.strictEqual(env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 5, slipImage: att }, t).code, 'INVALID');
});

test('reversing a completed withdrawal refunds amount + fee', () => {
  const { env, adminPw } = boot();
  const t = memberToken(env);
  env.call('submitWithdraw', wd({ accountNo: '201-5-00128-2' }), t);
  const second = env.call('submitWithdraw', wd({ accountNo: '201-5-00128-2' }), t).data.transaction;
  assert.strictEqual(env.read('Accounts')[1].balance, 47970);
  env.call('reviewTransaction', { id: second.id, status: 'rejected' }, adminToken(env, adminPw));
  assert.strictEqual(env.read('Accounts')[1].balance, 49000);
});

test('maintenance mode blocks transactions', () => {
  const { env, adminPw } = boot();
  env.call('saveSettings', { settings: { isMaintenanceMode: true } }, adminToken(env, adminPw));
  assert.strictEqual(env.call('submitWithdraw', wd(), memberToken(env)).code, 'SERVICE_CLOSED');
});

test('admin: wrong password throttled, change password clears bootstrap secret', () => {
  const { env, adminPw } = boot();
  assert.strictEqual(env.call('adminLogin', { username: 'admin', password: 'x' }).code, 'BAD_CREDENTIALS');
  const login = env.call('adminLogin', { username: 'admin', password: adminPw });
  assert.strictEqual(login.data.mustChangePassword, true);
  assert.strictEqual(env.call('changePassword', { oldPassword: adminPw, newPassword: 'short' }, login.data.token).code, 'WEAK_PASSWORD');
  assert.ok(env.call('changePassword', { oldPassword: adminPw, newPassword: 'a-much-longer-pass' }, login.data.token).ok);
  assert.ok(!env.props.BOOTSTRAP_PASSWORD_ONCE);
  assert.ok(!env.call('adminLogin', { username: 'admin', password: adminPw }).ok);
  assert.ok(env.call('adminLogin', { username: 'admin', password: 'a-much-longer-pass' }).ok);
});

test('roles: auditor read-only; teller cannot import or change settings', () => {
  const { env, adminPw } = boot();
  env.x.addAdmin_('aud', 'Aud', 'auditor', 'auditor-password');
  env.x.addAdmin_('tel', 'Tel', 'teller', 'teller-password');
  const login = (u, p) => env.call('adminLogin', { username: u, password: p }).data.token;
  const aud = login('aud', 'auditor-password');
  const tel = login('tel', 'teller-password');
  const d = env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 500, slipImage: att }, memberToken(env)).data.transaction;
  assert.ok(env.call('adminGetData', {}, aud).ok);
  assert.strictEqual(env.call('reviewTransaction', { id: d.id, status: 'completed' }, aud).code, 'FORBIDDEN');
  assert.strictEqual(env.call('importMembers', { rows: [{}] }, tel).code, 'FORBIDDEN');
  assert.strictEqual(env.call('saveSettings', { settings: {} }, tel).code, 'FORBIDDEN');
  assert.ok(env.call('reviewTransaction', { id: d.id, status: 'completed' }, tel).ok);
  assert.ok(adminPw);
});

test('import validates rows server-side and is superadmin-only', () => {
  const { env, adminPw } = boot();
  const a = adminToken(env, adminPw);
  const good = { memberId: '777', citizenId: '3100100456786', accountNo: '101-2-00777-1', accountName: 'ใหม่', balance: 1000, accruedInterest: 5 };
  const r = env.call('importMembers', {
    rows: [
      good,
      { ...good, accountNo: 'x1', citizenId: '1234567890123' }, // bad checksum
      { ...good, accountNo: 'x2', balance: -1 },
      { ...good, accountNo: 'x3', memberId: 'abc' },
      { ...good, accountNo: 'x4', memberId: '00128' }, // existing id, different citizen
    ],
  }, a);
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.data.addedAccounts, 1);
  assert.strictEqual(r.data.errors.length, 4);
  assert.ok(env.read('Members').some((m) => m.memberId === '00777'));
});

test('admin attachments are served only for files in the private folder', () => {
  const { env, adminPw } = boot();
  env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 500, slipImage: att }, memberToken(env));
  const a = adminToken(env, adminPw);
  const t = env.call('adminGetData', {}, a).data.transactions[0];
  assert.ok(t.fileIds.slip);
  const f = env.call('getAttachment', { fileId: t.fileIds.slip }, a);
  assert.ok(f.ok && f.data.dataUrl.startsWith('data:image/png;base64,'));
  assert.strictEqual(env.call('getAttachment', { fileId: '../etc' }, a).code, 'BAD_FILE');
  assert.strictEqual(env.call('getAttachment', { fileId: t.fileIds.slip }, memberToken(env)).code, 'SESSION_EXPIRED');
});

test('public settings expose no secrets', () => {
  const { env } = boot();
  const s = env.call('getPublicSettings', {}).data;
  assert.ok(!('lineChannelSecret' in s) && !('lineChannelAccessToken' in s));
});

test('members can read only their own attachments', () => {
  const { env } = boot();
  env.props.LINE_LOGIN_CHANNEL_ID = '';
  const mine = memberToken(env);
  const d = env.call('submitDeposit', { accountNo: '101-2-00128-1', amount: 500, slipImage: att }, mine).data.transaction;
  const fileId = d.fileIds.slip;
  assert.ok(env.call('getMyAttachment', { fileId }, mine).ok);
  const other = memberToken(env, '00405', '3100100456786');
  assert.strictEqual(env.call('getMyAttachment', { fileId }, other).code, 'FORBIDDEN');
});
