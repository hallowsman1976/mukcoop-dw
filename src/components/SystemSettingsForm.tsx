import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { StorageService, DEFAULT_SYSTEM_SETTINGS } from '../services/storageService';
import confetti from 'canvas-confetti';
import {
  Settings,
  Building2,
  Percent,
  Clock,
  Smartphone,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Lock,
  Globe,
  DollarSign,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  Bell,
  RefreshCw,
} from 'lucide-react';

interface SystemSettingsFormProps {
  onSettingsSaved?: (newSettings: SystemSettings) => void;
}

export const SystemSettingsForm: React.FC<SystemSettingsFormProps> = ({
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSystemSettings());
  const [activeSection, setActiveSection] = useState<
    'organization' | 'financial' | 'operating' | 'line' | 'security'
  >('organization');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Handle changes
  const updateField = <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  // Save Settings (superadmin only; validated and stored by the server)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await StorageService.saveSystemSettings(settings);
      setSettings(saved);
      setSaveSuccessMessage('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว ข้อมูลมีผลบังคับใช้ทันที');
      if (onSettingsSaved) onSettingsSaved(saved);
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults (only fills the form; nothing changes until "save")
  const handleResetDefaults = () => {
    if (confirm('ต้องการเติมค่าเริ่มต้นลงในฟอร์มใช่หรือไม่? (ยังไม่มีผลจนกว่าจะกดบันทึก)')) {
      setSettings(DEFAULT_SYSTEM_SETTINGS);
      setSaveSuccessMessage('เติมค่าเริ่มต้นแล้ว กรุณากดบันทึกเพื่อใช้งาน');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden space-y-0">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-indigo-300 border border-white/20">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  การตั้งค่าระบบสหกรณ์ (System Settings & Policies)
                </h2>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Global Config
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                กำหนดนโยบายการเงิน อัตราดอกเบี้ย วงเงินทำรายการ เวลาทำการ และการเชื่อมต่อ LINE LIFF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all border border-white/20 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection('organization')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSection === 'organization'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>ข้อมูลสหกรณ์และองค์กร</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('financial')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSection === 'financial'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>นโยบายการเงินและดอกเบี้ย</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('operating')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSection === 'operating'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>เวลาทำการและปิดปรับปรุง</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('line')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSection === 'line'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>LINE Messaging & LIFF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('security')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSection === 'security'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ความปลอดภัยและลายมือชื่อ</span>
          </button>
        </div>
      </div>

      {/* Main Settings Form Body */}
      <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
        {saveError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {saveError}
          </div>
        )}

        {/* Success Alert Banner */}
        {saveSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs font-medium animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1: Organization & Profile */}
        {activeSection === 'organization' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>ข้อมูลนิติบุคคลและหน่วยงานสหกรณ์</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ข้อมูลนี้จะแสดงในสลิปหลักฐาน หน้าจอแอปพลิเคชัน LIFF และหัวรายงานธุรกรรมทางการเงิน
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  ชื่อสหกรณ์ / องค์กร (Cooperative Name):
                </label>
                <input
                  type="text"
                  value={settings.cooperativeName}
                  onChange={(e) => updateField('cooperativeName', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  เลขทะเบียนสหกรณ์ / ทะเบียนนิติบุคคล:
                </label>
                <input
                  type="text"
                  value={settings.registrationNumber}
                  onChange={(e) => updateField('registrationNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  เบอร์โทรศัพท์ติดต่อสำนักงาน:
                </label>
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  อีเมลทางการ (Official Contact Email):
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-700 block">
                  ที่ตั้งสำนักงานใหญ่ (Headquarters Address):
                </label>
                <textarea
                  rows={2}
                  value={settings.officeAddress}
                  onChange={(e) => updateField('officeAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-700 block">
                  URL ตราสัญลักษณ์ / โลโก้สหกรณ์:
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={settings.logoUrl}
                    alt="Logo Preview"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                  />
                  <input
                    type="url"
                    value={settings.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Financial Policies & Interest Rates */}
        {activeSection === 'financial' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600" />
                <span>นโยบายอัตราดอกเบี้ยและวงเงินทำธุรกรรม</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดอัตราดอกเบี้ยสะสมต่อปี และข้อจำกัดวงเงินฝาก-ถอนของสมาชิก
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Regular Interest Rate */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <label className="font-bold text-emerald-950 block">
                  อัตราดอกเบี้ยบัญชีออมทรัพย์ปกติ (% ต่อปี):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="15"
                    value={settings.regularInterestRate}
                    onChange={(e) => updateField('regularInterestRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    %
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 block">
                  สำหรับบัญชีออมทรัพย์ทั่วไป (คำนวณสะสมแบบรายวัน)
                </span>
              </div>

              {/* Special Interest Rate */}
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2">
                <label className="font-bold text-teal-950 block">
                  อัตราดอกเบี้ยบัญชีออมทรัพย์พิเศษ (% ต่อปี):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="15"
                    value={settings.specialInterestRate}
                    onChange={(e) => updateField('specialInterestRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold text-sm bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    %
                  </span>
                </div>
                <span className="text-[11px] text-teal-700 block">
                  สำหรับบัญชีเงินฝากประจำหรือออมทรัพย์พิเศษผลตอบแทนสูง
                </span>
              </div>

              {/* Min Deposit */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  ยอดเงินฝากขั้นต่ำต่อรายการ (บาท):
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={settings.minDepositAmount}
                  onChange={(e) => updateField('minDepositAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Min Withdraw */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  ยอดเงินถอนขั้นต่ำต่อรายการ (บาท):
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={settings.minWithdrawAmount}
                  onChange={(e) => updateField('minWithdrawAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Max Daily Withdraw */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  วงเงินถอนสูงสุดต่อวันต่อสมาชิก (บาท):
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={settings.maxDailyWithdrawAmount}
                  onChange={(e) => updateField('maxDailyWithdrawAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Min Account Balance */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  ยอดเงินคงเหลือขั้นต่ำเพื่อคงสภาพบัญชี (บาท):
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.minAccountBalance}
                  onChange={(e) => updateField('minAccountBalance', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* High-Value Approval Threshold */}
              <div className="sm:col-span-2 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-950">
                    เกณฑ์วงเงินที่ต้องผ่านการตรวจสอบอนุมัติพิเศษ (High-Value Approval Threshold):
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5000"
                    step="5000"
                    value={settings.highValueApprovalThreshold}
                    onChange={(e) => updateField('highValueApprovalThreshold', parseFloat(e.target.value) || 0)}
                    className="w-48 px-3 py-1.5 font-mono font-bold bg-white border border-amber-300 rounded-xl focus:outline-none"
                    required
                  />
                  <span className="text-[11px] text-amber-800">
                    บาท (ธุรกรรมฝากหรือถอนที่เกินยอดนี้จะต้องได้รับการตรวจสอบสลิปและลายเซ็นต์โดยเจ้าหน้าที่)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Operating Hours & Maintenance */}
        {activeSection === 'operating' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>เวลาเปิด-ปิดระบบบริการ และการระงับบริการชั่วคราว</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ควบคุมช่วงเวลาที่สมาชิกสามารถทำรายการฝาก-ถอนเงินออนไลน์ผ่าน LINE LIFF
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* 24 Hours Toggle */}
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isServiceActive24h}
                  onChange={(e) => updateField('isServiceActive24h', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    เปิดให้บริการระบบฝาก-ถอนออนไลน์ตลอด 24 ชั่วโมง
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    หากปิดสวิตช์นี้ ระบบจะเปิดให้ทำรายการเฉพาะตามเวลาทำการที่ระบุด้านล่าง
                  </span>
                </div>
              </label>

              {/* Time Window if not 24h */}
              {!settings.isServiceActive24h && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      เวลาเริ่มเปิดให้บริการ (Start Time):
                    </label>
                    <input
                      type="time"
                      value={settings.serviceStartTime}
                      onChange={(e) => updateField('serviceStartTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      เวลาปิดให้บริการประจำวัน (End Time):
                    </label>
                    <input
                      type="time"
                      value={settings.serviceEndTime}
                      onChange={(e) => updateField('serviceEndTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Weekend Transactions */}
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowWeekendTransactions}
                  onChange={(e) => updateField('allowWeekendTransactions', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    อนุญาตให้ทำรายการในวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    เปิดให้สมาชิกสามารถโอนเงินฝากและส่งคำขอถอนเงินได้ในวันหยุด
                  </span>
                </div>
              </label>

              {/* Maintenance Mode Toggle */}
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isMaintenanceMode}
                    onChange={(e) => updateField('isMaintenanceMode', e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-rose-950 block">
                      เปิดโหมดปิดปรับปรุงระบบชั่วคราว (Maintenance Mode)
                    </span>
                    <span className="text-rose-700 text-[11px]">
                      เมื่อเปิดใช้งาน สมาชิกจะเห็นหน้าต่างแจ้งเตือนและไม่สามารถทำธุรกรรมฝาก-ถอนได้ชั่วคราว
                    </span>
                  </div>
                </label>

                {settings.isMaintenanceMode && (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <label className="font-semibold text-rose-900 block">
                      ข้อความแจ้งสมาชิกเมื่อปิดปรับปรุงระบบ:
                    </label>
                    <textarea
                      rows={2}
                      value={settings.maintenanceMessage}
                      onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: LINE Messaging & LIFF Configuration */}
        {activeSection === 'line' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#06C755]" />
                <span>การเชื่อมต่อ LINE Messaging API & LIFF SDK</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนด Channel ID, Channel Secret และ Long-lived Access Token สำหรับส่ง Push Message
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  LIFF App ID (LINE Front-end Framework):
                </label>
                <input
                  type="text"
                  value={settings.liffId}
                  onChange={(e) => updateField('liffId', e.target.value)}
                  placeholder="2006789012-abcdeXYZ"
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#06C755] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  LINE Official Account ID:
                </label>
                <input
                  type="text"
                  value={settings.lineOfficialId}
                  onChange={(e) => updateField('lineOfficialId', e.target.value)}
                  placeholder="@coop.development"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#06C755] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Channel Access Token และ LINE Login Channel ID เก็บอยู่ใน <b>Script Properties</b> ของ Google Apps Script
                (LINE_CHANNEL_ACCESS_TOKEN, LINE_LOGIN_CHANNEL_ID) ไม่เก็บ/ไม่แสดงในหน้านี้เพื่อความปลอดภัย
              </div>

              {/* Master Push Notification Toggles */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/30 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#06C755]" />
                  <span>ระบบส่งการแจ้งเตือนอัตโนมัติผ่าน LINE Push Message</span>
                </h4>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableGlobalLinePush}
                      onChange={(e) => updateField('enableGlobalLinePush', e.target.checked)}
                      className="w-4 h-4 rounded text-[#06C755] focus:ring-[#06C755]"
                    />
                    <span className="font-semibold text-slate-800">
                      เปิดระบบส่งสลิปและ Flex Message เข้า LINE ส่วนตัวของสมาชิกเมื่อมียอดเงินเปลี่ยนแปลง
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyStaffOnPendingTxn}
                      onChange={(e) => updateField('notifyStaffOnPendingTxn', e.target.checked)}
                      className="w-4 h-4 rounded text-[#06C755] focus:ring-[#06C755]"
                    />
                    <span className="font-semibold text-slate-800">
                      ส่งข้อความแจ้งเตือนเข้าห้องแชตเจ้าหน้าที่ทันทีเมื่อมีรายการรอการตรวจสอบและอนุมัติ
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Security & Verification Policies */}
        {activeSection === 'security' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>นโยบายความปลอดภัยและระบบลายมือชื่อดิจิทัล</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดเงื่อนไขทางกฎหมายการเงิน การลงนาม 2 จุด และระบบตรวจสอบสลิป
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireDualSignatures}
                  onChange={(e) => updateField('requireDualSignatures', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    บังคับลงลายมือชื่อดิจิทัล 2 จุด (Dual Digital Signatures) ในการถอนเงิน
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    กำหนดให้ต้องมีลายเซ็นของเจ้าของบัญชีผู้ถอน และลายเซ็นของผู้รับเงินปลายทางเพื่อความปลอดภัยตามกฎหมาย
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAiSlipVerification}
                  onChange={(e) => updateField('enableAiSlipVerification', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    เปิดระบบ AI วิเคราะห์และตรวจสอบสลิปโอนเงินอัตโนมัติ (Slip Verification)
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    ตรวจจับยอดเงิน วันที่ และรหัสธุรกรรมจากภาพสลิปที่สมาชิกอัปโหลดก่อนส่งให้เจ้าหน้าที่อนุมัติ
                  </span>
                </div>
              </label>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <label className="font-bold text-slate-900 block">
                  ระยะเวลา Session Timeout ของเจ้าหน้าที่ระบบ (นาที):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={settings.adminSessionTimeoutMinutes}
                    onChange={(e) => updateField('adminSessionTimeoutMinutes', parseInt(e.target.value, 10) || 30)}
                    className="w-32 px-3 py-1.5 font-mono bg-white border border-slate-200 rounded-xl"
                  />
                  <span className="text-slate-500 text-[11px]">
                    นาที (ระบบจะออกจากระบบอัตโนมัติหากไม่มีการใช้งานเพื่อความปลอดภัย)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions Bar */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            * การตั้งค่าทั้งหมดจะถูกบันทึกและซิงค์ทันทีเมื่อคลิกบันทึก
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึกการตั้งค่า...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าระบบทั้งหมด</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
