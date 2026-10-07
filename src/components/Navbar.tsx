import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { LogOut, UserCheck, Users, Type, Check, Database } from 'lucide-react';

export type AppTab = 'write' | 'executive' | 'history' | 'templates';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  currentUser: User;
  onLogout: () => void;
  pendingCount?: number;
  onOpenUserManagement: () => void;
  userCount?: number;
  dbConnected?: boolean | null;
  onOpenDbStatus?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  pendingCount = 0,
  onOpenUserManagement,
  userCount = 0,
  dbConnected = null,
  onOpenDbStatus,
}) => {
  // Font switcher state
  const [currentFont, setCurrentFont] = useState<string>(() => {
    return localStorage.getItem('cheque_sys_font') || 'prompt';
  });
  const [showFontMenu, setShowFontMenu] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  const fontOptions = [
    { key: 'prompt', label: 'Prompt (โมเดิร์น สบายตา ✨ แนะนำ)' },
    { key: 'noto', label: 'Noto Sans Thai (คมชัด มาตรฐาน)' },
    { key: 'ibm', label: 'IBM Plex Sans Thai (สไตล์องค์กร)' },
    { key: 'sarabun', label: 'Sarabun (สไตล์เอกสารราชการ)' },
  ];

  const handleApplyFont = (fontKey: string) => {
    setCurrentFont(fontKey);
    localStorage.setItem('cheque_sys_font', fontKey);
    document.documentElement.setAttribute('data-font', fontKey);
    document.body.setAttribute('data-font', fontKey);
    setShowFontMenu(false);
  };

  useEffect(() => {
    let saved = localStorage.getItem('cheque_sys_font');
    if (!saved || saved === 'sarabun') {
      saved = 'prompt';
      localStorage.setItem('cheque_sys_font', 'prompt');
    }
    setCurrentFont(saved);
    document.documentElement.setAttribute('data-font', saved);
    document.body.setAttribute('data-font', saved);

    const handleClickOutside = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setShowFontMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <header className="no-print bg-red-800 border-b-2 border-red-900 text-white sticky top-0 z-30 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 min-h-18 py-2.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Zone 1: Brand & Organization Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-red-800 flex items-center justify-center font-black text-xl shadow-md border-2 border-red-200 shrink-0">
            ฿
          </div>
          <button
            onClick={() => onSelectTab('write')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-red-100 transition-colors whitespace-nowrap block">
              ระบบจัดทำและพิมพ์เช็ค
            </span>
            <span className="text-xs text-red-200 font-medium hidden sm:block">
              KTB • BAAC • GSB
            </span>
          </button>
        </div>

        {/* Zone 2: Tabs (Admin sees all 4, User sees only write & history) */}
        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Tab 1: Cheque Writer */}
          <button
            type="button"
            onClick={() => onSelectTab('write')}
            className={`px-3.5 sm:px-4 py-2 text-sm sm:text-base font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'write'
                ? 'bg-white text-red-800 shadow-md ring-2 ring-red-300'
                : 'text-white hover:bg-red-700/80 bg-red-900/40 border border-red-700/60'
            }`}
          >
            <span>✍️ เขียนเช็ค</span>
          </button>

          {/* Tab 2: Dashboard (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('executive')}
              className={`px-3 sm:px-3.5 py-2 text-sm sm:text-base font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'executive'
                  ? 'bg-white text-red-800 shadow-md ring-2 ring-red-300'
                  : 'text-red-100 hover:text-white hover:bg-red-700/80 bg-red-900/30 border border-transparent hover:border-red-700/50'
              }`}
            >
              <span>📊 ภาพรวม</span>
            </button>
          )}

          {/* Tab 3: History */}
          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`px-3 sm:px-3.5 py-2 text-sm sm:text-base font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'history'
                ? 'bg-white text-red-800 shadow-md ring-2 ring-red-300'
                : 'text-red-100 hover:text-white hover:bg-red-700/80 bg-red-900/30 border border-transparent hover:border-red-700/50'
            }`}
          >
            <span>📋 ทะเบียนเช็ค</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-xs font-black ${currentTab === 'history' ? 'bg-red-700 text-white' : 'bg-white text-red-800'}`}>
                {pendingCount}
              </span>
            )}
          </button>

          {/* Tab 4: Templates (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('templates')}
              className={`px-3 sm:px-3.5 py-2 text-sm sm:text-base font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'templates'
                  ? 'bg-white text-red-800 shadow-md ring-2 ring-red-300'
                  : 'text-red-100 hover:text-white hover:bg-red-700/80 bg-red-900/30 border border-transparent hover:border-red-700/50'
              }`}
            >
              <span>⚙️ ตั้งค่าแม่แบบ</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Account info, Font Switcher, User Management button & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* MySQL Database Connection Status Pill */}
          {onOpenDbStatus && (
            <button
              type="button"
              onClick={onOpenDbStatus}
              title="คลิกเพื่อดูสถานะการเชื่อมต่อ MySQL 10.1.0.201 หรือซิงค์ข้อมูล"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs ${
                dbConnected === true
                  ? 'bg-emerald-950/60 hover:bg-emerald-950 border-emerald-500/80 text-emerald-200'
                  : dbConnected === false
                  ? 'bg-rose-950/60 hover:bg-rose-950 border-rose-500/80 text-rose-200'
                  : 'bg-amber-950/60 hover:bg-amber-950 border-amber-500/80 text-amber-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                dbConnected === true
                  ? 'bg-emerald-400 animate-pulse'
                  : dbConnected === false
                  ? 'bg-rose-400'
                  : 'bg-amber-400 animate-ping'
              }`} />
              <span className="hidden sm:inline text-[11px] font-mono">
                {dbConnected === true ? 'MySQL 10.1.0.201' : dbConnected === false ? 'MySQL ออฟไลน์' : 'MySQL ตรวจสอบ...'}
              </span>
            </button>
          )}

          {/* Font Switcher Dropdown */}
          <div className="relative" ref={fontMenuRef}>
            <button
              type="button"
              onClick={() => setShowFontMenu(!showFontMenu)}
              title="เปลี่ยนรูปแบบตัวอักษรของระบบ (Font)"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-white hover:text-red-100 bg-red-900/60 hover:bg-red-900 border border-red-700/80 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Type className="w-3.5 h-3.5 text-red-200" />
              <span className="hidden md:inline text-[11px]">
                ฟอนต์: {currentFont === 'prompt' ? 'Prompt' : currentFont === 'noto' ? 'Noto' : currentFont === 'ibm' ? 'IBM Plex' : 'Sarabun'}
              </span>
            </button>

            {showFontMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl border-2 border-red-100 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 text-xs font-black text-slate-700 flex items-center justify-between">
                  <span>เลือกรูปแบบตัวอักษร (Font)</span>
                </div>
                <div className="py-1 space-y-1">
                  {fontOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleApplyFont(opt.key)}
                      className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        currentFont === opt.key
                          ? 'bg-red-50 text-red-800 font-extrabold border border-red-200'
                          : 'hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {currentFont === opt.key && <Check className="w-3.5 h-3.5 text-red-700" />}
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] text-slate-500 mt-1">
                  ✨ แนะนำใช้ Prompt เพื่อความสบายตา โมเดิร์น คมชัด
                </div>
              </div>
            )}
          </div>

          {/* Member Management button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenUserManagement}
              title="จัดการและลงทะเบียนสมาชิกผู้ใช้งานในระบบ (เฉพาะ Admin)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-white hover:text-red-100 bg-red-900/60 hover:bg-red-900 border border-red-700/80 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Users className="w-4 h-4 text-red-200" />
              <span className="hidden md:inline">จัดการผู้ใช้</span>
              {userCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-red-800 rounded-full text-[11px] font-black">
                  {userCount}
                </span>
              )}
            </button>
          )}

          {/* Current user chip */}
          <div
            className="hidden xl:flex flex-col items-end text-xs leading-tight text-right select-none"
          >
            <span className="font-bold text-sm text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-red-200" />
              {currentUser.fullName}
              <span className={`text-[10px] px-2 py-0.5 rounded font-black ${isAdmin ? 'bg-amber-400 text-slate-900' : 'bg-red-950/60 text-red-200'}`}>
                {isAdmin ? 'ADMIN' : 'USER'}
              </span>
            </span>
            <span className="text-red-200 text-xs">
              {currentUser.position || (isAdmin ? 'ผู้ดูแลระบบสูงสุด' : 'เจ้าหน้าที่การเงิน')}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="ออกจากระบบ"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:text-red-100 bg-red-900/80 hover:bg-red-950 border border-red-700 hover:border-red-600 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>

      </div>
    </header>
  );
};
