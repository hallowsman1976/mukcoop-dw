import React, { useMemo, useState } from 'react';
import { Member, BankAccount, TransactionRecord } from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime, formatThaiDate } from '../utils/validators';
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
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  Activity,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Bell,
  BellOff,
} from 'lucide-react';

interface DashboardProps {
  currentMember: Member;
  accounts: BankAccount[];
  transactions: TransactionRecord[];
  onNavigateTab: (tab: 'accounts' | 'deposit' | 'withdraw' | 'history' | 'notifications') => void;
  onQuickAction: (account: BankAccount, action: 'deposit' | 'withdraw') => void;
  onOpenFlexModal: (txn: TransactionRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentMember,
  accounts,
  transactions,
  onNavigateTab,
  onQuickAction,
  onOpenFlexModal,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'recent'>('recent');

  // Filter accounts belonging to current member
  const memberAccounts = useMemo(() => {
    return accounts.filter((a) => a.memberId === currentMember.memberId);
  }, [accounts, currentMember.memberId]);

  // Filter transactions belonging to current member
  const memberTransactions = useMemo(() => {
    return transactions.filter((t) => t.memberId === currentMember.memberId);
  }, [transactions, currentMember.memberId]);

  // Key KPI totals
  const totalBalance = useMemo(() => {
    return memberAccounts.reduce((sum, a) => sum + a.balance, 0);
  }, [memberAccounts]);

  const totalInterest = useMemo(() => {
    return memberAccounts.reduce((sum, a) => sum + a.accruedInterest, 0);
  }, [memberAccounts]);

  const totalDeposited = useMemo(() => {
    return memberTransactions
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [memberTransactions]);

  const totalWithdrawn = useMemo(() => {
    return memberTransactions
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [memberTransactions]);

  // Prepare Balance Progression Trend Data
  const trendData = useMemo(() => {
    // Sort transactions chronologically
    const sorted = [...memberTransactions].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    if (sorted.length === 0) {
      // Seed with initial account balance baseline
      return [
        {
          date: 'จุดเริ่มต้น',
          balance: totalBalance,
          deposit: 0,
          withdraw: 0,
        },
      ];
    }

    const dataPoints = sorted.map((t) => ({
      date: formatThaiDate(t.dateTime),
      balance: t.balanceAfter,
      deposit: t.type === 'deposit' ? t.amount : 0,
      withdraw: t.type === 'withdraw' ? t.amount : 0,
      ref: t.refCode,
    }));

    // If more points exist, return all or recent
    return dataPoints;
  }, [memberTransactions, totalBalance]);

  // Prepare Inflow vs Outflow comparison by Month/Period
  const flowData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; deposit: number; withdraw: number }> = {};

    memberTransactions.forEach((t) => {
      const date = new Date(t.dateTime);
      const monthKey = !isNaN(date.getTime())
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : 'ล่าสุด';
      const monthLabel = !isNaN(date.getTime())
        ? `${date.toLocaleDateString('th-TH', { month: 'short' })} ${date.getFullYear() + 543}`
        : 'ล่าสุด';

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthLabel,
          deposit: 0,
          withdraw: 0,
        };
      }

      if (t.type === 'deposit') {
        monthlyMap[monthKey].deposit += t.amount;
      } else {
        monthlyMap[monthKey].withdraw += t.amount;
      }
    });

    const result = Object.values(monthlyMap);
    if (result.length === 0) {
      return [
        {
          month: 'ต.ค. 2569',
          deposit: totalDeposited || 15000,
          withdraw: totalWithdrawn || 5000,
        },
      ];
    }
    return result;
  }, [memberTransactions, totalDeposited, totalWithdrawn]);

  // Asset allocation by account type or accounts
  const assetDistribution = useMemo(() => {
    const COLORS = ['#059669', '#0d9488', '#0284c7', '#6366f1', '#e11d48'];
    return memberAccounts.map((acc, index) => ({
      name: `${formatAccountNo(acc.accountNo)} (${acc.accountType})`,
      value: acc.balance,
      color: COLORS[index % COLORS.length],
      percentage: totalBalance > 0 ? ((acc.balance / totalBalance) * 100).toFixed(1) : '0',
    }));
  }, [memberAccounts, totalBalance]);

  // Recent 4 transactions
  const recentTransactions = memberTransactions.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero: total balance */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-7 shadow-xl shadow-emerald-900/20">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-teal-300/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {currentMember.avatarUrl ? (
              <img src={currentMember.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/40" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center font-bold">
                {currentMember.fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] text-emerald-100/90">สวัสดี</p>
              <h2 className="text-base sm:text-lg font-bold leading-tight truncate">{currentMember.fullName}</h2>
              <p className="text-[11px] text-emerald-100/80 font-mono">รหัสสมาชิก {currentMember.memberId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('notifications')}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm transition-colors cursor-pointer"
            title="จัดการการแจ้งเตือน LINE"
          >
            {currentMember.notificationSettings?.enableLinePush !== false ? (
              <><Bell className="w-3 h-3" /><span>LINE เปิด</span></>
            ) : (
              <><BellOff className="w-3 h-3" /><span>LINE ปิด</span></>
            )}
          </button>
        </div>

        <div className="relative z-10 mt-6">
          <p className="text-xs text-emerald-100/90 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> ยอดเงินฝากรวมทุกบัญชี ({memberAccounts.length} บัญชี)
          </p>
          <div className="mt-1 text-4xl sm:text-5xl font-bold font-mono tracking-tight">
            <span className="text-2xl sm:text-3xl text-emerald-200 mr-1">฿</span>{formatCurrency(totalBalance)}
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'ดอกเบี้ย', value: totalInterest, icon: TrendingUp, tone: 'text-amber-200' },
            { label: 'ฝากสะสม', value: totalDeposited, icon: ArrowDownLeft, tone: 'text-emerald-100' },
            { label: 'ถอนสะสม', value: totalWithdrawn, icon: ArrowUpRight, tone: 'text-rose-200' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm px-3 py-2.5 min-w-0">
              <div className={`flex items-center gap-1 text-[10px] sm:text-[11px] ${tone}`}>
                <Icon className="w-3 h-3 shrink-0" /> <span className="truncate">{label}</span>
              </div>
              <div className="mt-0.5 text-[13px] sm:text-base font-bold font-mono whitespace-nowrap tracking-tight">฿{formatCurrency(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {([
          { tab: 'deposit', label: 'ฝากเงิน', icon: ArrowDownLeft, style: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
          { tab: 'withdraw', label: 'ถอนเงิน', icon: ArrowUpRight, style: 'bg-rose-50 text-rose-600 ring-rose-100' },
          { tab: 'history', label: 'ประวัติ', icon: Clock, style: 'bg-sky-50 text-sky-600 ring-sky-100' },
          { tab: 'accounts', label: 'บัญชี', icon: CreditCard, style: 'bg-amber-50 text-amber-600 ring-amber-100' },
        ] as const).map(({ tab, label, icon: Icon, style }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigateTab(tab)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
          >
            <span className={`w-12 h-12 rounded-2xl ring-1 flex items-center justify-center ${style}`}>
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-slate-700">{label}</span>
          </button>
        ))}
      </div>

      {/* Account cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900">บัญชีเงินฝากของคุณ</h3>
          <button type="button" onClick={() => onNavigateTab('accounts')} className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer">
            ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 scrollbar-none">
          {memberAccounts.map((acc) => {
            const special = acc.accountType === 'ออมทรัพย์พิเศษ';
            return (
              <div
                key={acc.accountNo}
                className={`snap-start shrink-0 w-[78%] sm:w-80 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden ${
                  special
                    ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-900 shadow-slate-900/20'
                    : 'bg-gradient-to-br from-teal-500 to-emerald-700 shadow-emerald-900/20'
                }`}
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"></div>
                <div className="relative flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">{acc.accountType}</span>
                  <CreditCard className="w-4 h-4 opacity-70" />
                </div>
                <div className="relative mt-4 font-mono text-sm tracking-widest opacity-90">{formatAccountNo(acc.accountNo)}</div>
                <div className="relative mt-3 text-[10px] opacity-70">ยอดคงเหลือ</div>
                <div className="relative text-2xl font-bold font-mono">฿{formatCurrency(acc.balance)}</div>
                <div className="relative mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-amber-200">ดอกเบี้ย ฿{formatCurrency(acc.accruedInterest)}</span>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => onQuickAction(acc, 'deposit')} className="px-3 py-1 rounded-full bg-white text-emerald-700 text-[11px] font-bold active:scale-95 transition-transform cursor-pointer">ฝาก</button>
                    <button type="button" onClick={() => onQuickAction(acc, 'withdraw')} className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold active:scale-95 transition-all cursor-pointer">ถอน</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Feed */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              ธุรกรรมล่าสุด
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              รายการฝาก-ถอนล่าสุดที่บันทึกเข้าระบบ
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
          >
            <span>ดูทั้งหมด ({memberTransactions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((t) => {
              const isDeposit = t.type === 'deposit';
              return (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {isDeposit ? 'ฝากเงินเข้าบัญชี' : 'ถอนเงินออกจากบัญชี'}
                        </span>
                        <span className="hidden sm:inline text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          {t.refCode}
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
                        isDeposit ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isDeposit ? '+' : '-'}฿{formatCurrency(t.amount)}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      คงเหลือ: ฿{formatCurrency(t.balanceAfter)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            ยังไม่มีรายการธุรกรรมล่าสุด สามารถเริ่มทำรายการฝากหรือถอนเงินได้ทันที
          </div>
        )}
      </div>

      <h3 className="pt-2 px-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-emerald-600" /> สถิติและแนวโน้ม
      </h3>

      {/* Main Charts Section (Balance Trend & Inflow vs Outflow) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Total Balance Trend Over Time (Recharts AreaChart) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                แนวโน้มยอดเงินคงเหลือสะสม (Balance Progression Trend)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามการเปลี่ยนแปลงยอดเงินในบัญชีตามลำดับธุรกรรม
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ยอดปัจจุบัน ฿{formatCurrency(totalBalance)}
              </span>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `฿${formatCurrency(Number(value || 0))}`,
                    'ยอดคงเหลือสุทธิ',
                  ]}
                  labelFormatter={(label) => `วันที่: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  itemStyle={{ color: '#34d399', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#balanceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ข้อมูลซิงค์ตรงกับตารางบัญชีและสมุดแยกประเภท</span>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
            >
              ดูรายละเอียดประวัติทั้งหมด <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Chart 2: Asset Allocation Donut Chart (Recharts PieChart) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-teal-600" />
                สัดส่วนเงินฝากตามบัญชี
              </h3>
              <span className="text-[11px] text-slate-400">{memberAccounts.length} บัญชี</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">การจัดสรรเงินออมและบัญชีพิเศษ</p>

            {/* Donut Chart */}
            <div className="w-full h-44 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {assetDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [
                      `฿${formatCurrency(Number(val || 0))}`,
                      'ยอดเงิน',
                    ]}
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

          {/* Account Breakdown Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {assetDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-slate-700 truncate font-medium text-[11px]">
                    {item.name}
                  </span>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <span className="font-semibold text-slate-900">฿{formatCurrency(item.value)}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('accounts')}
            className="w-full mt-2 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
          >
            จัดการตารางบัญชีเงินฝาก
          </button>
        </div>
      </div>

      {/* Second Row: Monthly Flow Comparison + User's Accounts Quick Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Flow Chart (Deposit vs Withdraw BarChart) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                เปรียบเทียบยอดเงินฝาก vs ถอน (Inflow & Outflow Comparison)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบยอดการฝากเงิน (สีเขียว) และการถอนเงิน (สีแดง)
              </p>
            </div>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={flowData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `฿${formatCurrency(Number(val || 0))}`,
                    name === 'deposit' ? 'ยอดฝาก' : 'ยอดถอน',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'deposit' ? 'ยอดเงินฝาก (Deposit)' : 'ยอดเงินถอน (Withdraw)'
                  }
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                <Bar dataKey="deposit" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="withdraw" fill="#e11d48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
