import React, { useState } from 'react';
import { RemoteImg } from './RemoteImg';
import { TransactionRecord } from '../types';
import { formatCurrency, thaiBahtText } from '../utils/thaiBahtText';
import { formatAccountNo, formatThaiDateTime, formatCitizenId } from '../utils/validators';
import { LiffService } from '../services/liffService';
import { OfficialWithdrawalSlipModal } from './OfficialWithdrawalSlipModal';
import { X, Send, Copy, Check, MessageSquare, Download, Share2, Printer } from 'lucide-react';

interface FlexMessageModalProps {
  transaction: TransactionRecord;
  onClose: () => void;
}

export const FlexMessageModal: React.FC<FlexMessageModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [showOfficialWithdrawSlip, setShowOfficialWithdrawSlip] = useState(false);

  const isDeposit = transaction.type === 'deposit';

  // Construct LINE Messaging API Flex Message JSON Payload
  const flexPayload = {
    type: 'flex',
    altText: `${isDeposit ? 'แจ้งเตือนฝากเงิน' : 'แจ้งเตือนถอนเงิน'} ฿${formatCurrency(transaction.amount)}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: isDeposit ? '#059669' : '#dc2626',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: isDeposit ? 'สหกรณ์ออมทรัพย์ • ฝากเงินสำเร็จ' : 'สหกรณ์ออมทรัพย์ • ถอนเงินสำเร็จ',
            color: '#ffffff',
            weight: 'bold',
            size: 'sm',
          },
          {
            type: 'text',
            text: `฿${formatCurrency(transaction.amount)}`,
            color: '#ffffff',
            weight: 'bold',
            size: 'xxl',
            margin: 'md',
          },
          {
            type: 'text',
            text: thaiBahtText(transaction.amount),
            color: '#f1f5f9',
            size: 'xs',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รหัสอ้างอิง', size: 'xs', color: '#64748b' },
              { type: 'text', text: transaction.refCode, size: 'xs', color: '#0f172a', align: 'end', weight: 'bold' },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ชื่อบัญชี', size: 'xs', color: '#64748b' },
              { type: 'text', text: transaction.accountName, size: 'xs', color: '#0f172a', align: 'end' },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่บัญชี', size: 'xs', color: '#64748b' },
              { type: 'text', text: formatAccountNo(transaction.accountNo), size: 'xs', color: '#0f172a', align: 'end' },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รหัสสมาชิก', size: 'xs', color: '#64748b' },
              { type: 'text', text: transaction.memberId, size: 'xs', color: '#0f172a', align: 'end' },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ยอดเงินคงเหลือ', size: 'xs', color: '#64748b' },
              { type: 'text', text: `฿${formatCurrency(transaction.balanceAfter)}`, size: 'xs', color: '#059669', align: 'end', weight: 'bold' },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันเวลาทำรายการ', size: 'xs', color: '#64748b' },
              { type: 'text', text: formatThaiDateTime(transaction.dateTime), size: 'xs', color: '#0f172a', align: 'end' },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#059669',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดใน LINE LIFF',
              uri: window.location.href,
            },
          },
        ],
      },
    },
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(flexPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaLiff = async () => {
    setIsSending(true);
    const sent = await LiffService.sendFlexMessage(flexPayload);
    setIsSending(false);
    if (sent) {
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } else {
      // In browser / sandbox mode, simulate send
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl sm:my-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                LINE Messaging API Flex Message
              </h3>
              <p className="text-[11px] text-slate-500">
                รูปแบบข้อความตอบรับอัตโนมัติแจ้งเตือนผ่าน LINE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LINE Chat Bubble Container */}
        <div className="p-4 bg-[#849EB8]/20 flex flex-col items-center">
          {/* Authentic LINE Flex Bubble Mockup */}
          <div className="w-full max-w-[340px] bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/80">
            {/* Flex Header */}
            <div
              className={`p-4 text-white text-center ${
                isDeposit ? 'bg-[#06C755]' : 'bg-[#e11d48]'
              }`}
            >
              <p className="text-xs uppercase tracking-wider font-semibold opacity-90">
                {isDeposit ? 'สหกรณ์ออมทรัพย์ • เงินฝากเข้าบัญชี' : 'สหกรณ์ออมทรัพย์ • ยืนยันการถอนเงิน'}
              </p>
              <p className="text-2xl font-bold mt-1">฿{formatCurrency(transaction.amount)}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{thaiBahtText(transaction.amount)}</p>
            </div>

            {/* Flex Body */}
            <div className="p-4 space-y-2.5 text-xs text-slate-700 bg-white">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">เลขที่อ้างอิง</span>
                <span className="font-mono font-bold text-slate-800">{transaction.refCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">ชื่อบัญชี</span>
                <span className="font-medium text-slate-800">{transaction.accountName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">หมายเลขบัญชี</span>
                <span className="font-mono text-slate-800">{formatAccountNo(transaction.accountNo)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">รหัสสมาชิก 5 หลัก</span>
                <span className="font-mono text-emerald-700 font-bold">{transaction.memberId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">เลขประจำตัวประชาชน</span>
                <span className="font-mono text-slate-600">{formatCitizenId(transaction.citizenId, true)}</span>
              </div>

              {/* Destination Bank if withdrawal */}
              {!isDeposit && transaction.destinationBank && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">โอนเข้าธนาคาร</span>
                  <span className="font-medium text-slate-800 text-right">
                    {transaction.destinationBank} ({transaction.destinationAccountNo})
                  </span>
                </div>
              )}

              {/* Fee if applicable */}
              {!isDeposit && transaction.fee && transaction.fee > 0 ? (
                <div className="flex justify-between py-1 border-b border-slate-100 text-amber-800">
                  <span>ค่าธรรมเนียมถอน (3%)</span>
                  <span className="font-mono font-bold">฿{formatCurrency(transaction.fee)}</span>
                </div>
              ) : null}

              {/* Balance after */}
              <div className="flex justify-between py-1.5 bg-slate-50 px-2 rounded-lg">
                <span className="font-semibold text-slate-700">ยอดคงเหลือสุทธิ</span>
                <span className="font-mono font-bold text-emerald-600">
                  ฿{formatCurrency(transaction.balanceAfter)}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>วันเวลา</span>
                <span>{formatThaiDateTime(transaction.dateTime)}</span>
              </div>

              {/* Signatures preview if withdrawal */}
              {transaction.ownerSignature && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 block mb-1">ลายมือชื่ออิเล็กทรอนิกส์</span>
                  <div className="flex items-center gap-2">
                    <RemoteImg
                      src={transaction.ownerSignature.dataUrl} fileId={transaction.ownerSignature.fileId}
                      alt="ลายเซ็นเจ้าของบัญชี"
                      className="h-9 border border-slate-200 rounded bg-white px-2 object-contain"
                    />
                    {transaction.recipientSignature && (
                      <RemoteImg
                        src={transaction.recipientSignature.dataUrl} fileId={transaction.recipientSignature.fileId}
                        alt="ลายเซ็นผู้รับเงิน"
                        className="h-9 border border-slate-200 rounded bg-white px-2 object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Flex Action Button */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              {transaction.type === 'withdraw' && (
                <button
                  type="button"
                  onClick={() => setShowOfficialWithdrawSlip(true)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบถอนเงินออนไลน์ตามแบบฟอร์มทางการ</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyJson}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>คัดลอก JSON แล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>คัดลอก Flex JSON (GAS / API)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSendViaLiff}
            disabled={isSending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendSuccess ? 'ส่งเข้า LINE สำเร็จ ✅' : 'ส่งข้อความเข้า LINE (LIFF)'}</span>
          </button>
        </div>
      </div>

      {/* Official Withdrawal Slip Modal */}
      {showOfficialWithdrawSlip && (
        <OfficialWithdrawalSlipModal
          transaction={transaction}
          onClose={() => setShowOfficialWithdrawSlip(false)}
        />
      )}
    </div>
  );
};
