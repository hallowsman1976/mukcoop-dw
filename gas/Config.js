/**
 * Non-secret defaults. Secrets live ONLY in Script Properties (Project Settings):
 *   LINE_CHANNEL_ACCESS_TOKEN  Messaging API channel access token (for push notifications)
 *   LINE_LOGIN_CHANNEL_ID      LINE Login channel ID that owns the LIFF app (to verify ID tokens)
 *   DRIVE_FOLDER_ID            (set by setup) private folder for slips / signatures / documents
 *   ALLOW_SANDBOX_MEMBER_AUTH  "true" = allow member login without LIFF (development only)
 *   SKIP_CITIZEN_CHECKSUM      "true" = accept 13-digit IDs that fail the checksum (test data only)
 */

const DEFAULT_SETTINGS = {
  cooperativeName: 'สหกรณ์ออมทรัพย์สาธารณสุขจังหวัดมุกดาหาร จำกัด',
  registrationNumber: '',
  contactPhone: '',
  contactEmail: '',
  officeAddress: '',
  logoUrl: '',

  regularInterestRate: 1.75,
  specialInterestRate: 2.75,
  minDepositAmount: 100,
  minWithdrawAmount: 100,
  maxDailyWithdrawAmount: 100000,
  minAccountBalance: 500,
  highValueApprovalThreshold: 50000,

  isServiceActive24h: true,
  serviceStartTime: '06:00',
  serviceEndTime: '22:00',
  allowWeekendTransactions: true,
  isMaintenanceMode: false,
  maintenanceMessage: 'ระบบปิดปรับปรุงชั่วคราว กรุณาทำรายการใหม่อีกครั้งในภายหลัง',

  liffId: '',
  lineOfficialId: '',
  enableGlobalLinePush: true,
  notifyStaffOnPendingTxn: true,

  requireDualSignatures: true,
  enableAiSlipVerification: false,
  adminSessionTimeoutMinutes: 30,
};

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
