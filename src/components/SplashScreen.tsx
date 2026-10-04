import React from 'react';
import { COOP_LOGO_SRC, SYSTEM_NAME } from '../constants/brand';

interface SplashScreenProps {
  message?: string;
}

/** Full-screen loading view shown while the app restores a session / signs in with LINE. */
export const SplashScreen: React.FC<SplashScreenProps> = ({ message = 'กำลังเตรียมระบบ...' }) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 font-['Prompt',sans-serif]"
  >
    <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none"></div>
    <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-teal-200/40 blur-3xl pointer-events-none"></div>

    <div className="relative">
      <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></span>
      <img
        src={COOP_LOGO_SRC}
        alt=""
        className="relative w-24 h-24 rounded-full shadow-xl shadow-emerald-900/15 ring-4 ring-white"
      />
    </div>

    <h1 className="relative mt-6 text-lg font-bold text-slate-800 tracking-tight">{SYSTEM_NAME}</h1>

    <div className="relative mt-5 w-40 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
      <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 animate-[splash-slide_1.1s_ease-in-out_infinite]"></div>
    </div>
    <p className="relative mt-3 text-xs text-slate-500">{message}</p>
  </div>
);
