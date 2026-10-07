import React, { useState, useId } from 'react';
import { StorageService } from '../utils/storage';
import { User, UserRole } from '../types';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Briefcase,
  CheckCircle2,
  Building,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  KeyRound,
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER';

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');

  // Sign In State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPosition, setRegPosition] = useState('นักวิชาการเงินและบัญชี');
  const [regRole, setRegRole] = useState<UserRole>('USER');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Feedback State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-configured positions for fast registration
  const commonPositions = [
    'นักวิชาการเงินและบัญชี',
    'เจ้าหน้าที่การเงินและบัญชี',
    'เจ้าหน้าที่พัสดุและจัดซื้อ',
    'หัวหน้ากลุ่มงานการเงินและบัญชี',
    'ผู้อำนวยการ / ผู้มีอำนาจลงนาม',
    'เจ้าหน้าที่ธุรการ',
  ];

  // Switch tabs
  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  // Password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' };
    if (pass.length < 4) return { score: 1, text: 'สั้นเกินไป (อย่างน้อย 4 ตัว)', color: 'bg-red-500' };
    if (pass.length < 6) return { score: 2, text: 'พอใช้', color: 'bg-amber-500' };
    if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) {
      return { score: 4, text: 'ปลอดภัยสูง', color: 'bg-emerald-500' };
    }
    return { score: 3, text: 'ปานกลาง', color: 'bg-blue-500' };
  };

  const strength = getPasswordStrength(regPassword);

  // Check username availability in real-time
  const isUsernameTaken = regUsername.length >= 3 && !StorageService.isUsernameAvailable(regUsername);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await StorageService.authenticateDetailed(loginUsername, loginPassword, rememberMe);
      if (!res.success || !res.user) {
        setError(res.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        onLoginSuccess(res.user);
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUsername = regUsername.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('ชื่อผู้ใช้งาน (Username) ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError('ชื่อผู้ใช้งานต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) เท่านั้น');
      return;
    }
    if (isUsernameTaken) {
      setError(`ชื่อผู้ใช้งาน "${cleanUsername}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
      return;
    }
    if (!regFullName.trim()) {
      setError('กรุณาระบุชื่อ-นามสกุลจริง');
      return;
    }
    if (regPassword.length < 4) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    setIsLoading(true);

    try {
      const result = await StorageService.registerUser(
        {
          username: cleanUsername,
          fullName: regFullName.trim(),
          passwordPlain: regPassword,
          position: regPosition.trim() || 'เจ้าหน้าที่การเงินและบัญชี',
          role: regRole,
        },
        {
          autoLogin: false,
          status: 'PENDING',
        }
      );

      if (!result.success || !result.user) {
        setError(result.error || 'การสมัครสมาชิกล้มเหลว');
      } else {
        setSuccessMsg(`ลงทะเบียนสำเร็จเรียบร้อยแล้ว! บัญชีของคุณ "${result.user.username}" อยู่ระหว่าง "รอการอนุมัติสิทธิ์" จากผู้ดูแลระบบ (Admin) เมื่อได้รับการอนุมัติแล้วจะสามารถเข้าสู่ระบบได้ทันที`);
        setRegUsername('');
        setRegFullName('');
        setRegPassword('');
        setRegConfirmPassword('');
        setLoginUsername(result.user.username);
        setLoginPassword('');
        setMode('LOGIN');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/5 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] flex flex-col justify-center items-center px-4 sm:px-6 py-10 relative font-sans antialiased text-slate-800">
      
      {/* Soft background ambient light */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[720px] h-[320px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[480px] w-full relative z-10">
        
        {/* Top Header Branding: Clean, High Authority, Professional */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-3 mb-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-red-800 via-red-700 to-red-600 text-white flex items-center justify-center shadow-lg shadow-red-900/25 ring-4 ring-white border border-red-500/30 shrink-0">
              <span className="font-black text-2xl tracking-tighter">฿</span>
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                ระบบจัดทำและสั่งพิมพ์เช็ค
              </h1>
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                Cheque Management & Printing System
              </p>
            </div>
          </div>

          {/* Clean supported bank indicators */}
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur-xs border border-slate-200/90 rounded-full shadow-xs text-[11px] font-semibold text-slate-600">
            <span className="text-sky-700 font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> KTB กรุงไทย
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" /> BAAC ธ.ก.ส.
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-pink-700 font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-600" /> GSB ออมสิน
            </span>
          </div>
        </div>

        {/* Clean, Modern Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 transition-all">
          
          {/* Top Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/70">
            <button
              type="button"
              onClick={() => handleSwitchMode('LOGIN')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'LOGIN'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className={`w-4 h-4 ${mode === 'LOGIN' ? 'text-red-700' : 'text-slate-400'}`} />
              <span>เข้าสู่ระบบ</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('REGISTER')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'REGISTER'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className={`w-4 h-4 ${mode === 'REGISTER' ? 'text-red-700' : 'text-slate-400'}`} />
              <span>สมัครสมาชิกใหม่</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50/80 border border-red-200 text-red-900 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 1: LOGIN (เข้าสู่ระบบ) */}
          {/* ========================================================================= */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="เช่น somchai หรือ admin"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    รหัสผ่าน (Password)
                  </label>
                  <span className="text-[11px] text-slate-400">รหัสผ่านเริ่มต้น: 1234</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showLoginPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember & Switch mode */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-red-700 border-slate-300 focus:ring-red-600 cursor-pointer"
                  />
                  <span>จดจำการเข้าสู่ระบบ</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleSwitchMode('REGISTER')}
                  className="font-bold text-red-700 hover:text-red-800 hover:underline cursor-pointer"
                >
                  ยังไม่มีบัญชี? สมัครสมาชิก
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 active:scale-[0.99] text-white text-sm sm:text-base font-extrabold rounded-xl shadow-md shadow-red-900/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบเพื่อปฏิบัติงาน'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: REGISTER (สมัครสมาชิกใหม่ ทั้งระบบ) */}
          {/* ========================================================================= */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in duration-200">
              
              <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-2xl text-xs text-red-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-700 shrink-0" />
                <span>
                  ลงทะเบียนผู้ใช้งานใหม่เพื่อเข้าจัดทำ เขียน และสั่งพิมพ์เช็ค พร้อมบันทึกประวัติการพิมพ์ย้อนหลัง
                </span>
              </div>

              {/* Username Input with live availability check */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ชื่อผู้ใช้งาน (Username) <span className="text-red-600">*</span>
                  </label>
                  {regUsername.length >= 3 && (
                    <span className={`text-[11px] font-bold flex items-center gap-1 ${isUsernameTaken ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isUsernameTaken ? (
                        <>
                          <AlertCircle className="w-3 h-3" /> มีผู้ใช้นี้แล้ว
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" /> ชื่อนี้ใช้ได้
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="เช่น siriporn, nicha_fin"
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all font-mono ${
                      isUsernameTaken
                        ? 'border-red-400 focus:ring-red-500/20'
                        : 'border-slate-200 focus:ring-red-600/20 focus:border-red-600'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) อย่างน้อย 3 ตัว
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุลจริง (Full Name) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="เช่น นางสาวณิชา การเงินดี"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                />
              </div>

              {/* Position with quick suggestion buttons & select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่ง / ฝ่ายงาน
                </label>
                <div className="relative mb-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    placeholder="ระบุตำแหน่ง หรือคลิกเลือกด้านล่าง"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                  />
                </div>
                {/* Position quick chips */}
                <div className="flex flex-wrap gap-1.5">
                  {commonPositions.slice(0, 3).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setRegPosition(pos)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        regPosition === pos
                          ? 'bg-red-50 text-red-800 border-red-300 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Indicator - Strictly USER for public self-registration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ระดับสิทธิ์การใช้งาน (User Role)
                </label>
                <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <div>
                      <div className="text-xs font-black text-red-950">
                        ผู้ใช้งานทั่วไป (USER) · เจ้าหน้าที่การเงิน
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        จัดทำ เขียน และสั่งพิมพ์เช็ค พร้อมตรวจสอบประวัติการพิมพ์
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                    USER
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  🔒 เพื่อความปลอดภัย สิทธิ์ผู้ดูแลระบบ (ADMIN) จะต้องได้รับการอนุมัติและปรับสิทธิ์จากผู้ดูแลระบบเท่านั้น
                </p>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      รหัสผ่าน <span className="text-red-600">*</span>
                    </label>
                    {regPassword && (
                      <span className="text-[10px] font-bold text-slate-500">
                        {strength.text}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="อย่างน้อย 4 ตัว"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ยืนยันรหัสผ่าน <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="กรอกให้ตรงกัน"
                      className={`w-full pl-3 pr-8 py-2 bg-slate-50/70 border rounded-xl text-xs font-semibold text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        regConfirmPassword && regConfirmPassword !== regPassword
                          ? 'border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-red-600/20 focus:border-red-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {regPassword && regConfirmPassword && regPassword === regConfirmPassword && (
                <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>รหัสผ่านตรงกันเรียบร้อย</span>
                </div>
              )}

              {/* Submit Register Button */}
              <button
                type="submit"
                disabled={isLoading || isUsernameTaken}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 active:scale-[0.99] text-white text-sm sm:text-base font-extrabold rounded-xl shadow-md shadow-red-900/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'กำลังบันทึกข้อมูล...' : '✨ ยืนยันการสมัครสมาชิกและเข้าใช้งาน'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('LOGIN')}
                  className="text-xs font-bold text-slate-500 hover:text-red-700 cursor-pointer hover:underline"
                >
                  มีบัญชีผู้ใช้งานอยู่แล้ว? กลับไปเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Security & Organization Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ระบบบันทึกความปลอดภัยและตรวจสอบประวัติการออกเช็คอัตโนมัติ (Audit Log)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            ใช้งานสำหรับงานการเงิน บัญชี และพัสดุ หน่วยงานภาครัฐและสถานพยาบาล
          </p>
        </div>

      </div>
    </div>
  );
};
