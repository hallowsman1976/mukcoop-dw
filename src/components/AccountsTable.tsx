import React, { useState } from 'react';
import { BankAccount, Member } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { formatCitizenId, formatAccountNo } from '../utils/validators';
import { downloadImportTemplateCsv } from '../utils/importTemplate';
import { Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Search, ShieldCheck, Wallet, Sparkles, FileSpreadsheet, Download } from 'lucide-react';

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

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    // If logged in, prioritize member's accounts or allow seeing all if admin toggle
    const matchesSearch =
      acc.accountNo.includes(searchTerm) ||
      acc.memberId.includes(searchTerm) ||
      acc.citizenId.includes(searchTerm) ||
      acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.contact.includes(searchTerm);

    const matchesType =
      selectedTypeFilter === 'all' || acc.accountType === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  const totalBalance = filteredAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalInterest = filteredAccounts.reduce((sum, a) => sum + a.accruedInterest, 0);

  return (
    <div className="space-y-4">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-xs text-emerald-100 font-medium">ยอดเงินรวมในบัญชีที่แสดง</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">฿{formatCurrency(totalBalance)}</span>
          </div>
          <p className="text-[11px] text-emerald-200 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> บัญชีเงินฝากที่ได้รับการคุ้มครอง
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">ดอกเบี้ยสะสมทั้งหมด</p>
          <div className="mt-1 flex items-baseline gap-1 text-slate-800">
            <span className="text-2xl font-bold text-amber-600">฿{formatCurrency(totalInterest)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> อัตราผลตอบแทนเฉลี่ย 1.75% - 2.75%
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">จำนวนบัญชีในระบบ</p>
          <div className="mt-1 flex items-baseline gap-1 text-slate-800">
            <span className="text-2xl font-bold text-slate-900">{filteredAccounts.length}</span>
            <span className="text-xs text-slate-500">บัญชี</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {currentMember ? `สมาชิก: ${currentMember.fullName}` : 'แสดงข้อมูลบัญชีเงินฝาก'}
          </p>
        </div>
      </div>

      {/* Table Header Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-5 bg-emerald-600 rounded-full inline-block"></span>
              ตารางข้อมูลบัญชีเงินฝากสมาชิก
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงข้อมูลรหัสสมาชิก 5 หลัก, เลขประจำตัวประชาชน 13 หลัก, ยอดคงเหลือ และดอกเบี้ยสะสม
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadImportTemplateCsv('import_template.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="ดาวน์โหลดไฟล์ import_template.csv (โครงสร้างตาม sheet Accounts)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>ดาวน์โหลด import_template</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFullCitizenId(!showFullCitizenId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              title={showFullCitizenId ? 'ซ่อนเลขบัตรประชาชน' : 'แสดงเลขบัตรประชาชนเต็ม'}
            >
              {showFullCitizenId ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>ซ่อนเลขบัตร</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>แสดงเลขบัตร 13 หลัก</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วย เลขที่บัญชี, รหัสสมาชิก 5 หลัก, ชื่อบัญชี หรือเบอร์โทร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedTypeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedTypeFilter('ออมทรัพย์')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedTypeFilter === 'ออมทรัพย์'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ออมทรัพย์
            </button>
            <button
              onClick={() => setSelectedTypeFilter('ออมทรัพย์พิเศษ')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedTypeFilter === 'ออมทรัพย์พิเศษ'
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              ออมทรัพย์พิเศษ
            </button>
          </div>
        </div>

        {/* The 8-Column Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">ลำดับ</th>
                <th className="py-3 px-3 min-w-[130px]">หมายเลขบัญชี</th>
                <th className="py-3 px-3 min-w-[90px]">รหัสสมาชิก</th>
                <th className="py-3 px-3 min-w-[150px]">หมายเลขบัตรประชาชน</th>
                <th className="py-3 px-3 min-w-[180px]">ชื่อบัญชีเงินฝาก</th>
                <th className="py-3 px-3 min-w-[140px]">ข้อมูลติดต่อล่าสุด</th>
                <th className="py-3 px-3 min-w-[120px] text-right">ยอดคงเหลือ</th>
                <th className="py-3 px-3 min-w-[110px] text-right">ดอกเบี้ยสะสม</th>
                <th className="py-3 px-3 min-w-[130px] text-center">ทำรายการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc, index) => {
                  const isCurrentMemberAccount = currentMember && acc.memberId === currentMember.memberId;
                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCurrentMemberAccount ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* 1. ลำดับ */}
                      <td className="py-3.5 px-3 text-center text-slate-500 font-mono">
                        {acc.no || index + 1}
                      </td>

                      {/* 2. หมายเลขบัญชี */}
                      <td className="py-3.5 px-3 font-semibold text-slate-900 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatAccountNo(acc.accountNo)}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              acc.accountType === 'ออมทรัพย์พิเศษ'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {acc.accountType}
                          </span>
                        </div>
                      </td>

                      {/* 3. รหัสสมาชิก (5 หลัก) */}
                      <td className="py-3.5 px-3 font-mono font-medium text-emerald-700 whitespace-nowrap">
                        <span className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          {acc.memberId}
                        </span>
                      </td>

                      {/* 4. หมายเลขบัตรประชาชน (13 หลัก) */}
                      <td className="py-3.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatCitizenId(acc.citizenId, !showFullCitizenId)}
                      </td>

                      {/* 5. ชื่อบัญชีเงินฝาก */}
                      <td className="py-3.5 px-3 font-medium text-slate-800">
                        <div>
                          <span>{acc.accountName}</span>
                          {isCurrentMemberAccount && (
                            <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                              บัญชีของคุณ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. ข้อมูลติดต่อล่าสุด */}
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                        <span>{acc.contact}</span>
                      </td>

                      {/* 7. ยอดคงเหลือ */}
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-600 font-mono whitespace-nowrap">
                        ฿{formatCurrency(acc.balance)}
                      </td>

                      {/* 8. ดอกเบี้ยสะสม */}
                      <td className="py-3.5 px-3 text-right text-amber-600 font-medium font-mono whitespace-nowrap">
                        ฿{formatCurrency(acc.accruedInterest)}
                      </td>

                      {/* Action buttons (ฝาก / ถอน) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectAction(acc, 'deposit')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-medium transition-colors shadow-2xs"
                            title="ฝากเงินเข้าบัญชีนี้"
                          >
                            <ArrowDownLeft className="w-3 h-3" /> ฝาก
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectAction(acc, 'withdraw')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-medium transition-colors shadow-2xs"
                            title="ถอนเงินจากบัญชีนี้"
                          >
                            <ArrowUpRight className="w-3 h-3" /> ถอน
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    ไม่พบข้อมูลบัญชีเงินฝากที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
