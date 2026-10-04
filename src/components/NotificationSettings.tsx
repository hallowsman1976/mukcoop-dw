import React, { useState } from 'react';
import { Member, LineNotificationSettings, LiffUserProfile } from '../types';
import { StorageService } from '../services/storageService';
import { LiffService } from '../services/liffService';
import {
  Bell,
  BellOff,
  BellRing,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Send,
  Sliders,
  DollarSign,
  MessageSquare,
} from 'lucide-react';

interface NotificationSettingsProps {
  currentMember: Member;
  liffProfile: LiffUserProfile | null;
  onUpdateMember: (updatedMember: Member) => void;
  onTestPush: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  currentMember,
  liffProfile,
  onUpdateMember,
  onTestPush,
}) => {
  const initialSettings: LineNotificationSettings = currentMember.notificationSettings || {
    enableLinePush: true,
    notifyOnDeposit: true,
    notifyOnWithdraw: true,
    notifyOnInterest: true,
    minimumAmount: 0,
    lineUserId: liffProfile?.userId || currentMember.lineUserId || 'U1a2b3c4d5e6f7g8',
  };

  const [settings, setSettings] = useState<LineNotificationSettings>(initialSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleToggleMaster = () => {
    const nextState = !settings.enableLinePush;
    const updated = {
      ...settings,
      enableLinePush: nextState,
      // If toggled on and sub-settings were all false, re-enable deposit/withdraw by default
      notifyOnDeposit: nextState ? (settings.notifyOnDeposit || true) : settings.notifyOnDeposit,
      notifyOnWithdraw: nextState ? (settings.notifyOnWithdraw || true) : settings.notifyOnWithdraw,
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const handleToggleOption = (key: keyof LineNotificationSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const handleThresholdChange = (amt: number) => {
    const updated = {
      ...settings,
      minimumAmount: amt,
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const persistSettings = async (newSettings: LineNotificationSettings) => {
    const ok = await StorageService.updateMemberNotificationSettings(newSettings);
    if (!ok) return;
    onUpdateMember({
      ...currentMember,
      notificationSettings: newSettings,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTriggerTest = () => {
    onTestPush();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const thresholds = [
    { label: 'ทุกยอดเงิน (฿0+)', value: 0 },
    { label: '฿100 ขึ้นไป', value: 100 },
    { label: '฿500 ขึ้นไป', value: 500 },
    { label: '฿1,000 ขึ้นไป', value: 1000 },
  ];

  return (
    <div className="max-w-2xl mx-auto my-4 space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-emerald-300 shadow-inner">
              {settings.enableLinePush ? (
                <BellRing className="w-6 h-6 text-white animate-bounce" />
              ) : (
                <BellOff className="w-6 h-6 text-slate-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  การแจ้งเตือนผ่าน LINE Messaging API
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    settings.enableLinePush
                      ? 'bg-emerald-400 text-slate-900'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {settings.enableLinePush ? 'เปิดใช้งาน (Active)' : 'ปิดการแจ้งเตือน (Muted)'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                รับข้อความ Push Notification ทันทีที่มีการเปลี่ยนแปลงยอดเงินในบัญชี
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-6">
        {/* Master Switch */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                เปิดรับการแจ้งเตือนยอดเงินผ่าน LINE (Push Notifications)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ส่งข้อความ Flex Messages แจ้งเตือนเข้าแชท LINE ส่วนตัวเมื่อเงินเข้า-ออก
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.enableLinePush}
              onChange={handleToggleMaster}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06C755]"></div>
          </label>
        </div>

        {/* Detailed Options when Master is ON */}
        {settings.enableLinePush ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Sub Notification Items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                เลือกประเภทธุรกรรมที่ต้องการรับแจ้งเตือน
              </h3>

              <div className="space-y-2.5">
                {/* 1. Deposit Alert */}
                <div
                  onClick={() => handleToggleOption('notifyOnDeposit')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-800">
                        แจ้งเตือนเมื่อมีเงินฝากเข้าบัญชี (Deposit Alerts)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ส่งสลิปพร้อมยอดเงินคงเหลือใหม่ทันทีที่มีการฝากเงินสำเร็จ
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnDeposit}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                  />
                </div>

                {/* 2. Withdraw Alert */}
                <div
                  onClick={() => handleToggleOption('notifyOnWithdraw')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block group-hover:text-rose-800">
                        แจ้งเตือนเมื่อมีการถอนเงินโอนออก (Withdrawal Alerts)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        แจ้งเตือนความปลอดภัยทันทีเมื่อมีการตัดยอดเงินออกจากบัญชี
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnWithdraw}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 pointer-events-none"
                  />
                </div>

                {/* 3. Interest Alert */}
                <div
                  onClick={() => handleToggleOption('notifyOnInterest')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-800">
                        แจ้งเตือนสรุปดอกเบี้ยสะสมและเงินปันผล (Interest Alerts)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        รับรายงานผลตอบแทนดอกเบี้ยเงินฝากประจำงวด
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnInterest}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Threshold Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                กำหนดยอดเงินขั้นต่ำที่ต้องการให้แจ้งเตือน
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {thresholds.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleThresholdChange(t.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      settings.minimumAmount === t.value
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {settings.minimumAmount === 0
                  ? 'ระบบจะส่งข้อความแจ้งเตือนทุกครั้งที่มีธุรกรรมเกิดขึ้น'
                  : `ระบบจะแจ้งเตือนเฉพาะรายการที่มีมูลค่าตั้งแต่ ฿${settings.minimumAmount.toLocaleString()} ขึ้นไป`}
              </p>
            </div>

            {/* LINE Account Link & Test Push */}
            <div className="p-4 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      บัญชี LINE ที่เชื่อมต่อสำหรับส่ง Push Notification
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {liffProfile
                        ? `เชื่อมต่อกับ LINE: ${liffProfile.displayName}`
                        : `LINE User ID: ${settings.lineUserId || currentMember.lineUserId || 'U1a2b3c4d5e6f7g8'}`}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-[#06C755] text-white font-semibold px-2 py-0.5 rounded-full">
                  เชื่อมต่อแล้ว
                </span>
              </div>

              <div className="pt-2 border-t border-[#06C755]/20 flex items-center justify-between">
                <span className="text-[11px] text-slate-600">
                  ต้องการตรวจสอบว่าการแจ้งเตือนทำงานได้ถูกต้องหรือไม่?
                </span>
                <button
                  type="button"
                  onClick={handleTriggerTest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSent ? 'ส่งตัวอย่างแล้ว!' : 'ทดสอบส่งข้อความเข้า LINE'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Muted State Information */
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 text-xs text-slate-500">
            <BellOff className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-700">คุณปิดการรับการแจ้งเตือนผ่าน LINE ไว้</h4>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              เมื่อทำรายการฝากหรือถอนเงิน ระบบจะไม่ส่งข้อความแจ้งเตือนอัตโนมัติเข้าแชท LINE ของคุณ โดยคุณยังสามารถตรวจสอบประวัติธุรกรรมได้ในแท็บประวัติบนหน้าเว็บ
            </p>
            <button
              type="button"
              onClick={handleToggleMaster}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>เปิดการแจ้งเตือนอีกครั้ง</span>
            </button>
          </div>
        )}

        {/* Saved Feedback */}
        {saveSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกการตั้งค่าการแจ้งเตือน LINE สำเร็จแล้ว!</span>
          </div>
        )}
      </div>
    </div>
  );
};
