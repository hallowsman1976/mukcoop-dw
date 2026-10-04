import { SYSTEM_NAME, COOP_NAME } from '../constants/brand';
import { BrandLogo } from './BrandLogo';
import React, { useState } from 'react';
import { Member, LiffUserProfile } from '../types';
import { padMemberId, formatCitizenId } from '../utils/validators';
import { StorageService } from '../services/storageService';
import { LiffService, LiffStatus } from '../services/liffService';
import { PdpaConsent, PDPA_VERSION } from './PdpaConsent';
import { UserCheck, AlertCircle, CheckCircle2, UserPlus, Smartphone } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (member: Member) => void;
  liffProfile: LiffUserProfile | null;
  liffStatus?: LiffStatus;
  onOpenLiffConfig: () => void;
  logoUrl?: string;
  coopName?: string;
  lineOfficialId?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  liffProfile,
  liffStatus,
  onOpenLiffConfig,
  logoUrl,
  coopName,
  lineOfficialId,
}) => {
  const [memberIdInput, setMemberIdInput] = useState('');
  const [citizenIdInput, setCitizenIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paddedNotice, setPaddedNotice] = useState<string | null>(null);
  const [pdpaAccepted, setPdpaAccepted] = useState(false);

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
    const cleanedCitizenId = citizenIdInput.replace(/\D/g, '');

    if (!paddedId || paddedId.length !== 5) {
      setError('กรุณาระบุรหัสสมาชิกให้ครบถ้วน (ระบบจะเติมเลข 0 ให้อัตโนมัติเป็น 5 หลัก)');
      return;
    }
    if (cleanedCitizenId.length !== 13) {
      setError('กรุณาระบุหมายเลขบัตรประชาชนให้ครบ 13 หลัก');
      return;
    }

    if (!pdpaAccepted) {
      setError('กรุณาอ่านและยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนเข้าสู่ระบบ');
      return;
    }

    setIsSubmitting(true);
    try {
      const member = await StorageService.loginMember(paddedId, cleanedCitizenId, LiffService.getIdToken(), {
        consent: pdpaAccepted,
        version: PDPA_VERSION,
      });
      onLoginSuccess(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add-friend link for the Official Account, e.g. @coop -> https://line.me/R/ti/p/%40coop
  const oaId = (lineOfficialId || '').trim();
  const addFriendUrl = oaId
    ? `https://line.me/R/ti/p/${encodeURIComponent(oaId.startsWith('@') ? oaId : `@${oaId}`)}`
    : null;

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

      {/* LINE account linking guide */}
      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        {liffProfile ? (
          <div className="flex items-center gap-3">
            {liffProfile.pictureUrl ? (
              <img
                src={liffProfile.pictureUrl}
                alt={liffProfile.displayName}
                className="w-12 h-12 rounded-full ring-2 ring-[#06C755]/50 object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold shrink-0">
                {liffProfile.displayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 truncate">{liffProfile.displayName}</span>
                <CheckCircle2 className="w-4 h-4 text-[#06C755] shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500">
                เข้าสู่ระบบ LINE แล้ว • กรอกข้อมูลสมาชิกด้านล่างเพื่อผูกบัญชีนี้
              </p>
            </div>
          </div>
        ) : liffStatus?.liffId ? (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">ต้องเข้าผ่านแอป LINE</div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  เพื่อความปลอดภัย ระบบต้องยืนยันตัวตนผ่านบัญชี LINE ของคุณก่อน กดปุ่มด้านล่างเพื่อเข้าสู่ระบบด้วย LINE
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => LiffService.login()}
                className="py-2.5 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                เข้าสู่ระบบด้วย LINE
              </button>
              <a
                href={`https://liff.line.me/${liffStatus.liffId}`}
                className="py-2.5 rounded-2xl border border-[#06C755] text-[#05963f] text-xs font-bold text-center hover:bg-[#06C755]/5 transition-colors"
              >
                เปิดในแอป LINE
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 text-[11px] text-slate-500">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>ยังไม่ได้ตั้งค่า LINE LIFF — ผู้ดูแลระบบต้องระบุ LIFF ID ก่อนจึงจะผูกบัญชี LINE ได้</span>
          </div>
        )}

        <ol className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500">
          {[
            { n: 1, label: 'เข้าสู่ระบบ LINE', done: !!liffProfile },
            { n: 2, label: 'กรอกข้อมูลสมาชิก', done: false },
            { n: 3, label: 'ครั้งหน้าเข้าอัตโนมัติ', done: false },
          ].map((st) => (
            <li key={st.n} className="space-y-1">
              <span
                className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  st.done ? 'bg-[#06C755] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {st.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.n}
              </span>
              <span className="block leading-tight">{st.label}</span>
            </li>
          ))}
        </ol>

        <div className="text-right">
          <button
            type="button"
            onClick={onOpenLiffConfig}
            className="text-[11px] text-slate-400 hover:text-emerald-700 hover:underline cursor-pointer"
          >
            ตั้งค่า LIFF
          </button>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl shadow-slate-900/5">
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
                className="w-full px-4 py-3.5 text-base font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 tracking-wider"
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
              className="w-full px-4 py-3.5 text-base font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 tracking-wider"
              required
            />
            {citizenIdInput.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                รูปแบบ: {formatCitizenId(citizenIdInput)}
              </p>
            )}
          </div>

          <PdpaConsent checked={pdpaAccepted} onChange={(v) => { setPdpaAccepted(v); setError(null); }} />

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
            disabled={isSubmitting || !pdpaAccepted}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            <span>ยืนยันตัวตนเข้าสู่ระบบ</span>
          </button>
        </form>

        {addFriendUrl && (
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-semibold transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มเพื่อน LINE {lineOfficialId?.trim()}</span>
          </a>
        )}
      </div>
    </div>
  );
};
