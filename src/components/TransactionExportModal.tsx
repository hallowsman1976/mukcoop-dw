import React, { useState, useMemo } from 'react';
import { TransactionRecord, AccountType, TransactionType, TransactionStatus } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import { formatAccountNo, formatCitizenId, formatThaiDate } from '../utils/validators';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  X,
  FileText,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Table,
  SlidersHorizontal,
} from 'lucide-react';

interface TransactionExportModalProps {
  transactions: TransactionRecord[];
  onClose: () => void;
}

type PeriodPreset =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'custom';

type ExportFormat = 'csv' | 'xls';

export const TransactionExportModal: React.FC<TransactionExportModalProps> = ({
  transactions,
  onClose,
}) => {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | AccountType>('all');

  // Custom date range
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');

  // Filtered transactions based on selections
  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Transaction Type
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // 2. Status
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // 3. Account Type
      if (accountTypeFilter !== 'all' && t.accountType !== accountTypeFilter) return false;

      // 4. Period Filter
      const txDate = new Date(t.dateTime);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth(); // 0-indexed: 0=Jan, 9=Oct

      if (periodPreset === 'all') return true;

      if (periodPreset === 'this_month') {
        // Oct 2026 in current simulated system
        return txYear === 2026 && txMonth === 9;
      }

      if (periodPreset === 'last_month') {
        // Sep 2026
        return txYear === 2026 && txMonth === 8;
      }

      if (periodPreset === 'q1') {
        // Jan - Mar
        return txYear === 2026 && txMonth >= 0 && txMonth <= 2;
      }

      if (periodPreset === 'q2') {
        // Apr - Jun
        return txYear === 2026 && txMonth >= 3 && txMonth <= 5;
      }

      if (periodPreset === 'q3') {
        // Jul - Sep
        return txYear === 2026 && txMonth >= 6 && txMonth <= 8;
      }

      if (periodPreset === 'q4') {
        // Oct - Dec
        return txYear === 2026 && txMonth >= 9 && txMonth <= 11;
      }

      if (periodPreset === 'custom') {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        const time = txDate.getTime();
        return time >= start && time <= end;
      }

      return true;
    });
  }, [
    transactions,
    periodPreset,
    typeFilter,
    statusFilter,
    accountTypeFilter,
    startDate,
    endDate,
  ]);

  // Statistics calculation for the filtered report
  const summaryStats = useMemo(() => {
    const totalDeposits = filteredData
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = filteredData
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = totalDeposits - totalWithdrawals;

    return {
      count: filteredData.length,
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      net: netCashFlow,
    };
  }, [filteredData]);

  // Generate File Name based on options
  const getExportFileName = () => {
    const periodLabel =
      periodPreset === 'this_month'
        ? 'Report_Monthly_Oct2026'
        : periodPreset === 'last_month'
        ? 'Report_Monthly_Sep2026'
        : periodPreset === 'q1'
        ? 'Report_Q1_2026'
        : periodPreset === 'q2'
        ? 'Report_Q2_2026'
        : periodPreset === 'q3'
        ? 'Report_Q3_2026'
        : periodPreset === 'q4'
        ? 'Report_Q4_2026'
        : periodPreset === 'custom'
        ? `Report_${startDate}_to_${endDate}`
        : 'Report_AllTransactions';

    return `Coop_${periodLabel}.${exportFormat}`;
  };

  // Perform Export & File Download
  const handleExport = () => {
    if (filteredData.length === 0) {
      alert('ไม่มีข้อมูลธุรกรรมที่ตรงตามเงื่อนไขที่เลือก');
      return;
    }

    const fileName = getExportFileName();

    if (exportFormat === 'csv') {
      // 1. CSV Format (with UTF-8 BOM \uFEFF for Excel compatibility)
      const headers = [
        'ลำดับ',
        'รหัสอ้างอิงธุรกรรม',
        'วันที่และเวลา',
        'รหัสสมาชิก',
        'เลขประจำตัวประชาชน',
        'ชื่อ-นามสกุลสมาชิก',
        'หมายเลขบัญชี',
        'ประเภทบัญชี',
        'ประเภทธุรกรรม',
        'จำนวนเงิน (บาท)',
        'ยอดคงเหลือก่อนหน้า (บาท)',
        'ยอดคงเหลือหลังทำรายการ (บาท)',
        'สถานะรายการ',
        'เจ้าหน้าที่ผู้ตรวจสอบ/อนุมัติ',
        'หมายเหตุการตรวจสอบ',
      ];

      const rows = filteredData.map((t, idx) => {
        const typeStr = t.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน';
        const statusStr =
          t.status === 'completed'
            ? 'อนุมัติแล้ว'
            : t.status === 'pending'
            ? 'รอตรวจสอบ'
            : 'ปฏิเสธ';

        return [
          idx + 1,
          `"${t.refCode}"`,
          `"${t.dateTime}"`,
          `"${t.memberId}"`,
          `"${t.citizenId}"`,
          `"${t.accountName}"`,
          `"${formatAccountNo(t.accountNo)}"`,
          `"${t.accountType}"`,
          `"${typeStr}"`,
          t.amount,
          t.balanceBefore,
          t.balanceAfter,
          `"${statusStr}"`,
          `"${t.reviewedBy || '-'}"`,
          `"${t.reviewNote || '-'}"`,
        ].join(',');
      });

      // Add Summary Row at bottom
      const summaryHeader = `\n"--- สรุปยอดรวมรายงาน ---",,,,,,,,"ยอดฝากรวม:",${summaryStats.deposits},"ยอดถอนรวม:",${summaryStats.withdrawals},"กระแสเงินสดสุทธิ:",${summaryStats.net},`;

      const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n') + summaryHeader;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, fileName);
    } else {
      // 2. Excel Spreadsheet HTML Table format (.xls)
      const htmlTable = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            table { border-collapse: collapse; width: 100%; font-family: 'Tahoma', 'Prompt', sans-serif; font-size: 12px; }
            th { background-color: #065F46; color: #ffffff; border: 1px solid #047857; padding: 8px 12px; text-align: left; }
            td { border: 1px solid #D1D5DB; padding: 6px 10px; }
            .number { text-align: right; mso-number-format: "#,##0.00"; }
            .text-center { text-align: center; }
            .deposit { color: #047857; font-weight: bold; }
            .withdraw { color: #BE123C; font-weight: bold; }
            .summary-row { background-color: #F3F4F6; font-weight: bold; border-top: 2px solid #374151; }
          </style>
        </head>
        <body>
          <h2>รายงานสรุปธุรกรรมทางการเงิน สหกรณ์ออมทรัพย์</h2>
          <p>ช่วงเวลา: ${periodPreset} | วันที่จัดทำรายงาน: ${new Date().toLocaleDateString('th-TH')} | จำนวนรายการ: ${filteredData.length} รายการ</p>
          <table>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>รหัสอ้างอิง</th>
                <th>วันที่-เวลา</th>
                <th>รหัสสมาชิก</th>
                <th>เลขบัตร ปชช.</th>
                <th>ชื่อสมาชิก</th>
                <th>หมายเลขบัญชี</th>
                <th>ประเภทบัญชี</th>
                <th>ประเภทรายการ</th>
                <th class="number">จำนวนเงิน (บาท)</th>
                <th class="number">ยอดก่อนหน้า (บาท)</th>
                <th class="number">ยอดคงเหลือ (บาท)</th>
                <th>สถานะ</th>
                <th>ผู้อนุมัติ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData
                .map(
                  (t, i) => `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td>${t.refCode}</td>
                  <td>${t.dateTime}</td>
                  <td class="text-center">'${t.memberId}</td>
                  <td>'${t.citizenId}</td>
                  <td>${t.accountName}</td>
                  <td>${formatAccountNo(t.accountNo)}</td>
                  <td>${t.accountType}</td>
                  <td class="${t.type === 'deposit' ? 'deposit' : 'withdraw'}">${t.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน'}</td>
                  <td class="number">${t.amount.toFixed(2)}</td>
                  <td class="number">${t.balanceBefore.toFixed(2)}</td>
                  <td class="number">${t.balanceAfter.toFixed(2)}</td>
                  <td>${t.status === 'completed' ? 'อนุมัติแล้ว' : t.status === 'pending' ? 'รอตรวจสอบ' : 'ปฏิเสธ'}</td>
                  <td>${t.reviewedBy || '-'}</td>
                </tr>
              `
                )
                .join('')}
              <tr class="summary-row">
                <td colspan="9" style="text-align: right;">รวมยอดเงินฝากทั้งหมด:</td>
                <td class="number deposit">${summaryStats.deposits.toFixed(2)}</td>
                <td colspan="4"></td>
              </tr>
              <tr class="summary-row">
                <td colspan="9" style="text-align: right;">รวมยอดเงินถอนทั้งหมด:</td>
                <td class="number withdraw">${summaryStats.withdrawals.toFixed(2)}</td>
                <td colspan="4"></td>
              </tr>
              <tr class="summary-row">
                <td colspan="9" style="text-align: right;">กระแสเงินสดสุทธิ (Net Flow):</td>
                <td class="number" style="color: ${summaryStats.net >= 0 ? '#047857' : '#BE123C'}; font-size: 14px;">${summaryStats.net.toFixed(2)}</td>
                <td colspan="4"></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      downloadBlob(blob, fileName);
    }

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-emerald-300 border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  ศูนย์ส่งออกรายงานธุรกรรม (Export Excel / CSV)
                </h3>
                <span className="text-[10px] bg-emerald-400 text-slate-900 font-bold px-2 py-0.5 rounded-full">
                  Monthly & Quarterly Reports
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                ส่งออกสรุปยอดรายเดือน รายไตรมาส หรือกำหนดช่วงเวลาเพื่อใช้ทำรายงานบัญชี
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* 1. Report Period Presets (Monthly & Quarterly) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              เลือกรอบระยะเวลาของรายงาน (Monthly / Quarterly Periods)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPeriodPreset('this_month')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'this_month'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📅 ประจำเดือนนี้ (ต.ค. 2569)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('last_month')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'last_month'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📅 ประจำเดือนที่แล้ว (ก.ย.)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('q4')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'q4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📊 ไตรมาส 4 (ต.ค.-ธ.ค.)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('q3')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'q3'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📊 ไตรมาส 3 (ก.ค.-ก.ย.)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('q2')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'q2'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📊 ไตรมาส 2 (เม.ย.-มิ.ย.)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('q1')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'q1'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📊 ไตรมาส 1 (ม.ค.-มี.ค.)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('all')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                🗂 ข้อมูลทั้งหมด (All Time)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'custom'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ⚙️ กำหนดวันที่เอง
              </button>
            </div>

            {/* Custom Date Inputs if Custom selected */}
            {periodPreset === 'custom' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-150">
                <div className="flex-1 w-full">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    ตั้งแต่วันที่:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    ถึงวันที่:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Granular Filter Options */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">ประเภทธุรกรรม:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">ทั้งหมด (ฝาก และ ถอน)</option>
                <option value="deposit">เฉพาะเงินฝากเข้า</option>
                <option value="withdraw">เฉพาะเงินถอนออก</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">สถานะรายการ:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="completed">เฉพาะอนุมัติแล้ว (Completed)</option>
                <option value="pending">เฉพาะรอตรวจสอบ (Pending)</option>
                <option value="rejected">เฉพาะปฏิเสธ (Rejected)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">ประเภทบัญชีเงินฝาก:</label>
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">ทุกประเภทบัญชี</option>
                <option value="ออมทรัพย์">ออมทรัพย์ (1.75%)</option>
                <option value="ออมทรัพย์พิเศษ">ออมทรัพย์พิเศษ (2.75%)</option>
              </select>
            </div>
          </div>

          {/* 3. Export Format Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              เลือกรูปแบบไฟล์ที่ต้องการส่งออก (Export File Format)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    CSV
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      ไฟล์ CSV (Excel UTF-8 BOM)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      รองรับ Microsoft Excel ทุกเวอร์ชัน ภาษาไทยไม่เพี้ยน
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="text-emerald-600"
                />
              </label>

              <label
                onClick={() => setExportFormat('xls')}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  exportFormat === 'xls'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    XLS
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      สมุดงาน Excel Spreadsheet (.xls)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      มีหัวตาราง จัดสีแถว และสรุปยอดรวมพร้อมใช้งาน
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'xls'}
                  onChange={() => setExportFormat('xls')}
                  className="text-emerald-600"
                />
              </label>
            </div>
          </div>

          {/* 4. Live Summary Card for Selected Parameters */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                สรุปข้อมูลที่จะถูกนำไปจัดทำรายงาน ({summaryStats.count} ธุรกรรม)
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                ไฟล์: <strong>{getExportFileName()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/80">
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">ยอดเงินฝากรวม:</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  ฿{formatCurrency(summaryStats.deposits)}
                </span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">ยอดเงินถอนรวม:</span>
                <span className="text-sm font-bold font-mono text-rose-400">
                  ฿{formatCurrency(summaryStats.withdrawals)}
                </span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">กระแสเงินสดสุทธิ (Net):</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    summaryStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ฿{formatCurrency(summaryStats.net)}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Mini Preview Table (First 3 items) */}
          {filteredData.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">ตัวอย่างแถวข้อมูลรายงาน (แสดง 3 รายการแรก):</span>
                <span>ทั้งหมด {filteredData.length} รายการ</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2.5">รหัสธุรกรรม</th>
                      <th className="py-1.5 px-2.5">วันที่</th>
                      <th className="py-1.5 px-2.5">สมาชิก</th>
                      <th className="py-1.5 px-2.5">ประเภท</th>
                      <th className="py-1.5 px-2.5 text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.slice(0, 3).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 font-mono text-slate-700">{t.refCode}</td>
                        <td className="py-1.5 px-2.5 text-slate-500">{t.dateTime}</td>
                        <td className="py-1.5 px-2.5">{t.accountName}</td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`font-semibold ${
                              t.type === 'deposit' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {t.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800">
                          ฿{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์รายงาน ({filteredData.length} รายการ)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
