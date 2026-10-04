import {
  BankAccount,
  Member,
  TransactionRecord,
  AdminUser,
  TransactionStatus,
  SystemSettings,
  LoanContract,
  LineNotificationSettings,
  AttachedFile,
  DigitalSignature,
} from '../types';
import { ApiService } from './api';

/**
 * Client-side view of the data that lives in Google Sheets.
 * Money data is NEVER written locally: every change goes through the Apps Script API,
 * and the in-memory cache below is replaced with whatever the server returns.
 * (Loans are still a local demo until they move to the backend.)
 */

const LOANS_KEY = 'line_liff_loans_v1';
const ADMIN_PROFILE_KEY = 'coop_admin_profile_v1';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
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

interface ServerTxn extends Omit<TransactionRecord, 'slipImage' | 'ownerSignature' | 'recipientSignature' | 'attachments'> {
  fileIds?: Record<string, string>;
}

interface Cache {
  members: Member[];
  accounts: BankAccount[];
  transactions: TransactionRecord[];
  settings: SystemSettings;
  currentMember: Member | null;
  currentAdmin: AdminUser | null;
  dailyWithdrawnTotal: number;
}

const cache: Cache = {
  members: [],
  accounts: [],
  transactions: [],
  settings: DEFAULT_SYSTEM_SETTINGS,
  currentMember: null,
  currentAdmin: null,
  dailyWithdrawnTotal: 0,
};

const remoteFile = (fileId: string | undefined, name: string, at: string): AttachedFile | undefined =>
  fileId ? { name, size: 0, type: 'image/*', dataUrl: '', fileId, uploadedAt: at } : undefined;

const remoteSig = (
  fileId: string | undefined,
  signerName: string,
  role: 'owner' | 'recipient',
  at: string
): DigitalSignature | undefined =>
  fileId ? { dataUrl: '', fileId, signedAt: at, signerName, signerRole: role } : undefined;

function fromServer(t: ServerTxn): TransactionRecord {
  const { fileIds = {}, ...rest } = t;
  const at = t.createdAt;
  const attachments = {
    idCard: remoteFile(fileIds.idCard, 'บัตรประชาชน', at),
    sourcePassbook: remoteFile(fileIds.sourcePassbook, 'สมุดบัญชีต้นทาง', at),
    destinationPassbook: remoteFile(fileIds.destinationPassbook, 'สมุดบัญชีปลายทาง', at),
  };
  return {
    ...rest,
    slipImage: remoteFile(fileIds.slip, 'สลิป', at),
    ownerSignature: remoteSig(fileIds.ownerSignature, t.accountName, 'owner', at),
    recipientSignature: remoteSig(fileIds.recipientSignature, t.destinationAccountName || t.accountName, 'recipient', at),
    attachments: attachments.idCard || attachments.sourcePassbook || attachments.destinationPassbook ? attachments : undefined,
  };
}

const failMessage = (e: unknown) => (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');

export const StorageService = {
  // ---------------------------------------------------------------- sync reads (from cache)
  getMembers: (): Member[] => cache.members,
  getAccounts: (): BankAccount[] => cache.accounts,
  getTransactions: (): TransactionRecord[] => cache.transactions,
  getSystemSettings: (): SystemSettings => cache.settings,
  getCurrentUser: (): Member | null => cache.currentMember,
  getCurrentAdmin: (): AdminUser | null => cache.currentAdmin,

  getAccountsByMember(memberId: string): BankAccount[] {
    return cache.accounts.filter((a) => a.memberId === memberId);
  },

  getAccountByNo(accountNo: string): BankAccount | null {
    return cache.accounts.find((a) => a.accountNo === accountNo) || null;
  },

  getTransactionsByMember(memberId: string): TransactionRecord[] {
    return cache.transactions.filter((t) => t.memberId === memberId);
  },

  /** Computed by the server (Bangkok time). Display only – the server re-checks on submit. */
  getMemberDailyWithdrawalTotal(_memberId?: string): number {
    return cache.dailyWithdrawnTotal;
  },

  getMonthlyAccountWithdrawalCount(accountNo: string): number {
    const ym = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
    return cache.transactions.filter(
      (t) =>
        t.accountNo === accountNo &&
        t.type === 'withdraw' &&
        t.status !== 'rejected' &&
        (t.dateTime || t.createdAt || '').startsWith(ym)
    ).length;
  },

  // ---------------------------------------------------------------- settings (public part)
  async loadPublicSettings(): Promise<void> {
    if (!ApiService.isConfigured()) return;
    try {
      cache.settings = { ...DEFAULT_SYSTEM_SETTINGS, ...(await ApiService.call<SystemSettings>('getPublicSettings')) };
    } catch {
      // keep defaults; login screen still works and shows real errors on action
    }
  },

  // ---------------------------------------------------------------- member session
  async loginMember(memberId: string, citizenId: string, idToken?: string): Promise<Member> {
    const r = await ApiService.call<{ token: string; member: Member }>('memberLogin', { memberId, citizenId, idToken });
    ApiService.setToken('member', r.token);
    cache.currentMember = r.member;
    await this.refreshMember();
    return cache.currentMember || r.member;
  },

  /** Sign in with the LINE account alone; throws NOT_LINKED (ApiError) when it is not linked to a member yet. */
  async loginMemberByLine(idToken: string): Promise<Member> {
    const r = await ApiService.call<{ token: string; member: Member }>('memberLoginByLine', { idToken });
    ApiService.setToken('member', r.token);
    cache.currentMember = r.member;
    await this.refreshMember();
    return cache.currentMember || r.member;
  },

  async refreshMember(): Promise<void> {
    const d = await ApiService.call<{
      member: Member;
      accounts: BankAccount[];
      transactions: ServerTxn[];
      dailyWithdrawnTotal: number;
      settings: SystemSettings;
    }>('getMyData', {}, 'member');
    cache.currentMember = d.member;
    cache.members = [d.member];
    cache.accounts = d.accounts;
    cache.transactions = d.transactions.map(fromServer);
    cache.dailyWithdrawnTotal = d.dailyWithdrawnTotal;
    cache.settings = { ...DEFAULT_SYSTEM_SETTINGS, ...d.settings };
  },

  /** Restore a member session after a page reload. */
  async restoreMemberSession(): Promise<boolean> {
    if (!ApiService.getToken('member') || !ApiService.isConfigured()) return false;
    try {
      await this.refreshMember();
      return true;
    } catch {
      ApiService.setToken('member', '');
      return false;
    }
  },

  async logoutMember(): Promise<void> {
    try {
      await ApiService.call('logout', {}, 'member');
    } catch {
      // token may already be expired
    }
    ApiService.setToken('member', '');
    cache.currentMember = null;
    cache.members = [];
    cache.accounts = [];
    cache.transactions = [];
  },

  async submitTransaction(
    kind: 'deposit' | 'withdraw',
    form: Record<string, unknown>
  ): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
    try {
      const r = await ApiService.call<{ transaction: ServerTxn }>(
        kind === 'deposit' ? 'submitDeposit' : 'submitWithdraw',
        form,
        'member'
      );
      await this.refreshMember();
      const stored = cache.transactions.find((t) => t.id === r.transaction.id);
      return { success: true, transaction: stored || fromServer(r.transaction) };
    } catch (e) {
      return { success: false, error: failMessage(e) };
    }
  },

  async updateMemberNotificationSettings(settings: LineNotificationSettings): Promise<boolean> {
    try {
      await ApiService.call('updateNotificationSettings', settings, 'member');
      await this.refreshMember();
      return true;
    } catch {
      return false;
    }
  },

  // ---------------------------------------------------------------- admin session
  async loginAdmin(username: string, password: string): Promise<{ admin: AdminUser; mustChangePassword: boolean }> {
    const r = await ApiService.call<{ token: string; admin: AdminUser; mustChangePassword: boolean }>('adminLogin', {
      username,
      password,
    });
    ApiService.setToken('admin', r.token);
    cache.currentAdmin = { ...r.admin, lastLogin: new Date().toISOString() };
    try {
      sessionStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(cache.currentAdmin));
    } catch {
      // ignore
    }
    await this.refreshAdmin();
    return { admin: cache.currentAdmin, mustChangePassword: r.mustChangePassword };
  },

  async refreshAdmin(): Promise<{ mustChangePassword: boolean }> {
    const d = await ApiService.call<{
      members: Member[];
      accounts: BankAccount[];
      transactions: ServerTxn[];
      mustChangePassword: boolean;
    }>('adminGetData', {}, 'admin');
    cache.members = d.members;
    cache.accounts = d.accounts;
    cache.transactions = d.transactions.map(fromServer).reverse();
    return { mustChangePassword: d.mustChangePassword };
  },

  async restoreAdminSession(admin: AdminUser | null): Promise<boolean> {
    if (!ApiService.getToken('admin') || !ApiService.isConfigured() || !admin) return false;
    try {
      cache.currentAdmin = admin;
      await this.refreshAdmin();
      return true;
    } catch {
      cache.currentAdmin = null;
      ApiService.setToken('admin', '');
      return false;
    }
  },

  getStoredAdminProfile(): AdminUser | null {
    try {
      const raw = sessionStorage.getItem(ADMIN_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async logoutAdmin(): Promise<void> {
    try {
      await ApiService.call('logout', {}, 'admin');
    } catch {
      // ignore
    }
    ApiService.setToken('admin', '');
    try {
      sessionStorage.removeItem(ADMIN_PROFILE_KEY);
    } catch {
      // ignore
    }
    cache.currentAdmin = null;
    cache.members = [];
    cache.accounts = [];
    cache.transactions = [];
  },

  async reviewTransaction(
    txnId: string,
    status: Exclude<TransactionStatus, 'pending'>,
    reviewNote?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await ApiService.call('reviewTransaction', { id: txnId, status, reviewNote }, 'admin');
      await this.refreshAdmin();
      return { success: true };
    } catch (e) {
      return { success: false, error: failMessage(e) };
    }
  },

  async importMembers(
    rows: Record<string, unknown>[],
    updateExisting: boolean
  ): Promise<{ addedMembers: number; addedAccounts: number; updatedAccounts: number; errors: string[] }> {
    const r = await ApiService.call<{
      addedMembers: number;
      addedAccounts: number;
      updatedAccounts: number;
      errors: string[];
    }>('importMembers', { rows, updateExisting }, 'admin');
    await this.refreshAdmin();
    return r;
  },

  async saveSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    const saved = await ApiService.call<SystemSettings>('saveSettings', { settings }, 'admin');
    cache.settings = { ...DEFAULT_SYSTEM_SETTINGS, ...saved };
    if (cache.settings.liffId) localStorage.setItem('line_liff_id_v1', cache.settings.liffId);
    return cache.settings;
  },

  async changeAdminPassword(oldPassword: string, newPassword: string): Promise<void> {
    await ApiService.call('changePassword', { oldPassword, newPassword }, 'admin');
  },

  /** Fetch a private attachment as a data URL (admin or the owning member). */
  async fetchAttachment(fileId: string): Promise<string> {
    const asAdmin = !!ApiService.getToken('admin') && !!cache.currentAdmin;
    const r = await ApiService.call<{ dataUrl: string }>(
      asAdmin ? 'getAttachment' : 'getMyAttachment',
      { fileId },
      asAdmin ? 'admin' : 'member'
    );
    return r.dataUrl;
  },

  // ---------------------------------------------------------------- LIFF id (public, device-local)
  getLiffId(): string {
    return localStorage.getItem('line_liff_id_v1') || cache.settings.liffId || '';
  },

  setLiffId(id: string) {
    localStorage.setItem('line_liff_id_v1', id);
  },

  // ---------------------------------------------------------------- loans (LOCAL ONLY – no backend yet, starts empty)
  getLoans(): LoanContract[] {
    try {
      const raw = localStorage.getItem(LOANS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fall through to demo data
    }
    return [];
  },

  getLoansByMember(memberId: string): LoanContract[] {
    return this.getLoans().filter((l) => l.memberId === memberId);
  },

  saveLoans(loans: LoanContract[]) {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  },

  /** Demo only: marks the installment paid on the local loan record. It never touches real balances. */
  payLoanInstallment(
    contractId: string,
    installmentNo: number,
    _paymentMethod?: 'account' | 'transfer',
    _accountNo?: string
  ): { success: boolean; message: string; transaction?: TransactionRecord } {
    const loans = this.getLoans();
    const loan = loans.find((l) => l.id === contractId);
    if (!loan) return { success: false, message: 'ไม่พบสัญญาเงินกู้' };
    const idx = loan.installments.findIndex((i) => i.installmentNo === installmentNo);
    if (idx === -1) return { success: false, message: 'ไม่พบงวดการชำระที่ระบุ' };
    const inst = loan.installments[idx];
    if (inst.status === 'paid') return { success: false, message: 'งวดนี้ได้รับการชำระเงินเรียบร้อยแล้ว' };

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    loan.installments[idx] = {
      ...inst,
      status: 'paid',
      paidAmount: inst.totalAmount,
      paidDate: nowStr,
      receiptNo: `DEMO-${Date.now().toString().slice(-6)}`,
    };
    loan.remainingBalance = Math.max(0, loan.remainingBalance - inst.principal);
    loan.totalPaidPrincipal += inst.principal;
    loan.totalPaidInterest += inst.interest;
    loan.paidInstallmentsCount += 1;
    loan.nextDueInstallmentNo = Math.min(loan.termMonths, loan.paidInstallmentsCount + 1);
    if (loan.paidInstallmentsCount >= loan.termMonths || loan.remainingBalance <= 0) loan.status = 'completed';
    this.saveLoans(loans);
    const receipt: TransactionRecord = {
      id: `demo-${Date.now()}`,
      refCode: `DEMO-LN-${Date.now().toString().slice(-6)}`,
      type: 'deposit',
      accountNo: loan.accountNo,
      accountName: loan.borrowerName,
      accountType: 'ออมทรัพย์',
      memberId: loan.memberId,
      citizenId: loan.borrowerCitizenId,
      amount: inst.totalAmount,
      balanceBefore: 0,
      balanceAfter: 0,
      dateTime: nowStr,
      status: 'completed',
      reviewNote: `(ข้อมูลทดลอง) ชำระค่างวดสัญญา ${loan.contractNo} งวดที่ ${inst.installmentNo}`,
      createdAt: new Date().toISOString(),
    };
    return { success: true, message: `บันทึกการชำระงวดที่ ${inst.installmentNo} (ข้อมูลทดลอง)`, transaction: receipt };
  },
};
