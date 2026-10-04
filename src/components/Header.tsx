import { SYSTEM_NAME, COOP_NAME } from '../constants/brand';
import { BrandLogo } from './BrandLogo';
import React, { useState } from 'react';
import { Member, BankAccount, AdminUser } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import {
  ShieldAlert,
  User,
  LogOut,
  Smartphone,
  Cloud,
  ArrowDownLeft,
  ArrowUpRight,
  ListOrdered,
  History,
  Wallet,
  LayoutDashboard,
  Users,
  Bell,
  BellOff,
  Coins,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  currentMember: Member | null;
  currentAdmin: AdminUser | null;
  accounts: BankAccount[];
  activeTab: 'dashboard' | 'accounts' | 'deposit' | 'withdraw' | 'history' | 'loans' | 'notifications';
  viewMode: 'member' | 'admin';
  onSelectTab: (tab: 'dashboard' | 'accounts' | 'deposit' | 'withdraw' | 'history' | 'loans' | 'notifications') => void;
  onLogout: () => void;
  onOpenLiffConfig: () => void;
  onOpenGasModal: () => void;
  onToggleViewMode: (mode: 'member' | 'admin') => void;
  liffConnected: boolean;
  gasConnected: boolean;
  logoUrl?: string;
  coopName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentMember,
  currentAdmin,
  accounts,
  activeTab,
  viewMode,
  onSelectTab,
  onLogout,
  onOpenLiffConfig,
  onOpenGasModal,
  onToggleViewMode,
  liffConnected,
  gasConnected,
  logoUrl,
  coopName,
}) => {
  const [showMore, setShowMore] = useState(false);

  // Compute total balance for this member
  const memberAccounts = currentMember
    ? accounts.filter((a) => a.memberId === currentMember.memberId)
    : [];
  const totalMemberBalance = memberAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Main navigation row */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <BrandLogo logoUrl={logoUrl} className="w-10 h-10 shrink-0 shadow-md shadow-emerald-600/20" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {SYSTEM_NAME}
              </h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                LINE LIFF
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {coopName || COOP_NAME}
            </p>
          </div>
        </div>

        {/* Member Profile or Total Balance */}
        {currentMember && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1">
                <span>{currentMember.fullName}</span>
                <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded text-[10px] border border-emerald-200">
                  รหัส {currentMember.memberId}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                ยอดรวมทุกบัญชี: <span className="text-emerald-600 font-bold">฿{formatCurrency(totalMemberBalance)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentMember.avatarUrl ? (
                <img
                  src={currentMember.avatarUrl}
                  alt={currentMember.fullName}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {currentMember.fullName.charAt(0)}
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="ออกจากระบบ / สลับสมาชิก"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs navigation if logged in */}
      {currentMember && (
        <div className="hidden md:block border-t border-slate-100 bg-slate-50/70 px-4">
          <div className="max-w-6xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>แดชบอร์ดการเงิน (Dashboard)</span>
            </button>

            <button
              onClick={() => onSelectTab('accounts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'accounts'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ListOrdered className="w-4 h-4 text-emerald-600" />
              <span>ตารางข้อมูลบัญชีเงินฝาก</span>
            </button>

            <button
              onClick={() => onSelectTab('deposit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'deposit'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>แบบฟอร์มการฝากเงิน</span>
            </button>

            <button
              onClick={() => onSelectTab('withdraw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>แบบฟอร์มการถอนเงิน</span>
            </button>

            <button
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-teal-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <History className="w-4 h-4 text-teal-600" />
              <span>ประวัติธุรกรรม</span>
            </button>

            <button
              onClick={() => onSelectTab('loans')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'loans'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Coins className="w-4 h-4 text-indigo-300" />
              <span>สินเชื่อและผ่อนชำระ</span>
            </button>

            <button
              onClick={() => onSelectTab('notifications')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'notifications'
                  ? 'bg-emerald-50 text-emerald-800 shadow-2xs border border-emerald-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="ตั้งค่าการเปิด/ปิดรับการแจ้งเตือนผ่าน LINE Push Notifications"
            >
              {currentMember?.notificationSettings?.enableLinePush !== false ? (
                <Bell className="w-4 h-4 text-[#06C755]" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-400" />
              )}
              <span>การแจ้งเตือน LINE</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  currentMember?.notificationSettings?.enableLinePush !== false
                    ? 'bg-[#06C755]'
                    : 'bg-slate-300'
                }`}
              ></span>
            </button>
          </div>
        </div>
      )}
    </header>

      {/* Mobile bottom navigation (member portal) */}
      {currentMember && (
        <>
          {showMore && (
            <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setShowMore(false)}>
              <div
                className="absolute left-3 right-3 bottom-24 bg-white rounded-3xl shadow-2xl border border-slate-200 p-2 animate-in slide-in-from-bottom-4 fade-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {([
                  { tab: 'accounts', label: 'ตารางข้อมูลบัญชีเงินฝาก', icon: ListOrdered, color: 'text-emerald-600 bg-emerald-50' },
                  { tab: 'loans', label: 'สินเชื่อและผ่อนชำระ', icon: Coins, color: 'text-indigo-600 bg-indigo-50' },
                  { tab: 'notifications', label: 'การแจ้งเตือน LINE', icon: Bell, color: 'text-[#06C755] bg-green-50' },
                ] as const).map(({ tab, label, icon: Icon, color }) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { onSelectTab(tab); setShowMore(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-left transition-colors ${
                      activeTab === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setShowMore(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-left text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50">
                    <LogOut className="w-4 h-4" />
                  </span>
                  ออกจากระบบ
                </button>
              </div>
            </div>
          )}

          <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
              {([
                { tab: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
                { tab: 'deposit', label: 'ฝากเงิน', icon: ArrowDownLeft },
                { tab: 'withdraw', label: 'ถอนเงิน', icon: ArrowUpRight },
                { tab: 'history', label: 'ประวัติ', icon: History },
              ] as const).map(({ tab, label, icon: Icon }) => {
                const active = activeTab === tab && !showMore;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setShowMore(false); onSelectTab(tab); }}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold transition-all ${
                      active ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <span className={`w-11 h-7 rounded-full flex items-center justify-center transition-all ${active ? 'bg-emerald-100' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold transition-all ${
                  showMore || ['accounts', 'loans', 'notifications'].includes(activeTab) ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                <span className={`w-11 h-7 rounded-full flex items-center justify-center ${showMore || ['accounts', 'loans', 'notifications'].includes(activeTab) ? 'bg-emerald-100' : ''}`}>
                  <Menu className="w-5 h-5" />
                </span>
                เมนูอื่นๆ
              </button>
            </div>
          </nav>
        </>
      )}
  </>
  );
};
