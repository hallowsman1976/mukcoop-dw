import React, { useMemo, useState } from 'react';
import {
  AdminUser,
  BankAccount,
  Member,
  TransactionRecord,
  TransactionStatus,
  AccountType,
} from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import {
  formatAccountNo,
  accountPrefixFor,
  formatCitizenId,
  formatThaiDateTime,
  formatThaiDate,
  padMemberId,
  isValidCitizenId,
} from '../utils/validators';
import { StorageService } from '../services/storageService';
import { RemoteImg } from './RemoteImg';
import { downloadImportTemplateCsv } from '../utils/importTemplate';
import { MemberUploadForm } from './MemberUploadForm';
import { TransactionExportModal } from './TransactionExportModal';
import { SystemSettingsForm } from './SystemSettingsForm';
import { LoansView } from './LoansView';
import { OfficialWithdrawalSlipModal } from './OfficialWithdrawalSlipModal';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  Download,
  PlusCircle,
  Clock,
  Sparkles,
  Building2,
  LogOut,
  RefreshCw,
  MessageSquare,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Upload,
  Settings,
  Coins,
  Printer,
} from 'lucide-react';

interface AdminDashboardProps {
  currentAdmin: AdminUser;
  accounts: BankAccount[];
  transactions: TransactionRecord[];
  members: Member[];
  onRefreshData: () => void;
  onLogoutAdmin: () => void;
  onSwitchToMemberView: () => void;
  onOpenFlexModal: (txn: TransactionRecord) => void;
  onOpenGasModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdmin,
  accounts,
  transactions,
  members,
  onRefreshData,
  onLogoutAdmin,
  onSwitchToMemberView,
  onOpenFlexModal,
  onOpenGasModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'approvals' | 'accounts' | 'members' | 'loans' | 'import' | 'settings'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Transaction Inspection Modal
  const [inspectingTxn, setInspectingTxn] = useState<TransactionRecord | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);

  // New Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showUploadMembersModal, setShowUploadMembersModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [printingWithdrawSlipTxn, setPrintingWithdrawSlipTxn] = useState<TransactionRecord | null>(null);
  const [newMemberId, setNewMemberId] = useState<string>('');
  const [newCitizenId, setNewCitizenId] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // New Account Modal
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [selectedMemberForAccount, setSelectedMemberForAccount] = useState<string>(members[0]?.memberId || '');
  const [newAccountType, setNewAccountType] = useState<AccountType>('ออมทรัพย์');
  const [newInitialDeposit, setNewInitialDeposit] = useState<string>('500');

  // Computed Org Financial Statistics
  const totalAssets = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  const totalAccruedInterest = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.accruedInterest, 0);
  }, [accounts]);

  const totalDepositsVolume = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalWithdrawalsVolume = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const pendingCount = useMemo(() => {
    return transactions.filter((t) => t.status === 'pending').length;
  }, [transactions]);

  // Chart 1: System Cash Flow Trend
  const systemTrendData = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    if (sorted.length === 0) {
      return [{ date: 'ปัจจุบัน', liquidity: totalAssets, amount: 0, type: 'ฝาก' }];
    }

    return sorted.map((t) => ({
      date: formatThaiDate(t.dateTime),
      liquidity: t.balanceAfter,
      amount: t.amount,
      type: t.type === 'deposit' ? 'ฝาก' : 'ถอน',
    }));
  }, [transactions, totalAssets]);

  // Chart 2: Flow comparison
  const monthlyFlowData = useMemo(() => {
    const map: Record<string, { month: string; deposit: number; withdraw: number }> = {};

    transactions.forEach((t) => {
      const date = new Date(t.dateTime);
      const key = !isNaN(date.getTime())
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : 'ล่าสุด';
      const label = !isNaN(date.getTime())
        ? `${date.toLocaleDateString('th-TH', { month: 'short' })} ${date.getFullYear() + 543}`
        : 'ล่าสุด';

      if (!map[key]) {
        map[key] = { month: label, deposit: 0, withdraw: 0 };
      }

      if (t.type === 'deposit') {
        map[key].deposit += t.amount;
      } else {
        map[key].withdraw += t.amount;
      }
    });

    const list = Object.values(map);
    return list.length > 0 ? list : [{ month: 'ต.ค. 2569', deposit: 15000, withdraw: 5000 }];
  }, [transactions]);

  // Chart 3: Account Type distribution
  const accountTypeStats = useMemo(() => {
    let regularSavings = 0;
    let specialSavings = 0;

    accounts.forEach((a) => {
      if (a.accountType === 'ออมทรัพย์พิเศษ') {
        specialSavings += a.balance;
      } else {
        regularSavings += a.balance;
      }
    });

    return [
      { name: 'ออมทรัพย์ทั่วไป (1.75%)', value: regularSavings, color: '#059669' },
      { name: 'ออมทรัพย์พิเศษ (2.75%)', value: specialSavings, color: '#0284c7' },
    ];
  }, [accounts]);

  // Filtered transactions for the audit center
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSearch =
        t.refCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.accountNo.includes(searchTerm) ||
        t.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.memberId.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [transactions, statusFilter, searchTerm]);

  // Handle Approve Transaction
  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.memberId.includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      (m.contact || '').includes(q) ||
      (m.phone || '').includes(q)
    );
  });

  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  const handleApproveTxn = async (txn: TransactionRecord) => {
    setAdminActionError(null);
    const r = await StorageService.reviewTransaction(txn.id, 'completed', 'อนุมัติรายการโดยเจ้าหน้าที่ผู้มีอำนาจ');
    if (!r.success) {
      setAdminActionError(r.error || 'อนุมัติไม่สำเร็จ');
      return;
    }
    onRefreshData();
    setInspectingTxn(null);
  };

  // Handle Reject Transaction
  const handleRejectTxn = async (txn: TransactionRecord) => {
    if (!rejectReasonInput.trim()) return;
    setAdminActionError(null);
    const r = await StorageService.reviewTransaction(txn.id, 'rejected', rejectReasonInput.trim());
    if (!r.success) {
      setAdminActionError(r.error || 'ปฏิเสธรายการไม่สำเร็จ');
      return;
    }
    onRefreshData();
    setShowRejectBox(false);
    setRejectReasonInput('');
    setInspectingTxn(null);
  };

  // Handle Create Member (+ first account). The server validates and writes the sheet.
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError(null);

    const padded = padMemberId(newMemberId);
    const cleanedCitizen = newCitizenId.replace(/\D/g, '');

    if (padded.length !== 5) {
      setAddMemberError('รหัสสมาชิกต้องมี 5 หลัก');
      return;
    }
    if (!isValidCitizenId(cleanedCitizen)) {
      setAddMemberError('เลขบัตรประชาชน 13 หลักไม่ถูกต้อง');
      return;
    }

    try {
      const r = await StorageService.importMembers(
        [
          {
            memberId: padded,
            citizenId: cleanedCitizen,
            fullName: newFullName.trim() || 'สมาชิกใหม่',
            accountName: newFullName.trim() || 'สมาชิกใหม่',
            accountNo: nextAccountNo('ออมทรัพย์'),
            accountType: 'ออมทรัพย์',
            balance: 0,
            contact: newPhone,
          },
        ],
        false
      );
      if (r.errors.length) {
        setAddMemberError(r.errors.join(' / '));
        return;
      }
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : 'เพิ่มสมาชิกไม่สำเร็จ');
      return;
    }

    onRefreshData();
    setShowAddMemberModal(false);
    setNewMemberId('');
    setNewCitizenId('');
    setNewFullName('');
    setNewPhone('');
  };

  // Next free account number for a product: NN-NNNNN-0 with the running number after the highest in use.
  const nextAccountNo = (type: string): string => {
    const prefix = accountPrefixFor(type);
    const used = accounts
      .map((a) => a.accountNo.replace(/\D/g, ''))
      .filter((d) => d.length === 8 && d.startsWith(prefix))
      .map((d) => parseInt(d.slice(2, 7), 10));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    return `${prefix}-${String(next).padStart(5, '0')}-0`;
  };

  // Handle Create Account (superadmin only on the server: an opening balance is set like a CSV import)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMember = members.find((m) => m.memberId === selectedMemberForAccount);
    if (!targetMember) return;

    const accNo = nextAccountNo(newAccountType);

    try {
      const r = await StorageService.importMembers(
        [
          {
            memberId: targetMember.memberId,
            citizenId: targetMember.citizenId,
            fullName: targetMember.fullName,
            accountName: `${targetMember.fullName} (${newAccountType})`,
            accountNo: accNo,
            accountType: newAccountType,
            balance: Math.max(0, parseFloat(newInitialDeposit) || 0),
            contact: targetMember.contact,
          },
        ],
        false
      );
      if (r.errors.length) {
        setAdminActionError(r.errors.join(' / '));
        return;
      }
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : 'เปิดบัญชีไม่สำเร็จ');
      return;
    }
    onRefreshData();
    setShowAddAccountModal(false);
  };

  // Export CSV Report
  const handleExportCsv = () => {
    const headers = [
      'ลำดับ',
      'รหัสอ้างอิง',
      'วันเวลา',
      'ประเภท',
      'หมายเลขบัญชี',
      'รหัสสมาชิก',
      'ชื่อบัญชี',
      'จำนวนเงิน',
      'ยอดคงเหลือสุทธิ',
      'สถานะ',
    ];
    const rows = transactions.map((t, idx) => [
      idx + 1,
      t.refCode,
      t.dateTime,
      t.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน',
      t.accountNo,
      t.memberId,
      `"${t.accountName}"`,
      t.amount,
      t.balanceAfter,
      t.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cooperative_Ledger_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {adminActionError && (
        <div className="flex items-start justify-between gap-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
          <span>{adminActionError}</span>
          <button type="button" onClick={() => setAdminActionError(null)} className="font-semibold hover:underline">
            ปิด
          </button>
        </div>
      )}
      {/* Admin header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-5 sm:p-6 shadow-xl shadow-indigo-950/20">
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {currentAdmin.avatarUrl ? (
              <img
                src={currentAdmin.avatarUrl}
                alt={currentAdmin.fullName}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/30 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/20 ring-2 ring-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                {currentAdmin.fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold truncate">{currentAdmin.fullName}</span>
                <span className="text-[10px] bg-white/15 border border-white/20 font-semibold px-2 py-0.5 rounded-full">
                  {currentAdmin.role === 'superadmin' ? 'Super Admin' : 'เจ้าหน้าที่การเงิน'}
                </span>
              </div>
              <p className="text-xs text-indigo-100/80 mt-0.5 truncate">
                {currentAdmin.department} • เข้าสู่ระบบเมื่อ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGasModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
              title="ซิงค์ Google Sheets / Apps Script"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToMemberView}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>พอร์ทัลสมาชิก</span>
            </button>
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-xs font-medium border border-white/15 transition-colors cursor-pointer"
              title="ออกจากระบบเจ้าหน้าที่"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <div className="sticky top-[65px] z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 bg-slate-50/90 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          {([
            { id: 'overview', label: 'ภาพรวม', icon: LayoutDashboard, badge: 0 },
            { id: 'approvals', label: 'อนุมัติธุรกรรม', icon: FileCheck2, badge: pendingCount },
            { id: 'accounts', label: `บัญชี (${accounts.length})`, icon: Wallet, badge: 0 },
            { id: 'members', label: `สมาชิก (${members.length})`, icon: Users, badge: 0 },
            { id: 'loans', label: 'สินเชื่อ', icon: Coins, badge: 0 },
            { id: 'import', label: 'นำเข้า CSV', icon: Upload, badge: 0 },
            { id: 'settings', label: 'ตั้งค่า', icon: Settings, badge: 0 },
          ] as const).map(({ id, label, icon: Icon, badge }) => {
            const active = activeSubTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSubTab(id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 rounded-full ${
                      active ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: Overview and Analytics */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            <div className="lg:col-span-1 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 shadow-xl shadow-emerald-900/15">
              <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
              <div className="relative flex items-center gap-2 text-xs text-emerald-100">
                <Wallet className="w-4 h-4" /> สินทรัพย์สภาพคล่องรวมสหกรณ์
              </div>
              <div className="relative mt-2 text-3xl sm:text-4xl font-bold font-mono tracking-tight">
                <span className="text-xl text-emerald-200 mr-1">฿</span>
                {formatCurrency(totalAssets)}
              </div>
              <p className="relative mt-2 text-[11px] text-emerald-100/90">
                ครอบคลุม {accounts.length} บัญชี จากสมาชิก {members.length} ราย
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                {
                  label: 'ดอกเบี้ยสะสมรอจ่าย',
                  value: totalAccruedInterest,
                  note: 'ยอดสะสมจากทุกบัญชีเงินฝาก',
                  icon: TrendingUp,
                  tone: 'text-amber-600',
                  chip: 'bg-amber-50 text-amber-600',
                },
                {
                  label: 'ยอดเงินฝากรวมทั้งระบบ',
                  value: totalDepositsVolume,
                  note: 'เงินไหลเข้าจากสมาชิกผ่านระบบ LINE LIFF',
                  icon: ArrowDownLeft,
                  tone: 'text-emerald-600',
                  chip: 'bg-emerald-50 text-emerald-600',
                },
                {
                  label: 'ยอดเงินถอนรวมทั้งระบบ',
                  value: totalWithdrawalsVolume,
                  note: 'การถอนเงินที่ได้รับการรับรองและมีลายเซ็น',
                  icon: ArrowUpRight,
                  tone: 'text-rose-600',
                  chip: 'bg-rose-50 text-rose-600',
                },
              ].map(({ label, value, note, icon: Icon, tone, chip }) => (
                <div
                  key={label}
                  className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">{label}</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${chip}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`text-xl font-bold font-mono tracking-tight ${tone}`}>฿{formatCurrency(value)}</div>
                  <p className="text-[11px] text-slate-400 mt-1">{note}</p>
                </div>
              ))}
            </div>
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveSubTab('approvals')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100/70 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-amber-900">
                <Clock className="w-5 h-5 text-amber-600" />
                มี {pendingCount} รายการรอการตรวจสอบและอนุมัติ
              </span>
              <span className="text-xs font-semibold text-amber-700">ไปที่ศูนย์อนุมัติ →</span>
            </button>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 1: System Cash Flow / Liquidity Trend */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    กราฟแนวโน้มสภาพคล่องและเงินทุนหมุนเวียนสหกรณ์
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ประเมินเสถียรภาพทางการเงินของกองทุนจากธุรกรรมฝาก-ถอน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                  title="เปิดศูนย์ส่งออกรายงานสรุปยอดรายเดือน/รายไตรมาส (Excel & CSV)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ส่งออกรายงานสรุปยอด (Excel / CSV)</span>
                </button>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={systemTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminLiquidityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`฿${formatCurrency(Number(val || 0))}`, 'ยอดเงินคงเหลือ']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="liquidity"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#adminLiquidityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Account Distribution */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">สัดส่วนเงินฝากตามประเภทบัญชี</h3>
                <p className="text-xs text-slate-500 mt-0.5">แบ่งตามออมทรัพย์ทั่วไปและออมทรัพย์พิเศษ</p>

                <div className="w-full h-44 my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={accountTypeStats} innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                        {accountTypeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`฿${formatCurrency(Number(val || 0))}`, 'ยอดรวม']}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {accountTypeStats.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-700 font-medium text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">฿{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Transactions Preview */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">ธุรกรรมล่าสุดรอการตรวจสอบและประวัติการทำงาน</h3>
                <p className="text-xs text-slate-500">คลิกที่แถวเพื่อเปิดดูสลิป ลายเซ็น และเอกสารแนบ</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('approvals')}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                ดูทั้งหมดในศูนย์ตรวจสอบ →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => setInspectingTxn(t)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-2xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        t.type === 'deposit'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {t.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{t.accountName}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          {t.refCode}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            t.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {t.status === 'completed' ? 'อนุมัติแล้ว' : t.status === 'pending' ? 'รอตรวจสอบ' : 'ปฏิเสธ'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {formatThaiDateTime(t.dateTime)} • บัญชี {formatAccountNo(t.accountNo)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold font-mono ${
                        t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'deposit' ? '+' : '-'}฿{formatCurrency(t.amount)}
                    </span>
                    <p className="text-[10px] text-indigo-600 font-medium">ตรวจทานรายละเอียด →</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Approvals and Audit Center */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                  ศูนย์ตรวจสอบและอนุมัติธุรกรรม (Transaction Review Center)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตรวจสอบสลิปเงินโอน ตรวจสอบลายมือชื่อ 2 จุด และอนุมัติการถอนเงิน
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 overflow-x-auto">
                  {([
                    { id: 'all', label: 'ทั้งหมด', n: transactions.length, on: 'bg-slate-900 text-white' },
                    { id: 'pending', label: 'รอตรวจสอบ', n: transactions.filter((t) => t.status === 'pending').length, on: 'bg-amber-500 text-white' },
                    { id: 'completed', label: 'อนุมัติแล้ว', n: transactions.filter((t) => t.status === 'completed').length, on: 'bg-emerald-600 text-white' },
                    { id: 'rejected', label: 'ปฏิเสธ', n: transactions.filter((t) => t.status === 'rejected').length, on: 'bg-rose-600 text-white' },
                  ] as const).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        statusFilter === f.id ? `${f.on} shadow-sm` : 'text-slate-600 hover:bg-white/70'
                      }`}
                    >
                      {f.label} <span className="opacity-70 font-mono">({f.n})</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  title="ส่งออกรายงานธุรกรรมเป็น Excel / CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ส่งออกรายงาน</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาด้วยรหัสธุรกรรม, เลขบัญชี, หรือชื่อสมาชิก..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
                  const isDeposit = t.type === 'deposit';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInspectingTxn(t)}
                      className="w-full text-left rounded-2xl border border-slate-200 p-3.5 bg-white active:bg-slate-50 space-y-2 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isDeposit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isDeposit ? 'ฝากเงิน' : 'ถอนเงิน'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {t.status === 'completed' ? 'อนุมัติแล้ว' : t.status === 'pending' ? 'รอตรวจสอบ' : 'ปฏิเสธ'}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{t.accountName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatAccountNo(t.accountNo)} • {t.refCode}
                          </div>
                          <div className="text-[11px] text-slate-400">{formatThaiDateTime(t.dateTime)}</div>
                        </div>
                        <div
                          className={`text-base font-bold font-mono shrink-0 ${
                            isDeposit ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          ฿{formatCurrency(t.amount)}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">ไม่พบรายการธุรกรรมตามเงื่อนไขที่กำหนด</div>
              )}
            </div>

            {/* Transactions Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-3">รหัสอ้างอิง</th>
                    <th className="py-3 px-3">ประเภท</th>
                    <th className="py-3 px-3">สมาชิก</th>
                    <th className="py-3 px-3">หมายเลขบัญชี</th>
                    <th className="py-3 px-3 text-right">จำนวนเงิน</th>
                    <th className="py-3 px-3">หลักฐานแนบ</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                    <th className="py-3 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => {
                      const isDeposit = t.type === 'deposit';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">
                            {t.refCode}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isDeposit
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isDeposit ? 'ฝากเงิน' : 'ถอนเงิน'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{t.accountName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              รหัสสมาชิก: {t.memberId}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            {formatAccountNo(t.accountNo)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            ฿{formatCurrency(t.amount)}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500">
                            {isDeposit ? (
                              t.slipImage ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> มีสลิปแนบ
                                </span>
                              ) : (
                                'ไม่มีสลิป'
                              )
                            ) : t.ownerSignature ? (
                              <span className="text-indigo-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> ลายเซ็น 2 จุด
                              </span>
                            ) : (
                              'ยังไม่เซ็น'
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                t.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : t.status === 'pending'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {t.status === 'completed'
                                ? 'อนุมัติแล้ว'
                                : t.status === 'pending'
                                ? 'รอตรวจสอบ'
                                : 'ปฏิเสธ'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {t.type === 'withdraw' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintingWithdrawSlipTxn(t);
                                  }}
                                  className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="พิมพ์ใบถอนเงินออนไลน์ตามแบบฟอร์มทางการ"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setInspectingTxn(t)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs transition-colors cursor-pointer"
                              >
                                ตรวจสอบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        ไม่พบรายการธุรกรรมตามเงื่อนไขที่กำหนด
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Accounts Management */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  บัญชีเงินฝากสหกรณ์ทั้งหมด ({accounts.length} บัญชี)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตรวจสอบยอดคงเหลือ ดอกเบี้ยสะสม ข้อมูลติดต่อ และเปิดบัญชีเงินฝากเล่มใหม่ให้สมาชิก
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadImportTemplateCsv('import_template.csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  title="ดาวน์โหลดไฟล์ import_template.csv สำหรับนำเข้าข้อมูลเริ่มต้น"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ดาวน์โหลด import_template</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('import')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="ไปยังหน้าจออัปโหลดและนำเข้าข้อมูล CSV"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>นำเข้าไฟล์ CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>เปิดบัญชีเงินฝากใหม่</span>
                </button>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5">
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-2xl border border-slate-200 p-3.5 bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{formatAccountNo(acc.accountNo)}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        acc.accountType === 'ออมทรัพย์พิเศษ' ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {acc.accountType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {acc.accountName} • รหัส <span className="font-mono">{acc.memberId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-emerald-50/70 px-3 py-2">
                      <div className="text-[10px] text-emerald-700">ยอดคงเหลือ</div>
                      <div className="font-mono font-bold text-emerald-700 text-sm">฿{formatCurrency(acc.balance)}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50/70 px-3 py-2">
                      <div className="text-[10px] text-amber-700">ดอกเบี้ยสะสม</div>
                      <div className="font-mono font-bold text-amber-700 text-sm">฿{formatCurrency(acc.accruedInterest)}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {formatCitizenId(acc.citizenId, true)} • {acc.contact || '-'}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 whitespace-nowrap">
                    <th className="py-3 px-3 text-center w-12">1. ลำดับ</th>
                    <th className="py-3 px-3 min-w-[130px]">2. หมายเลขบัญชี</th>
                    <th className="py-3 px-3 min-w-[90px]">3. รหัสสมาชิก</th>
                    <th className="py-3 px-3 min-w-[140px]">4. เลขบัตรประชาชน</th>
                    <th className="py-3 px-3 min-w-[160px]">5. ชื่อบัญชีเงินฝาก</th>
                    <th className="py-3 px-3 min-w-[120px]">6. ข้อมูลติดต่อล่าสุด</th>
                    <th className="py-3 px-3 text-right min-w-[110px]">7. ยอดคงเหลือ</th>
                    <th className="py-3 px-3 text-right min-w-[110px]">8. ดอกเบี้ยสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {accounts.map((acc, i) => (
                    <tr key={acc.id} className="hover:bg-slate-50/70">
                      {/* 1. ลำดับ */}
                      <td className="py-3 px-3 font-mono text-slate-400 text-center">{acc.no || i + 1}</td>

                      {/* 2. หมายเลขบัญชี */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{formatAccountNo(acc.accountNo)}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              acc.accountType === 'ออมทรัพย์พิเศษ'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {acc.accountType}
                          </span>
                        </div>
                      </td>

                      {/* 3. รหัสสมาชิก */}
                      <td className="py-3 px-3 font-mono text-emerald-700 font-medium whitespace-nowrap">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {acc.memberId}
                        </span>
                      </td>

                      {/* 4. เลขบัตรประชาชน */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatCitizenId(acc.citizenId, true)}
                      </td>

                      {/* 5. ชื่อบัญชีเงินฝาก */}
                      <td className="py-3 px-3 font-medium text-slate-800 min-w-[160px]">{acc.accountName}</td>

                      {/* 6. ข้อมูลติดต่อล่าสุด */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{acc.contact || '-'}</td>

                      {/* 7. ยอดคงเหลือ */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        ฿{formatCurrency(acc.balance)}
                      </td>

                      {/* 8. ดอกเบี้ยสะสม */}
                      <td className="py-3 px-3 text-right font-mono text-amber-600 font-medium whitespace-nowrap">
                        ฿{formatCurrency(acc.accruedInterest)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Members Management */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  รายชื่อสมาชิกสหกรณ์ทั้งหมด ({members.length} ราย)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ทะเบียนสมาชิก รหัสสมาชิก 5 หลัก และข้อมูลติดต่อ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadMembersModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>อัปโหลดไฟล์สมาชิก (CSV / Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>ลงทะเบียนสมาชิกใหม่</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาด้วยรหัสสมาชิก ชื่อ หรือเบอร์ติดต่อ"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMembers.map((m) => {
                const owned = accounts.filter((a) => a.memberId === m.memberId);
                const total = owned.reduce((s, a) => s + a.balance, 0);
                return (
                  <div
                    key={m.memberId}
                    className="p-4 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all bg-white space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.fullName}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-lg font-bold">
                          {m.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{m.fullName}</h4>
                        <p className="text-[11px] font-mono text-slate-500">{formatCitizenId(m.citizenId, true)}</p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shrink-0">
                        {m.memberId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-emerald-50/70 px-3 py-2">
                        <div className="text-[10px] text-emerald-700">{owned.length} บัญชี</div>
                        <div className="font-mono font-bold text-emerald-700 text-sm">฿{formatCurrency(total)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] text-slate-500">สถานะ LINE</div>
                        <div
                          className={`text-xs font-semibold ${
                            m.lineUserId || (m as Member & { lineLinked?: boolean }).lineLinked
                              ? 'text-[#05963f]'
                              : 'text-slate-400'
                          }`}
                        >
                          {m.lineUserId || (m as Member & { lineLinked?: boolean }).lineLinked ? 'ผูกแล้ว' : 'ยังไม่ผูก'}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>ติดต่อ: {m.contact || '-'}</span>
                      <span>สมาชิกตั้งแต่ {m.registeredDate}</span>
                    </div>
                  </div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 py-10 text-center text-sm text-slate-400">
                  ไม่พบสมาชิกที่ตรงกับคำค้นหา
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: Loans Management View */}
      {activeSubTab === 'loans' && (
        <div className="animate-in fade-in duration-150">
          <LoansView
            currentMember={null}
            accounts={accounts}
            transactions={transactions}
            onRefreshData={onRefreshData}
            onOpenFlexModal={onOpenFlexModal}
          />
        </div>
      )}

      {/* SUBTAB 6: Dedicated Bulk CSV Import View */}
      {activeSubTab === 'import' && (
        <div className="animate-in fade-in duration-150">
          <MemberUploadForm
            existingMembers={members}
            existingAccounts={accounts}
            onUploadSuccess={(importedMembers, importedAccounts) => {
              onRefreshData();
              setActiveSubTab('members');
            }}
            onCancel={() => setActiveSubTab('members')}
          />
        </div>
      )}

      {/* SUBTAB 7: System Settings & Policy Configuration */}
      {activeSubTab === 'settings' && (
        <div className="animate-in fade-in duration-150">
          <SystemSettingsForm onSettingsSaved={() => onRefreshData()} />
        </div>
      )}

      {/* Transaction Inspection & Approval Modal */}
      {inspectingTxn && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
          onClick={() => setInspectingTxn(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl sm:my-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  ตรวจสอบและอนุมัติธุรกรรม #{inspectingTxn.refCode}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingTxn(null)}
                className="p-1 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Summary Card */}
              <div className={`p-4 rounded-2xl text-white ${inspectingTxn.type === 'deposit' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                <div className="flex justify-between items-center text-xs opacity-90">
                  <span>{inspectingTxn.type === 'deposit' ? 'รายการเงินฝากเข้า' : 'รายการคำขอถอนเงินโอนออก'}</span>
                  <span className="font-mono">{inspectingTxn.refCode}</span>
                </div>
                <div className="text-2xl font-bold font-mono mt-1">
                  ฿{formatCurrency(inspectingTxn.amount)}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">{thaiBahtText(inspectingTxn.amount)}</div>
              </div>

              {/* Data Rows */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">ชื่อเจ้าของบัญชี:</span>
                  <span className="font-bold text-slate-800">{inspectingTxn.accountName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">หมายเลขบัญชี:</span>
                  <span className="font-mono text-slate-800 font-semibold">{formatAccountNo(inspectingTxn.accountNo)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">รหัสสมาชิก:</span>
                  <span className="font-mono text-emerald-700 font-bold">{inspectingTxn.memberId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ยอดคงเหลือสุทธิ:</span>
                  <span className="font-mono text-emerald-700 font-bold">฿{formatCurrency(inspectingTxn.balanceAfter)}</span>
                </div>
              </div>

              {/* Deposit Slip Inspection */}
              {inspectingTxn.slipImage && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                    <span>หลักฐานสลิปเงินโอน</span>
                    {inspectingTxn.slipVerification?.verified && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                        API ตรวจสอบแล้วถูกต้อง
                      </span>
                    )}
                  </h5>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 p-2 text-center">
                    <RemoteImg
                      src={inspectingTxn.slipImage.dataUrl} fileId={inspectingTxn.slipImage.fileId}
                      alt="สลิปเงินโอน"
                      className="max-h-60 mx-auto object-contain rounded"
                    />
                  </div>
                </div>
              )}

              {/* Withdrawal Signatures & 3 Attachments Inspection */}
              {inspectingTxn.type === 'withdraw' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h5 className="font-bold text-slate-800 text-xs">ลายเซ็นอิเล็กทรอนิกส์ 2 จุด</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">ลายเซ็นเจ้าของบัญชี</p>
                      {inspectingTxn.ownerSignature ? (
                        <RemoteImg
                          src={inspectingTxn.ownerSignature.dataUrl} fileId={inspectingTxn.ownerSignature.fileId}
                          alt="ลายเซ็นเจ้าของ"
                          className="h-12 mx-auto object-contain bg-white rounded p-1 border border-slate-200"
                        />
                      ) : (
                        <p className="text-rose-500 py-3">ยังไม่มีลายเซ็น</p>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">ลายเซ็นผู้รับเงิน</p>
                      {inspectingTxn.recipientSignature ? (
                        <RemoteImg
                          src={inspectingTxn.recipientSignature.dataUrl} fileId={inspectingTxn.recipientSignature.fileId}
                          alt="ลายเซ็นผู้รับ"
                          className="h-12 mx-auto object-contain bg-white rounded p-1 border border-slate-200"
                        />
                      ) : (
                        <p className="text-rose-500 py-3">ยังไม่มีลายเซ็น</p>
                      )}
                    </div>
                  </div>

                  {/* 3 Attachments */}
                  {inspectingTxn.attachments && (
                    <div className="space-y-1.5 pt-1">
                      <h5 className="font-semibold text-slate-700 text-xs">เอกสารแนบประกอบการถอน (3 รายการ)</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {inspectingTxn.attachments.idCard && (
                          <div className="border border-slate-200 rounded-2xl p-1 text-center bg-slate-50">
                            <span className="text-[10px] text-slate-500 block truncate">1. สำเนาบัตร</span>
                            <RemoteImg src={inspectingTxn.attachments.idCard.dataUrl} fileId={inspectingTxn.attachments.idCard.fileId} alt="บัตร" className="h-14 w-full object-cover rounded mt-1" />
                          </div>
                        )}
                        {inspectingTxn.attachments.sourcePassbook && (
                          <div className="border border-slate-200 rounded-2xl p-1 text-center bg-slate-50">
                            <span className="text-[10px] text-slate-500 block truncate">2. สมุดต้นทาง</span>
                            <RemoteImg src={inspectingTxn.attachments.sourcePassbook.dataUrl} fileId={inspectingTxn.attachments.sourcePassbook.fileId} alt="สมุด" className="h-14 w-full object-cover rounded mt-1" />
                          </div>
                        )}
                        {inspectingTxn.attachments.destinationPassbook && (
                          <div className="border border-slate-200 rounded-2xl p-1 text-center bg-slate-50">
                            <span className="text-[10px] text-slate-500 block truncate">3. สมุดปลายทาง</span>
                            <RemoteImg src={inspectingTxn.attachments.destinationPassbook.dataUrl} fileId={inspectingTxn.attachments.destinationPassbook.fileId} alt="สมุดปลายทาง" className="h-14 w-full object-cover rounded mt-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection input box */}
              {showRejectBox && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                  <label className="text-[11px] font-bold text-rose-900 block">
                    ระบุเหตุผลในการปฏิเสธรายการ:
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น สลิปไม่ชัดเจน, ยอดเงินไม่ตรงกับบัญชี, ลายเซ็นไม่สมบูรณ์"
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-rose-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectTxn(inspectingTxn)}
                      className="px-3 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                    >
                      ยืนยันปฏิเสธรายการ
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const t = inspectingTxn;
                  setInspectingTxn(null);
                  setShowRejectBox(false);
                  onOpenFlexModal(t);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#06C755] bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>ดู LINE Flex Bubble</span>
              </button>

              <div className="flex items-center gap-2">
                {inspectingTxn.type === 'withdraw' && (
                  <button
                    type="button"
                    onClick={() => {
                      const t = inspectingTxn;
                      setInspectingTxn(null);
                      setShowRejectBox(false);
                      setPrintingWithdrawSlipTxn(t);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-colors cursor-pointer"
                    title="พิมพ์ใบถอนเงินออนไลน์ตามแบบฟอร์มทางการ"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>พิมพ์ใบถอนเงิน</span>
                  </button>
                )}

                {!showRejectBox && (
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(true)}
                    className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-semibold transition-colors"
                  >
                    ปฏิเสธรายการ
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApproveTxn(inspectingTxn)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>อนุมัติรายการ (Approve)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Member Modal */}
      {showAddMemberModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                ลงทะเบียนสมาชิกใหม่ในระบบสหกรณ์
              </h3>
              <button type="button" onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  รหัสสมาชิก (5 หลัก - ระบบเติม 0 อัตโนมัติ):
                </label>
                <input
                  type="text"
                  placeholder="เช่น 129 หรือ 00129"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  เลขประจำตัวประชาชน (13 หลัก):
                </label>
                <input
                  type="text"
                  placeholder="เช่น 1100200345670"
                  value={newCitizenId}
                  onChange={(e) => setNewCitizenId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ชื่อ-นามสกุลสมาชิก:</label>
                <input
                  type="text"
                  placeholder="เช่น นายเอกชัย เจริญยิ่ง"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">เบอร์โทรศัพท์ติดต่อ:</label>
                <input
                  type="tel"
                  placeholder="เช่น 089-999-8888"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {addMemberError && (
                <div className="p-2 bg-rose-50 text-rose-700 rounded-2xl text-xs">{addMemberError}</div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-2xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold shadow-xs"
                >
                  บันทึกข้อมูลสมาชิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Account Modal */}
      {showAddAccountModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowAddAccountModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                เปิดบัญชีเงินฝากเล่มใหม่ให้สมาชิก
              </h3>
              <button type="button" onClick={() => setShowAddAccountModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">เลือกสมาชิกเจ้าของบัญชี:</label>
                <select
                  value={selectedMemberForAccount}
                  onChange={(e) => setSelectedMemberForAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.fullName} (รหัส {m.memberId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ประเภทบัญชีเงินฝาก:</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ออมทรัพย์">ออมทรัพย์ทั่วไป (ดอกเบี้ย 1.75% ต่อปี)</option>
                  <option value="ออมทรัพย์พิเศษ">ออมทรัพย์พิเศษ (ดอกเบี้ย 2.75% ต่อปี)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ยอดเงินเปิดบัญชีเริ่มต้น (บาท):</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={newInitialDeposit}
                  onChange={(e) => setNewInitialDeposit(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-2xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold shadow-xs"
                >
                  สร้างบัญชีเงินฝาก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Member Upload Form Modal */}
      {showUploadMembersModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
          onClick={() => setShowUploadMembersModal(false)}
        >
          <div
            className="w-full max-w-4xl my-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <MemberUploadForm
              existingMembers={members}
              existingAccounts={accounts}
              onUploadSuccess={(importedMembers, importedAccounts) => {
                onRefreshData();
                setShowUploadMembersModal(false);
              }}
              onCancel={() => setShowUploadMembersModal(false)}
            />
          </div>
        </div>
      )}

      {/* Transaction Report Export Modal */}
      {showExportModal && (
        <TransactionExportModal
          transactions={transactions}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Official Withdrawal Slip Printable Modal */}
      {printingWithdrawSlipTxn && (
        <OfficialWithdrawalSlipModal
          transaction={printingWithdrawSlipTxn}
          onClose={() => setPrintingWithdrawSlipTxn(null)}
        />
      )}
    </div>
  );
};
