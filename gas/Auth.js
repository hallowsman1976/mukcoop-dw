/** Sessions, admin passwords, LIFF ID-token verification, login throttling. */

const MAX_LOGIN_FAILS = 5;
const LOCK_SECONDS = 15 * 60;

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

function newSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

// ---- sessions (CacheService, sliding expiry, max 6h) ----

function createSession_(data, ttlSeconds) {
  const token = newToken_();
  data.ttl = Math.min(ttlSeconds, 21600);
  CacheService.getScriptCache().put('sess:' + token, JSON.stringify(data), data.ttl);
  return token;
}

function getSession_(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get('sess:' + token);
  if (!raw) return null;
  const data = JSON.parse(raw);
  cache.put('sess:' + token, raw, data.ttl); // slide
  return data;
}

function destroySession_(token) {
  if (token) CacheService.getScriptCache().remove('sess:' + token);
}

function requireMember_(token) {
  const s = getSession_(token);
  if (!s || s.role !== 'member') throw new ApiError('SESSION_EXPIRED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  return s;
}

function requireAdmin_(token, roles) {
  const s = getSession_(token);
  if (!s || s.role !== 'admin') throw new ApiError('SESSION_EXPIRED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  if (roles && roles.indexOf(s.adminRole) === -1) throw new ApiError('FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์ทำรายการดังกล่าว');
  return s;
}

// ---- throttling ----

function assertNotLocked_(key) {
  const n = Number(CacheService.getScriptCache().get('fail:' + key) || 0);
  if (n >= MAX_LOGIN_FAILS) throw new ApiError('LOCKED', 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
}

function recordFail_(key) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('fail:' + key) || 0) + 1;
  cache.put('fail:' + key, String(n), LOCK_SECONDS);
}

function clearFails_(key) {
  CacheService.getScriptCache().remove('fail:' + key);
}

// ---- admin ----

function adminLogin_(p) {
  const username = String(p.username || '').trim().toLowerCase();
  const key = 'a:' + username;
  assertNotLocked_(key);
  const row = readAll_('Admins').filter(function (a) { return String(a.username).toLowerCase() === username; })[0];
  const ok = row && row.active !== false && row.active !== 'FALSE' &&
    safeEqual(hashPassword(String(p.password || ''), row.salt, sha256Hex_), row.hash);
  if (!ok) {
    recordFail_(key);
    throw new ApiError('BAD_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  clearFails_(key);
  const settings = getSettings_();
  const token = createSession_(
    { role: 'admin', username: row.username, adminRole: row.role, fullName: row.fullName },
    settings.adminSessionTimeoutMinutes * 60
  );
  return { token: token, admin: publicAdmin_(row), mustChangePassword: !!prop_('BOOTSTRAP_PASSWORD_ONCE') };
}

function publicAdmin_(row) {
  return {
    id: row.username,
    username: row.username,
    fullName: row.fullName,
    role: row.role,
    email: row.email || '',
    department: row.department || '',
  };
}

function changeAdminPassword_(session, p) {
  const newPw = String(p.newPassword || '');
  if (newPw.length < 10) throw new ApiError('WEAK_PASSWORD', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 10 ตัวอักษร');
  const rows = readAll_('Admins');
  const row = rows.filter(function (a) { return a.username === session.username; })[0];
  if (!row || !safeEqual(hashPassword(String(p.oldPassword || ''), row.salt, sha256Hex_), row.hash)) {
    throw new ApiError('BAD_CREDENTIALS', 'รหัสผ่านเดิมไม่ถูกต้อง');
  }
  const salt = newSalt_();
  const updated = stripRow_(row);
  updated.salt = salt;
  updated.hash = hashPassword(newPw, salt, sha256Hex_);
  writeRow_('Admins', row.__row, updated);
  PropertiesService.getScriptProperties().deleteProperty('BOOTSTRAP_PASSWORD_ONCE');
  return { changed: true };
}

// ---- member ----

/** Verify a LIFF ID token with LINE; returns the LINE userId (sub). */
function verifyLiffIdToken_(idToken) {
  const channelId = prop_('LINE_LOGIN_CHANNEL_ID');
  if (!channelId) throw new ApiError('NOT_CONFIGURED', 'ระบบยังไม่ได้ตั้งค่า LINE Login (LINE_LOGIN_CHANNEL_ID)');
  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: channelId },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new ApiError('BAD_LINE_TOKEN', 'ยืนยันตัวตนกับ LINE ไม่สำเร็จ กรุณาเข้าสู่ระบบ LINE ใหม่');
  const sub = JSON.parse(res.getContentText()).sub;
  if (!sub) throw new ApiError('BAD_LINE_TOKEN', 'ยืนยันตัวตนกับ LINE ไม่สำเร็จ');
  return sub;
}

function memberLogin_(p) {
  const memberId = padMemberId(p.memberId);
  const citizenId = onlyDigits(p.citizenId);
  const key = 'm:' + memberId;
  assertNotLocked_(key);

  const fail = function () {
    recordFail_(key);
    throw new ApiError('BAD_CREDENTIALS', 'ไม่พบข้อมูลสมาชิก หรือข้อมูลไม่ตรงกัน');
  };

  const member = readAll_('Members').filter(function (m) { return m.memberId === memberId; })[0];
  if (!member || !safeEqual(onlyDigits(member.citizenId), citizenId)) fail();

  let lineUserId = '';
  let newlyLinked = false;
  if (p.idToken) {
    lineUserId = verifyLiffIdToken_(String(p.idToken));
  } else if (prop_('ALLOW_SANDBOX_MEMBER_AUTH') !== 'true') {
    throw new ApiError('LINE_REQUIRED', 'กรุณาเข้าสู่ระบบผ่านแอป LINE เพื่อยืนยันตัวตน');
  }

  if (lineUserId) {
    if (member.lineUserId && member.lineUserId !== lineUserId) {
      recordFail_(key);
      throw new ApiError('LINE_MISMATCH', 'บัญชีสมาชิกนี้ผูกกับบัญชี LINE อื่นแล้ว กรุณาติดต่อเจ้าหน้าที่');
    }
    if (!member.lineUserId) {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        const fresh = readAll_('Members').filter(function (m) { return m.memberId === memberId; })[0];
        if (fresh.lineUserId && fresh.lineUserId !== lineUserId) {
          throw new ApiError('LINE_MISMATCH', 'บัญชีสมาชิกนี้ผูกกับบัญชี LINE อื่นแล้ว กรุณาติดต่อเจ้าหน้าที่');
        }
        const upd = stripRow_(fresh);
        upd.lineUserId = lineUserId;
        writeRow_('Members', fresh.__row, upd);
        member.lineUserId = lineUserId;
        newlyLinked = true;
      } finally {
        lock.releaseLock();
      }
    }
  }

  clearFails_(key);
  const token = createSession_({ role: 'member', memberId: memberId }, 6 * 3600);
  return { token: token, member: publicMember_(member), newlyLinked: newlyLinked };
}

/**
 * Sign in a member whose LINE account is already linked: the LIFF ID token proves the LINE user,
 * so no member ID / citizen ID is needed. Unlinked (or ambiguous) accounts must use memberLogin.
 */
function memberLoginByLine_(p) {
  if (!p.idToken) throw new ApiError('NOT_LINKED', 'ยังไม่ได้ผูกบัญชี LINE กับสมาชิก');
  const lineUserId = verifyLiffIdToken_(String(p.idToken));
  const matches = readAll_('Members').filter(function (m) { return m.lineUserId === lineUserId; });
  if (matches.length !== 1) throw new ApiError('NOT_LINKED', 'ยังไม่ได้ผูกบัญชี LINE กับสมาชิก');
  const member = matches[0];
  const token = createSession_({ role: 'member', memberId: member.memberId }, 6 * 3600);
  return { token: token, member: publicMember_(member) };
}

function publicMember_(m) {
  const out = stripRow_(m);
  out.lineLinked = !!m.lineUserId;
  return out;
}
