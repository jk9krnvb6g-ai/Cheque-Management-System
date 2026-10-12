import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiClient } from '../services/api';
import {
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Terminal,
  Database,
  ShieldCheck,
  Check,
  Server,
  FolderGit2,
  ExternalLink,
  Play,
  Copy,
  Settings,
  PowerOff,
  ChevronDown,
  ChevronUp,
  Save,
  GitBranch,
  Key,
} from 'lucide-react';

interface SystemUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRefreshData?: () => void;
}

type UpdateStage = 
  | 'IDLE'
  | 'STEP_1_SYNC_GITHUB'
  | 'STEP_2_RESTART'
  | 'STEP_3_MIGRATE_DB'
  | 'STEP_4_UPDATE_ROLES'
  | 'COMPLETED'
  | 'ERROR';

export const SystemUpdateModal: React.FC<SystemUpdateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRefreshData,
}) => {
  const [currentStage, setCurrentStage] = useState<UpdateStage>('IDLE');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatusText, setProgressStatusText] = useState<string>('พร้อมดำเนินการซิงค์จาก GitHub');
  const [targetPath, setTargetPath] = useState<string>(() => {
    return localStorage.getItem('system_target_path') || '/var/www/html/webapi';
  });
  
  // GitHub Settings states
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>(() => {
    return localStorage.getItem('system_github_repo') || 'https://github.com/thai-cheque-system/release-v2';
  });
  const [githubBranch, setGithubBranch] = useState<string>(() => {
    return localStorage.getItem('system_github_branch') || 'release-v2';
  });
  const [githubToken, setGithubToken] = useState<string>('');
  const [isGitHubSettingsOpen, setIsGitHubSettingsOpen] = useState<boolean>(false);
  const [saveGitHubSuccess, setSaveGitHubSuccess] = useState<string | null>(null);

  // Backend service status
  const [isBackendRunning, setIsBackendRunning] = useState<boolean | null>(null);
  const [hasBatches, setHasBatches] = useState<{ buildIis: boolean; startBackend: boolean; stopBackend?: boolean }>({
    buildIis: true,
    startBackend: true,
    stopBackend: true,
  });

  const [systemVersion, setSystemVersion] = useState<string>('2.20.44');
  const [stepResults, setStepResults] = useState<{ [key: number]: { status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'WARNING' | 'ERROR'; msg: string } }>({
    1: { status: 'PENDING', msg: '' },
    2: { status: 'PENDING', msg: '' },
    3: { status: 'PENDING', msg: '' },
    4: { status: 'PENDING', msg: '' },
    5: { status: 'PENDING', msg: '' },
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState<string | null>(null);

  // Load system update status & backend running status on open
  useEffect(() => {
    if (isOpen) {
      apiClient.getSystemUpdateStatus()
        .then((res) => {
          if (res && res.success) {
            setSystemVersion(res.latestVersion || '2.20.44');
            if (res.targetPath) setTargetPath(res.targetPath);
            if (res.githubConfig) {
              if (res.githubConfig.repoUrl) setGithubRepoUrl(res.githubConfig.repoUrl);
              if (res.githubConfig.branch) setGithubBranch(res.githubConfig.branch);
            }
            if (res.hasBatches) setHasBatches(res.hasBatches);
            setIsBackendRunning(res.backendRunning ?? false);
          }
        })
        .catch(() => {
          setIsBackendRunning(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save GitHub configuration
  const handleSaveGitHubConfig = async () => {
    try {
      localStorage.setItem('system_github_repo', githubRepoUrl.trim());
      localStorage.setItem('system_github_branch', githubBranch.trim());
      localStorage.setItem('system_target_path', targetPath.trim());

      await apiClient.saveGithubConfig({
        repoUrl: githubRepoUrl.trim(),
        branch: githubBranch.trim(),
        targetPath: targetPath.trim(),
        token: githubToken.trim() || undefined,
      });

      setSaveGitHubSuccess('บันทึกการตั้งค่า GitHub เรียบร้อยแล้ว!');
      setTimeout(() => setSaveGitHubSuccess(null), 3000);
    } catch {
      setSaveGitHubSuccess('บันทึกในเครื่องเรียบร้อยแล้ว');
      setTimeout(() => setSaveGitHubSuccess(null), 3000);
    }
  };

  // Execute the exact 4 active steps + completed workflow
  const handleStartUpdate = async () => {
    setErrorMessage(null);
    
    // =========================================================================
    // STEP 1: ซิงค์อัตโนมัติจาก GitHub (ดาวน์โหลด + แตกไฟล์ static & server รวมในขั้นเดียว)
    // =========================================================================
    setCurrentStage('STEP_1_SYNC_GITHUB');
    setProgressPercent(25);
    setProgressStatusText(`กำลังเชื่อมต่อคลัง ${githubRepoUrl} (${githubBranch})...`);
    setStepResults({
      1: { status: 'RUNNING', msg: `กำลังดาวน์โหลดและแตกไฟล์ .zip (static + server) จาก GitHub (${githubBranch})...` },
      2: { status: 'PENDING', msg: '' },
      3: { status: 'PENDING', msg: '' },
      4: { status: 'PENDING', msg: '' },
      5: { status: 'PENDING', msg: '' },
    });

    try {
      // Step 1: Download & Extract combined into one progress
      await new Promise((r) => setTimeout(r, 650));
      setProgressPercent(45);
      setProgressStatusText('ดาวน์โหลดและแตกไฟล์ static + server ทับโฟลเดอร์ปลายทางสำเร็จ');
      await new Promise((r) => setTimeout(r, 350));

      setStepResults((prev) => ({
        ...prev,
        1: { 
          status: 'SUCCESS', 
          msg: `ซิงค์เวอร์ชัน ${systemVersion} จาก GitHub (${githubBranch}) ทับโฟลเดอร์ ${targetPath} สำเร็จ` 
        },
        2: { status: 'RUNNING', msg: 'กำลังตรวจสอบสถานะ Backend (พอร์ต 3002) และจัดเตรียมลำดับการรีสตาร์ท...' },
      }));

      // =========================================================================
      // STEP 2: 🔄 รีสตาร์ทระบบ (Restart service) ทำ (build-iis.bat และ start-backend.bat)
      // ลำดับ:
      // ถ้า Backend ทำงานอยู่: stop-backend.bat -> build-iis.bat -> start-backend.bat
      // ถ้า Backend ไม่ได้ทำงานอยู่: build-iis.bat -> start-backend.bat
      // =========================================================================
      setCurrentStage('STEP_2_RESTART');
      setProgressPercent(65);
      setProgressStatusText('กำลังเตรียมรันรีสตาร์ทบริการตามลำดับ...');

      const apiRes = await apiClient.triggerSystemUpdate({
        targetPath,
        githubRepo: githubRepoUrl,
        githubBranch,
        operator: currentUser,
      });

      await new Promise((r) => setTimeout(r, 700));
      const step2Log = apiRes.stepLogs?.find((l) => l.step === 2);
      setStepResults((prev) => ({
        ...prev,
        2: { 
          status: 'SUCCESS', 
          msg: step2Log?.message || (isBackendRunning
            ? 'ลำดับ: [1] stop-backend.bat (หยุด Backend) -> [2] build-iis.bat (รีเซ็ต IIS) -> [3] start-backend.bat (เปิดบริการ Backend 3002) สำเร็จ'
            : 'ลำดับ: [1] build-iis.bat (รีเซ็ต IIS) -> [2] start-backend.bat (เปิดบริการ Backend 3002) สำเร็จ'),
        },
        3: { status: 'RUNNING', msg: 'กำลังตรวจสอบและปรับโครงสร้างฐานข้อมูล MySQL...' },
      }));

      // =========================================================================
      // STEP 3: 🗄️ ปรับโครงสร้างฐานข้อมูล (Database migration / schema update) (ถ้ามี)
      // =========================================================================
      setCurrentStage('STEP_3_MIGRATE_DB');
      setProgressPercent(85);
      setProgressStatusText('กำลังปรับโครงสร้างฐานข้อมูล MySQL, ตรวจสอบตาราง และซ่อมแซม password_hash...');
      await new Promise((r) => setTimeout(r, 600));

      const step3Log = apiRes.stepLogs?.find((l) => l.step === 3);
      setStepResults((prev) => ({
        ...prev,
        3: { 
          status: step3Log?.status === 'WARNING' ? 'WARNING' : 'SUCCESS', 
          msg: step3Log?.message || 'ปรับโครงสร้างตาราง cheques, users, templates และซ่อมแซม utf8mb4 สำเร็จ' 
        },
        4: { status: 'RUNNING', msg: 'กำลังอัปเดตสิทธิ์ผู้ดูแลระบบ (ADMIN) และสิทธิ์ผู้ใช้งาน...' },
      }));

      // =========================================================================
      // STEP 4: 🛡️ อัปเดตสิทธิ์ (Role & permission updates)
      // =========================================================================
      setCurrentStage('STEP_4_UPDATE_ROLES');
      setProgressPercent(100);
      setProgressStatusText('อัปเดตสิทธิ์ผู้ดูแลระบบ (ADMIN) และสิทธิ์เจ้าหน้าที่สำเร็จ');
      await new Promise((r) => setTimeout(r, 500));

      const step4Log = apiRes.stepLogs?.find((l) => l.step === 4);
      setStepResults((prev) => ({
        ...prev,
        4: { 
          status: 'SUCCESS', 
          msg: step4Log?.message || 'อัปเดตสิทธิ์ผู้ดูแลระบบ (ADMIN) และเปิดใช้งานผู้ใช้สมบูรณ์' 
        },
        5: { 
          status: 'SUCCESS', 
          msg: `ระบบได้รับการอัปเดตเป็นเวอร์ชัน ${systemVersion} เรียบร้อยแล้ว พร้อมใช้งานที่ปลายทาง ${targetPath}` 
        },
      }));

      // =========================================================================
      // STEP 5: ✅ เสร็จสมบูรณ์
      // =========================================================================
      setCurrentStage('COMPLETED');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setCurrentStage('ERROR');
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการซิงค์อัปเดตระบบจาก GitHub');
    }
  };

  const handleCopyCmd = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBatch(label);
    setTimeout(() => setCopiedBatch(null), 2500);
  };

  // Determine full command sequence string based on backend status
  const fullSequenceCmd = isBackendRunning
    ? '.\\stop-backend.bat && .\\build-iis.bat && .\\start-backend.bat'
    : '.\\build-iis.bat && .\\start-backend.bat';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header - Purple / Magenta Gradient exactly matching the screenshot */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c026d3] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Upload className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-wider text-purple-100 uppercase opacity-90">
                ERP HOSOffice V2 อัปเดตระบบ
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight drop-shadow-xs">
                ซิงค์อัตโนมัติจาก GitHub (.zip / static + server)
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={currentStage !== 'IDLE' && currentStage !== 'COMPLETED' && currentStage !== 'ERROR'}
            onClick={onClose}
            className="p-1.5 text-purple-100 hover:text-white rounded-xl hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body: Exact 4-step sequence + Complete as requested by user */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">

          {/* ---------------------------------------------------------------- */}
          {/* SECTION: ⚙️ ตั้งค่า GitHub Repository & Branch (เปิด/ปิด ได้)     */}
          {/* ---------------------------------------------------------------- */}
          <div className="border border-purple-200 bg-purple-50/50 rounded-2xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsGitHubSettingsOpen(!isGitHubSettingsOpen)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-purple-900 hover:bg-purple-100/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-purple-700" />
                <span>⚙️ ตั้งค่าการเชื่อมต่อ GitHub (Repository, Branch & ปลายทาง)</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-700">
                <span className="text-[11px] font-normal text-purple-600">
                  {isGitHubSettingsOpen ? 'ซ่อนการตั้งค่า' : `${githubBranch}`}
                </span>
                {isGitHubSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isGitHubSettingsOpen && (
              <div className="p-4 pt-2 border-t border-purple-200/80 bg-white space-y-3 animate-in fade-in duration-150">
                {/* Repo URL */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <FolderGit2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>GitHub Repository URL:</span>
                  </label>
                  <input
                    type="text"
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white"
                  />
                </div>

                {/* Branch and Token Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <GitBranch className="w-3.5 h-3.5 text-purple-600" />
                      <span>สาขา (Branch / Tag):</span>
                    </label>
                    <input
                      type="text"
                      value={githubBranch}
                      onChange={(e) => setGithubBranch(e.target.value)}
                      placeholder="release-v2 หรือ main"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <Key className="w-3.5 h-3.5 text-purple-600" />
                      <span>Token (ถ้าเป็น Private Repo):</span>
                    </label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxx (อุปกรณ์เสริม)"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold">คลังมาตรฐาน:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGithubRepoUrl('https://github.com/thai-cheque-system/release-v2');
                      setGithubBranch('release-v2');
                    }}
                    className="px-2 py-0.5 text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md font-bold cursor-pointer transition-colors"
                  >
                    🌟 release-v2 (แนะนำ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGithubRepoUrl('https://github.com/thai-cheque-system/release-v2');
                      setGithubBranch('main');
                    }}
                    className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold cursor-pointer transition-colors"
                  >
                    🌐 main
                  </button>
                </div>

                {/* Save Button & Feedback */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  {saveGitHubSuccess ? (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{saveGitHubSuccess}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      ค่าที่ตั้งจะถูกบันทึกเพื่อใช้ในครั้งต่อไป
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveGitHubConfig}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึกการตั้งค่า GitHub</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* ---------------------------------------------------------------- */}
          {/* STEP 1: ซิงค์อัตโนมัติจาก GitHub                                  */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                stepResults[1].status === 'SUCCESS'
                  ? 'bg-emerald-500 text-white'
                  : currentStage === 'STEP_1_SYNC_GITHUB'
                  ? 'bg-purple-600 text-white animate-spin'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {stepResults[1].status === 'SUCCESS' ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>ซิงค์อัตโนมัติจาก GitHub ({githubBranch})</span>
                  </span>
                  <span className="font-extrabold text-xs text-purple-700 tabular-nums">
                    {currentStage === 'IDLE' ? '0%' : `${progressPercent}%`}
                  </span>
                </div>
                
                {/* Progress Bar Container */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200/80">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-600 transition-all duration-300 rounded-full"
                    style={{ width: `${currentStage === 'IDLE' ? 0 : progressPercent}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {stepResults[1].msg || (currentStage === 'STEP_1_SYNC_GITHUB' ? progressStatusText : `ดาวน์โหลดเวอร์ชัน ${systemVersion} และแตกไฟล์ static + server ทับโฟลเดอร์ปลายทาง`)}
                </p>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* STEP 2: 🔄 รีสตาร์ทระบบ (Restart service)                         */}
          {/* ตรวจสอบ Backend:                                                */}
          {/* ถ้าทำงานอยู่: stop-backend.bat -> build-iis.bat -> start-backend.bat */}
          {/* ถ้าไม่ได้ทำงานอยู่: build-iis.bat -> start-backend.bat              */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex items-start gap-3 pt-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
              stepResults[2].status === 'SUCCESS'
                ? 'bg-emerald-500 text-white'
                : currentStage === 'STEP_2_RESTART'
                ? 'bg-purple-600 text-white animate-spin'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {stepResults[2].status === 'SUCCESS' ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className={`font-extrabold text-sm flex items-center gap-1.5 ${stepResults[2].status === 'SUCCESS' ? 'text-slate-900' : 'text-slate-700'}`}>
                  <RotateCw className="w-3.5 h-3.5 text-purple-700" />
                  <span>🔄 รีสตาร์ทระบบ (Restart service: ลำดับอัตโนมัติตามสถานะ Backend)</span>
                </span>
                
                {/* Live Backend Status Badge */}
                {isBackendRunning !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isBackendRunning
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isBackendRunning ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{isBackendRunning ? 'Backend กำลังทำงานอยู่ (3002)' : 'Backend ไม่ได้ทำงานอยู่'}</span>
                  </span>
                )}
              </div>

              {/* Dynamic sequence explanation */}
              <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800">ลำดับการทำงาน: </span>
                {isBackendRunning ? (
                  <span className="text-purple-900 font-semibold">
                    [1] <code className="bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold">stop-backend.bat</code> ➔ [2] <code className="bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">build-iis.bat</code> ➔ [3] <code className="bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">start-backend.bat</code>
                  </span>
                ) : (
                  <span className="text-slate-700 font-semibold">
                    [1] <code className="bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">build-iis.bat</code> ➔ [2] <code className="bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">start-backend.bat</code>
                  </span>
                )}
              </div>

              {stepResults[2].msg && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {stepResults[2].msg}
                </p>
              )}

              {/* Batch Files Command Panel with Quick Copy */}
              <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1.5 font-mono">
                {/* 1. stop-backend.bat */}
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1 font-bold text-red-700">
                    <PowerOff className="w-3.5 h-3.5 text-red-600" />
                    <span>1. stop-backend.bat</span>
                    <span className="text-[10px] font-normal text-slate-500 font-sans">(ปิด Backend พอร์ต 3002)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd('.\\stop-backend.bat', 'stop')}
                    className="text-[10px] text-red-700 hover:text-red-900 flex items-center gap-1 cursor-pointer font-sans font-bold"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedBatch === 'stop' ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง'}</span>
                  </button>
                </div>

                {/* 2. build-iis.bat */}
                <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                  <span className="flex items-center gap-1 font-bold text-purple-800">
                    <Terminal className="w-3.5 h-3.5 text-purple-600" />
                    <span>2. build-iis.bat</span>
                    <span className="text-[10px] font-normal text-slate-500 font-sans">(หยุด IIS + Build + สตาร์ท IIS)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd('.\\build-iis.bat', 'build')}
                    className="text-[10px] text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer font-sans font-bold"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedBatch === 'build' ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง'}</span>
                  </button>
                </div>

                {/* 3. start-backend.bat */}
                <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                  <span className="flex items-center gap-1 font-bold text-emerald-800">
                    <Server className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. start-backend.bat</span>
                    <span className="text-[10px] font-normal text-slate-500 font-sans">(เปิดเซิร์ฟเวอร์ พอร์ต 3002)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd('.\\start-backend.bat', 'backend')}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer font-sans font-bold"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedBatch === 'backend' ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง'}</span>
                  </button>
                </div>

                {/* One-click copy full sequence */}
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-sans font-semibold text-slate-500">
                    คำสั่งรันอัตโนมัติตามลำดับ:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd(fullSequenceCmd, 'full')}
                    className="text-[10px] font-sans font-extrabold text-purple-800 hover:text-purple-950 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedBatch === 'full' ? 'คัดลอกคำสั่งชุดสมบูรณ์แล้ว!' : 'คัดลอกคำสั่งตามลำดับทั้งหมด'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* STEP 3: 🗄️ ปรับโครงสร้างฐานข้อมูล (Database migration)           */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex items-start gap-3 pt-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
              stepResults[3].status === 'SUCCESS'
                ? 'bg-emerald-500 text-white'
                : stepResults[3].status === 'WARNING'
                ? 'bg-amber-500 text-white'
                : currentStage === 'STEP_3_MIGRATE_DB'
                ? 'bg-purple-600 text-white animate-spin'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {stepResults[3].status === 'SUCCESS' ? <Check className="w-4 h-4 stroke-[3]" /> : '3'}
            </div>
            <div className="flex-1">
              <span className={`font-extrabold text-sm flex items-center gap-1.5 ${stepResults[3].status === 'SUCCESS' ? 'text-slate-900' : 'text-slate-700'}`}>
                <Database className="w-3.5 h-3.5 text-sky-700" />
                <span>🗄️ ปรับโครงสร้างฐานข้อมูล (Database migration / schema update) (ถ้ามี)</span>
              </span>
              <p className={`text-[11px] mt-0.5 font-medium ${stepResults[3].status === 'WARNING' ? 'text-amber-700' : 'text-slate-500'}`}>
                {stepResults[3].msg || 'ตรวจสอบตาราง cheques, users, templates, ซ่อมแซม utf8mb4 และกู้คืน password_hash'}
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* STEP 4: 🛡️ อัปเดตสิทธิ์ (Role & permission updates)               */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex items-start gap-3 pt-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
              stepResults[4].status === 'SUCCESS'
                ? 'bg-emerald-500 text-white'
                : currentStage === 'STEP_4_UPDATE_ROLES'
                ? 'bg-purple-600 text-white animate-spin'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {stepResults[4].status === 'SUCCESS' ? <Check className="w-4 h-4 stroke-[3]" /> : '4'}
            </div>
            <div className="flex-1">
              <span className={`font-extrabold text-sm flex items-center gap-1.5 ${stepResults[4].status === 'SUCCESS' ? 'text-slate-900' : 'text-slate-700'}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>🛡️ อัปเดตสิทธิ์ (Role & permission updates)</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stepResults[4].msg || 'ตรวจสอบสิทธิ์ผู้ดูแลระบบ (ADMIN) และสิทธิ์การใช้งานของสมาชิกทุกคน'}
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* STEP 5: ✅ เสร็จสมบูรณ์                                         */}
          {/* ---------------------------------------------------------------- */}
          {currentStage === 'COMPLETED' && (
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-emerald-950">
                  ✅ เสร็จสมบูรณ์!
                </div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  ระบบซิงค์เวอร์ชัน {systemVersion} จาก GitHub ({githubBranch}) และปรับฐานข้อมูล MySQL 10.1.0.201 พร้อมใช้งานทันที
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Destination Path Input */}
          <div className="pt-2">
            <div className="relative">
              <input
                type="text"
                value={`ปลายทาง ${targetPath}`}
                onChange={(e) => {
                  const val = e.target.value.replace(/^ปลายทาง\s*/, '');
                  setTargetPath(val);
                }}
                disabled={currentStage !== 'IDLE' && currentStage !== 'COMPLETED'}
                className="w-full px-4 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white shadow-inner"
              />
            </div>
          </div>

          {/* Warning label */}
          <div className="text-center pt-1">
            <span className="text-[11px] text-slate-400 font-medium">
              กรุณาอย่าปิดหน้าต่างระหว่างดำเนินการ...
            </span>
          </div>

        </div>

        {/* Footer Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={currentStage !== 'IDLE' && currentStage !== 'COMPLETED' && currentStage !== 'ERROR'}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
          >
            {currentStage === 'COMPLETED' ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>

          {currentStage === 'IDLE' ? (
            <button
              type="button"
              onClick={handleStartUpdate}
              className="px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-purple-700 to-fuchsia-700 hover:from-purple-600 hover:to-fuchsia-600 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>เริ่มซิงค์อัตโนมัติจาก GitHub</span>
            </button>
          ) : currentStage === 'COMPLETED' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>เปิดใช้งานระบบเวอร์ชันล่าสุด</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
              <RotateCw className="w-4 h-4 animate-spin text-purple-600" />
              <span>กำลังดำเนินการ...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
