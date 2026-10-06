import React, { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Member, BankAccount, DigitalSignature, AttachedFile, TransactionRecord } from '../types';
import { THAI_BANKS } from '../data/banks';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, newRequestId } from '../utils/validators';
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
  // One id per form: a retry or double tap of the same submit is recognised by the server.
  const requestId = useRef<string>(newRequestId());
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
        requestId: requestId.current,
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

  const stepBadge = (n: number) => (
    <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );

  const cardCls = 'bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3';
  const inputCls =
    'w-full text-sm bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none';

  return (
    <div className="max-w-3xl mx-auto my-2 sm:my-4 space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-600 via-rose-700 to-pink-800 text-white p-5 shadow-xl shadow-rose-900/15">
        <div className="absolute -top-14 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">ถอนเงิน</h2>
            <p className="text-xs text-rose-100/90 truncate">
              {currentMember.fullName} • รหัสสมาชิก {currentMember.memberId}
            </p>
          </div>
        </div>
      </div>

      {/* Policy summary (collapsed by default) */}
      <details className="group bg-amber-50/70 border border-amber-200 rounded-3xl px-4 py-3 text-xs">
        <summary className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer list-none">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="flex-1">เงื่อนไขและระเบียบการถอนเงิน</span>
          <span className="text-[11px] font-medium text-amber-700 group-open:hidden">แตะเพื่อดู</span>
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
          <div className="p-2.5 rounded-2xl bg-white/80 border border-amber-200/60 space-y-1">
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-amber-600" /> วงเงินถอนออนไลน์
            </span>
            <p className="text-slate-600 leading-relaxed">
              ถอนได้ <strong>1,000 - 100,000 บาท/วัน</strong> (มากกว่า 100,000 บาท ต้องทำธุรกรรมที่สหกรณ์)
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/80 border border-amber-200/60 space-y-1">
            <span className="font-bold text-teal-900 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-teal-600" /> ออมทรัพย์พิเศษ
            </span>
            <p className="text-slate-600 leading-relaxed">
              ถอนฟรี <strong>1 ครั้ง/เดือน</strong> ครั้งที่ 2 คิดค่าธรรมเนียม <strong>ร้อยละ 3</strong>
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/80 border border-amber-200/60 space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ออมทรัพย์ปกติ
            </span>
            <p className="text-slate-600 leading-relaxed">
              ถอนได้ <strong>ไม่จำกัดครั้ง</strong> ไม่มีค่าธรรมเนียม
            </p>
          </div>
        </div>
      </details>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: account */}
        <section className={cardCls}>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {stepBadge(1)} เลือกบัญชีที่ต้องการถอน
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
                        ? 'border-rose-500 bg-rose-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-rose-300'
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
                          active ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
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

          {/* Monthly right + daily quota */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-600 font-medium">สิทธิ์ประจำเดือน:</span>
              {isSpecialSavings ? (
                monthlyWithdrawalCount === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> ถอนครั้งที่ 1 ของเดือน (ฟรีค่าธรรมเนียม)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-300 text-[11px]">
                    <AlertCircle className="w-3 h-3" /> ถอนครั้งที่ {monthlyWithdrawalCount + 1} ของเดือน (ค่าธรรมเนียม 3%)
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> ถอนได้ไม่จำกัดครั้ง (ไม่มีค่าธรรมเนียม)
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>วงเงินถอนออนไลน์วันนี้ (สูงสุด 100,000 บาท)</span>
                <span className="font-mono font-semibold text-slate-700">
                  เหลือ ฿{formatCurrency(remainingDailyQuota)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (todayWithdrawn / dailyLimit) * 100)}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-slate-400">ถอนไปแล้ววันนี้ ฿{formatCurrency(todayWithdrawn)}</div>
            </div>
          </div>
        </section>

        {/* Step 2: amount */}
        <section className={cardCls}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {stepBadge(2)} จำนวนเงินที่ถอน <span className="text-rose-500">*</span>
            </h3>
            <button
              type="button"
              onClick={handleWithdrawAll}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              ถอนสูงสุด ฿{formatCurrency(Math.min(currentBalance, remainingDailyQuota))}
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10 focus-within:bg-white transition-all px-4 py-3 flex items-baseline justify-center gap-2">
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
          <p className="text-center text-[11px] text-slate-400">ขั้นต่ำ 1,000 - สูงสุด 100,000 บาท/วัน</p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleSelectQuickAmount(amt)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all active:scale-95 cursor-pointer ${
                  numericAmount === amt
                    ? 'bg-rose-600 border-rose-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:text-rose-700'
                }`}
              >
                {amt.toLocaleString()}
              </button>
            ))}
          </div>

          {numericAmount > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-100/70 text-xs text-slate-700 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span className="text-rose-800 font-medium">{thaiBahtText(numericAmount)}</span>
            </div>
          )}

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

          {numericAmount > 0 && (
            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-hidden">
              <div className="flex justify-between items-center px-3.5 py-2.5 text-slate-600">
                <span>ยอดเงินที่ขอถอน</span>
                <span className="font-mono font-bold text-slate-900">฿{formatCurrency(numericAmount)}</span>
              </div>
              <div className="flex justify-between items-center px-3.5 py-2.5">
                <span className="flex items-center gap-1.5 text-slate-600">
                  ค่าธรรมเนียม
                  {feeRate > 0 ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                      3% (ครั้งที่ {monthlyWithdrawalCount + 1})
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                      ฟรี
                    </span>
                  )}
                </span>
                <span className={`font-mono font-bold ${fee > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  ฿{formatCurrency(fee)}
                </span>
              </div>
              <div className="flex justify-between items-center px-3.5 py-3 bg-rose-50 text-slate-900 font-bold">
                <span>ยอดรวมที่หักจากบัญชี</span>
                <span className="font-mono text-rose-700 text-base">฿{formatCurrency(totalDeduction)}</span>
              </div>
              <div className="flex justify-between items-center px-3.5 py-2.5 text-[11px]">
                <span className="text-slate-500">คงเหลือสุทธิหลังถอน</span>
                <span className={`font-mono font-bold ${remainingBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ฿{formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Step 3: destination */}
        <section className={cardCls}>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {stepBadge(3)} บัญชีปลายทางสำหรับรับเงินโอน
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                ธนาคาร <span className="text-rose-500">*</span>
              </label>
              <select
                value={destinationBank}
                onChange={(e) => setDestinationBank(e.target.value)}
                className={inputCls}
              >
                {THAI_BANKS.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                เลขที่บัญชี <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="เช่น 123-4-56789-0"
                value={destinationAccountNo}
                onChange={(e) => setDestinationAccountNo(e.target.value)}
                className={`${inputCls} font-mono`}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                ชื่อบัญชี <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={destinationAccountName}
                onChange={(e) => setDestinationAccountName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>
        </section>

        {/* Step 4: documents */}
        <section className={cardCls}>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {stepBadge(4)} แนบเอกสารประกอบ <span className="text-rose-500">*</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 ml-8">
              อัปโหลดเอกสารทั้ง 3 รายการเพื่อจัดทำใบถอนเงินออนไลน์
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FileUpload
              label="1. แนบบัตรประชาชน"
              helperText="สำเนาบัตรประชาชนตัวจริง"
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
              label="3. แนบสมุดบัญชีธนาคาร"
              helperText="หน้าสมุดบัญชีธนาคารปลายทาง"
              value={destinationPassbookFile}
              onChange={setDestinationPassbookFile}
              required
            />
          </div>
        </section>

        {/* Step 5: signatures and note */}
        <section className={cardCls}>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {stepBadge(5)} ลายมือชื่ออิเล็กทรอนิกส์ <span className="text-rose-500">*</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 ml-8">
              ลงลายมือชื่อด้วยนิ้วหรือปากกา Stylus เพื่อประทับบนใบถอนเงิน
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SignaturePad
                label="ลายมือชื่อเจ้าของบัญชี"
                role="owner"
                signerName={currentMember.fullName}
                onSave={setOwnerSignature}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={sameAsOwner}
                  onChange={(e) => setSameAsOwner(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span>ผู้รับเงินเป็นคนเดียวกับเจ้าของบัญชี</span>
              </label>

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

          <input
            type="text"
            placeholder="บันทึกช่วยจำ / วัตถุประสงค์การถอน (ไม่บังคับ)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
          />
        </section>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-2">
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
              disabled={isSubmitting || numericAmount < 1000 || numericAmount > 100000}
              className="px-8 py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>ยืนยันการถอนเงิน ฿{numericAmount > 0 ? formatCurrency(totalDeduction) : '0.00'}</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            ยอดเงินจะถูกหักจากบัญชีและบันทึกลงในทะเบียนธุรกรรมสหกรณ์ทันที
          </p>
        </div>
      </form>
    </div>
  );
};
