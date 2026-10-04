import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { LiffService, LiffStatus } from '../services/liffService';
import { X, Smartphone, Globe, ExternalLink, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface LiffConfigModalProps {
  status: LiffStatus;
  onClose: () => void;
  onRefresh: () => void;
}

export const LiffConfigModal: React.FC<LiffConfigModalProps> = ({
  status,
  onClose,
  onRefresh,
}) => {
  const [liffIdInput, setLiffIdInput] = useState<string>(StorageService.getLiffId());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    StorageService.setLiffId(liffIdInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onRefresh();
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setLiffIdInput('');
    StorageService.setLiffId('');
    onRefresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                ตั้งค่า LINE LIFF SDK Gateway
              </h3>
              <p className="text-[11px] text-slate-500">
                LINE Front-end Framework (LIFF) Client Gateway
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Status Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="font-semibold text-slate-700 block">สถานะสภาพแวดล้อมปัจจุบัน:</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">SDK Ready:</span>
                <span className="font-semibold text-emerald-600">
                  {status.isReady ? 'พร้อมใช้งาน (Active)' : 'กำลังเชื่อมต่อ'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">ระบบปฏิบัติการ:</span>
                <span className="font-semibold text-slate-800">{status.os}</span>
              </div>
              <div>
                <span className="text-slate-400 block">เปิดใน LINE App:</span>
                <span className="font-semibold text-slate-800">
                  {status.isInClient ? 'ใช่ (In-Client Browser)' : 'เบราว์เซอร์ภายนอก / Sandbox'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">LINE Profile:</span>
                <span className="font-semibold text-slate-800">
                  {status.profile?.displayName || 'จำลองสมาชิก (Simulated)'}
                </span>
              </div>
            </div>
          </div>

          {/* LIFF ID Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">
              LINE LIFF ID:
            </label>
            <input
              type="text"
              placeholder="เช่น 2006789123-abcdefgh"
              value={liffIdInput}
              onChange={(e) => setLiffIdInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:bg-white"
            />
            <p className="text-[11px] text-slate-400">
              รับ LIFF ID ได้จาก{' '}
              <a
                href="https://developers.line.biz"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
              >
                LINE Developers Console <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Quick Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] space-y-1">
            <p className="font-semibold">💡 โหมดจำลองทำงานสมบูรณ์แบบ 100%:</p>
            <p className="text-emerald-700">
              แม้ไม่มี LIFF ID ระบบก็เปิดให้ทดสอบการยืนยันตัวตน 5 หลัก, ฟอร์มฝาก-ถอน, ลายเซ็น 2 จุด, ตรวจสอบสลิป, ตารางบัญชี และ LINE Flex Bubble ได้เสมือนจริงทุกฟังก์ชัน
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-rose-600 transition-colors"
          >
            ล้างค่า LIFF ID
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" /> บันทึกแล้ว
                </>
              ) : (
                'บันทึก LIFF ID'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
