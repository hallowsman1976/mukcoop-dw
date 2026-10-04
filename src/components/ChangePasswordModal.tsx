import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  onDone: () => void;
}

/** Shown right after the first admin login while the one-time bootstrap password is still active. */
export const ChangePasswordModal: React.FC<Props> = ({ onDone }) => {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPw.length < 10) return setError('รหัสผ่านใหม่ต้องยาวอย่างน้อย 10 ตัวอักษร');
    if (newPw !== confirmPw) return setError('รหัสผ่านใหม่ไม่ตรงกัน');
    setBusy(true);
    try {
      await StorageService.changeAdminPassword(oldPw, newPw);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-2xl space-y-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">ตั้งรหัสผ่านใหม่</h3>
            <p className="text-xs text-slate-500">รหัสผ่านเริ่มต้นใช้ได้ครั้งเดียว กรุณาเปลี่ยนก่อนใช้งาน</p>
          </div>
        </div>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="รหัสผ่านเริ่มต้น"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="รหัสผ่านใหม่ (อย่างน้อย 10 ตัวอักษร)"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3 text-sm font-bold shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
        </button>
      </form>
    </div>
  );
};
