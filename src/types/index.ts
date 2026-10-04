export type AccountType = 'ออมทรัพย์' | 'ออมทรัพย์พิเศษ';

export type TransactionType = 'deposit' | 'withdraw';

export type TransactionStatus = 'completed' | 'pending' | 'rejected';

export interface LineNotificationSettings {
  enableLinePush: boolean;
  notifyOnDeposit: boolean;
  notifyOnWithdraw: boolean;
  notifyOnInterest: boolean;
  minimumAmount: number;
  lineUserId?: string;
  updatedAt?: string;
}

export interface Member {
  memberId: string; // 5 digits e.g. "00128"
  citizenId: string; // 13 digits e.g. "1100200345678"
  fullName: string;
  contact: string;
  phone: string;
  lineUserId?: string;
  avatarUrl?: string;
  registeredDate: string;
  notificationSettings?: LineNotificationSettings;
}

export interface BankAccount {
  id: string;
  no: number;
  accountNo: string; // e.g. "15-00003-0"
  memberId: string;
  citizenId: string;
  accountName: string;
  accountType: AccountType;
  balance: number;
  accruedInterest: number;
  contact: string;
  interestRate: number; // e.g. 1.75
  lastUpdated: string;
}

export interface DigitalSignature {
  dataUrl: string; // base64 png ('' when stored remotely; use fileId)
  fileId?: string; // private Drive file id
  signedAt: string;
  signerName: string;
  signerRole: 'owner' | 'recipient';
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 preview ('' when stored remotely; use fileId)
  fileId?: string; // private Drive file id
  uploadedAt: string;
}

export interface SlipVerificationResult {
  verified: boolean;
  bankName?: string;
  transRef?: string;
  amount?: number;
  dateTime?: string;
  senderName?: string;
  receiverName?: string;
  receiverAccount?: string;
  confidenceScore?: number;
  message?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: 'superadmin' | 'teller' | 'auditor';
  avatarUrl?: string;
  email: string;
  department: string;
  lastLogin?: string;
}

export interface TransactionRecord {
  id: string;
  refCode: string; // e.g. "TXN-20261003-001"
  type: TransactionType;
  accountNo: string;
  accountName: string;
  accountType: AccountType;
  memberId: string;
  citizenId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  dateTime: string;
  status: TransactionStatus;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  
  // Specific to withdrawal
  destinationBank?: string;
  destinationAccountNo?: string;
  destinationAccountName?: string;
  fee?: number;
  feeRate?: number;
  totalDeduction?: number;
  monthlyWithdrawalCount?: number;
  ownerSignature?: DigitalSignature;
  recipientSignature?: DigitalSignature;
  attachments?: {
    idCard?: AttachedFile;
    sourcePassbook?: AttachedFile;
    destinationPassbook?: AttachedFile;
  };

  // Specific to deposit
  slipImage?: AttachedFile;
  slipVerification?: SlipVerificationResult;
  depositDateTime?: string;

  note?: string;
  createdAt: string;
}

export interface LiffUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface ApiConfig {
  webAppUrl: string;
}

export interface SystemSettings {
  // 1. Organization info
  cooperativeName: string;
  registrationNumber: string;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string;
  logoUrl: string;

  // 2. Financial policies
  regularInterestRate: number; // e.g. 1.75
  specialInterestRate: number; // e.g. 2.75
  minDepositAmount: number; // e.g. 100
  minWithdrawAmount: number; // e.g. 100
  maxDailyWithdrawAmount: number; // e.g. 100000
  minAccountBalance: number; // e.g. 500
  highValueApprovalThreshold: number; // e.g. 50000

  // 3. Operating hours & Maintenance
  isServiceActive24h: boolean;
  serviceStartTime: string; // "06:00"
  serviceEndTime: string; // "22:00"
  allowWeekendTransactions: boolean;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;

  // 4. LINE Integration
  liffId: string;
  lineOfficialId: string;
  enableGlobalLinePush: boolean;
  notifyStaffOnPendingTxn: boolean;

  // 5. Security & Verification
  requireDualSignatures: boolean;
  enableAiSlipVerification: boolean;
  adminSessionTimeoutMinutes: number;
}

export type LoanType =
  | 'สินเชื่อเพื่อสวัสดิการ'
  | 'สินเชื่อสามัญ'
  | 'สินเชื่อฉุกเฉิน'
  | 'สินเชื่อเคหะเพื่อที่อยู่อาศัย';

export type LoanStatus = 'active' | 'completed' | 'overdue' | 'pending_approval';

export interface LoanInstallment {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  totalAmount: number;
  paidAmount: number;
  paidDate?: string;
  status: 'paid' | 'pending' | 'overdue';
  txnRef?: string;
  receiptNo?: string;
}

export interface LoanContract {
  id: string;
  contractNo: string; // e.g. "LN-2569-0012"
  memberId: string;
  borrowerName: string;
  borrowerCitizenId: string;
  accountNo: string; // linked deposit account
  loanType: LoanType;
  principalAmount: number;
  interestRate: number; // % p.a.
  termMonths: number;
  monthlyInstallment: number;
  startDate: string;
  endDate: string;
  remainingBalance: number;
  totalPaidPrincipal: number;
  totalPaidInterest: number;
  paidInstallmentsCount: number;
  nextDueInstallmentNo: number;
  nextDueDate: string;
  status: LoanStatus;
  installments: LoanInstallment[];
  guarantorName?: string;
  purpose?: string;
  approvedBy?: string;
  approvedDate?: string;
}
