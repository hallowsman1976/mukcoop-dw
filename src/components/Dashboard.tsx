import React, { useMemo } from 'react';
import { Member, BankAccount, TransactionRecord, LiffUserProfile } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime } from '../utils/validators';
import { ArrowDownLeft, ArrowUpRight, Clock, ArrowRight, CreditCard } from 'lucide-react';

interface DashboardProps {
  currentMember: Member;
  liffProfile: LiffUserProfile | null;
  accounts: BankAccount[];
  transactions: TransactionRecord[];
  onNavigateTab: (tab: 'history' | 'accounts') => void;
  onQuickAction: (account: BankAccount, action: 'deposit' | 'withdraw') => void;
}

const RECENT_LIMIT = 10;

export const Dashboard: React.FC<DashboardProps> = ({
  currentMember,
  liffProfile,
  accounts,
  transactions,
  onNavigateTab,
  onQuickAction,
}) => {
  const memberAccounts = useMemo(
    () => accounts.filter((a) => a.memberId === currentMember.memberId),
    [accounts, currentMember.memberId]
  );
  const totalBalance = memberAccounts.reduce((sum, a) => sum + a.balance, 0);

  const memberTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.memberId === currentMember.memberId)
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    [transactions, currentMember.memberId]
  );
  const recentTransactions = memberTransactions.slice(0, RECENT_LIMIT);

  // LINE profile first, falling back to what the sheet knows about the member.
  const pictureUrl = liffProfile?.pictureUrl || currentMember.avatarUrl;
  const displayName = liffProfile?.displayName || currentMember.fullName;

  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 shadow-lg shadow-emerald-900/15">
        {pictureUrl ? (
          <img
            src={pictureUrl}
            alt={displayName}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-white/30 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center text-2xl font-bold shrink-0">
            {displayName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-emerald-100/90">สวัสดี</p>
          <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">{displayName}</h2>
          <p className="text-xs text-emerald-100/80 mt-0.5 truncate">
            {currentMember.fullName} • รหัสสมาชิก <span className="font-mono">{currentMember.memberId}</span>
          </p>
        </div>
      </div>

      {/* Account cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900">บัญชีเงินฝากของคุณ</h3>
            <p className="text-[11px] text-slate-500">
              {memberAccounts.length} บัญชี • รวม <span className="font-mono font-semibold text-emerald-700">฿{formatCurrency(totalBalance)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('accounts')}
            className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {memberAccounts.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 scrollbar-none">
            {memberAccounts.map((acc) => {
              const special = acc.accountType === 'ออมทรัพย์พิเศษ';
              return (
                <div
                  key={acc.accountNo}
                  className={`snap-start shrink-0 w-[82%] sm:w-80 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden ${
                    special
                      ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-900 shadow-slate-900/20'
                      : 'bg-gradient-to-br from-teal-500 to-emerald-700 shadow-emerald-900/20'
                  }`}
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"></div>
                  <div className="relative flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">
                      {acc.accountType}
                    </span>
                    <CreditCard className="w-4 h-4 opacity-70" />
                  </div>
                  <div className="relative mt-4 font-mono text-sm tracking-widest opacity-90">
                    {formatAccountNo(acc.accountNo)}
                  </div>
                  <div className="relative mt-3 text-[10px] opacity-70">ยอดคงเหลือ</div>
                  <div className="relative text-2xl font-bold font-mono">฿{formatCurrency(acc.balance)}</div>
                  <div className="relative mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-amber-200">ดอกเบี้ย ฿{formatCurrency(acc.accruedInterest)}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onQuickAction(acc, 'deposit')}
                        className="px-3 py-1 rounded-full bg-white text-emerald-700 text-[11px] font-bold active:scale-95 transition-transform cursor-pointer"
                      >
                        ฝาก
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickAction(acc, 'withdraw')}
                        className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
                      >
                        ถอน
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
            ยังไม่มีบัญชีเงินฝาก
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            ธุรกรรมล่าสุด
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
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
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {isDeposit ? 'ฝากเงินเข้าบัญชี' : 'ถอนเงินออกจากบัญชี'}
                        </span>
                        <span className="hidden sm:inline text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {t.refCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {formatThaiDateTime(t.dateTime)} • บัญชี {formatAccountNo(t.accountNo)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold font-mono ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}
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
