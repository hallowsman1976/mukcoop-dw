import React, { useMemo } from 'react';
import { Member, TransactionRecord, LiffUserProfile } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime } from '../utils/validators';
import { ArrowDownLeft, ArrowUpRight, Clock, ArrowRight } from 'lucide-react';

interface DashboardProps {
  currentMember: Member;
  liffProfile: LiffUserProfile | null;
  transactions: TransactionRecord[];
  onNavigateTab: (tab: 'history') => void;
}

const RECENT_LIMIT = 10;

export const Dashboard: React.FC<DashboardProps> = ({
  currentMember,
  liffProfile,
  transactions,
  onNavigateTab,
}) => {
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
