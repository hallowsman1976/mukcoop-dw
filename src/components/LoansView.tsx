import React, { useState } from 'react';
import { LoanContract, LoanInstallment, Member, BankAccount, TransactionRecord } from '../types';
import { StorageService } from '../services/storageService';
import { formatCurrency } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDate } from '../utils/validators';
import confetti from 'canvas-confetti';
import {
  Coins,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calculator,
  Percent,
  Download,
  Printer,
  X,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Wallet,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Building2,
  Upload,
} from 'lucide-react';

interface LoansViewProps {
  currentMember: Member | null;
  accounts: BankAccount[];
  transactions: TransactionRecord[];
  onRefreshData: () => void;
  onOpenFlexModal?: (txn: TransactionRecord) => void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  currentMember,
  accounts,
  transactions,
  onRefreshData,
  onOpenFlexModal,
}) => {
  const [loans, setLoans] = useState<LoanContract[]>(() => {
    if (!currentMember) return StorageService.getLoans();
    return StorageService.getLoansByMember(currentMember.memberId);
  });

  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    loans[0]?.id || ''
  );

  // Active Tab: 'contracts' | 'calculator'
  const [activeTab, setActiveTab] = useState<'contracts' | 'calculator'>('contracts');

  // Repayment Modal
  const [repayingLoan, setRepayingLoan] = useState<LoanContract | null>(null);
  const [selectedInstallmentNo, setSelectedInstallmentNo] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'transfer'>('account');
  const [selectedAccountNo, setSelectedAccountNo] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    loan: LoanContract;
    installment: LoanInstallment;
    txn: TransactionRecord;
  } | null>(null);

  // Loan Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(100000);
  const [calcRate, setCalcRate] = useState<number>(5.5);
  const [calcMonths, setCalcMonths] = useState<number>(24);

  // Selected loan details
  const selectedLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];

  // Member Accounts
  const memberAccounts = currentMember
    ? accounts.filter((a) => a.memberId === currentMember.memberId)
    : accounts;

  // Refresh local loans state
  const refreshLoans = () => {
    if (!currentMember) {
      setLoans(StorageService.getLoans());
    } else {
      setLoans(StorageService.getLoansByMember(currentMember.memberId));
    }
  };

  // Open Repayment Modal
  const handleOpenRepayModal = (loan: LoanContract, installmentNo?: number) => {
    setRepayingLoan(loan);
    const targetNo = installmentNo || loan.nextDueInstallmentNo || 1;
    setSelectedInstallmentNo(targetNo);
    setSelectedAccountNo(memberAccounts[0]?.accountNo || loan.accountNo);
    setPaymentReceipt(null);
  };

  // Submit Repayment
  const handleSubmitRepayment = () => {
    if (!repayingLoan) return;

    const installment = repayingLoan.installments.find(
      (ins) => ins.installmentNo === selectedInstallmentNo
    );
    if (!installment) return;

    setIsProcessingPayment(true);

    setTimeout(() => {
      const result = StorageService.payLoanInstallment(
        repayingLoan.id,
        selectedInstallmentNo,
        paymentMethod,
        selectedAccountNo
      );

      setIsProcessingPayment(false);

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

        refreshLoans();
        onRefreshData();

        // Show receipt view
        setPaymentReceipt({
          loan: repayingLoan,
          installment,
          txn: result.transaction,
        });
      } else {
        alert(result.message || 'เกิดข้อผิดพลาดในการชำระค่างวด');
      }
    }, 600);
  };

  // Calculator monthly installment calculation (Flat Rate/Reducing Balance approximation)
  const calcMonthlyPayment = () => {
    const monthlyRate = calcRate / 100 / 12;
    if (monthlyRate === 0) return calcAmount / calcMonths;
    const payment =
      (calcAmount * monthlyRate * Math.pow(1 + monthlyRate, calcMonths)) /
      (Math.pow(1 + monthlyRate, calcMonths) - 1);
    return Math.round(payment);
  };

  const calcTotalPayment = () => calcMonthlyPayment() * calcMonths;
  const calcTotalInterest = () => calcTotalPayment() - calcAmount;

  // Portfolio Totals
  const totalPrincipalAll = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalRemainingAll = loans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalPaidPrincipalAll = loans.reduce((sum, l) => sum + l.totalPaidPrincipal, 0);
  const overallProgressPercent =
    totalPrincipalAll > 0
      ? Math.round((totalPaidPrincipalAll / totalPrincipalAll) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <b>ข้อมูลทดลอง:</b> ส่วนสินเชื่อยังไม่เชื่อมกับฐานข้อมูลจริง การชำระค่างวดในหน้านี้ไม่ตัดยอดบัญชีเงินฝากและไม่ถูกบันทึกในระบบสหกรณ์
        </span>
      </div>

      {/* Header / portfolio summary */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-900 text-white p-5 sm:p-7 shadow-xl shadow-indigo-900/20">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-blue-300/20 blur-3xl pointer-events-none"></div>

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">สินเชื่อและการผ่อนชำระ</h2>
            <p className="text-xs text-indigo-100/90">
              {loans.length > 0 ? `${loans.length} สัญญา • ติดตามยอดหนี้และชำระค่างวดออนไลน์` : 'ติดตามยอดหนี้ และจำลองการกู้เงิน'}
            </p>
          </div>
        </div>

        {loans.length > 0 && (
          <div className="relative mt-5">
            <p className="text-xs text-indigo-100/90">ยอดหนี้คงเหลือรวม</p>
            <div className="mt-0.5 text-4xl font-bold font-mono tracking-tight">
              <span className="text-2xl text-indigo-200 mr-1">฿</span>
              {formatCurrency(totalRemainingAll)}
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-indigo-100">
                <span>ชำระเงินต้นแล้ว ฿{formatCurrency(totalPaidPrincipalAll)}</span>
                <span className="font-mono font-bold text-white">{overallProgressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-300 to-teal-300 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgressPercent}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-indigo-200">วงเงินกู้รวม ฿{formatCurrency(totalPrincipalAll)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Sub navigation */}
      <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('contracts')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'contracts' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          สัญญาเงินกู้ของฉัน ({loans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'calculator' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>คำนวณสินเชื่อ</span>
        </button>
      </div>

      {/* CONTRACTS VIEW */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          {loans.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">ไม่พบสัญญาเงินกู้ที่กำลังผ่อนชำระ</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ท่านไม่มีภาระหนี้สินเชื่อกับสหกรณ์ในขณะนี้ ท่านสามารถใช้เครื่องคำนวณสินเชื่อเพื่อวางแผนยื่นกู้ได้
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>จำลองการกู้เงิน</span>
              </button>
            </div>
          ) : (
            <>
              {/* Loan Contract Selector Tabs if multiple */}
              {loans.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {loans.map((loan) => (
                    <button
                      key={loan.id}
                      type="button"
                      onClick={() => setSelectedLoanId(loan.id)}
                      className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                        selectedLoan?.id === loan.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{loan.loanType}</span>
                      <span className="font-mono opacity-70 ml-1.5">({loan.contractNo})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Loan Spotlight Card */}
              {selectedLoan && (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-6 shadow-sm space-y-5">
                  {/* Contract Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {selectedLoan.loanType}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500">
                          สัญญาเลขที่ {selectedLoan.contractNo}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          สถานะ: ปกติ (Active)
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedLoan.purpose || 'สินเชื่อสวัสดิการสหกรณ์'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        ผู้กู้: <strong>{selectedLoan.borrowerName}</strong> • บัญชีหักชำระ:{' '}
                        <span className="font-mono">{formatAccountNo(selectedLoan.accountNo)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenRepayModal(selectedLoan)}
                        className="w-full sm:w-auto justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-md shadow-emerald-700/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>ชำระค่างวดออนไลน์ (งวดที่ {selectedLoan.nextDueInstallmentNo})</span>
                      </button>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-400 text-[11px] block">วงเงินต้นตามสัญญา</span>
                      <span className="text-sm font-bold font-mono text-slate-900 block mt-1">
                        ฿{formatCurrency(selectedLoan.principalAmount)}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        อัตราดอกเบี้ย: {selectedLoan.interestRate}% ต่อปี
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                      <span className="text-amber-800 text-[11px] block font-medium">
                        ยอดเงินต้นคงค้าง (Balance)
                      </span>
                      <span className="text-sm font-bold font-mono text-amber-950 block mt-1">
                        ฿{formatCurrency(selectedLoan.remainingBalance)}
                      </span>
                      <span className="text-[10px] text-amber-700 mt-1 block">
                        ชำระแล้ว {selectedLoan.paidInstallmentsCount} จาก {selectedLoan.termMonths} งวด
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-400 text-[11px] block">ค่างวดที่ต้องชำระรายเดือน</span>
                      <span className="text-sm font-bold font-mono text-slate-900 block mt-1">
                        ฿{formatCurrency(selectedLoan.monthlyInstallment)}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        หักชำระทุกวันที่ 25 ของเดือน
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                      <span className="text-emerald-800 text-[11px] block font-medium">
                        กำหนดชำระงวดถัดไป
                      </span>
                      <span className="text-sm font-bold text-emerald-950 block mt-1">
                        {formatThaiDate(selectedLoan.nextDueDate)}
                      </span>
                      <span className="text-[10px] text-emerald-700 mt-1 block">
                        งวดที่ {selectedLoan.nextDueInstallmentNo} (฿{formatCurrency(selectedLoan.monthlyInstallment)})
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        ความก้าวหน้าการชำระคืนหนี้เงินกู้ (Repayment Progress)
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedLoan.paidInstallmentsCount} / {selectedLoan.termMonths} งวด (
                        {Math.round(
                          (selectedLoan.paidInstallmentsCount / selectedLoan.termMonths) * 100
                        )}
                        %)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.round(
                            (selectedLoan.paidInstallmentsCount / selectedLoan.termMonths) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Installments */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-slate-900">แผนการผ่อนชำระรายงวด</h4>
                      </div>
                      <span className="text-slate-400">{selectedLoan.installments.length} งวด</span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
                      {selectedLoan.installments.map((ins) => {
                        const paid = ins.status === 'paid';
                        const isNext = !paid && ins.installmentNo === selectedLoan.nextDueInstallmentNo;
                        return (
                          <div
                            key={ins.installmentNo}
                            className={`flex items-center gap-3 px-3.5 py-3 ${isNext ? 'bg-amber-50/60' : 'bg-white'}`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                                paid
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isNext
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {paid ? <CheckCircle2 className="w-4 h-4" /> : ins.installmentNo}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-800">งวดที่ {ins.installmentNo}</span>
                                {paid ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                    ชำระแล้ว
                                  </span>
                                ) : isNext ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                    <Clock className="w-2.5 h-2.5" /> งวดถัดไป
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    รอชำระ
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono">
                                ครบกำหนด {ins.dueDate} • ต้น ฿{formatCurrency(ins.principal)} • ดอก ฿
                                {formatCurrency(ins.interest)}
                              </p>
                              {ins.txnRef && (
                                <p className="text-[10px] font-mono text-indigo-600">
                                  {ins.txnRef} {ins.receiptNo && `• ${ins.receiptNo}`}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0 space-y-1">
                              <div className="text-sm font-bold font-mono text-slate-900">
                                ฿{formatCurrency(ins.totalAmount)}
                              </div>
                              {!paid && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRepayModal(selectedLoan, ins.installmentNo)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  ชำระ
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* LOAN CALCULATOR TAB */}
      {activeTab === 'calculator' && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-7 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <span>เครื่องมือคำนวณและจำลองสินเชื่อเงินกู้ (Loan Simulator)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              วางแผนการเงิน คำนวณค่างวดรายเดือนและดอกเบี้ยรวมตามจำนวนเงินที่ต้องการกู้
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Controls */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">วงเงินที่ต้องการกู้ (บาท):</label>
                  <span className="font-mono font-bold text-sm text-indigo-700">
                    ฿{formatCurrency(calcAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10,000 บาท</span>
                  <span>500,000 บาท</span>
                  <span>1,000,000 บาท</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">ระยะเวลาผ่อนชำระ (เดือน):</label>
                  <span className="font-mono font-bold text-sm text-indigo-700">
                    {calcMonths} เดือน ({Math.round((calcMonths / 12) * 10) / 10} ปี)
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[12, 24, 36, 48, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCalcMonths(m)}
                      className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        calcMonths === m
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {m} ด.
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">อัตราดอกเบี้ยต่อปี (%):</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'สินเชื่อสวัสดิการ (4.5%)', rate: 4.5 },
                    { label: 'สินเชื่อสามัญ (5.5%)', rate: 5.5 },
                    { label: 'สินเชื่อเคหะ (4.25%)', rate: 4.25 },
                  ].map((item) => (
                    <button
                      key={item.rate}
                      type="button"
                      onClick={() => setCalcRate(item.rate)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        calcRate === item.rate
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px]">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Output Box */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  ประมาณการยอดผ่อนชำระ
                </span>

                <div>
                  <span className="text-xs text-slate-300 block">ยอดผ่อนชำระต่อเดือน (โดยประมาณ):</span>
                  <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                    ฿{formatCurrency(calcMonthlyPayment())}
                    <span className="text-xs font-normal text-slate-300 ml-1.5">/ เดือน</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-indigo-900/80 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">เงินต้นทั้งหมด:</span>
                    <span className="font-mono font-bold text-white mt-0.5 block">
                      ฿{formatCurrency(calcAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">ดอกเบี้ยรวมตลอดสัญญา:</span>
                    <span className="font-mono font-bold text-amber-400 mt-0.5 block">
                      ฿{formatCurrency(calcTotalInterest())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-900/80 text-center space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      `ระบบได้รับข้อมูลการจำลองสินเชื่อ ${calcAmount.toLocaleString()} บาท เรียบร้อยแล้ว เจ้าหน้าที่ฝ่ายสินเชื่อจะติดต่อกลับทางเบอร์โทรศัพท์ที่ลงทะเบียนไว้`
                    )
                  }
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-emerald-700/30 cursor-pointer"
                >
                  ส่งคำขอสมัครสินเชื่อออนไลน์ผ่านระบบ LINE
                </button>
                <p className="text-[10px] text-slate-400">
                  * การอนุมัติวงเงินเป็นไปตามเกณฑ์และระเบียบเงินกู้ของสหกรณ์
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPAYMENT MODAL */}
      {repayingLoan && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
          onClick={() => {
            if (!isProcessingPayment) setRepayingLoan(null);
          }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl sm:my-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {paymentReceipt ? (
              /* RECEIPT VIEW */
              <div className="p-6 space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    ชำระค่างวดสินเชื่อสำเร็จ
                  </h3>
                  <p className="text-xs text-slate-500">
                    ระบบได้บันทึกการชำระเงินและออกใบเสร็จรับเงินเรียบร้อยแล้ว
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">เลขที่ใบเสร็จ:</span>
                    <span className="font-bold text-slate-900">{paymentReceipt.installment.receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">รหัสอ้างอิงธุรกรรม:</span>
                    <span className="font-bold text-indigo-700">{paymentReceipt.txn.refCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">สัญญาเงินกู้:</span>
                    <span className="text-slate-900">{paymentReceipt.loan.contractNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ชำระงวดที่:</span>
                    <span className="text-slate-900">
                      {paymentReceipt.installment.installmentNo} / {paymentReceipt.loan.termMonths}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เงินต้น / ดอกเบี้ย:</span>
                    <span className="text-slate-900">
                      ฿{formatCurrency(paymentReceipt.installment.principal)} / ฿
                      {formatCurrency(paymentReceipt.installment.interest)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                    <span className="font-bold text-slate-900">ยอดชำระสุทธิ:</span>
                    <span className="font-bold text-emerald-600">
                      ฿{formatCurrency(paymentReceipt.installment.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!onOpenFlexModal) return;
                      const txn = paymentReceipt.txn;
                      setPaymentReceipt(null);
                      onOpenFlexModal(txn);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>ดูสลิป Flex Message</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepayingLoan(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            ) : (
              /* PAYMENT FORM VIEW */
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ชำระค่างวดสินเชื่อสัญญา {repayingLoan.contractNo}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {repayingLoan.loanType} • ผู้กู้ {repayingLoan.borrowerName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRepayingLoan(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Installment Choice */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-slate-700 block">
                    เลือกงวดที่ต้องการชำระ:
                  </label>
                  <select
                    value={selectedInstallmentNo}
                    onChange={(e) => setSelectedInstallmentNo(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none"
                  >
                    {repayingLoan.installments
                      .filter((ins) => ins.status !== 'paid')
                      .map((ins) => (
                        <option key={ins.installmentNo} value={ins.installmentNo}>
                          งวดที่ {ins.installmentNo} (ครบกำหนด {ins.dueDate}) — ยอดชำระ ฿
                          {formatCurrency(ins.totalAmount)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Amount Summary Card */}
                {(() => {
                  const ins = repayingLoan.installments.find(
                    (i) => i.installmentNo === selectedInstallmentNo
                  );
                  if (!ins) return null;
                  return (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
                      <div className="flex justify-between text-indigo-950">
                        <span>เงินต้นประจำงวด:</span>
                        <span className="font-mono font-bold">฿{formatCurrency(ins.principal)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-950">
                        <span>ดอกเบี้ยประจำงวด:</span>
                        <span className="font-mono font-bold">฿{formatCurrency(ins.interest)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-950 font-bold border-t border-indigo-200/60 pt-2 text-sm">
                        <span>ยอดรวมที่ต้องชำระ:</span>
                        <span className="font-mono text-emerald-700">
                          ฿{formatCurrency(ins.totalAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Method Selector */}
                <div className="space-y-2 text-xs">
                  <label className="font-semibold text-slate-700 block">
                    วิธีการชำระเงิน:
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label
                      onClick={() => setPaymentMethod('account')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        paymentMethod === 'account'
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-900">หักบัญชีสหกรณ์</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">
                        หักจากบัญชีเงินฝากทันที
                      </span>
                    </label>

                    <label
                      onClick={() => setPaymentMethod('transfer')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        paymentMethod === 'transfer'
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-900">โอนเงินแนบสลิป</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">
                        ชำระผ่านพร้อมเพย์/ธนาคาร
                      </span>
                    </label>
                  </div>
                </div>

                {/* If Account Selected: choose which account */}
                {paymentMethod === 'account' && (
                  <div className="space-y-1.5 text-xs animate-in fade-in duration-150">
                    <label className="font-semibold text-slate-700 block">
                      เลือกบัญชีเงินฝากสหกรณ์สำหรับหักชำระ:
                    </label>
                    <select
                      value={selectedAccountNo}
                      onChange={(e) => setSelectedAccountNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none"
                    >
                      {memberAccounts.map((acc) => (
                        <option key={acc.id} value={acc.accountNo}>
                          {acc.accountName} ({formatAccountNo(acc.accountNo)}) — คงเหลือ ฿
                          {formatCurrency(acc.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleSubmitRepayment}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>กำลังประมวลผลการชำระค่างวด...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>ยืนยันการชำระค่างวดสินเชื่อ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
