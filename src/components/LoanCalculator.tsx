import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';
import confetti from 'canvas-confetti';
import {
  Calculator,
  Percent,
  Calendar,
  Wallet,
  Sparkles,
  TrendingDown,
  Table,
  ChevronDown,
  ChevronUp,
  Printer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  DollarSign,
  Layers,
  RotateCcw,
} from 'lucide-react';

export interface LoanCalculatorProps {
  currentMember?: Member | null;
  initialPrincipal?: number;
  initialRate?: number;
  initialMonths?: number;
  onApplyLoan?: (plan: {
    principal: number;
    interestRate: number;
    months: number;
    monthlyPayment: number;
    totalInterest: number;
    totalPayment: number;
    method: 'reducing' | 'flat';
  }) => void;
  className?: string;
  isCompact?: boolean;
}

interface AmortizationRow {
  installmentNo: number;
  dueDateStr: string;
  monthlyPayment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export const LoanCalculator: React.FC<LoanCalculatorProps> = ({
  currentMember,
  initialPrincipal = 100000,
  initialRate = 5.5,
  initialMonths = 24,
  onApplyLoan,
  className = '',
  isCompact = false,
}) => {
  // Input States
  const [principal, setPrincipal] = useState<number>(initialPrincipal);
  const [interestRate, setInterestRate] = useState<number>(initialRate);
  const [months, setMonths] = useState<number>(initialMonths);
  const [calcMethod, setCalcMethod] = useState<'reducing' | 'flat'>('reducing');
  const [showAmortization, setShowAmortization] = useState<boolean>(false);
  const [applySubmitted, setApplySubmitted] = useState<boolean>(false);

  // Cooperative Loan Type Presets
  const LOAN_PRESETS = [
    { label: 'สินเชื่อสวัสดิการข้าราชการ', rate: 4.5, icon: '🏥', desc: 'สำหรับบุคลากรสาธารณสุข ดอกเบี้ยพิเศษ' },
    { label: 'สินเชื่อสามัญสมาชิก', rate: 5.5, icon: '👥', desc: 'สินเชื่อทั่วไปเพื่อการอุปโภคบริโภค' },
    { label: 'สินเชื่อเคหะ/ที่อยู่อาศัย', rate: 4.25, icon: '🏠', desc: 'ซื้อหรือต่อเติมบ้าน/ที่ดิน ผ่อนยาว' },
    { label: 'สินเชื่อเพื่อการศึกษา', rate: 3.75, icon: '🎓', desc: 'ทุนการศึกษาตนเองและบุตรหลาน' },
    { label: 'สินเชื่อฉุกเฉินเร่งด่วน', rate: 6.0, icon: '⚡', desc: 'อนุมัติไว โอนเงินเข้าบัญชีทันที' },
  ];

  // Quick Principal Presets
  const PRINCIPAL_PRESETS = [
    30000, 50000, 100000, 200000, 300000, 500000, 1000000, 1500000,
  ];

  // Quick Term Presets
  const TERM_PRESETS = [
    { months: 12, label: '1 ปี (12 ด.)' },
    { months: 24, label: '2 ปี (24 ด.)' },
    { months: 36, label: '3 ปี (36 ด.)' },
    { months: 48, label: '4 ปี (48 ด.)' },
    { months: 60, label: '5 ปี (60 ด.)' },
    { months: 84, label: '7 ปี (84 ด.)' },
    { months: 120, label: '10 ปี (120 ด.)' },
  ];

  // Calculations
  const calculationResults = useMemo(() => {
    const P = Math.max(1000, principal);
    const n = Math.max(1, months);
    const r = Math.max(0, interestRate) / 100;

    let monthlyPayment = 0;
    let totalInterest = 0;
    let totalPayment = 0;
    const schedule: AmortizationRow[] = [];

    if (calcMethod === 'flat') {
      // Flat Rate: Interest = P * r * (months/12)
      totalInterest = P * r * (n / 12);
      totalPayment = P + totalInterest;
      monthlyPayment = totalPayment / n;

      let balance = P;
      const principalPerMonth = P / n;
      const interestPerMonth = totalInterest / n;

      const startDate = new Date();
      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 5);
        balance = Math.max(0, balance - principalPerMonth);
        schedule.push({
          installmentNo: i,
          dueDateStr: dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
          monthlyPayment: Math.round(monthlyPayment),
          principalPaid: Math.round(principalPerMonth),
          interestPaid: Math.round(interestPerMonth),
          remainingBalance: Math.round(balance),
        });
      }
    } else {
      // Reducing Balance / Amortization formula (PMT)
      const monthlyRate = r / 12;
      if (monthlyRate === 0) {
        monthlyPayment = P / n;
        totalInterest = 0;
        totalPayment = P;
      } else {
        monthlyPayment = (P * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        totalPayment = monthlyPayment * n;
        totalInterest = totalPayment - P;
      }

      let balance = P;
      const startDate = new Date();
      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 5);
        const interestForMonth = balance * monthlyRate;
        const principalForMonth = monthlyPayment - interestForMonth;
        balance = Math.max(0, balance - principalForMonth);

        schedule.push({
          installmentNo: i,
          dueDateStr: dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
          monthlyPayment: Math.round(monthlyPayment),
          principalPaid: Math.round(principalForMonth),
          interestPaid: Math.round(interestForMonth),
          remainingBalance: Math.round(balance),
        });
      }
    }

    const principalPercent = totalPayment > 0 ? Math.round((P / totalPayment) * 100) : 100;
    const interestPercent = 100 - principalPercent;

    // Recommended minimum monthly income (assuming max 35% DTI for this loan)
    const recommendedIncome = Math.round(monthlyPayment / 0.35);

    return {
      monthlyPayment: Math.round(monthlyPayment),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
      principalPercent,
      interestPercent,
      recommendedIncome,
      schedule,
    };
  }, [principal, interestRate, months, calcMethod]);

  const handleReset = () => {
    setPrincipal(initialPrincipal);
    setInterestRate(initialRate);
    setMonths(initialMonths);
    setCalcMethod('reducing');
    setShowAmortization(false);
    setApplySubmitted(false);
  };

  const handleApply = () => {
    if (onApplyLoan) {
      onApplyLoan({
        principal,
        interestRate,
        months,
        monthlyPayment: calculationResults.monthlyPayment,
        totalInterest: calculationResults.totalInterest,
        totalPayment: calculationResults.totalPayment,
        method: calcMethod,
      });
    }

    setApplySubmitted(true);
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs ${className}`}>
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-indigo-300 border border-white/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  เครื่องมือคำนวณสินเชื่อเงินกู้ (Loan Calculator)
                </h3>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  คำนวณเรียลไทม์
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                ประมาณการยอดผ่อนชำระรายเดือน อัตราดอกเบี้ย และแผนการชำระคืนหนี้สินเชื่อสหกรณ์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium border border-white/15 transition-all cursor-pointer"
              title="ล้างค่าเริ่มต้น"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>

        {/* Calculation Method Toggle */}
        <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-indigo-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>รูปแบบการคิดดอกเบี้ย:</span>
          </span>
          <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setCalcMethod('reducing')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                calcMethod === 'reducing'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              ลดต้นลดดอก (Reducing Balance)
            </button>
            <button
              type="button"
              onClick={() => setCalcMethod('flat')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                calcMethod === 'flat'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              ดอกเบี้ยคงที่ (Flat Rate)
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Input Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Loan Principal (วงเงินกู้) */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  <span>วงเงินกู้ที่ต้องการ (Loan Principal)</span>
                </label>
                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 text-sm">
                  <span>฿</span>
                  <input
                    type="number"
                    min={10000}
                    max={2000000}
                    step={5000}
                    value={principal}
                    onChange={(e) => setPrincipal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-28 text-right font-bold text-indigo-700 outline-none"
                  />
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={10000}
                max={2000000}
                step={10000}
                value={principal}
                onChange={(e) => setPrincipal(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>฿10,000</span>
                <span>฿500,000</span>
                <span>฿1,000,000</span>
                <span>฿2,000,000</span>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium mr-1">วงเงินยอดนิยม:</span>
                {PRINCIPAL_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                      principal === amt
                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    ฿{amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Loan Duration (ระยะเวลาผ่อนชำระ) */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>ระยะเวลาผ่อนชำระ (Loan Duration)</span>
                </label>
                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 text-sm">
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={months}
                    onChange={(e) => setMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-12 text-right font-bold text-indigo-700 outline-none"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    เดือน ({Math.round((months / 12) * 10) / 10} ปี)
                  </span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={6}
                max={120}
                step={6}
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>6 เดือน</span>
                <span>36 เดือน (3 ปี)</span>
                <span>60 เดือน (5 ปี)</span>
                <span>120 เดือน (10 ปี)</span>
              </div>

              {/* Term Quick Buttons */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-2 border-t border-slate-200">
                {TERM_PRESETS.map((t) => (
                  <button
                    key={t.months}
                    type="button"
                    onClick={() => setMonths(t.months)}
                    className={`py-1.5 px-1 text-center rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      months === t.months
                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {t.months} ด.
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Interest Rate (อัตราดอกเบี้ยต่อปี) */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  <span>อัตราดอกเบี้ยต่อปี (Interest Rate % ต่อปี)</span>
                </label>
                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 text-sm">
                  <input
                    type="number"
                    min={0.5}
                    max={20}
                    step={0.05}
                    value={interestRate}
                    onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-14 text-right font-bold text-indigo-700 outline-none"
                  />
                  <span>%</span>
                </div>
              </div>

              {/* Preset Cooperative Loan Types */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-medium block">
                  เลือกประเภทสินเชื่อตามอัตราดอกเบี้ยสหกรณ์:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LOAN_PRESETS.map((p) => {
                    const isSelected = interestRate === p.rate;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setInterestRate(p.rate)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-500 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{p.icon}</span>
                            <span>{p.label}</span>
                          </span>
                          <span className="font-mono font-bold text-xs text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                            {p.rate}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Output Estimation Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-md flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    ผลการคำนวณประมาณการ
                  </span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-indigo-200 border border-white/15">
                    {calcMethod === 'reducing' ? 'ลดต้นลดดอก' : 'คงที่'}
                  </span>
                </div>

                {/* Primary Metric: Monthly Repayment */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-xs text-slate-300 block font-medium">
                    ยอดผ่อนชำระต่อเดือน (โดยประมาณ):
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-bold font-mono text-emerald-400 tracking-tight">
                      ฿{formatCurrency(calculationResults.monthlyPayment)}
                    </span>
                    <span className="text-xs text-slate-300 font-normal">/ เดือน</span>
                  </div>
                  <p className="text-[11px] text-indigo-200/80 mt-1.5">
                    ผ่อนจำนวน {months} งวด (ทั้งหมด {Math.round((months / 12) * 10) / 10} ปี)
                  </p>
                </div>

                {/* Breakdown Summary Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-slate-400 text-[11px] block">วงเงินกู้ (เงินต้น):</span>
                    <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                      ฿{formatCurrency(principal)}
                    </span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-slate-400 text-[11px] block">ดอกเบี้ยรวมตลอดสัญญา:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm mt-0.5 block">
                      ฿{formatCurrency(calculationResults.totalInterest)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">ยอดชำระคืนรวมทั้งสิ้น:</span>
                  <span className="font-mono font-bold text-white text-base">
                    ฿{formatCurrency(calculationResults.totalPayment)}
                  </span>
                </div>

                {/* Visual Ratio Bar: Principal vs Interest */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>เงินต้น: {calculationResults.principalPercent}%</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                      <span>ดอกเบี้ย: {calculationResults.interestPercent}%</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${calculationResults.principalPercent}%` }}
                      className="bg-emerald-400 h-full transition-all duration-300"
                    />
                    <div
                      style={{ width: `${calculationResults.interestPercent}%` }}
                      className="bg-amber-400 h-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Recommended Income Guideline */}
                <div className="p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/30 text-[11px] text-indigo-200 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">คำแนะนำความสามารถในการผ่อน:</span>
                    <span>
                      ควรมีรายได้ขั้นต่ำประมาณ ฿{formatCurrency(calculationResults.recommendedIncome)} / เดือน
                      (ประเมินจากภาระหนี้ไม่เกิน 35% ของรายได้)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                {applySubmitted ? (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>บันทึกความสนใจขอสินเชื่อเรียบร้อยแล้ว เจ้าหน้าที่จะติดต่อกลับ</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleApply}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ยื่นจำลองความต้องการสินเชื่อออนไลน์</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAmortization(!showAmortization)}
                    className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/15"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>{showAmortization ? 'ซ่อนตารางผ่อน' : 'ดูตารางผ่อนชำระ'}</span>
                    {showAmortization ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintSchedule}
                    className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/15"
                    title="พิมพ์ผลการคำนวณสินเชื่อ"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AMORTIZATION SCHEDULE TABLE (EXPANDABLE) */}
        {showAmortization && (
          <div className="pt-4 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  ตารางจำลองแผนการผ่อนชำระรายงวด ({calculationResults.schedule.length} งวด)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                * วันครบกำหนดชำระอ้างอิงทุกวันที่ 5 ของแต่ละเดือน
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">งวดที่</th>
                    <th className="py-2.5 px-3 min-w-[110px]">วันครบกำหนด</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">ยอดผ่อนต่องวด</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">เงินต้นที่ตัด</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">ดอกเบี้ย</th>
                    <th className="py-2.5 px-3 text-right min-w-[120px]">เงินต้นคงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {calculationResults.schedule.map((row) => (
                    <tr key={row.installmentNo} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-center text-slate-400 font-bold">
                        {row.installmentNo}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-700 whitespace-nowrap">
                        {row.dueDateStr}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        ฿{formatCurrency(row.monthlyPayment)}
                      </td>
                      <td className="py-2 px-3 text-right text-indigo-700 whitespace-nowrap">
                        ฿{formatCurrency(row.principalPaid)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-600 whitespace-nowrap">
                        ฿{formatCurrency(row.interestPaid)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 font-medium whitespace-nowrap">
                        ฿{formatCurrency(row.remainingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
