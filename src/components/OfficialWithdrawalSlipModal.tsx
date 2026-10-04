import { COOP_NAME } from '../constants/brand';
import { BrandLogo } from './BrandLogo';
import React, { useRef } from 'react';
import { TransactionRecord } from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDate } from '../utils/validators';
import { StorageService } from '../services/storageService';
import { RemoteImg } from './RemoteImg';
import { Printer, Download, X, FileCheck2, Building2 } from 'lucide-react';

interface OfficialWithdrawalSlipModalProps {
  transaction: TransactionRecord;
  onClose: () => void;
}

export const OfficialWithdrawalSlipModal: React.FC<OfficialWithdrawalSlipModalProps> = ({
  transaction,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const settings = StorageService.getSystemSettings();

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Format date: e.g. "25 กันยายน 2569" or "3 ตุลาคม 2569"
  const dateFormatted = formatThaiDate(transaction.dateTime);

  const isSavings = transaction.accountType === 'ออมทรัพย์';
  const isSpecialSavings = transaction.accountType === 'ออมทรัพย์พิเศษ';

  // Bank branch fallback
  const branchName = 'สาขามุกดาหาร';
  const contactPhone = transaction.citizenId
    ? StorageService.getMembers().find((m) => m.memberId === transaction.memberId)?.phone || '089-123-4567'
    : '089-123-4567';

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl sm:my-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150 flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-gradient-to-r from-indigo-700 to-slate-900 text-white flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-indigo-300">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                ใบถอนเงินออนไลน์ (Official Withdrawal Form)
              </h3>
              <p className="text-xs text-slate-300">
                เอกสารคำขอถอนเงินและหลักฐานการโอนเงินตามแบบฟอร์มสหกรณ์ออมทรัพย์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบถอนเงิน (Print / PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document View */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          {/* Exact Form Layout Matching PDF */}
          <div
            id="printable-withdrawal-slip"
            ref={printAreaRef}
            className="bg-white text-slate-900 shadow-md p-6 sm:p-8 max-w-[780px] w-full border border-slate-300 text-[13px] leading-relaxed font-sans"
            style={{ minHeight: '1050px' }}
          >
            {/* Header: Logo and Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <BrandLogo logoUrl={settings.logoUrl} className="w-16 h-16 border border-emerald-600/40 p-0.5" />
              </div>

              <div className="flex-1">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 flex flex-wrap items-baseline gap-2">
                  <span>{settings.cooperativeName || COOP_NAME}</span>
                  <span className="text-lg sm:text-xl font-bold text-slate-900">ใบถอนเงินออนไลน์</span>
                </h1>
                <div className="text-[11px] text-slate-500 font-mono">
                  {settings.registrationNumber || 'กสพ. 102/2545'} • www.mukcoop.org
                </div>
              </div>
            </div>

            {/* Line 1: เลขที่บัญชี, ชื่อบัญชี, วันที่ */}
            <div className="grid grid-cols-12 gap-2 items-baseline mb-2">
              <div className="col-span-4 flex items-baseline">
                <span className="font-semibold shrink-0">เลขที่บัญชี</span>
                <span className="border-b border-dotted border-slate-700 flex-1 ml-1 text-center font-mono font-bold text-sm">
                  {formatAccountNo(transaction.accountNo)}
                </span>
              </div>

              <div className="col-span-5 flex items-baseline">
                <span className="font-semibold shrink-0">ชื่อบัญชี</span>
                <span className="border-b border-dotted border-slate-700 flex-1 ml-1 text-center font-bold">
                  {transaction.accountName}
                </span>
              </div>

              <div className="col-span-3 flex items-baseline">
                <span className="font-semibold shrink-0">วันที่</span>
                <span className="border-b border-dotted border-slate-700 flex-1 ml-1 text-center text-xs">
                  {dateFormatted}
                </span>
              </div>
            </div>

            {/* Line 2: ประเภทบัญชี Checkboxes */}
            <div className="flex items-center gap-6 mb-2 py-0.5">
              <span className="font-semibold">ประเภทบัญชี</span>
              <label className="flex items-center gap-2 cursor-default">
                <span
                  className={`w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center text-[10px] font-bold ${
                    isSavings ? 'bg-slate-900 text-white' : 'bg-white'
                  }`}
                >
                  {isSavings ? '✓' : ''}
                </span>
                <span>ออมทรัพย์</span>
              </label>

              <label className="flex items-center gap-2 cursor-default">
                <span
                  className={`w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center text-[10px] font-bold ${
                    isSpecialSavings ? 'bg-slate-900 text-white' : 'bg-white'
                  }`}
                >
                  {isSpecialSavings ? '✓' : ''}
                </span>
                <span>ออมทรัพย์พิเศษ</span>
              </label>
            </div>

            {/* Line 3: จำนวนเงินที่ถอน (ตัวอักษร) และ (ตัวเลข) */}
            <div className="grid grid-cols-12 gap-2 items-baseline mb-4">
              <div className="col-span-7 flex items-baseline">
                <span className="font-semibold shrink-0">จำนวนเงินที่ถอน (ตัวอักษร)</span>
                <span className="border-b border-dotted border-slate-700 flex-1 ml-1 text-center font-medium">
                  {thaiBahtText(transaction.amount)}
                </span>
              </div>

              <div className="col-span-5 flex items-baseline">
                <span className="font-semibold shrink-0">จำนวนเงินที่ถอน (ตัวเลข)</span>
                <span className="border-b border-dotted border-slate-700 flex-1 ml-1 text-right font-mono font-bold px-1">
                  {formatCurrency(transaction.amount)}
                </span>
                <span className="shrink-0 ml-1">บาท</span>
              </div>
            </div>

            {/* Fee Note if Special Savings 2nd withdrawal onward */}
            {transaction.fee && transaction.fee > 0 ? (
              <div className="text-[11px] text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-1.5 mb-3 flex items-center justify-between font-mono">
                <span>
                  * ออมทรัพย์พิเศษ (ถอนครั้งที่ {transaction.monthlyWithdrawalCount || 2} ของเดือน): ค่าธรรมเนียมร้อยละ 3 = ฿{formatCurrency(transaction.fee)} บาท
                </span>
                <span className="font-bold text-slate-950">
                  รวมยอดเงินที่หักบัญชี: ฿{formatCurrency(transaction.totalDeduction || transaction.amount + transaction.fee)} บาท
                </span>
              </div>
            ) : null}

            {/* Table Section: 3 Columns matching original form */}
            <div className="border border-slate-800 grid grid-cols-12 text-[12px] mb-3">
              {/* Column 1: โดยโอนเข้าบัญชี (5 Cols) */}
              <div className="col-span-5 p-2.5 border-r border-slate-800 space-y-1.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-950 mb-1.5">โดยโอนเข้าบัญชี</h4>

                  <div className="space-y-1">
                    <div className="flex items-baseline">
                      <span className="shrink-0 text-slate-700 w-14">ธนาคาร</span>
                      <span className="border-b border-dotted border-slate-400 flex-1 pl-1 font-semibold text-slate-900 truncate">
                        {transaction.destinationBank || 'ธนาคารกรุงไทย (KTB)'}
                      </span>
                    </div>

                    <div className="flex items-baseline">
                      <span className="shrink-0 text-slate-700 w-14">ชื่อบัญชี</span>
                      <span className="border-b border-dotted border-slate-400 flex-1 pl-1 font-semibold text-slate-900 truncate">
                        {transaction.destinationAccountName || transaction.accountName}
                      </span>
                    </div>

                    <div className="flex items-baseline">
                      <span className="shrink-0 text-slate-700 w-14">เลขที่บัญชี</span>
                      <span className="border-b border-dotted border-slate-400 flex-1 pl-1 font-mono font-bold text-slate-900 truncate">
                        {transaction.destinationAccountNo || '-'}
                      </span>
                    </div>

                    <div className="flex items-baseline">
                      <span className="shrink-0 text-slate-700 w-14">สาขา</span>
                      <span className="border-b border-dotted border-slate-400 flex-1 pl-1 text-slate-800 truncate">
                        {branchName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline pt-1">
                  <span className="shrink-0 text-slate-700 text-[11px]">
                    หมายเลขโทรศัพท์ติดต่อกลับ
                  </span>
                  <span className="border-b border-dotted border-slate-400 flex-1 pl-1 font-mono text-[11px]">
                    {contactPhone}
                  </span>
                </div>
              </div>

              {/* Column 2: ลายมือชื่อ (4 Cols) */}
              <div className="col-span-4 p-2.5 border-r border-slate-800 text-center flex flex-col justify-between">
                {/* Owner Signature */}
                <div className="space-y-0.5">
                  <div className="h-10 flex items-center justify-center">
                    {(transaction.ownerSignature?.dataUrl || transaction.ownerSignature?.fileId) ? (
                      <RemoteImg
                        src={transaction.ownerSignature.dataUrl} fileId={transaction.ownerSignature.fileId}
                        alt="ลายมือชื่อเจ้าของบัญชี"
                        className="max-h-9 max-w-full object-contain"
                      />
                    ) : (
                      <div className="w-32 border-b border-dotted border-slate-400 h-6"></div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-700">ลายมือชื่อเจ้าของบัญชี</div>
                </div>

                {/* Recipient Signature */}
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                  <div className="h-10 flex items-center justify-center">
                    {(transaction.recipientSignature?.dataUrl || transaction.recipientSignature?.fileId) ? (
                      <RemoteImg
                        src={transaction.recipientSignature.dataUrl} fileId={transaction.recipientSignature.fileId}
                        alt="ลายมือชื่อผู้รับเงิน"
                        className="max-h-9 max-w-full object-contain"
                      />
                    ) : (
                      <div className="w-32 border-b border-dotted border-slate-400 h-6"></div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-700">ลายมือชื่อผู้รับเงิน</div>
                  <div className="text-[10px] text-slate-500">
                    ข้าพเจ้าได้รับเงินครบถ้วนและถูกต้องแล้ว
                  </div>
                </div>
              </div>

              {/* Column 3: สำหรับเจ้าหน้าที่สหกรณ์ (3 Cols) */}
              <div className="col-span-3 p-2.5 text-center flex flex-col justify-between bg-slate-50/50">
                <h4 className="font-bold text-slate-900 text-[11px] border-b border-slate-300 pb-1 mb-1">
                  สำหรับเจ้าหน้าที่สหกรณ์
                </h4>

                <div className="space-y-0.5">
                  <div className="h-10 flex items-center justify-center">
                    {transaction.reviewedBy ? (
                      <span className="text-[11px] font-semibold text-emerald-800">
                        {transaction.reviewedBy}
                      </span>
                    ) : (
                      <div className="w-24 border-b border-dotted border-slate-400 h-6"></div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-700">เจ้าหน้าที่</div>
                </div>

                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-slate-700">
                      นายวรวิทย์ ผู้จัดการ
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700">ผู้จัดการ</div>
                </div>
              </div>
            </div>

            {/* Bottom Attachments Grid: Left Box (ID Card) + Right Boxes (Coop Passbook & Bank Passbook) */}
            <div className="grid grid-cols-12 gap-0 border border-slate-800 text-xs">
              {/* Left Column: แนบบัตรประชาชน (Vertical) */}
              <div className="col-span-4 border-r border-slate-800 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-center font-bold text-slate-800 mb-1">
                    แนบบัตรประชาชน
                    <span className="block text-[10px] font-normal text-slate-500">
                      (สามารถวางเอียงแนวนี้ได้)
                    </span>
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-lg h-44 flex items-center justify-center bg-slate-50 overflow-hidden my-2">
                    {(transaction.attachments?.idCard?.dataUrl || transaction.attachments?.idCard?.fileId) ? (
                      <RemoteImg
                        src={transaction.attachments.idCard.dataUrl} fileId={transaction.attachments.idCard.fileId}
                        alt="แนบบัตรประชาชน"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        [ภาพสำเนาบัตรประชาชน]
                      </span>
                    )}
                  </div>
                </div>

                {/* Left Bottom Contact Note */}
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 leading-tight">
                  <span className="font-bold block text-slate-800 mb-0.5">หมายเหตุ :</span>
                  <p>
                    สมาชิกเมื่ออัปโหลดข้อมูล กรุณาโทรสอบทานข้อมูลเพื่อความถูกต้องและชัดเจนในการทำธุรกรรม
                  </p>
                  <p className="mt-1 font-mono font-semibold text-slate-800">
                    หมายเลขโทรศัพท์ 088-5578567, 042-633587, 090-9881933
                  </p>
                </div>
              </div>

              {/* Right Column: 2 Stacked Boxes */}
              <div className="col-span-8 flex flex-col divide-y divide-slate-800">
                {/* Top Box: แนบสมุดบัญชีสหกรณ์ */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div className="text-center font-bold text-slate-800 mb-1">
                    แนบสมุดบัญชีสหกรณ์
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-lg h-36 flex items-center justify-center bg-slate-50 overflow-hidden">
                    {(transaction.attachments?.sourcePassbook?.dataUrl || transaction.attachments?.sourcePassbook?.fileId) ? (
                      <RemoteImg
                        src={transaction.attachments.sourcePassbook.dataUrl} fileId={transaction.attachments.sourcePassbook.fileId}
                        alt="แนบสมุดบัญชีสหกรณ์"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        [ภาพสมุดบัญชีสหกรณ์]
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Box: แนบสมุดบัญชีเงินฝากธนาคาร */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div className="text-center font-bold text-slate-800 mb-1">
                    แนบสมุดบัญชีเงินฝากธนาคาร
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-lg h-36 flex items-center justify-center bg-slate-50 overflow-hidden">
                    {(transaction.attachments?.destinationPassbook?.dataUrl || transaction.attachments?.destinationPassbook?.fileId) ? (
                      <RemoteImg
                        src={transaction.attachments.destinationPassbook.dataUrl} fileId={transaction.attachments.destinationPassbook.fileId}
                        alt="แนบสมุดบัญชีเงินฝากธนาคาร"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        [ภาพสมุดบัญชีเงินฝากธนาคารปลายทาง]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ref footer */}
            <div className="mt-3 flex justify-between text-[10px] text-slate-400 font-mono">
              <span>รหัสอ้างอิง: {transaction.refCode}</span>
              <span>บันทึกเมื่อ: {transaction.dateTime} น.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS to ensure pixel-perfect print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-withdrawal-slip, #printable-withdrawal-slip * {
            visibility: visible !important;
          }
          #printable-withdrawal-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
};
