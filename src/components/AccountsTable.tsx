import React, { useState } from 'react';
import { BankAccount, Member } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { formatCitizenId, formatAccountNo } from '../utils/validators';
import { Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Search, Wallet, Sparkles, Landmark } from 'lucide-react';

interface AccountsTableProps {
  accounts: BankAccount[];
  currentMember: Member | null;
  onSelectAction: (account: BankAccount, action: 'deposit' | 'withdraw') => void;
}

export const AccountsTable: React.FC<AccountsTableProps> = ({
  accounts,
  currentMember,
  onSelectAction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullCitizenId, setShowFullCitizenId] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const term = searchTerm.toLowerCase();
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.accountNo.includes(searchTerm) ||
      acc.memberId.includes(searchTerm) ||
      acc.citizenId.includes(searchTerm) ||
      acc.accountName.toLowerCase().includes(term) ||
      (acc.contact || '').includes(searchTerm);
    const matchesType = selectedTypeFilter === 'all' || acc.accountType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalBalance = filteredAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalInterest = filteredAccounts.reduce((sum, a) => sum + a.accruedInterest, 0);

  const filters = [
    { id: 'all', label: 'ทั้งหมด', active: 'bg-slate-900 text-white' },
    { id: 'ออมทรัพย์', label: 'ออมทรัพย์', active: 'bg-emerald-600 text-white' },
    { id: 'ออมทรัพย์พิเศษ', label: 'ออมทรัพย์พิเศษ', active: 'bg-slate-800 text-white' },
  ];

  const typeBadge = (type: string) => (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
        type === 'ออมทรัพย์พิเศษ' ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-800'
      }`}
    >
      {type}
    </span>
  );

  const actionButtons = (acc: BankAccount, full = false) => (
    <div className={`flex items-center gap-1.5 ${full ? 'w-full' : 'justify-center'}`}>
      <button
        type="button"
        onClick={() => onSelectAction(acc, 'deposit')}
        className={`inline-flex items-center justify-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full text-xs font-semibold transition-all cursor-pointer ${
          full ? 'flex-1 py-2.5 rounded-2xl' : ''
        }`}
        title="ฝากเงินเข้าบัญชีนี้"
      >
        <ArrowDownLeft className="w-3.5 h-3.5" /> ฝาก
      </button>
      <button
        type="button"
        onClick={() => onSelectAction(acc, 'withdraw')}
        className={`inline-flex items-center justify-center gap-1 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          full ? 'flex-1 py-2.5 rounded-2xl' : ''
        }`}
        title="ถอนเงินจากบัญชีนี้"
      >
        <ArrowUpRight className="w-3.5 h-3.5" /> ถอน
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Summary */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 shadow-xl shadow-emerald-900/15">
        <div className="absolute -top-14 -right-8 w-52 h-52 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">บัญชีเงินฝาก</h2>
            <p className="text-xs text-emerald-100/90 truncate">
              {currentMember ? currentMember.fullName : 'ข้อมูลบัญชีเงินฝากสมาชิก'} • {filteredAccounts.length} บัญชี
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-3">
            <div className="flex items-center gap-1 text-[11px] text-emerald-100">
              <Wallet className="w-3 h-3" /> ยอดเงินรวม
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono">฿{formatCurrency(totalBalance)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-3">
            <div className="flex items-center gap-1 text-[11px] text-amber-200">
              <Sparkles className="w-3 h-3" /> ดอกเบี้ยสะสม
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono">฿{formatCurrency(totalInterest)}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedTypeFilter(f.id)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedTypeFilter === f.id ? `${f.active} shadow-sm` : 'text-slate-600 hover:bg-white/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขบัญชี รหัสสมาชิก หรือชื่อบัญชี"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-3 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFullCitizenId(!showFullCitizenId)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title={showFullCitizenId ? 'ซ่อนเลขบัตรประชาชน' : 'แสดงเลขบัตรประชาชนเต็ม'}
          >
            {showFullCitizenId ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{showFullCitizenId ? 'ซ่อนเลขบัตร' : 'แสดงเลขบัตร'}</span>
          </button>
        </div>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-600">ไม่พบบัญชีเงินฝาก</p>
          <p className="text-xs text-slate-400 mt-0.5">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filteredAccounts.map((acc) => {
              const mine = currentMember && acc.memberId === currentMember.memberId;
              return (
                <div
                  key={acc.id}
                  className={`bg-white border rounded-3xl p-4 shadow-2xs space-y-3 ${
                    mine ? 'border-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {typeBadge(acc.accountType)}
                    {mine && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        บัญชีของคุณ
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="font-mono text-base font-bold text-slate-900 tracking-wide">
                      {formatAccountNo(acc.accountNo)}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{acc.accountName}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-emerald-50/70 px-3 py-2">
                      <div className="text-[10px] text-emerald-700">ยอดคงเหลือ</div>
                      <div className="font-mono font-bold text-emerald-700 text-sm">฿{formatCurrency(acc.balance)}</div>
                    </div>
                    <div className="rounded-2xl bg-amber-50/70 px-3 py-2">
                      <div className="text-[10px] text-amber-700">ดอกเบี้ยสะสม</div>
                      <div className="font-mono font-bold text-amber-700 text-sm">฿{formatCurrency(acc.accruedInterest)}</div>
                    </div>
                  </div>

                  <dl className="text-[11px] text-slate-500 grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                      <dt className="text-slate-400">รหัสสมาชิก</dt>
                      <dd className="font-mono text-slate-700">{acc.memberId}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">ติดต่อล่าสุด</dt>
                      <dd className="text-slate-700">{acc.contact || '-'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-400">เลขบัตรประชาชน</dt>
                      <dd className="font-mono text-slate-700">{formatCitizenId(acc.citizenId, !showFullCitizenId)}</dd>
                    </div>
                  </dl>

                  {actionButtons(acc, true)}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3.5 px-4 min-w-[170px]">หมายเลขบัญชี</th>
                    <th className="py-3.5 px-3">รหัสสมาชิก</th>
                    <th className="py-3.5 px-3 min-w-[150px]">หมายเลขบัตรประชาชน</th>
                    <th className="py-3.5 px-3 min-w-[160px]">ชื่อบัญชีเงินฝาก</th>
                    <th className="py-3.5 px-3">ข้อมูลติดต่อล่าสุด</th>
                    <th className="py-3.5 px-3 text-right">ยอดคงเหลือ</th>
                    <th className="py-3.5 px-3 text-right">ดอกเบี้ยสะสม</th>
                    <th className="py-3.5 px-4 text-center">ทำรายการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAccounts.map((acc) => {
                    const mine = currentMember && acc.memberId === currentMember.memberId;
                    return (
                      <tr key={acc.id} className={`hover:bg-slate-50/70 transition-colors ${mine ? 'bg-emerald-50/30' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatAccountNo(acc.accountNo)}
                          </div>
                          <div className="mt-1">{typeBadge(acc.accountType)}</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                          {acc.memberId}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {formatCitizenId(acc.citizenId, !showFullCitizenId)}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-800">
                          {acc.accountName}
                          {mine && (
                            <span className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-normal">
                              บัญชีของคุณ
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{acc.contact || '-'}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-600 font-mono whitespace-nowrap">
                          ฿{formatCurrency(acc.balance)}
                        </td>
                        <td className="py-3.5 px-3 text-right text-amber-600 font-medium font-mono whitespace-nowrap">
                          ฿{formatCurrency(acc.accruedInterest)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{actionButtons(acc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
