import React, { useState } from 'react';
import { AdminUser } from '../types';
import { StorageService } from '../services/storageService';
import {
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Building2,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminUser, mustChangePassword: boolean) => void;
  onBackToMemberLogin: () => void;
}

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

  return (
    <div className="max-w-md mx-auto my-6 px-4">
      {/* Return to member button */}
      <button
        type="button"
        onClick={onBackToMemberLogin}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปยังหน้าสมาชิกสหกรณ์</span>
      </button>

      {/* Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-900 text-white shadow-xl shadow-indigo-900/25 mb-3">
          <ShieldAlert className="w-7 h-7 text-white" />
        </div>
        <div className="inline-block bg-indigo-100 text-indigo-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 border border-indigo-200">
          Cooperative Officer & Management Portal
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          ระบบจัดการสหกรณ์สำหรับเจ้าหน้าที่ (Admin)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ตรวจสอบสลิปเงินฝาก อนุมัติการถอนเงิน และจัดการสมุดบัญชีเงินฝาก
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl shadow-slate-900/5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              ชื่อผู้ใช้งานเจ้าหน้าที่ (Username / Employee ID) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ชื่อผู้ใช้เจ้าหน้าที่"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-3.5 py-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                รหัสผ่าน (Password) <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="ระบุรหัสผ่านเข้าใช้งาน"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-10 py-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
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
            <span>เข้าสู่ระบบเจ้าหน้าที่ (Admin Login)</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>ระบบรักษาความปลอดภัยระดับองค์กรสหกรณ์ออมทรัพย์</span>
        </div>
      </div>
    </div>
  );
};
