import React, { useState } from 'react';
import { AdminUser } from '../types';
import { StorageService } from '../services/storageService';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ArrowLeft,
  FileCheck2,
  Users,
  Settings,
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminUser, mustChangePassword: boolean) => void;
  onBackToMemberLogin: () => void;
}

const FEATURES = [
  { icon: FileCheck2, label: 'ตรวจสลิปและอนุมัติธุรกรรม' },
  { icon: Users, label: 'จัดการสมาชิกและบัญชีเงินฝาก' },
  { icon: Settings, label: 'ตั้งค่านโยบายและรายงาน' },
];

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToMemberLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { admin, mustChangePassword } = await StorageService.loginAdmin(username, password);
      onLoginSuccess(admin, mustChangePassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all';

  return (
    <div className="max-w-md mx-auto my-4 sm:my-8 px-1 sm:px-4">
      <button
        type="button"
        onClick={onBackToMemberLogin}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปยังหน้าสมาชิก</span>
      </button>

      <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-950/15 border border-slate-200 bg-white">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white px-6 pt-8 pb-10">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <p className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-indigo-200">
              Officer Portal
            </p>
            <h2 className="text-2xl font-bold tracking-tight mt-0.5">ระบบเจ้าหน้าที่สหกรณ์</h2>
            <p className="text-xs text-indigo-100/80 mt-1">เข้าสู่ระบบเพื่อจัดการธุรกรรมและข้อมูลสมาชิก</p>

            <ul className="mt-5 space-y-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-xs text-indigo-50">
                  <span className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form (overlaps the hero) */}
        <form onSubmit={handleSubmit} className="relative -mt-5 rounded-t-[2rem] bg-white px-6 pt-6 pb-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">ชื่อผู้ใช้เจ้าหน้าที่</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                className={`${inputCls} font-mono`}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className={`${inputCls} pr-12 font-mono`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>เข้าสู่ระบบเจ้าหน้าที่</span>
          </button>

          <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้น
          </p>
        </form>
      </div>
    </div>
  );
};
