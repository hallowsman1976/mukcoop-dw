import { LoanContract, LoanInstallment } from '../types';

function generateInstallments(
  count: number,
  monthlyAmount: number,
  paidCount: number,
  startYear: number,
  startMonth: number
): LoanInstallment[] {
  const installments: LoanInstallment[] = [];
  const principalPerMonth = Math.round(monthlyAmount * 0.82);
  const interestPerMonth = monthlyAmount - principalPerMonth;

  for (let i = 1; i <= count; i++) {
    const curMonth = (startMonth + i - 1) % 12;
    const curYear = startYear + Math.floor((startMonth + i - 1) / 12);
    const monthStr = String(curMonth + 1).padStart(2, '0');
    const dueDate = `${curYear}-${monthStr}-25`;
    const isPaid = i <= paidCount;

    installments.push({
      installmentNo: i,
      dueDate,
      principal: principalPerMonth,
      interest: interestPerMonth,
      totalAmount: monthlyAmount,
      paidAmount: isPaid ? monthlyAmount : 0,
      paidDate: isPaid ? `${curYear}-${monthStr}-24 10:30` : undefined,
      status: isPaid ? 'paid' : i === paidCount + 1 ? 'pending' : 'pending',
      txnRef: isPaid ? `TXN-LN-${curYear}${monthStr}-${String(i).padStart(3, '0')}` : undefined,
      receiptNo: isPaid ? `RC-${curYear}${monthStr}-${String(1000 + i)}` : undefined,
    });
  }

  return installments;
}

export const INITIAL_LOANS: LoanContract[] = [
  {
    id: 'loan-01',
    contractNo: 'LN-2569-0012',
    memberId: '00128',
    borrowerName: 'นายสมชาย ใจดี',
    borrowerCitizenId: '1100200345670',
    accountNo: '101-2-00128-1',
    loanType: 'สินเชื่อสามัญ',
    principalAmount: 120000,
    interestRate: 5.5,
    termMonths: 24,
    monthlyInstallment: 5290,
    startDate: '2026-02-01',
    endDate: '2028-01-25',
    remainingBalance: 81400,
    totalPaidPrincipal: 38600,
    totalPaidInterest: 3720,
    paidInstallmentsCount: 8,
    nextDueInstallmentNo: 9,
    nextDueDate: '2026-10-25',
    status: 'active',
    installments: generateInstallments(24, 5290, 8, 2026, 1),
    guarantorName: 'นายวิชัย เกียรติขจร (สมาชิกเลขที่ 00095)',
    purpose: 'เพื่อซ่อมแซมและต่อเติมบ้านพักอาศัย',
    approvedBy: 'นายวรวิทย์ ผู้จัดการสหกรณ์',
    approvedDate: '2026-01-28',
  },
  {
    id: 'loan-02',
    contractNo: 'LN-2569-0034',
    memberId: '00405',
    borrowerName: 'นางสาววิภาภรณ์ รัตนโชติ',
    borrowerCitizenId: '1200100456789',
    accountNo: '101-2-00405-1',
    loanType: 'สินเชื่อเพื่อสวัสดิการ',
    principalAmount: 50000,
    interestRate: 4.5,
    termMonths: 12,
    monthlyInstallment: 4270,
    startDate: '2026-04-01',
    endDate: '2027-03-25',
    remainingBalance: 25620,
    totalPaidPrincipal: 24380,
    totalPaidInterest: 1240,
    paidInstallmentsCount: 6,
    nextDueInstallmentNo: 7,
    nextDueDate: '2026-10-25',
    status: 'active',
    installments: generateInstallments(12, 4270, 6, 2026, 3),
    guarantorName: 'นางกาญจนา สุขสมบัติ (สมาชิกเลขที่ 00210)',
    purpose: 'เพื่อการศึกษาบุตรในระดับอุดมศึกษา',
    approvedBy: 'นายวรวิทย์ ผู้จัดการสหกรณ์',
    approvedDate: '2026-03-25',
  },
  {
    id: 'loan-03',
    contractNo: 'LN-2569-0089',
    memberId: '01024',
    borrowerName: 'นายชาญชัย มั่งคั่งเจริญ',
    borrowerCitizenId: '3100500987654',
    accountNo: '101-2-01024-1',
    loanType: 'สินเชื่อเคหะเพื่อที่อยู่อาศัย',
    principalAmount: 500000,
    interestRate: 4.25,
    termMonths: 60,
    monthlyInstallment: 9260,
    startDate: '2025-08-01',
    endDate: '2030-07-25',
    remainingBalance: 395000,
    totalPaidPrincipal: 105000,
    totalPaidInterest: 24640,
    paidInstallmentsCount: 14,
    nextDueInstallmentNo: 15,
    nextDueDate: '2026-10-25',
    status: 'active',
    installments: generateInstallments(60, 9260, 14, 2025, 7),
    guarantorName: 'โฉนดที่ดินเลขที่ 45890 ต.บางเขน อ.เมือง',
    purpose: 'เพื่อซื้อที่อยู่อาศัยและที่ดิน',
    approvedBy: 'นายวรวิทย์ ผู้จัดการสหกรณ์',
    approvedDate: '2025-07-20',
  },
];
