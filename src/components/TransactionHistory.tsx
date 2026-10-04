import React, { useState } from 'react';
import { RemoteImg } from './RemoteImg';
import { TransactionRecord } from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime, formatCitizenId } from '../utils/validators';
import { OfficialWithdrawalSlipModal } from './OfficialWithdrawalSlipModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Search,
  MessageSquare,
  Printer,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  onOpenFlexModal: (txn: TransactionRecord) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onOpenFlexModal,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTxn, setSelectedTxn] = useState<TransactionRecord | null>(null);
  const [printingWithdrawSlipTxn, setPrintingWithdrawSlipTxn] = useState<TransactionRecord | null>(null);

  const filtered = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch =
      t.refCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.accountNo.includes(searchTerm) ||
      t.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.memberId.includes(searchTerm);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-5 bg-teal-600 rounded-full inline-block"></span>
              ประวัติรายการฝาก-ถอนเงิน (Transaction Ledger)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกการทำธุรกรรมแบบเรียลไทม์ พร้อมหลักฐานสลิปและลายมือชื่ออิเล็กทรอนิกส์
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('deposit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterType === 'deposit'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ฝากเงิน ({transactions.filter((t) => t.type === 'deposit').length})
            </button>
            <button
              onClick={() => setFilterType('withdraw')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterType === 'withdraw'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              ถอนเงิน ({transactions.filter((t) => t.type === 'withdraw').length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัสธุรกรรม, เลขบัญชี, หรือชื่อสมาชิก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((t) => {
              const isDeposit = t.type === 'deposit';
              return (
                <div
                  key={t.id}
                  className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors cursor-pointer group"
                  onClick={() => setSelectedTxn(t)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {isDeposit ? 'ฝากเงินเข้าบัญชี' : 'ถอนเงินโอนออก'}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {t.refCode}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> สำเร็จ
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {t.accountName} • บัญชี {formatAccountNo(t.accountNo)}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {formatThaiDateTime(t.dateTime)}
                        {t.destinationBank && ` → ${t.destinationBank}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono ${
                          isDeposit ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isDeposit ? '+' : '-'}฿{formatCurrency(t.amount)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        คงเหลือ: ฿{formatCurrency(t.balanceAfter)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFlexModal(t);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#06C755] hover:bg-emerald-50 transition-colors"
                        title="ดู LINE Flex Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {t.type === 'withdraw' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintingWithdrawSlipTxn(t);
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="พิมพ์ใบถอนเงินออนไลน์ตามแบบฟอร์มทางการ"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxn(t);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 group-hover:border-slate-300 group-hover:bg-white cursor-pointer"
                      >
                        สลิปฉบับเต็ม
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs">
              ไม่พบประวัติรายการที่ค้นหา
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details & Receipt Modal */}
      {selectedTxn && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedTxn(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  ใบเสร็จรับเงินอิเล็กทรอนิกส์ (e-Receipt)
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                  title="พิมพ์ใบเสร็จ"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center mb-1.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  ระบบฝาก-ถอนเงินออนไลน์ผ่าน LINE LIFF
                </h3>
                <p className="text-[11px] text-slate-500">สหกรณ์ออมทรัพย์ / กองทุนการเงินออนไลน์</p>
                <div className="mt-2 inline-block bg-slate-100 px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold text-slate-700">
                  {selectedTxn.refCode}
                </div>
              </div>

              {/* Amount Banner */}
              <div
                className={`p-3.5 rounded-2xl text-center text-white ${
                  selectedTxn.type === 'deposit' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
                  {selectedTxn.type === 'deposit' ? 'ยอดเงินที่ฝากเข้า' : 'ยอดเงินที่ถอนออก'}
                </p>
                <p className="text-2xl font-bold mt-0.5 font-mono">
                  ฿{formatCurrency(selectedTxn.amount)}
                </p>
                <p className="text-xs opacity-90 mt-0.5">{thaiBahtText(selectedTxn.amount)}</p>
              </div>

              {/* Details grid */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภทรายการ</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTxn.type === 'deposit' ? 'ฝากเงิน (Deposit)' : 'ถอนเงิน (Withdrawal)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อเจ้าของบัญชี</span>
                  <span className="font-semibold text-slate-800">{selectedTxn.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">หมายเลขบัญชี</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {formatAccountNo(selectedTxn.accountNo)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภทบัญชี</span>
                  <span className="text-slate-800">{selectedTxn.accountType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสสมาชิก 5 หลัก</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    {selectedTxn.memberId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เลขบัตรประชาชน</span>
                  <span className="font-mono text-slate-700">
                    {formatCitizenId(selectedTxn.citizenId, true)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">ยอดคงเหลือก่อนทำรายการ</span>
                  <span className="font-mono text-slate-700">
                    ฿{formatCurrency(selectedTxn.balanceBefore)}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">ยอดเงินคงเหลือสุทธิ</span>
                  <span className="font-mono text-emerald-600 text-sm">
                    ฿{formatCurrency(selectedTxn.balanceAfter)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-400">
                  <span>วันเวลาบันทึกรายการ</span>
                  <span>{formatThaiDateTime(selectedTxn.dateTime)}</span>
                </div>
              </div>

              {/* Destination Bank if withdraw */}
              {selectedTxn.type === 'withdraw' && selectedTxn.destinationBank && (
                <div className="bg-rose-50/60 border border-rose-200/80 p-3 rounded-2xl space-y-1.5">
                  <h5 className="font-semibold text-rose-900 text-xs">ข้อมูลบัญชีปลายทางรับเงิน</h5>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ธนาคาร</span>
                    <span className="font-medium text-slate-800">{selectedTxn.destinationBank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เลขที่บัญชี</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {selectedTxn.destinationAccountNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ชื่อบัญชี</span>
                    <span className="text-slate-800">{selectedTxn.destinationAccountName}</span>
                  </div>
                </div>
              )}

              {/* Signatures if withdraw */}
              {selectedTxn.ownerSignature && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h5 className="font-semibold text-slate-800 text-xs">ลายมือชื่ออิเล็กทรอนิกส์</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">ลายเซ็นเจ้าของบัญชี</p>
                      <RemoteImg
                        src={selectedTxn.ownerSignature.dataUrl} fileId={selectedTxn.ownerSignature.fileId}
                        alt="ลายเซ็นเจ้าของ"
                        className="h-12 mx-auto object-contain bg-white rounded p-1 border border-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedTxn.ownerSignature.signerName}
                      </p>
                    </div>

                    {selectedTxn.recipientSignature && (
                      <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 text-center">
                        <p className="text-[10px] text-slate-500 mb-1">ลายเซ็นผู้รับเงิน</p>
                        <RemoteImg
                          src={selectedTxn.recipientSignature.dataUrl} fileId={selectedTxn.recipientSignature.fileId}
                          alt="ลายเซ็นผู้รับเงิน"
                          className="h-12 mx-auto object-contain bg-white rounded p-1 border border-slate-200"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {selectedTxn.recipientSignature.signerName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attached Slip if deposit */}
              {selectedTxn.slipImage && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h5 className="font-semibold text-slate-800 text-xs">สลิปเงินโอนที่แนบ</h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 p-2 text-center">
                    <RemoteImg
                      src={selectedTxn.slipImage.dataUrl} fileId={selectedTxn.slipImage.fileId}
                      alt="สลิปเงินโอน"
                      className="max-h-56 mx-auto object-contain rounded"
                    />
                  </div>
                  {selectedTxn.slipVerification?.message && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {selectedTxn.slipVerification.message}
                    </p>
                  )}
                </div>
              )}

              {/* Attached files for withdrawal */}
              {selectedTxn.attachments && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h5 className="font-semibold text-slate-800 text-xs">เอกสารแนบ (3 รายการ)</h5>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTxn.attachments.idCard && (
                      <div className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 text-center">
                        <p className="text-[10px] text-slate-500 truncate mb-1">สำเนาบัตร ปชช.</p>
                        <RemoteImg
                          src={selectedTxn.attachments.idCard.dataUrl} fileId={selectedTxn.attachments.idCard.fileId}
                          alt="สำเนาบัตร"
                          className="h-14 w-full object-cover rounded"
                        />
                      </div>
                    )}
                    {selectedTxn.attachments.sourcePassbook && (
                      <div className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 text-center">
                        <p className="text-[10px] text-slate-500 truncate mb-1">สมุดเงินฝาก</p>
                        <RemoteImg
                          src={selectedTxn.attachments.sourcePassbook.dataUrl} fileId={selectedTxn.attachments.sourcePassbook.fileId}
                          alt="สมุดเงินฝาก"
                          className="h-14 w-full object-cover rounded"
                        />
                      </div>
                    )}
                    {selectedTxn.attachments.destinationPassbook && (
                      <div className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 text-center">
                        <p className="text-[10px] text-slate-500 truncate mb-1">สมุดรับเงิน</p>
                        <RemoteImg
                          src={selectedTxn.attachments.destinationPassbook.dataUrl} fileId={selectedTxn.attachments.destinationPassbook.fileId}
                          alt="สมุดรับเงิน"
                          className="h-14 w-full object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onOpenFlexModal(selectedTxn);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl text-xs font-medium transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>เปิดดู LINE Flex Bubble</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedTxn.type === 'withdraw' && (
                  <button
                    type="button"
                    onClick={() => setPrintingWithdrawSlipTxn(selectedTxn)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    title="พิมพ์ใบถอนเงินออนไลน์ตามแบบฟอร์มทางการ"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ใบถอนเงิน</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Withdrawal Slip Printable Modal */}
      {printingWithdrawSlipTxn && (
        <OfficialWithdrawalSlipModal
          transaction={printingWithdrawSlipTxn}
          onClose={() => setPrintingWithdrawSlipTxn(null)}
        />
      )}
    </div>
  );
};
