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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> แดชบอร์ดสรุปสถานะการเงินส่วนบุคคล
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('notifications')}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                  currentMember.notificationSettings?.enableLinePush !== false
                    ? 'bg-[#06C755]/20 text-[#38ef7d] border-[#06C755]/40 hover:bg-[#06C755]/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="คลิกเพื่อจัดการการแจ้งเตือน LINE"
              >
                {currentMember.notificationSettings?.enableLinePush !== false ? (
                  <>
                    <Bell className="w-3 h-3" />
                    <span>แจ้งเตือน LINE: เปิด</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3 h-3" />
                    <span>แจ้งเตือน LINE: ปิด</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-400 font-mono">
                รหัสสมาชิก: <strong className="text-white">{currentMember.memberId}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              สวัสดีคุณ {currentMember.fullName}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              ภาพรวมสินทรัพย์เงินฝาก สถิติกระแสเงินสดฝาก-ถอน และแนวโน้มดอกเบี้ยสะสมสหกรณ์แบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('deposit')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-700/30 active:scale-95 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>ฝากเงิน</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('withdraw')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-700/30 active:scale-95 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>ถอนเงิน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Financial Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Balance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ยอดเงินคงเหลือรวมทุกบัญชี</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            ฿{formatCurrency(totalBalance)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">จาก {memberAccounts.length} บัญชีเงินฝาก</span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
              พร้อมทำรายการ
            </span>
          </div>
        </div>

        {/* 2. Total Accrued Interest */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ดอกเบี้ยสะสมทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono tracking-tight">
            ฿{formatCurrency(totalInterest)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">อัตราดอกเบี้ย 1.75 - 2.75%</span>
            <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
              ผลตอบแทนสูง
            </span>
          </div>
        </div>

        {/* 3. Total Deposited */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ยอดเงินฝากเข้าสะสม</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
            ฿{formatCurrency(totalDeposited)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {memberTransactions.filter((t) => t.type === 'deposit').length} รายการ
            </span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
              เงินไหลเข้า
            </span>
          </div>
        </div>

        {/* 4. Total Withdrawn */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ยอดเงินถอนสะสม</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono tracking-tight">
            ฿{formatCurrency(totalWithdrawn)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {memberTransactions.filter((t) => t.type === 'withdraw').length} รายการ
            </span>
            <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-md">
              เงินโอนออก
            </span>
          </div>
        </div>
      </div>

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
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
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

        {/* Member Accounts Quick Switcher & Balance List */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              บัญชีเงินฝากของคุณ
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">คลิกทำรายการด่วน</span>
          </div>

          <div className="space-y-2.5">
            {memberAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {formatAccountNo(acc.accountNo)}
                  </span>
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

                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500">ยอดคงเหลือ:</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    ฿{formatCurrency(acc.balance)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-amber-600">ดอกเบี้ย ฿{formatCurrency(acc.accruedInterest)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onQuickAction(acc, 'deposit')}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium"
                    >
                      ฝาก
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickAction(acc, 'withdraw')}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-medium"
                    >
                      ถอน
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              กิจกรรมธุรกรรมล่าสุด (Recent Transactions)
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
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
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
    </div>
  );
};
