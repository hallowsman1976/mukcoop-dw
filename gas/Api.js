/** HTTP entry points and action handlers. Every response is JSON: {ok, data} or {ok:false, code, message}. */

function ApiError(code, message) {
  this.code = code;
  this.message = message;
}
ApiError.prototype = Object.create(Error.prototype);

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, data: { status: 'ONLINE', service: 'coop-api', version: '2.0.0', time: new Date().toISOString() } });
}

// Actions that write to the sheets run under a script lock.
const WRITE_ACTIONS = {
  memberLogin: 1, submitDeposit: 1, submitWithdraw: 1, updateNotificationSettings: 1,
  reviewTransaction: 1, importMembers: 1, saveSettings: 1, changePassword: 1,
};

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    const handler = HANDLERS[action];
    if (!handler) throw new ApiError('UNKNOWN_ACTION', 'ไม่รู้จักคำสั่ง: ' + action);
    const p = body.payload || {};
    let data;
    if (WRITE_ACTIONS[action] && action !== 'memberLogin') {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { data = handler(p, body.token); } finally { lock.releaseLock(); }
    } else {
      data = handler(p, body.token);
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    if (err instanceof ApiError) return json_({ ok: false, code: err.code, message: err.message });
    console.error(err && err.stack ? err.stack : String(err));
    return json_({ ok: false, code: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง' });
  }
}

const HANDLERS = {
  ping: function () { return { status: 'ONLINE' }; },
  getPublicSettings: function () { return getSettings_(); },
  memberLogin: function (p) { return memberLogin_(p); },
  memberLoginByLine: function (p) { return memberLoginByLine_(p); },
  adminLogin: function (p) { return adminLogin_(p); },
  logout: function (p, token) { destroySession_(token); return { ok: true }; },

  getMyData: function (p, token) {
    const s = requireMember_(token);
    return memberData_(s.memberId);
  },
  submitDeposit: function (p, token) { return submitDeposit_(requireMember_(token), p); },
  submitWithdraw: function (p, token) { return submitWithdraw_(requireMember_(token), p); },
  updateNotificationSettings: function (p, token) {
    const s = requireMember_(token);
    const ns = {
      enableLinePush: !!p.enableLinePush,
      notifyOnDeposit: !!p.notifyOnDeposit,
      notifyOnWithdraw: !!p.notifyOnWithdraw,
      notifyOnInterest: !!p.notifyOnInterest,
      minimumAmount: Math.max(0, Number(p.minimumAmount) || 0),
      updatedAt: new Date().toISOString(),
    };
    const m = readAll_('Members').filter(function (x) { return x.memberId === s.memberId; })[0];
    const upd = stripRow_(m);
    upd.notificationSettings = ns;
    writeRow_('Members', m.__row, upd);
    return { notificationSettings: ns };
  },

  adminGetData: function (p, token) {
    requireAdmin_(token);
    return {
      members: readAll_('Members').map(publicMember_),
      accounts: readAll_('Accounts').map(stripRow_),
      transactions: readAll_('Transactions').map(txnOut_),
      mustChangePassword: !!prop_('BOOTSTRAP_PASSWORD_ONCE'),
    };
  },
  getAttachment: function (p, token) {
    requireAdmin_(token);
    return getAttachment_(String(p.fileId || ''));
  },
  getMyAttachment: function (p, token) {
    const sess = requireMember_(token);
    const fileId = String(p.fileId || '');
    const owns = readAll_('Transactions').some(function (t) {
      if (t.memberId !== sess.memberId || !t.files) return false;
      return Object.keys(t.files).some(function (k) { return t.files[k] === fileId; });
    });
    if (!owns) throw new ApiError('FORBIDDEN', 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้');
    return getAttachment_(fileId);
  },
  reviewTransaction: function (p, token) {
    return reviewTransaction_(requireAdmin_(token, ['superadmin', 'teller']), p);
  },
  importMembers: function (p, token) { return importMembers_(requireAdmin_(token, ['superadmin']), p); },
  saveSettings: function (p, token) {
    requireAdmin_(token, ['superadmin']);
    return saveSettingsFromClient_(p);
  },
  changePassword: function (p, token) { return changeAdminPassword_(requireAdmin_(token), p); },
};

// ---------------------------------------------------------------- reads

function txnOut_(t) {
  const o = stripRow_(t);
  const files = o.files || {};
  delete o.files;
  o.fileIds = files; // {slip, ownerSignature, recipientSignature, idCard, sourcePassbook, destinationPassbook}
  return o;
}

function memberData_(memberId) {
  const member = readAll_('Members').filter(function (m) { return m.memberId === memberId; })[0];
  if (!member) throw new ApiError('NOT_FOUND', 'ไม่พบสมาชิก');
  const now = bangkokParts(new Date());
  const txns = readAll_('Transactions').filter(function (t) { return t.memberId === memberId; });
  return {
    member: publicMember_(member),
    accounts: readAll_('Accounts').filter(function (a) { return a.memberId === memberId; }).map(stripRow_),
    transactions: txns.map(txnOut_).reverse(),
    dailyWithdrawnTotal: dailyWithdrawn_(txns, memberId, now.ymd),
    settings: getSettings_(),
  };
}

function dailyWithdrawn_(txns, memberId, ymd) {
  return txns
    .filter(function (t) { return t.memberId === memberId && t.type === 'withdraw' && t.status !== 'rejected'; })
    .filter(function (t) { return String(t.dateTime || t.createdAt || '').indexOf(ymd) === 0; })
    .reduce(function (sum, t) { return sum + Number(t.amount); }, 0);
}

function monthlyWithdrawCount_(txns, accountNo, ym) {
  return txns.filter(function (t) {
    return t.accountNo === accountNo && t.type === 'withdraw' && t.status !== 'rejected' &&
      String(t.dateTime || t.createdAt || '').indexOf(ym) === 0;
  }).length;
}

// ---------------------------------------------------------------- files (private Drive folder)

function uploadsFolder_() {
  const id = prop_('DRIVE_FOLDER_ID');
  if (!id) throw new ApiError('NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่าที่เก็บไฟล์ (รัน setup() ก่อน)');
  return DriveApp.getFolderById(id);
}

function saveUpload_(att, name) {
  if (!att || !att.dataUrl) return '';
  const parsed = parseDataUrl(att.dataUrl);
  if (!parsed.ok) throw new ApiError('BAD_FILE', parsed.error);
  const blob = Utilities.newBlob(Utilities.base64Decode(parsed.base64), parsed.mime, name);
  return uploadsFolder_().createFile(blob).getId();
}

function getAttachment_(fileId) {
  if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) throw new ApiError('BAD_FILE', 'รหัสไฟล์ไม่ถูกต้อง');
  const folder = uploadsFolder_();
  const file = DriveApp.getFileById(fileId);
  let inFolder = false;
  const parents = file.getParents();
  while (parents.hasNext()) { if (parents.next().getId() === folder.getId()) inFolder = true; }
  if (!inFolder) throw new ApiError('FORBIDDEN', 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้');
  const blob = file.getBlob();
  return { dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()), name: file.getName() };
}

// ---------------------------------------------------------------- transactions

function newTxnBase_(type, member, account, now, rand) {
  return {
    id: 'tx-' + now.getTime() + '-' + Math.floor(rand * 1000),
    refCode: makeRefCode(now, rand),
    type: type,
    accountNo: account.accountNo,
    accountName: account.accountName,
    accountType: account.accountType,
    memberId: member.memberId,
    citizenId: member.citizenId,
    dateTime: bangkokParts(now).stamp,
    createdAt: now.toISOString(),
  };
}

function ownAccount_(memberId, accountNo) {
  const acc = readAll_('Accounts').filter(function (a) { return a.accountNo === String(accountNo); })[0];
  if (!acc || acc.memberId !== memberId) throw new ApiError('NOT_FOUND', 'ไม่พบบัญชีเงินฝากที่ระบุ');
  return acc;
}

function assertOpen_(settings) {
  const open = checkServiceOpen(settings, new Date());
  if (!open.open) throw new ApiError('SERVICE_CLOSED', open.message);
}

function submitDeposit_(session, p) {
  const settings = getSettings_();
  assertOpen_(settings);
  const amount = round2(Number(p.amount));
  const chk = checkDeposit(amount, settings);
  if (!chk.ok) throw new ApiError('INVALID', chk.error);
  if (!p.slipImage || !p.slipImage.dataUrl) throw new ApiError('INVALID', 'กรุณาแนบสลิปการโอนเงิน');

  const member = readAll_('Members').filter(function (m) { return m.memberId === session.memberId; })[0];
  const account = ownAccount_(session.memberId, p.accountNo);
  const now = new Date();
  const t = newTxnBase_('deposit', member, account, now, Math.random());
  t.amount = amount;
  t.fee = 0;
  t.feeRate = 0;
  t.totalDeduction = amount;
  t.balanceBefore = account.balance;
  t.balanceAfter = account.balance; // unchanged until a teller approves
  t.status = 'pending';
  t.depositDateTime = String(p.depositDateTime || '').slice(0, 32);
  t.slipVerification = { verified: false, message: 'รอเจ้าหน้าที่ตรวจสอบสลิป' };
  t.note = String(p.note || '').slice(0, 500);
  t.files = { slip: saveUpload_(p.slipImage, 'Slip_' + t.refCode) };
  appendRow_('Transactions', t);
  notifyStaffPending_(settings, t);
  return { transaction: txnOut_(t) };
}

function submitWithdraw_(session, p) {
  const settings = getSettings_();
  assertOpen_(settings);
  const amount = round2(Number(p.amount));
  const member = readAll_('Members').filter(function (m) { return m.memberId === session.memberId; })[0];
  const account = ownAccount_(session.memberId, p.accountNo);
  const now = new Date();
  const parts = bangkokParts(now);

  if (!p.ownerSignature || !p.ownerSignature.dataUrl) throw new ApiError('INVALID', 'กรุณาลงลายมือชื่อเจ้าของบัญชี');
  if (settings.requireDualSignatures && (!p.recipientSignature || !p.recipientSignature.dataUrl)) {
    throw new ApiError('INVALID', 'กรุณาลงลายมือชื่อผู้รับเงิน');
  }
  const att = p.attachments || {};
  if (!att.idCard || !att.sourcePassbook || !att.destinationPassbook) {
    throw new ApiError('INVALID', 'กรุณาแนบเอกสารให้ครบ (บัตรประชาชน, สมุดบัญชีต้นทาง, สมุดบัญชีปลายทาง)');
  }
  if (!p.destinationBank || !p.destinationAccountNo || !p.destinationAccountName) {
    throw new ApiError('INVALID', 'กรุณาระบุบัญชีปลายทางให้ครบ');
  }

  const txns = readAll_('Transactions');
  const pendingHold = txns
    .filter(function (t) { return t.accountNo === account.accountNo && t.type === 'withdraw' && t.status === 'pending'; })
    .reduce(function (s, t) { return s + Number(t.totalDeduction || t.amount); }, 0);
  const monthlyCount = monthlyWithdrawCount_(txns, account.accountNo, parts.ym);
  const chk = checkWithdrawal({
    amount: amount,
    accountType: account.accountType,
    balance: Number(account.balance),
    pendingHold: pendingHold,
    monthlyCount: monthlyCount,
    dailyTotal: dailyWithdrawn_(txns, session.memberId, parts.ymd),
  }, settings);
  if (!chk.ok) throw new ApiError('INVALID', chk.error);

  const t = newTxnBase_('withdraw', member, account, now, Math.random());
  t.amount = amount;
  t.fee = chk.fee;
  t.feeRate = chk.feeRate;
  t.totalDeduction = chk.totalDeduction;
  t.monthlyWithdrawalCount = monthlyCount + 1;
  t.destinationBank = String(p.destinationBank).slice(0, 100);
  t.destinationAccountNo = String(p.destinationAccountNo).slice(0, 30);
  t.destinationAccountName = String(p.destinationAccountName).slice(0, 200);
  t.note = String(p.note || '').slice(0, 500);
  t.files = {
    ownerSignature: saveUpload_(p.ownerSignature, 'SigOwner_' + t.refCode),
    recipientSignature: p.recipientSignature ? saveUpload_(p.recipientSignature, 'SigRecipient_' + t.refCode) : '',
    idCard: saveUpload_(att.idCard, 'IdCard_' + t.refCode),
    sourcePassbook: saveUpload_(att.sourcePassbook, 'SrcBook_' + t.refCode),
    destinationPassbook: saveUpload_(att.destinationPassbook, 'DstBook_' + t.refCode),
  };

  if (chk.needsApproval) {
    t.status = 'pending';
    t.balanceBefore = Number(account.balance);
    t.balanceAfter = Number(account.balance);
    appendRow_('Transactions', t);
    notifyStaffPending_(settings, t);
    return { transaction: txnOut_(t) };
  }

  const after = applyToBalance('withdraw', Number(account.balance), amount, chk.totalDeduction);
  if (after === null) throw new ApiError('INVALID', 'ยอดเงินไม่เพียงพอ');
  t.status = 'completed';
  t.balanceBefore = Number(account.balance);
  t.balanceAfter = after;
  t.reviewedBy = 'ระบบอัตโนมัติ';
  t.reviewedAt = now.toISOString();
  const upd = stripRow_(account);
  upd.balance = after;
  upd.lastUpdated = parts.stamp;
  writeRow_('Accounts', account.__row, upd);
  appendRow_('Transactions', t);
  notifyMember_(settings, member, t);
  return { transaction: txnOut_(t) };
}

function reviewTransaction_(admin, p) {
  const status = p.status;
  if (status !== 'completed' && status !== 'rejected') throw new ApiError('INVALID', 'สถานะไม่ถูกต้อง');
  const t = readAll_('Transactions').filter(function (x) { return x.id === p.id; })[0];
  if (!t) throw new ApiError('NOT_FOUND', 'ไม่พบรายการ');
  if (t.status === status) throw new ApiError('INVALID', 'รายการนี้อยู่ในสถานะดังกล่าวแล้ว');

  const account = readAll_('Accounts').filter(function (a) { return a.accountNo === t.accountNo; })[0];
  if (!account) throw new ApiError('NOT_FOUND', 'ไม่พบบัญชีของรายการนี้');
  const now = new Date();
  const stamp = bangkokParts(now).stamp;
  let balance = Number(account.balance);
  const amount = Number(t.amount);
  const total = Number(t.totalDeduction || t.amount);

  if (t.status === 'pending' && status === 'completed') {
    if (t.type === 'withdraw') {
      const chkBal = balance - total;
      const settings = getSettings_();
      if (chkBal < 0) throw new ApiError('INVALID', 'ยอดเงินในบัญชีไม่เพียงพอสำหรับอนุมัติ');
      if (chkBal < settings.minAccountBalance) throw new ApiError('INVALID', 'หลังอนุมัติ ยอดคงเหลือจะต่ำกว่าขั้นต่ำของบัญชี');
    }
    const after = applyToBalance(t.type, balance, amount, total);
    if (after === null) throw new ApiError('INVALID', 'ไม่สามารถปรับยอดบัญชีได้');
    t.balanceBefore = balance;
    t.balanceAfter = after;
    balance = after;
  } else if (t.status === 'completed' && status === 'rejected') {
    const after = reverseFromBalance(t.type, balance, amount, total);
    if (after === null) throw new ApiError('INVALID', 'ไม่สามารถย้อนรายการได้ เพราะยอดเงินในบัญชีไม่พอ');
    balance = after;
  } else if (t.status === 'pending' && status === 'rejected') {
    // nothing to reverse: balance was never touched
  } else {
    throw new ApiError('INVALID', 'ไม่สามารถเปลี่ยนสถานะจาก ' + t.status + ' เป็น ' + status);
  }

  const accUpd = stripRow_(account);
  accUpd.balance = balance;
  accUpd.lastUpdated = stamp;
  writeRow_('Accounts', account.__row, accUpd);

  const tUpd = stripRow_(t);
  tUpd.status = status;
  tUpd.reviewedBy = admin.fullName;
  tUpd.reviewedAt = now.toISOString();
  if (p.reviewNote) tUpd.reviewNote = String(p.reviewNote).slice(0, 500);
  if (status === 'completed' && t.type === 'deposit') {
    tUpd.slipVerification = { verified: true, message: 'เจ้าหน้าที่ตรวจสอบสลิปแล้ว: ' + admin.fullName };
  }
  writeRow_('Transactions', t.__row, tUpd);

  if (status === 'completed') {
    const member = readAll_('Members').filter(function (m) { return m.memberId === t.memberId; })[0];
    if (member) notifyMember_(getSettings_(), member, tUpd);
  }
  return { transaction: txnOut_(tUpd), account: stripRow_(accUpd) };
}

// ---------------------------------------------------------------- import / settings

function importMembers_(admin, p) {
  const rows = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) throw new ApiError('INVALID', 'ไม่มีข้อมูลสำหรับนำเข้า');
  if (rows.length > 2000) throw new ApiError('INVALID', 'นำเข้าได้ครั้งละไม่เกิน 2,000 แถว');
  const updateExisting = p.updateExisting !== false;
  const skipChecksum = prop_('SKIP_CITIZEN_CHECKSUM') === 'true';

  const members = readAll_('Members');
  const accounts = readAll_('Accounts');
  const mById = {}; members.forEach(function (m) { mById[m.memberId] = m; });
  const aByNo = {}; accounts.forEach(function (a) { aByNo[a.accountNo] = a; });

  const errors = [];
  let addedMembers = 0, addedAccounts = 0, updated = 0;
  const newMembers = [], newAccounts = [];
  const seen = {};

  rows.forEach(function (r, i) {
    const line = i + 1;
    const memberId = padMemberId(r.memberId);
    const citizenId = onlyDigits(r.citizenId);
    const accountNo = String(r.accountNo || '').trim();
    if (!/^\d{5}$/.test(memberId)) return errors.push('แถว ' + line + ': รหัสสมาชิกต้องเป็นตัวเลข 5 หลัก');
    if (!skipChecksum && !isValidCitizenId(citizenId)) return errors.push('แถว ' + line + ': เลขบัตรประชาชนไม่ถูกต้อง');
    if (citizenId.length !== 13) return errors.push('แถว ' + line + ': เลขบัตรประชาชนต้องมี 13 หลัก');
    if (!accountNo) return errors.push('แถว ' + line + ': ไม่มีหมายเลขบัญชี');
    const balance = round2(Number(r.balance));
    const interest = round2(Number(r.accruedInterest) || 0);
    if (!isFinite(balance) || balance < 0) return errors.push('แถว ' + line + ': ยอดคงเหลือไม่ถูกต้อง');
    if (seen[accountNo]) return errors.push('แถว ' + line + ': หมายเลขบัญชีซ้ำในไฟล์ (' + accountNo + ')');
    seen[accountNo] = true;
    const type = r.accountType === 'ออมทรัพย์พิเศษ' ? 'ออมทรัพย์พิเศษ' : 'ออมทรัพย์';
    const stamp = bangkokParts(new Date()).stamp;

    const existingM = mById[memberId];
    if (existingM && onlyDigits(existingM.citizenId) !== citizenId) {
      return errors.push('แถว ' + line + ': รหัสสมาชิก ' + memberId + ' มีอยู่แล้วด้วยเลขบัตรประชาชนอื่น');
    }
    if (!existingM) {
      const m = {
        memberId: memberId, citizenId: citizenId, fullName: String(r.fullName || r.accountName || '').slice(0, 200),
        contact: String(r.contact || ''), phone: String(r.contact || ''), registeredDate: stamp.slice(0, 10),
      };
      mById[memberId] = m; newMembers.push(m); addedMembers++;
    }
    const existingA = aByNo[accountNo];
    if (existingA) {
      if (existingA.memberId !== memberId) return errors.push('แถว ' + line + ': บัญชี ' + accountNo + ' เป็นของสมาชิกอื่น');
      if (updateExisting) {
        const upd = stripRow_(existingA);
        upd.accountName = String(r.accountName || upd.accountName);
        upd.accountType = type;
        upd.balance = balance;
        upd.accruedInterest = interest;
        upd.contact = String(r.contact || upd.contact || '');
        upd.lastUpdated = stamp;
        writeRow_('Accounts', existingA.__row, upd);
        updated++;
      }
    } else {
      const a = {
        accountNo: accountNo, memberId: memberId, citizenId: citizenId, accountName: String(r.accountName || '').slice(0, 200),
        accountType: type, balance: balance, accruedInterest: interest, contact: String(r.contact || ''),
        interestRate: type === 'ออมทรัพย์พิเศษ' ? getSettings_().specialInterestRate : getSettings_().regularInterestRate,
        lastUpdated: stamp,
      };
      aByNo[accountNo] = a; newAccounts.push(a); addedAccounts++;
    }
  });

  appendRows_('Members', newMembers);
  appendRows_('Accounts', newAccounts);
  return { addedMembers: addedMembers, addedAccounts: addedAccounts, updatedAccounts: updated, errors: errors };
}

const NUMERIC_SETTINGS = [
  'regularInterestRate', 'specialInterestRate', 'minDepositAmount', 'minWithdrawAmount',
  'maxDailyWithdrawAmount', 'minAccountBalance', 'highValueApprovalThreshold', 'adminSessionTimeoutMinutes',
];

function saveSettingsFromClient_(p) {
  const incoming = p.settings || {};
  const out = getSettings_();
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!(k in incoming)) return;
    const def = DEFAULT_SETTINGS[k];
    let v = incoming[k];
    if (typeof def === 'number') {
      v = Number(v);
      if (!isFinite(v) || v < 0) throw new ApiError('INVALID', 'ค่าตั้งค่าไม่ถูกต้อง: ' + k);
    } else if (typeof def === 'boolean') {
      v = !!v;
    } else {
      v = String(v == null ? '' : v).slice(0, 500);
    }
    out[k] = v;
  });
  if (!/^\d\d:\d\d$/.test(out.serviceStartTime) || !/^\d\d:\d\d$/.test(out.serviceEndTime)) {
    throw new ApiError('INVALID', 'รูปแบบเวลาต้องเป็น HH:MM');
  }
  saveSettings_(out);
  return getSettings_();
}
