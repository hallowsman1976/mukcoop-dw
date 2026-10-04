import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { COOP_NAME } from '../constants/brand';

/** Bump when the notice text changes; the server stores it with each consent. */
export const PDPA_VERSION = '1.0';

interface PdpaConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'ข้อมูลที่เก็บรวบรวม',
    items: [
      'ข้อมูลสมาชิก: รหัสสมาชิก ชื่อ-นามสกุล เลขประจำตัวประชาชน ช่องทางติดต่อ',
      'ข้อมูลบัญชี LINE: LINE User ID ชื่อที่แสดง และรูปโปรไฟล์ (ผ่าน LINE Login / LIFF)',
      'ข้อมูลบัญชีเงินฝากและธุรกรรมฝาก-ถอน รวมถึงเอกสารที่แนบ เช่น สลิปโอนเงิน สำเนาบัตร สมุดบัญชี และลายมือชื่ออิเล็กทรอนิกส์',
    ],
  },
  {
    title: 'วัตถุประสงค์การใช้ข้อมูล',
    items: [
      'ยืนยันตัวตนและผูกบัญชี LINE กับทะเบียนสมาชิกเพื่อเข้าใช้งานโดยไม่ต้องกรอกข้อมูลซ้ำ',
      'ให้บริการฝาก-ถอนเงินออนไลน์ ตรวจสอบและอนุมัติรายการโดยเจ้าหน้าที่สหกรณ์',
      'ส่งการแจ้งเตือนธุรกรรมผ่าน LINE ตามที่สมาชิกเลือกไว้',
      'ป้องกันการทุจริต ตรวจสอบย้อนหลัง และปฏิบัติตามกฎหมายและระเบียบสหกรณ์',
    ],
  },
  {
    title: 'การเปิดเผยและการเก็บรักษา',
    items: [
      'ข้อมูลถูกเก็บในระบบของสหกรณ์ (Google Sheets / Google Drive) และเข้าถึงได้เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมาย',
      'ข้อความแจ้งเตือนส่งผ่านแพลตฟอร์ม LINE ซึ่งอยู่ภายใต้นโยบายความเป็นส่วนตัวของ LINE',
      'เก็บรักษาตลอดระยะเวลาที่เป็นสมาชิก และตามระยะเวลาที่กฎหมายหรือระเบียบสหกรณ์กำหนด',
    ],
  },
  {
    title: 'สิทธิของเจ้าของข้อมูล',
    items: [
      'ขอเข้าถึง ขอสำเนา แก้ไข ลบ ระงับการใช้ หรือคัดค้านการประมวลผลข้อมูลส่วนบุคคลของท่านได้',
      'ถอนความยินยอมได้ทุกเมื่อ โดยแจ้งเจ้าหน้าที่สหกรณ์ (เจ้าหน้าที่จะยกเลิกการผูกบัญชี LINE ให้ ท่านยังทำรายการผ่านสหกรณ์ได้ตามปกติ)',
    ],
  },
];

export const PdpaConsent: React.FC<PdpaConsentProps> = ({ checked, onChange }) => {
  const [open, setOpen] = useState(false);
  const settings = StorageService.getSystemSettings();
  const coopName = settings.cooperativeName || COOP_NAME;
  const contact = [settings.contactPhone, settings.contactEmail].filter(Boolean).join(' • ');

  return (
    <>
      <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
        />
        <span className="text-[11px] text-slate-600 leading-relaxed">
          ข้าพเจ้าได้อ่านและยินยอมให้ {coopName} เก็บรวบรวม ใช้ และประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้า
          รวมถึงข้อมูลบัญชี LINE เพื่อผูกบัญชีและให้บริการตาม{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className="text-emerald-700 font-semibold underline cursor-pointer"
          >
            นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </button>
        </span>
      </label>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h3>
                  <p className="text-[11px] text-slate-400">{coopName} • เวอร์ชัน {PDPA_VERSION}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-600">
              {SECTIONS.map((sec) => (
                <section key={sec.title} className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900">{sec.title}</h4>
                  <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                    {sec.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </section>
              ))}
              <section className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">ช่องทางติดต่อ</h4>
                <p>{contact || 'เจ้าหน้าที่สหกรณ์'}</p>
              </section>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(true);
                  setOpen(false);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                ยอมรับ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
