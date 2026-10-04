/**
 * Run setup() ONCE from the Apps Script editor (select "setup" > Run).
 * - creates the sheet tabs with headers
 * - creates a private Drive folder for uploads
 * - creates the first superadmin with a random password, stored in Script Properties
 *   as BOOTSTRAP_PASSWORD_ONCE (read it in Project Settings; it is deleted when the
 *   password is changed).
 */
function setup() {
  ensureSheets_();

  if (!prop_('DRIVE_FOLDER_ID')) {
    setProp_('DRIVE_FOLDER_ID', DriveApp.createFolder('Cooperative_Uploads_Private').getId());
  }

  if (readAll_('Admins').length === 0) {
    const password = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 16);
    const salt = newSalt_();
    appendRow_('Admins', {
      username: 'admin',
      fullName: 'ผู้ดูแลระบบ',
      role: 'superadmin',
      email: '',
      department: '',
      salt: salt,
      hash: hashPassword(password, salt, sha256Hex_),
      active: true,
    });
    setProp_('BOOTSTRAP_PASSWORD_ONCE', password);
  }

  saveSettings_(getSettings_());
  console.log('setup เสร็จแล้ว: ดูรหัสผ่านแอดมินเริ่มต้นที่ Project Settings > Script Properties > BOOTSTRAP_PASSWORD_ONCE');
}

/** Add another staff account. Run from the editor after editing the arguments below, then revert them. */
function addAdmin_(username, fullName, role, password) {
  const salt = newSalt_();
  appendRow_('Admins', {
    username: username, fullName: fullName, role: role, email: '', department: '',
    salt: salt, hash: hashPassword(password, salt, sha256Hex_), active: true,
  });
}
