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
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Send,
  Sliders,
  DollarSign,
} from 'lucide-react';

interface NotificationSettingsProps {
  currentMember: Member;
  liffProfile: LiffUserProfile | null;
  onUpdateMember: (updatedMember: Member) => void;
  onTestPush: () => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: () => void; tone?: string; label: string }> = ({
  checked,
  onChange,
  tone = 'bg-[#06C755]',
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className={`relative w-12 h-7 rounded-full shrink-0 transition-colors cursor-pointer ${
      checked ? tone : 'bg-slate-300'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : ''
      }`}
    ></span>
  </button>
);

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
    lineUserId: liffProfile?.userId || currentMember.lineUserId || '',
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

  const lineLinked =
    !!liffProfile || !!currentMember.lineUserId || !!(currentMember as Member & { lineLinked?: boolean }).lineLinked;

  const options: {
    key: 'notifyOnDeposit' | 'notifyOnWithdraw' | 'notifyOnInterest';
    title: string;
    desc: string;
    icon: React.ElementType;
    iconCls: string;
    tone: string;
  }[] = [
    {
      key: 'notifyOnDeposit',
      title: 'เงินฝากเข้าบัญชี',
      desc: 'ส่งสลิปและยอดคงเหลือใหม่ทันทีที่ฝากเงินสำเร็จ',
      icon: ArrowDownLeft,
      iconCls: 'bg-emerald-100 text-emerald-700',
      tone: 'bg-emerald-500',
    },
    {
      key: 'notifyOnWithdraw',
      title: 'ถอนเงินโอนออก',
      desc: 'แจ้งเตือนความปลอดภัยทันทีเมื่อมีการตัดยอดออกจากบัญชี',
      icon: ArrowUpRight,
      iconCls: 'bg-rose-100 text-rose-700',
      tone: 'bg-rose-500',
    },
    {
      key: 'notifyOnInterest',
      title: 'สรุปดอกเบี้ยสะสม',
      desc: 'รายงานผลตอบแทนดอกเบี้ยเงินฝากประจำงวด',
      icon: Sparkles,
      iconCls: 'bg-amber-100 text-amber-700',
      tone: 'bg-amber-500',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto my-2 sm:my-4 space-y-4">
      {/* Hero with master switch */}
      <div
        className={`relative overflow-hidden rounded-[2rem] text-white p-5 shadow-xl transition-colors ${
          settings.enableLinePush
            ? 'bg-gradient-to-br from-[#06C755] via-emerald-600 to-teal-800 shadow-emerald-900/20'
            : 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-900/20'
        }`}
      >
        <div className="absolute -top-14 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
            {settings.enableLinePush ? <BellRing className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight">แจ้งเตือนผ่าน LINE</h2>
            <p className="text-xs text-white/85">
              {settings.enableLinePush ? 'เปิดอยู่ • รับข้อความเมื่อยอดเงินเปลี่ยน' : 'ปิดอยู่ • จะไม่มีข้อความเข้า LINE'}
            </p>
          </div>
          <Toggle
            checked={settings.enableLinePush}
            onChange={handleToggleMaster}
            tone="bg-white/40"
            label="เปิดหรือปิดการแจ้งเตือนผ่าน LINE"
          />
        </div>
      </div>

      {settings.enableLinePush ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Types */}
          <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" /> ประเภทที่ต้องการรับแจ้งเตือน
            </h3>
            <div className="divide-y divide-slate-100">
              {options.map(({ key, title, desc, icon: Icon, iconCls, tone }) => (
                <div
                  key={key}
                  onClick={() => handleToggleOption(key)}
                  className="flex items-center gap-3 py-3 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconCls}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{desc}</div>
                  </div>
                  <Toggle checked={settings[key]} onChange={() => handleToggleOption(key)} tone={tone} label={title} />
                </div>
              ))}
            </div>
          </section>

          {/* Threshold */}
          <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> ยอดเงินขั้นต่ำที่แจ้งเตือน
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {thresholds.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleThresholdChange(t.value)}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                    settings.minimumAmount === t.value
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {settings.minimumAmount === 0
                ? 'แจ้งเตือนทุกครั้งที่มีธุรกรรมเกิดขึ้น'
                : `แจ้งเตือนเฉพาะรายการตั้งแต่ ฿${settings.minimumAmount.toLocaleString()} ขึ้นไป`}
            </p>
          </section>

          {/* LINE account */}
          <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              {liffProfile?.pictureUrl ? (
                <img src={liffProfile.pictureUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#06C755]/40 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#06C755] text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {liffProfile ? liffProfile.displayName : 'บัญชี LINE ของคุณ'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {lineLinked ? 'ผูกกับบัญชีสมาชิกแล้ว' : 'ยังไม่ได้ผูกบัญชี LINE — เข้าสู่ระบบผ่านแอป LINE เพื่อรับแจ้งเตือน'}
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                  lineLinked ? 'bg-[#06C755]/15 text-[#05963f]' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {lineLinked ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTriggerTest}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.99] text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-[#06C755]/25 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{testSent ? 'เปิดตัวอย่างแล้ว!' : 'ดูตัวอย่างข้อความแจ้งเตือน'}</span>
            </button>
          </section>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <BellOff className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">คุณปิดการแจ้งเตือนผ่าน LINE ไว้</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            เมื่อฝากหรือถอนเงิน ระบบจะไม่ส่งข้อความเข้าแชท LINE ของคุณ ยังตรวจสอบรายการได้ที่หน้าประวัติธุรกรรม
          </p>
          <button
            type="button"
            onClick={handleToggleMaster}
            className="mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>เปิดการแจ้งเตือนอีกครั้ง</span>
          </button>
        </div>
      )}

      {/* Saved toast */}
      {saveSuccess && (
        <div className="fixed bottom-24 md:bottom-6 inset-x-0 z-[70] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>บันทึกการตั้งค่าแล้ว</span>
          </div>
        </div>
      )}
    </div>
  );
};
