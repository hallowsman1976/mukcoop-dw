import { SYSTEM_NAME, COOP_NAME } from '../constants/brand';
import { BrandLogo } from './BrandLogo';
import React, { useState } from 'react';
import { Member, LiffUserProfile } from '../types';
import { padMemberId, formatCitizenId } from '../utils/validators';
import { StorageService } from '../services/storageService';
import { LiffService } from '../services/liffService';
import { UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (member: Member) => void;
  liffProfile: LiffUserProfile | null;
  onOpenLiffConfig: () => void;
  logoUrl?: string;
  coopName?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  liffProfile,
  onOpenLiffConfig,
  logoUrl,
  coopName,
}) => {
  const [memberIdInput, setMemberIdInput] = useState('');
  const [citizenIdInput, setCitizenIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paddedNotice, setPaddedNotice] = useState<string | null>(null);

  // Auto-pad member ID when user finishes typing or blurs
  const handleMemberIdBlur = () => {
    if (memberIdInput.trim()) {
      const padded = padMemberId(memberIdInput);
      if (padded !== memberIdInput) {
        setPaddedNotice(`ระบบเพิ่มเลข 0 นำหน้าให้เป็น 5 หลักอัตโนมัติ: ${padded}`);
      } else {
        setPaddedNotice(null);
      }
      setMemberIdInput(padded);
    }
  };

  const handleMemberIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 5);
    setMemberIdInput(raw);
    setError(null);
    setPaddedNotice(null);
  };

  const handleCitizenIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 13);
    setCitizenIdInput(raw);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const paddedId = padMemberId(memberIdInput);
    setMemberIdInput(paddedId);
    const cleanedCitizenId = citizenIdInput.replace(/D/g, '');

    if (!paddedId || paddedId.length !== 5) {
      setError('กรุณาระบุรหัสสมาชิกให้ครบถ้วน (ระบบจะเติมเลข 0 ให้อัตโนมัติเป็น 5 หลัก)');
      return;
    }
    if (cleanedCitizenId.length !== 13) {
      setError('กรุณาระบุหมายเลขบัตรประชาชนให้ครบ 13 หลัก');
      return;
    }

    setIsSubmitting(true);
    try {
      const member = await StorageService.loginMember(paddedId, cleanedCitizenId, LiffService.getIdToken());
      onLoginSuccess(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 px-4">
      {/* LINE LIFF Header Banner */}
      <div className="text-center mb-6">
        <BrandLogo logoUrl={logoUrl} className="w-16 h-16 mx-auto shadow-lg shadow-emerald-500/20 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{SYSTEM_NAME}</h2>
        <p className="text-sm font-semibold text-emerald-700 mt-0.5">{coopName || COOP_NAME}</p>
        <p className="text-xs text-slate-500 mt-1">
          ยืนยันตัวตนสมาชิก ปลอดภัย รวดเร็ว
        </p>
      </div>

      {/* LINE Profile Badge if detected */}
      {liffProfile && (
        <div className="mb-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {liffProfile.pictureUrl ? (
              <img
                src={liffProfile.pictureUrl}
                alt={liffProfile.displayName}
                className="w-10 h-10 rounded-full border border-emerald-300 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {liffProfile.displayName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{liffProfile.displayName}</span>
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-medium">
                  LINE Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500">เชื่อมต่อผ่าน LINE LIFF Gateway</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLiffConfig}
            className="text-[11px] text-emerald-700 hover:underline"
          >
            ตั้งค่า LIFF
          </button>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member ID (5 digits auto-pad) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                รหัสสมาชิก (5 หลัก) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                หากกรอกไม่ครบ 5 หลัก ระบบจะเพิ่ม 0 นำหน้าให้อัตโนมัติ
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                placeholder="เช่น 128 หรือ 00128"
                value={memberIdInput}
                onChange={handleMemberIdChange}
                onBlur={handleMemberIdBlur}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 tracking-wider"
                required
              />
              {memberIdInput && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-600 font-medium">
                  {padMemberId(memberIdInput)}
                </div>
              )}
            </div>
            {paddedNotice && (
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                {paddedNotice}
              </p>
            )}
          </div>

          {/* Citizen ID (13 digits) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                เลขประจำตัวประชาชน (13 หลัก) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {citizenIdInput.length}/13
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              placeholder="เลขบัตรประชาชน 13 หลัก"
              value={citizenIdInput}
              onChange={handleCitizenIdChange}
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 tracking-wider"
              required
            />
            {citizenIdInput.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                รูปแบบ: {formatCitizenId(citizenIdInput)}
              </p>
            )}
          </div>

          {/* Error notice */}
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
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            <span>ยืนยันตัวตนเข้าสู่ระบบ</span>
          </button>
        </form>

      </div>
    </div>
  );
};
