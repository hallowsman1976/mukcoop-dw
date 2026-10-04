import React from 'react';
import { Member, BankAccount, AdminUser } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import {
  ShieldCheck,
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
}) => {
  // Compute total balance for this member
  const memberAccounts = currentMember
    ? accounts.filter((a) => a.memberId === currentMember.memberId)
    : [];
  const totalMemberBalance = memberAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top micro bar: LINE LIFF & Google Apps Script status badges */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LINE LIFF Online Banking Gateway v2.1
          </span>
          <span className="hidden sm:inline-block text-slate-500">•</span>
          <span className="hidden sm:inline-block text-slate-400">
            ระบบฝาก-ถอนเงินออนไลน์ผ่าน LINE LIFF (Google Sheets & Apps Script Cloud)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* LIFF Badge */}
          <button
            type="button"
            onClick={onOpenLiffConfig}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              liffConnected
                ? 'bg-[#06C755]/20 text-[#06C755] hover:bg-[#06C755]/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="ตั้งค่า LINE LIFF SDK"
          >
            <Smartphone className="w-3 h-3" />
            <span>LINE LIFF: {liffConnected ? 'เชื่อมต่อแล้ว' : 'Sandbox'}</span>
          </button>

          {/* GAS Badge */}
          <button
            type="button"
            onClick={onOpenGasModal}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              gasConnected
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="ดูสคริปต์ Google Apps Script (Code.gs) & ตั้งค่า Web App"
          >
            <Cloud className="w-3 h-3" />
            <span>GAS Backend: {gasConnected ? 'Google Sheets Sync' : 'Code.gs API'}</span>
          </button>

          {/* Portal Switcher Badge */}
          {viewMode === 'member' ? (
            <button
              type="button"
              onClick={() => onToggleViewMode('admin')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all shadow-xs cursor-pointer"
              title="เข้าสู่ระบบเจ้าหน้าที่ / ผู้ดูแลระบบ"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>ระบบเจ้าหน้าที่ (Admin)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleViewMode('member')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
              title="สลับไปยังหน้าพอร์ทัลสมาชิก"
            >
              <Users className="w-3 h-3" />
              <span>พอร์ทัลสมาชิก (Member)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                สหกรณ์ออมทรัพย์ออนไลน์
              </h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                LINE LIFF
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              ระบบฝาก-ถอนเงินดิจิทัล ตรวจสอบสลิปและบันทึกอัตโนมัติ
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
        <div className="border-t border-slate-100 bg-slate-50/70 px-4">
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
  );
};
