import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Member, BankAccount, DigitalSignature, AttachedFile, TransactionRecord } from '../types';
import { THAI_BANKS } from '../data/mockData';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo } from '../utils/validators';
import { StorageService } from '../services/storageService';
import { SignaturePad } from './SignaturePad';
import { FileUpload } from './FileUpload';
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Landmark,
  Building2,
  Percent,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface WithdrawFormProps {
  currentMember: Member;
  accounts: BankAccount[];
  initialAccount?: BankAccount | null;
  onSuccess: (txn: TransactionRecord) => void;
  onCancel: () => void;
}

export const WithdrawForm: React.FC<WithdrawFormProps> = ({
  currentMember,
  accounts,
  initialAccount,
  onSuccess,
  onCancel,
}) => {
  // Member's accounts
  const memberAccounts = accounts.filter((a) => a.memberId === currentMember.memberId);
  const defaultAccount = initialAccount || memberAccounts[0] || accounts[0];

  const [selectedAccountNo, setSelectedAccountNo] = useState<string>(
    defaultAccount ? defaultAccount.accountNo : ''
  );

  const currentAccount =
    memberAccounts.find((a) => a.accountNo === selectedAccountNo) || defaultAccount;

  // Form Fields
  const [amountInput, setAmountInput] = useState<string>('');
  const [destinationBank, setDestinationBank] = useState<string>(THAI_BANKS[0].name);
  const [destinationAccountNo, setDestinationAccountNo] = useState<string>('');
  const [destinationAccountName, setDestinationAccountName] = useState<string>(
    currentMember.fullName
  );
  const [note, setNote] = useState<string>('');

  // Signatures
  const [ownerSignature, setOwnerSignature] = useState<DigitalSignature | null>(null);
  const [recipientSignature, setRecipientSignature] = useState<DigitalSignature | null>(null);
  const [sameAsOwner, setSameAsOwner] = useState<boolean>(true);

  // Attachments
  const [idCardFile, setIdCardFile] = useState<AttachedFile | null>(null);
  const [sourcePassbookFile, setSourcePassbookFile] = useState<AttachedFile | null>(null);
  const [destinationPassbookFile, setDestinationPassbookFile] = useState<AttachedFile | null>(null);

  // States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Business Rules Calculations
  const numericAmount = parseFloat(amountInput) || 0;
  const currentBalance = currentAccount ? currentAccount.balance : 0;

  // Rule 1: Daily limit tracking (1,000 - 100,000 บาท/วัน)
  const dailyLimit = 100000;
  const todayWithdrawn = StorageService.getMemberDailyWithdrawalTotal(currentMember.memberId);
  const remainingDailyQuota = Math.max(0, dailyLimit - todayWithdrawn);

  // Rule 2 & 3: Account type fee rules
  const isSpecialSavings = currentAccount?.accountType === 'ออมทรัพย์พิเศษ';
  const monthlyWithdrawalCount = currentAccount
    ? StorageService.getMonthlyAccountWithdrawalCount(currentAccount.accountNo)
    : 0;

  // Special Savings: 1 free withdrawal/month, 2nd onward = 3% fee
  // Regular Savings: unlimited, 0 fee
  const feeRate = isSpecialSavings && monthlyWithdrawalCount >= 1 ? 3 : 0;
  const fee = feeRate > 0 ? Math.round(numericAmount * 0.03 * 100) / 100 : 0;
  const totalDeduction = numericAmount + fee;
  const remainingBalance = currentBalance - totalDeduction;

  // Quick amount buttons
  const quickAmounts = [1000, 3000, 5000, 10000, 20000, 50000, 100000];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setAmountInput(val);
    setError(null);
  };

  const handleSelectQuickAmount = (amt: number) => {
    setAmountInput(String(amt));
    setError(null);
  };

  const handleWithdrawAll = () => {
    // Withdraw up to available balance or daily remaining quota
    const maxPossible = Math.min(currentBalance, remainingDailyQuota);
    setAmountInput(String(Math.floor(maxPossible)));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentAccount) {
      setError('ไม่พบข้อมูลบัญชีเงินฝากที่เลือก');
      return;
    }

    // Condition 1: Minimum 1,000 THB
    if (numericAmount < 1000) {
      setError('ยอดถอนเงินขั้นต่ำ 1,000 บาท (เงื่อนไข: วงเงินถอนออนไลน์ 1,000 - 100,000 บาท/วัน)');
      return;
    }

    // Condition 2: Maximum online withdrawal 100,000 THB/day
    if (numericAmount > 100000) {
      setError(
        'ยอดเงินที่ถอนเกิน 100,000 บาท สำหรับยอดเงินมากกว่า 100,000 บาท ต้องติดต่อทำธุรกรรมด้วยตนเอง ณ ที่ทำการสหกรณ์'
      );
      return;
    }

    if (todayWithdrawn + numericAmount > dailyLimit) {
      setError(
        `วงเงินถอนออนไลน์จำกัดสูงสุด 100,000 บาท/วัน (วันนี้ท่านถอนไปแล้ว ฿${formatCurrency(
          todayWithdrawn
        )} คงเหลือวงเงินที่ถอนได้อีก ฿${formatCurrency(
          remainingDailyQuota
        )}) หากต้องการถอนมากกว่า 100,000 บาท ต้องติดต่อทำธุรกรรมด้วยตนเอง ณ ที่ทำการสหกรณ์`
      );
      return;
    }

    // Sufficient balance check including fee
    if (totalDeduction > currentBalance) {
      setError(
        `ยอดเงินในบัญชีไม่เพียงพอสำหรับการถอน (ยอดถอน ฿${formatCurrency(numericAmount)}${
          fee > 0 ? ` + ค่าธรรมเนียม 3% ฿${formatCurrency(fee)}` : ''
        } = รวมหัก ฿${formatCurrency(totalDeduction)} แต่ยอดคงเหลือในบัญชีมีเพียง ฿${formatCurrency(
          currentBalance
        )})`
      );
      return;
    }

    if (!destinationAccountNo.trim()) {
      setError('กรุณาระบุหมายเลขบัญชีธนาคารปลายทาง');
      return;
    }

    if (!destinationAccountName.trim()) {
      setError('กรุณาระบุชื่อบัญชีธนาคารปลายทาง');
      return;
    }

    if (!ownerSignature) {
      setError('กรุณาลงนามในช่อง "ลายเซ็นเจ้าของบัญชี" ให้ครบถ้วน');
      return;
    }

    const actualRecipientSig = sameAsOwner
      ? {
          ...ownerSignature,
          signerRole: 'recipient' as const,
          signerName: destinationAccountName || currentMember.fullName,
        }
      : recipientSignature;

    if (!actualRecipientSig) {
      setError('กรุณาลงนามในช่อง "ลายเซ็นผู้รับเงิน" ให้ครบถ้วน');
      return;
    }

    // Required attachments check
    if (!idCardFile) {
      setError('กรุณาแนบเอกสาร "สำเนาบัตรประชาชน" (ขนาดไม่เกิน 5MB)');
      return;
    }

    if (!sourcePassbookFile) {
      setError('กรุณาแนบเอกสาร "สำเนาใบแจ้งยอดบัญชีเงินฝาก / สมุดบัญชีต้นทาง"');
      return;
    }

    if (!destinationPassbookFile) {
      setError('กรุณาแนบเอกสาร "สำเนาใบแจ้งยอดบัญชีรับเงิน / หน้าสมุดบัญชีปลายทาง"');
      return;
    }

    setIsSubmitting(true);

    void (async () => {
      const now = new Date();
      const result = await StorageService.submitTransaction('withdraw', {
        type: 'withdraw',
        accountNo: currentAccount.accountNo,
        accountName: currentAccount.accountName,
        accountType: currentAccount.accountType,
        memberId: currentMember.memberId,
        citizenId: currentMember.citizenId,
        amount: numericAmount,
        fee: fee > 0 ? fee : 0,
        feeRate: feeRate > 0 ? feeRate : 0,
        totalDeduction,
        monthlyWithdrawalCount: monthlyWithdrawalCount + 1,
        dateTime: now.toISOString().replace('T', ' ').slice(0, 16),
        status: 'completed',
        destinationBank,
        destinationAccountNo,
        destinationAccountName,
        ownerSignature,
        recipientSignature: actualRecipientSig,
        attachments: {
          idCard: idCardFile,
          sourcePassbook: sourcePassbookFile,
          destinationPassbook: destinationPassbookFile,
        },
        note: `${note ? note + ' ' : ''}${
          fee > 0
            ? `(ค่าธรรมเนียมถอนเงินออมทรัพย์พิเศษครั้งที่ ${monthlyWithdrawalCount + 1} ในเดือน 3%: ฿${formatCurrency(fee)})`
            : '(ไม่มีค่าธรรมเนียม)'
        }`,
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
        setError(result.error || 'เกิดข้อผิดพลาดในการบันทึกรายการถอนเงิน');
      }
    })();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 text-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">แบบฟอร์มการถอนเงินออนไลน์</h2>
              <p className="text-xs text-rose-100">
                ระบบสหกรณ์ออมทรัพย์ / กองทุนการเงิน (ยืนยันสิทธิ์สมาชิก {currentMember.memberId})
              </p>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
            ถอนเงิน (Withdrawal)
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
        {/* Policy Conditions Callout Box */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>เงื่อนไขและระเบียบการถอนเงินสหกรณ์:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/60 space-y-1">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-amber-600" />
                1. วงเงินถอนออนไลน์
              </span>
              <p className="text-slate-600 leading-relaxed">
                ถอนได้ <strong>1,000 - 100,000 บาท/วัน</strong> (มากกว่า 100,000 บาท ต้องทำธุรกรรมที่สหกรณ์)
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/60 space-y-1">
              <span className="font-bold text-teal-900 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-teal-600" />
                2. บัญชีออมทรัพย์พิเศษ
              </span>
              <p className="text-slate-600 leading-relaxed">
                ถอนได้ฟรี <strong>1 ครั้ง/เดือน</strong> ครั้งที่ 2 คิดค่าธรรมเนียม <strong>ร้อยละ 3</strong> ของยอดถอน
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/60 space-y-1">
              <span className="font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                3. บัญชีออมทรัพย์ปกติ
              </span>
              <p className="text-slate-600 leading-relaxed">
                ถอนได้ <strong>ไม่จำกัดครั้ง</strong> และ <strong>ไม่มีค่าธรรมเนียม</strong> (ฟรี 0 บาท)
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: ข้อมูลที่ถูกดึงโดยอัตโนมัติหลังจากเข้าสู่ระบบ */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ข้อมูลบัญชีที่ดึงโดยอัตโนมัติ
            </span>
            {memberAccounts.length > 1 && (
              <span className="text-[11px] text-slate-500">
                มี {memberAccounts.length} บัญชี (เลือกบัญชีที่ต้องการ)
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
                  className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
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

            {/* ประเภทบัญชี & โควตา */}
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

          {/* Account Policy Quota Indicator */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">สิทธิ์การถอนประจำเดือน:</span>
              {isSpecialSavings ? (
                monthlyWithdrawalCount === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    ถอนครั้งที่ 1 ของเดือน (ได้รับสิทธิ์ฟรีค่าธรรมเนียม)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-300 text-[11px]">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    ถอนครั้งที่ {monthlyWithdrawalCount + 1} ของเดือนนี้ (คิดค่าธรรมเนียม 3%)
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ถอนได้ไม่จำกัดครั้ง (ไม่มีค่าธรรมเนียม)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">ยอดเงินในบัญชี:</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                ฿{formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* Daily Quota Progress Bar */}
          <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between items-center">
              <span>วงเงินถอนออนไลน์วันนี้ (จำกัด 100,000 บาท/วัน):</span>
              <span className="font-mono font-semibold text-slate-700">
                ถอนแล้ว ฿{formatCurrency(todayWithdrawn)} / คงเหลือ ฿{formatCurrency(remainingDailyQuota)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (todayWithdrawn / dailyLimit) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Section 2: จำนวนเงินที่ถอน */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              จำนวนเงินที่ถอน (บาท) <span className="text-rose-500">*</span>
              <span className="text-[11px] font-normal text-slate-400">
                (ขั้นต่ำ 1,000 - สูงสุด 100,000 บาท/วัน)
              </span>
            </label>
            <button
              type="button"
              onClick={handleWithdrawAll}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium underline cursor-pointer"
            >
              ถอนสูงสุดที่ทำได้ (฿{formatCurrency(Math.min(currentBalance, remainingDailyQuota))})
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
              ฿
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="1,000 - 100,000"
              value={amountInput}
              onChange={handleAmountChange}
              className="w-full pl-9 pr-4 py-3 text-lg font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all tracking-wide"
              required
            />
          </div>

          {/* Thai Baht text representation */}
          {numericAmount > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-700 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">จำนวนเงินตัวอักษร:</span>{' '}
                <span className="text-rose-800 font-medium">{thaiBahtText(numericAmount)}</span>
              </div>
            </div>
          )}

          {/* Alert if amount > 100,000 THB */}
          {numericAmount > 100000 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span>การถอนเงินมากกว่า 100,000 บาท ต้องทำธุรกรรม ณ สำนักงานสหกรณ์</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                ตามระเบียบสหกรณ์ การถอนเงินเกิน 100,000 บาท ไม่สามารถทำรายการผ่านระบบออนไลน์ได้ สมาชิกต้องติดต่อทำธุรกรรมด้วยตนเอง ณ ที่ทำการสหกรณ์ออมทรัพย์สาธารณสุขจังหวัดมุกดาหาร จำกัด พร้อมนำสมุดบัญชีเงินฝากและบัตรประชาชนตัวจริงมาแสดง (โทรสอบถาม: 088-5578567, 042-633587)
              </p>
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
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-mono transition-all cursor-pointer"
              >
                +{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Dynamic Fee & Net Deduction Breakdown Card */}
          {numericAmount > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>ยอดเงินที่ขอถอน:</span>
                <span className="font-mono font-bold text-slate-900">
                  ฿{formatCurrency(numericAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-600">
                  <span>ค่าธรรมเนียมการถอน</span>
                  {feeRate > 0 ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                      3% (ออมทรัพย์พิเศษครั้งที่ {monthlyWithdrawalCount + 1})
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                      ฟรี (0 บาท)
                    </span>
                  )}
                  :
                </span>
                <span
                  className={`font-mono font-bold ${
                    fee > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  ฿{formatCurrency(fee)}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-slate-900 font-bold">
                <span>ยอดรวมที่หักจากบัญชี (ยอดถอน + ค่าธรรมเนียม):</span>
                <span className="font-mono text-rose-700 text-sm">
                  ฿{formatCurrency(totalDeduction)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-500">ยอดเงินคงเหลือสุทธิหลังถอน:</span>
                <span
                  className={`font-mono font-bold ${
                    remainingBalance < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  ฿{formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: โอนเข้าบัญชี และ ชื่อบัญชี */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-rose-600" />
            ข้อมูลบัญชีปลายทางสำหรับรับเงินโอน
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* โอนเข้าธนาคาร */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                ธนาคารปลายทาง <span className="text-rose-500">*</span>
              </label>
              <select
                value={destinationBank}
                onChange={(e) => setDestinationBank(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {THAI_BANKS.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* เลขที่บัญชีปลายทาง */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                เลขที่บัญชีปลายทาง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น 123-4-56789-0"
                value={destinationAccountNo}
                onChange={(e) => setDestinationAccountNo(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            {/* ชื่อบัญชีปลายทาง */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                ชื่อบัญชีปลายทาง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={destinationAccountName}
                onChange={(e) => setDestinationAccountName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 4: แนบเอกสารหลักฐานสำคัญ (3 จุดตามแบบฟอร์มสหกรณ์) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              แนบเอกสารหลักฐานสำคัญประกอบการถอนเงิน <span className="text-rose-500">*</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              กรุณาอัปโหลดเอกสารทั้ง 3 รายการเพื่อประกอบการจัดทำใบถอนเงินออนไลน์ทางการ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FileUpload
              label="1. แนบบัตรประชาชน"
              helperText="สำเนาบัตรประชาชนตัวจริง (วางตรงหรือเอียงแนวนี้ได้)"
              value={idCardFile}
              onChange={setIdCardFile}
              required
            />

            <FileUpload
              label="2. แนบสมุดบัญชีสหกรณ์"
              helperText="หน้าสมุดบัญชีเงินฝากสหกรณ์ต้นทาง"
              value={sourcePassbookFile}
              onChange={setSourcePassbookFile}
              required
            />

            <FileUpload
              label="3. แนบสมุดบัญชีเงินฝากธนาคาร"
              helperText="หน้าสมุดบัญชีธนาคารปลายทางรับเงินโอน"
              value={destinationPassbookFile}
              onChange={setDestinationPassbookFile}
              required
            />
          </div>
        </div>

        {/* Section 5: ลายมือชื่ออิเล็กทรอนิกส์ (Digital Signature) */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              ลายมือชื่ออิเล็กทรอนิกส์ (Digital Signatures){' '}
              <span className="text-rose-500">*</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ลงลายมือชื่อด้วยนิ้วหรือปากกา Stylus ลงบนหน้าจอเพื่อใช้ประทับบนใบถอนเงินออนไลน์
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Signature 1: ลายมือชื่อเจ้าของบัญชี */}
            <div>
              <SignaturePad
                label="ลายมือชื่อเจ้าของบัญชี"
                role="owner"
                signerName={currentMember.fullName}
                onSave={setOwnerSignature}
                required
              />
            </div>

            {/* Signature 2: ลายมือชื่อผู้รับเงิน */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsOwner}
                    onChange={(e) => setSameAsOwner(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>ผู้รับเงินเป็นคนเดียวกับเจ้าของบัญชี</span>
                </label>
              </div>

              {!sameAsOwner ? (
                <SignaturePad
                  label="ลายมือชื่อผู้รับเงิน"
                  role="recipient"
                  signerName={destinationAccountName || 'ผู้รับเงิน'}
                  onSave={setRecipientSignature}
                  required
                />
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[140px]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
                  <span className="font-semibold text-slate-800">
                    ใช้ลายมือชื่อเจ้าของบัญชีเป็นผู้รับเงินโดยอัตโนมัติ
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    "ข้าพเจ้าได้รับเงินครบถ้วนและถูกต้องแล้ว"
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 6: บันทึกข้อความเพิ่มเติม */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 block">
            บันทึกช่วยจำ / วัตถุประสงค์การถอน (ไม่บังคับ):
          </label>
          <input
            type="text"
            placeholder="เช่น ค่าใช้จ่ายประจำเดือน, ค่ารักษาพยาบาล, ชำระหนี้สิน"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            * ยอดเงินจะถูกหักจากบัญชีและบันทึกลงในทะเบียนธุรกรรมสหกรณ์ทันที
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting || numericAmount < 1000 || numericAmount > 100000}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>กำลังบันทึกรายการ...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>
                    ยืนยันการถอนเงิน ฿
                    {numericAmount > 0 ? formatCurrency(totalDeduction) : '0.00'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
