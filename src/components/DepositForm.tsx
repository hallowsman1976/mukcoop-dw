import React, { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Member,
  BankAccount,
  AttachedFile,
  TransactionRecord,
} from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime, newRequestId } from '../utils/validators';
import { StorageService } from '../services/storageService';
import { FileUpload } from './FileUpload';
import {
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Info,
  Landmark,
  Copy,
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
  const coopSettings = StorageService.getSystemSettings();
  const [copied, setCopied] = useState(false);
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

  // One id per form: a retry or double tap of the same submit is recognised by the server.
  const requestId = useRef<string>(newRequestId());

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
  };

  const handleSelectQuickAmount = (amt: number) => {
    setAmountInput(String(amt));
    setError(null);
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
        requestId: requestId.current,
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

  const stepBadge = (n: number) => (
    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto my-2 sm:my-4 space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 shadow-xl shadow-emerald-900/15">
        <div className="absolute -top-14 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">ฝากเงิน</h2>
            <p className="text-xs text-emerald-100/90 truncate">
              {currentMember.fullName} • รหัสสมาชิก {currentMember.memberId}
            </p>
          </div>
        </div>
      </div>

      {coopSettings.depositAccountNumber && (
        <section className="bg-white border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-700" /> โอนเงินเข้าบัญชีสหกรณ์
          </h3>
          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3.5 text-sm space-y-1">
            <div className="text-slate-500 text-xs">{coopSettings.depositBankName}</div>
            <div className="font-semibold text-slate-900">{coopSettings.depositAccountName}</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-lg font-bold text-emerald-800 tracking-wider">
                {coopSettings.depositAccountNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(coopSettings.depositAccountNumber).then(
                    () => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    },
                    () => undefined
                  );
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2.5 py-1.5 rounded-xl bg-white border border-emerald-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? 'คัดลอกแล้ว' : 'คัดลอกเลขบัญชี'}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">โอนเงินก่อน แล้วกรอกรายการและแนบสลิปด้านล่าง</p>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: choose account */}
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {stepBadge(1)} เลือกบัญชีที่ต้องการฝาก
          </h3>

          {memberAccounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {memberAccounts.map((acc) => {
                const active = currentAccount?.accountNo === acc.accountNo;
                const special = acc.accountType === 'ออมทรัพย์พิเศษ';
                return (
                  <button
                    key={acc.accountNo}
                    type="button"
                    onClick={() => setSelectedAccountNo(acc.accountNo)}
                    className={`text-left rounded-2xl p-3.5 border-2 transition-all cursor-pointer ${
                      active
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          special ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {acc.accountType}
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          active ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}
                      >
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-sm font-bold text-slate-900 tracking-wide">
                      {formatAccountNo(acc.accountNo)}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{acc.accountName}</div>
                    <div className="mt-1.5 text-xs text-slate-500">
                      คงเหลือ{' '}
                      <span className="font-mono font-bold text-slate-800">฿{formatCurrency(acc.balance)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">ไม่พบบัญชีเงินฝากของสมาชิก</p>
          )}
        </section>

        {/* Step 2: amount */}
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {stepBadge(2)} จำนวนเงินฝาก <span className="text-rose-500">*</span>
          </h3>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white transition-all px-4 py-3 flex items-baseline justify-center gap-2">
            <span className="text-2xl font-bold text-slate-400">฿</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={handleAmountChange}
              className="w-full min-w-0 text-center text-4xl font-bold font-mono text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleSelectQuickAmount(amt)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all active:scale-95 cursor-pointer ${
                  numericAmount === amt
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700'
                }`}
              >
                {amt.toLocaleString()}
              </button>
            ))}
          </div>

          {numericAmount > 0 && (
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-100/70 text-xs text-slate-700 flex items-start gap-1.5">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span className="text-emerald-800 font-medium">{thaiBahtText(numericAmount)}</span>
              </div>
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
                <span>
                  ยอดหลังฝาก <span className="text-emerald-600/80">(เดิม ฿{formatCurrency(currentBalance)})</span>
                </span>
                <span className="font-bold font-mono text-base">฿{formatCurrency(newBalance)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Step 3: date and time */}
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {stepBadge(3)} วัน-เวลาที่โอน <span className="text-rose-500">*</span>
            </h3>
            <button
              type="button"
              onClick={setDateToNow}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              ใช้เวลาปัจจุบัน
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full pl-9 pr-2 py-3 text-xs font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="time"
                value={depositTime}
                onChange={(e) => setDepositTime(e.target.value)}
                className="w-full pl-9 pr-2 py-3 text-xs font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {depositDate && (
            <p className="text-[11px] text-slate-500">
              บันทึกเป็น:{' '}
              <span className="font-semibold text-slate-700">
                {formatThaiDateTime(`${depositDate}T${depositTime || '00:00'}`)}
              </span>
            </p>
          )}
        </section>

        {/* Step 4: slip */}
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {stepBadge(4)} แนบสลิปเงินโอน <span className="text-rose-500">*</span>
            </h3>
          </div>

          <FileUpload
            label="แนบสลิปเงินโอน"
            required
            value={slipFile}
            onChange={setSlipFile}
            helperText="ภาพสลิปจาก Mobile Banking (JPEG, PNG ไม่เกิน 5MB)"
          />

          <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>เจ้าหน้าที่จะตรวจสอบสลิปและปรับยอดเข้าบัญชีให้หลังอนุมัติ รายการจะแสดงสถานะ "รอตรวจสอบ" จนกว่าจะอนุมัติ</span>
          </p>

          <input
            type="text"
            placeholder="บันทึกช่วยจำ (ไม่บังคับ) เช่น ฝากสะสมประจำงวด"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
          />
        </section>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting || numericAmount <= 0}
            className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>กำลังบันทึก...</span>
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
