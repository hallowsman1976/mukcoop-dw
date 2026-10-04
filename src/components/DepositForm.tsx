import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Member,
  BankAccount,
  AttachedFile,
  TransactionRecord,
  SlipVerificationResult,
} from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime } from '../utils/validators';
import { StorageService } from '../services/storageService';
import { FileUpload } from './FileUpload';
import {
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  QrCode,
  ScanLine,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface DepositFormProps {
  currentMember: Member;
  accounts: BankAccount[];
  initialAccount?: BankAccount | null;
  onSuccess: (txn: TransactionRecord) => void;
  onCancel: () => void;
}

export const DepositForm: React.FC<DepositFormProps> = ({
  currentMember,
  accounts,
  initialAccount,
  onSuccess,
  onCancel,
}) => {
  const memberAccounts = accounts.filter((a) => a.memberId === currentMember.memberId);
  const defaultAccount = initialAccount || memberAccounts[0] || accounts[0];

  const [selectedAccountNo, setSelectedAccountNo] = useState<string>(
    defaultAccount ? defaultAccount.accountNo : ''
  );

  const currentAccount =
    memberAccounts.find((a) => a.accountNo === selectedAccountNo) || defaultAccount;

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');

  // Date and Time (Flatpickr style)
  const [depositDate, setDepositDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [depositTime, setDepositTime] = useState<string>(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  // Slip upload
  const [slipFile, setSlipFile] = useState<AttachedFile | null>(null);

  // Slip Verification API states
  const [isVerifyingSlip, setIsVerifyingSlip] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<SlipVerificationResult | null>(
    null
  );

  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amountInput) || 0;
  const currentBalance = currentAccount ? currentAccount.balance : 0;
  const newBalance = currentBalance + numericAmount;

  const quickAmounts = [1000, 2000, 5000, 10000, 50000];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setAmountInput(val);
    setError(null);

    // If verification already occurred and amount was changed, warn user
    if (verificationResult && verificationResult.amount && parseFloat(val) !== verificationResult.amount) {
      // Keep result but note discrepancy
    }
  };

  const handleSelectQuickAmount = (amt: number) => {
    setAmountInput(String(amt));
    setError(null);
  };

  // API ตรวจสอบยอดเงินฝาก (Simulates SlipOK / EasySlip / GAS Slip Verification API)
  const handleVerifySlipWithApi = () => {
    if (!slipFile) {
      setError('กรุณาแนบไฟล์ภาพสลิปเงินโอนก่อนทำการตรวจสอบ');
      return;
    }

    setIsVerifyingSlip(true);
    setError(null);

    // Simulate API call to Slip Verification Backend
    setTimeout(() => {
      const parsedAmount = numericAmount > 0 ? numericAmount : 5000;
      const refNumber = `01${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

      // If user hadn't entered amount yet, autofill from slip OCR
      if (!amountInput) {
        setAmountInput(String(parsedAmount));
      }

      setVerificationResult({
        verified: true,
        bankName: 'ธนาคารกสิกรไทย (KBANK)',
        transRef: refNumber,
        amount: parsedAmount,
        dateTime: `${depositDate} ${depositTime}:12`,
        senderName: currentMember.fullName,
        receiverName: 'สหกรณ์ออมทรัพย์ (บัญชีหลัก)',
        receiverAccount: '101-2-XXXXX-1',
        confidenceScore: 0.99,
        message: 'ตรวจสอบผ่าน API สำเร็จ: สลิปถูกต้อง ไม่พบประวัติใช้งานซ้ำ ยอดเงินตรงกัน',
      });

      setIsVerifyingSlip(false);
    }, 1000);
  };

  const handleSlipChange = (file: AttachedFile | null) => {
    setSlipFile(file);
    setVerificationResult(null);
    if (file) {
      // Auto-trigger verification suggestion
    }
  };

  const setDateToNow = () => {
    const now = new Date();
    setDepositDate(now.toISOString().split('T')[0]);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setDepositTime(`${h}:${m}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentAccount) {
      setError('ไม่พบข้อมูลบัญชีเงินฝากที่เลือก');
      return;
    }

    if (numericAmount <= 0) {
      setError('กรุณาระบุจำนวนเงินฝากมากกว่า 0 บาท');
      return;
    }

    if (!depositDate || !depositTime) {
      setError('กรุณาระบุวันและเวลาที่โอนเงินฝากให้ครบถ้วน');
      return;
    }

    if (!slipFile) {
      setError('กรุณาแนบภาพสลิปเงินโอน (ขนาดไฟล์ไม่เกิน 5MB)');
      return;
    }

    // ยอดฝาก-ถอน ต้องสัมพันธ์กัน Check
    if (verificationResult && verificationResult.amount && Math.abs(numericAmount - verificationResult.amount) > 0.01) {
      setError(
        `ยอดเงินฝากที่กรอก (฿${formatCurrency(numericAmount)}) ไม่ตรงกับยอดเงินที่ตรวจพบบนสลิป (฿${formatCurrency(verificationResult.amount)}) กรุณาตรวจสอบยอดเงินให้ตรงกัน`
      );
      return;
    }

    setIsSubmitting(true);

    void (async () => {
      const fullDepositDateTime = `${depositDate} ${depositTime}`;
      const now = new Date();

      const result = await StorageService.submitTransaction('deposit', {
        type: 'deposit',
        accountNo: currentAccount.accountNo,
        accountName: currentAccount.accountName,
        accountType: currentAccount.accountType,
        memberId: currentMember.memberId,
        citizenId: currentMember.citizenId,
        amount: numericAmount,
        dateTime: now.toISOString().replace('T', ' ').slice(0, 16),
        status: 'completed',
        depositDateTime: fullDepositDateTime,
        slipImage: slipFile,
        slipVerification: verificationResult || {
          verified: true,
          amount: numericAmount,
          message: 'บันทึกพร้อมสลิปแนบ',
        },
        note,
      });

      setIsSubmitting(false);

      if (result.success && result.transaction) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
        onSuccess(result.transaction);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการบันทึกรายการฝากเงิน');
      }
    })();
  };

  return (
    <div className="max-w-2xl mx-auto my-4 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <ArrowDownLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">แบบฟอร์มการฝากเงินออนไลน์</h2>
              <p className="text-xs text-emerald-100">
                ระบบสหกรณ์ออมทรัพย์ / กองทุนการเงิน (ยืนยันสิทธิ์สมาชิก {currentMember.memberId})
              </p>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
            ฝากเงิน (Deposit)
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
        {/* Section 1: ข้อมูลที่ถูกดึงโดยอัตโนมัติหลังจากเข้าสู่ระบบ */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ข้อมูลบัญชีที่ดึงโดยอัตโนมัติ
            </span>
            {memberAccounts.length > 1 && (
              <span className="text-[11px] text-slate-500">
                มี {memberAccounts.length} บัญชี (เลือกบัญชีที่ต้องการฝาก)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* หมายเลขบัญชี */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                หมายเลขบัญชี
              </label>
              {memberAccounts.length > 1 ? (
                <select
                  value={selectedAccountNo}
                  onChange={(e) => setSelectedAccountNo(e.target.value)}
                  className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {memberAccounts.map((acc) => (
                    <option key={acc.accountNo} value={acc.accountNo}>
                      {formatAccountNo(acc.accountNo)} ({acc.accountType})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-2">
                  {currentAccount ? formatAccountNo(currentAccount.accountNo) : '-'}
                </div>
              )}
            </div>

            {/* ชื่อบัญชี */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                ชื่อบัญชี
              </label>
              <div className="text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-2 truncate">
                {currentAccount ? currentAccount.accountName : currentMember.fullName}
              </div>
            </div>

            {/* ประเภทบัญชี */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                ประเภทบัญชี
              </label>
              <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <span>{currentAccount?.accountType || 'ออมทรัพย์'}</span>
                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-600">
                  ดอกเบี้ย {currentAccount?.interestRate || 1.75}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">ยอดเงินคงเหลือก่อนฝาก:</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              ฿{formatCurrency(currentBalance)}
            </span>
          </div>
        </div>

        {/* Section 2: วัน เวลาที่ฝาก (Date Flat pickr) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              วันและเวลาที่โอนเงินฝาก (Date & Time Picker) <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={setDateToNow}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
            >
              ตั้งเป็นเวลาปัจจุบัน
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Input */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">วันที่ทำรายการ</span>
                <span className="text-[11px] text-slate-400">พ.ศ. / ค.ศ.</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Time Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">เวลาที่โอน (น.)</span>
                <span className="text-[11px] text-slate-400">ตามที่ระบุในสลิป</span>
              </div>
              <div className="relative">
                <input
                  type="time"
                  value={depositTime}
                  onChange={(e) => setDepositTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Thai date preview */}
          {depositDate && (
            <p className="text-[11px] text-slate-500">
              วันเวลาที่บันทึก:{' '}
              <span className="font-semibold text-slate-700">
                {formatThaiDateTime(`${depositDate}T${depositTime || '00:00'}`)}
              </span>
            </p>
          )}
        </div>

        {/* Section 3: จำนวนเงินฝาก */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            จำนวนเงินฝาก (บาท) <span className="text-rose-500">*</span>
          </label>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
              ฿
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={handleAmountChange}
              className="w-full pl-9 pr-4 py-3 text-lg font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all tracking-wide"
              required
            />
          </div>

          {/* Thai Baht text */}
          {numericAmount > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-700 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">จำนวนเงินตัวอักษร:</span>{' '}
                <span className="text-emerald-800 font-medium">{thaiBahtText(numericAmount)}</span>
              </div>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">จำนวนด่วน:</span>
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleSelectQuickAmount(amt)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-mono transition-all"
              >
                +{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Real-time Balance Preview */}
          {numericAmount > 0 && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
              <span>ยอดคงเหลือหลังการฝาก:</span>
              <span className="font-bold font-mono text-sm">฿{formatCurrency(newBalance)}</span>
            </div>
          )}
        </div>

        {/* Section 4: แนบสลิปเงินโอน (ไฟล์ภาพไม่เกิน 5MB) & API ตรวจสอบสลิป */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                แนบสลิปเงินโอน และระบบตรวจสอบอัตโนมัติ
              </h3>
              <p className="text-[11px] text-slate-500">
                รองรับไฟล์ภาพ JPEG, PNG ขนาดไม่เกิน 5MB พร้อม API ตรวจสอบสลิป
              </p>
            </div>

            {slipFile && (
              <button
                type="button"
                onClick={handleVerifySlipWithApi}
                disabled={isVerifyingSlip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50"
              >
                {isVerifyingSlip ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>กำลังเชื่อมต่อ API ตรวจสอบ...</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>ตรวจสอบสลิปด้วย API</span>
                  </>
                )}
              </button>
            )}
          </div>

          <FileUpload
            label="แนบสลิปเงินโอน"
            required
            value={slipFile}
            onChange={handleSlipChange}
            helperText="ไฟล์ภาพสลิปที่โอนจาก Mobile Banking (ไม่เกิน 5MB)"
          />

          {/* API Verification Result Card */}
          {verificationResult && (
            <div className="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/70 space-y-2 text-xs">
              <div className="flex items-center justify-between text-teal-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  ผลการตรวจสอบจาก Slip Verification API
                </span>
                <span className="text-[10px] bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded-full font-mono">
                  ความแม่นยำ 99.8%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-xl border border-teal-100">
                <div>
                  <span className="text-slate-400 block">ธนาคารที่โอน:</span>
                  <span className="font-semibold text-slate-800">
                    {verificationResult.bankName || 'ธนาคารกสิกรไทย'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">รหัสอ้างอิง (TransRef):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {verificationResult.transRef}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">ยอดเงินบนสลิป:</span>
                  <span className="font-mono font-bold text-teal-700">
                    ฿{formatCurrency(verificationResult.amount || numericAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">วันเวลาบนสลิป:</span>
                  <span className="font-mono text-slate-700">{verificationResult.dateTime}</span>
                </div>
              </div>

              {/* Check discrepancy with amountInput */}
              {numericAmount > 0 &&
                verificationResult.amount &&
                Math.abs(numericAmount - verificationResult.amount) > 0.01 && (
                  <div className="p-2 rounded-lg bg-rose-100/80 text-rose-800 flex items-start gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>
                      คำเตือน: ยอดเงินที่ระบุ (฿{formatCurrency(numericAmount)}) ไม่ตรงกับยอดบนสลิป
                      (฿{formatCurrency(verificationResult.amount)})
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Note / Remarks */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            บันทึกช่วยจำ (ไม่บังคับ)
          </label>
          <input
            type="text"
            placeholder="เช่น ฝากเงินสะสมประจำงวด, โบนัส, เงินออมพิเศษ"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting || numericAmount <= 0}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>กำลังบันทึกรายการฝาก...</span>
              </>
            ) : (
              <>
                <ArrowDownLeft className="w-4 h-4" />
                <span>ยืนยันการฝากเงิน</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
