import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { Database, Cloud, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface GasIntegrationModalProps {
  onClose: () => void;
}

export const GasIntegrationModal: React.FC<GasIntegrationModalProps> = ({ onClose }) => {
  const [webAppUrl, setWebAppUrl] = useState(ApiService.getConfig().webAppUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSaveAndTest = async () => {
    const url = webAppUrl.trim();
    if (!url) {
      setResult({ ok: false, message: 'กรุณาระบุ URL ของ Google Apps Script Web App' });
      return;
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
      setResult({ ok: false, message: 'URL ต้องอยู่ในรูปแบบ https://script.google.com/macros/s/…/exec' });
      return;
    }

    setTesting(true);
    setResult(null);
    try {
      const info = await ApiService.ping(url);
      ApiService.setUrl(url);
      setResult({
        ok: true,
        message: `เชื่อมต่อสำเร็จและบันทึกแล้ว (${info.service} v${info.version}) กรุณารีเฟรชหน้าเว็บ`,
      });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'ทดสอบไม่สำเร็จ' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl sm:my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">เชื่อมต่อระบบหลังบ้าน (Google Apps Script + Sheets)</h3>
              <p className="text-xs text-slate-500">ข้อมูลทั้งหมดเก็บใน Google Sheets และตรวจสอบโดย Apps Script</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-700" />
              Web App URL
            </h4>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveAndTest}
                disabled={testing}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shrink-0 disabled:opacity-50"
              >
                {testing ? 'กำลังทดสอบ...' : 'ทดสอบและบันทึก'}
              </button>
            </div>
            {result && (
              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                  result.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {result.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{result.message}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-700">
            <h5 className="font-bold text-slate-900">ขั้นตอนติดตั้ง (ทำครั้งเดียว โดยผู้ดูแลระบบ)</h5>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
              <li>
                ในโฟลเดอร์โปรเจกต์ รัน <code className="bg-white px-1 rounded">cd gas && clasp push</code> เพื่ออัปโหลดโค้ดหลังบ้าน
              </li>
              <li>
                เปิดโปรเจกต์ใน Apps Script เลือกฟังก์ชัน <b>setup</b> แล้วกด Run (อนุญาตสิทธิ์ Sheets/Drive) —
                จะสร้างแท็บข้อมูล โฟลเดอร์ไฟล์แนบแบบส่วนตัว และผู้ดูแลระบบคนแรก
              </li>
              <li>
                ที่ <b>Project Settings → Script Properties</b> อ่านรหัสผ่านเริ่มต้นจาก <code>BOOTSTRAP_PASSWORD_ONCE</code>{' '}
                และเพิ่ม <code>LINE_CHANNEL_ACCESS_TOKEN</code>, <code>LINE_LOGIN_CHANNEL_ID</code>
              </li>
              <li>
                <b>Deploy → New deployment → Web app</b> (Execute as: Me, Access: Anyone) แล้วนำ URL ที่ลงท้าย{' '}
                <code>/exec</code> มาวางด้านบน
              </li>
              <li>เข้าสู่ระบบเจ้าหน้าที่ด้วยชื่อผู้ใช้ <code>admin</code> และตั้งรหัสผ่านใหม่ทันที</li>
            </ol>
            <p className="text-[11px] text-slate-500 pt-1">
              ผู้ใช้ต้องผูกบัญชี LINE ครั้งแรกผ่านแอป LINE (LIFF) จึงจะเข้าสู่ระบบได้ ส่วนโหมดทดสอบนอก LINE ให้ตั้ง{' '}
              <code>ALLOW_SANDBOX_MEMBER_AUTH=true</code> ชั่วคราวเท่านั้น
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
