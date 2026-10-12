import React, { useState } from 'react';
import { BankTemplateConfig, BankType, User } from '../types';
import { StorageService } from '../utils/storage';
import {
  Github,
  Check,
  X,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  Layers,
  FileText,
  Printer,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface GitHubChequeTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBank: BankType;
  currentTemplate: BankTemplateConfig;
  currentUser: User;
  onApplyTemplateImage: (imageUrl: string, mode: 'CHEQUE_REAL' | 'A4_TEST') => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  bankType: string;
  category: 'CHEQUE_REAL' | 'A4_TEST';
  description: string;
  githubUrl: string;
  widthMm: number;
  heightMm: number;
}

// Pre-configured GitHub official / standard scanned template references
const GITHUB_PRESETS: TemplatePreset[] = [
  {
    id: 'ktb_real',
    name: 'ธนาคารกรุงไทย (KTB) - ภาพสแกนเช็คจริง',
    bankType: 'KTB',
    category: 'CHEQUE_REAL',
    description: 'แบบฟอร์มสแกนเช็คธนาคารกรุงไทย มีต้นขั้วด้านซ้าย (กว้าง 241 × สูง 90 มม.)',
    githubUrl: 'https://raw.githubusercontent.com/thai-cheque-templates/assets/main/ktb_cheque_scanned_241x90.png',
    widthMm: 241,
    heightMm: 90,
  },
  {
    id: 'baac_real',
    name: 'ธ.ก.ส. (BAAC) - ภาพสแกนเช็คจริง',
    bankType: 'BAAC',
    category: 'CHEQUE_REAL',
    description: 'แบบฟอร์มสแกนเช็คธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (241 × 90 มม.)',
    githubUrl: 'https://raw.githubusercontent.com/thai-cheque-templates/assets/main/baac_cheque_scanned_241x90.png',
    widthMm: 241,
    heightMm: 90,
  },
  {
    id: 'gsb_real',
    name: 'ธนาคารออมสิน (GSB) - ภาพสแกนเช็คจริง',
    bankType: 'GSB',
    category: 'CHEQUE_REAL',
    description: 'แบบฟอร์มสแกนเช็คธนาคารออมสินโทนชมพู (241 × 90 มม.)',
    githubUrl: 'https://raw.githubusercontent.com/thai-cheque-templates/assets/main/gsb_cheque_scanned_241x90.png',
    widthMm: 241,
    heightMm: 90,
  },
  {
    id: 'bbl_real',
    name: 'ธนาคารกรุงเทพ (BBL) - ภาพสแกนเช็คจริง',
    bankType: 'BBL',
    category: 'CHEQUE_REAL',
    description: 'แบบฟอร์มเช็คธนาคารกรุงเทพ มาตรฐาน BBL Cheque (241 × 90 มม.)',
    githubUrl: 'https://raw.githubusercontent.com/thai-cheque-templates/assets/main/bbl_cheque_scanned_241x90.png',
    widthMm: 241,
    heightMm: 90,
  },
  {
    id: 'scb_real',
    name: 'ธนาคารไทยพาณิชย์ (SCB) - ภาพสแกนเช็คจริง',
    bankType: 'SCB',
    category: 'CHEQUE_REAL',
    description: 'แบบฟอร์มเช็คธนาคารไทยพาณิชย์ SCB Cheque (241 × 90 มม.)',
    githubUrl: 'https://raw.githubusercontent.com/thai-cheque-templates/assets/main/scb_cheque_scanned_241x90.png',
    widthMm: 241,
    heightMm: 90,
  },
  {
    id: 'a4_calibration_test',
    name: '📄 แผ่นทาบ A4 ทดสอบพิมพ์ (A4 Calibration Grid)',
    bankType: 'ALL',
    category: 'A4_TEST',
    description: 'แผ่นตารางสเกลมิลลิเมตร A4 แนวนอน (297 × 210 มม.) สำหรับทาบพิมพ์ทดสอบเทียบตำแหน่ง',
    githubUrl: 'https://raw.githubusercontent.com/thai-cheque-templates/assets/main/a4_calibration_sheet_297x210.png',
    widthMm: 297,
    heightMm: 210,
  },
];

// Helper to normalize any GitHub URL (e.g., github.com/.../blob/... to raw.githubusercontent.com/...)
export function normalizeGitHubRawUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('github.com/') && trimmed.includes('/blob/')) {
    return trimmed
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('http://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  return trimmed;
}

export const GitHubChequeTemplateModal: React.FC<GitHubChequeTemplateModalProps> = ({
  isOpen,
  onClose,
  selectedBank,
  currentTemplate,
  currentUser,
  onApplyTemplateImage,
}) => {
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'CUSTOM_URL'>('PRESETS');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ktb_real');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState<boolean>(false);
  const [applyMode, setApplyMode] = useState<'CHEQUE_REAL' | 'A4_TEST'>('CHEQUE_REAL');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPresetId(preset.id);
    const normalized = normalizeGitHubRawUrl(preset.githubUrl);
    setPreviewUrl(normalized);
    setPreviewError(null);
    setPreviewLoaded(false);
    setApplyMode(preset.category);
  };

  const handleTestLoadCustomUrl = () => {
    if (!customUrl.trim()) {
      setPreviewError('กรุณาระบุ URL รูปภาพจาก GitHub ก่อนกดทดสอบ');
      return;
    }
    const normalized = normalizeGitHubRawUrl(customUrl);
    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewLoaded(false);
    setPreviewUrl(normalized);
  };

  const handleConfirmApply = () => {
    const finalUrl = activeTab === 'PRESETS'
      ? normalizeGitHubRawUrl(GITHUB_PRESETS.find(p => p.id === selectedPresetId)?.githubUrl || '')
      : normalizeGitHubRawUrl(customUrl);

    if (!finalUrl) {
      setPreviewError('กรุณาเลือกหรือระบุ URL รูปภาพจาก GitHub');
      return;
    }

    onApplyTemplateImage(finalUrl, applyMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Github className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  โหลดแบบรูปเช็คจาก GitHub (Cheque Template Repository)
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-md">
                  Admin Feature
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                เลือกรูปภาพแม่แบบเช็คจากคลัง GitHub เพื่อใช้ทาบตำแหน่งพิมพ์เช็คจริง หรือแผ่นทดสอบ A4
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('PRESETS')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PRESETS'
                ? 'border-red-700 text-red-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-red-700" />
            <span>แบบรูปสำเร็จรูปของระบบ (GitHub Presets)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOM_URL')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CUSTOM_URL'
                ? 'border-red-700 text-red-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Github className="w-4 h-4 text-slate-700" />
            <span>ระบุ GitHub URL ขององค์กร (Custom Raw URL)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Target Application Option (ข้อ 1 vs ข้อ 2) */}
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4">
            <div className="text-xs font-black text-red-950 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-red-700" />
              <span>เลือกวัตถุประสงค์ในการใช้งานรูปภาพ (รวมข้อ 1 และ ข้อ 2):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                onClick={() => setApplyMode('CHEQUE_REAL')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  applyMode === 'CHEQUE_REAL'
                    ? 'border-red-700 bg-white shadow-xs font-bold text-red-950'
                    : 'border-red-200 bg-white/60 hover:bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="applyMode"
                  checked={applyMode === 'CHEQUE_REAL'}
                  onChange={() => setApplyMode('CHEQUE_REAL')}
                  className="mt-0.5 text-red-700"
                />
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5 text-red-700" />
                    <span>ข้อ 2: แม่แบบเช็คจริง ({currentTemplate.bankNameThai})</span>
                  </div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                    นำภาพไปเป็นพื้นหลังเทียบพิกัดสำหรับพิมพ์เช็คจริง วางทาบช่องสั่งจ่าย ตัวเลข จำนวนเงิน
                  </div>
                </div>
              </label>

              <label
                onClick={() => setApplyMode('A4_TEST')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  applyMode === 'A4_TEST'
                    ? 'border-red-700 bg-white shadow-xs font-bold text-red-950'
                    : 'border-red-200 bg-white/60 hover:bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="applyMode"
                  checked={applyMode === 'A4_TEST'}
                  onChange={() => setApplyMode('A4_TEST')}
                  className="mt-0.5 text-red-700"
                />
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-red-700" />
                    <span>ข้อ 1: แม่แบบแผ่นทดสอบ A4 (A4 Test Sheet)</span>
                  </div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                    นำภาพไปเป็นภาพอ้างอิงบนแผ่นทดสอบพิมพ์ A4 แนวนอน (297 × 210 มม.) พอดี 1 หน้า
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700">
                เลือกแบบรูปสำเร็จรูปที่จัดเก็บใน GitHub Repository:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {GITHUB_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-slate-600" />
                            <span>{preset.name}</span>
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> เลือก
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>ขนาด: {preset.widthMm} × {preset.heightMm} mm</span>
                        <span className="text-slate-500 font-sans">GitHub Asset</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM URL */}
          {activeTab === 'CUSTOM_URL' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700">
                ระบุ URL รูปภาพเช็คจาก GitHub Repository ของหน่วยงานท่าน:
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://raw.githubusercontent.com/username/repository/main/cheque_image.png"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setPreviewError(null);
                    }}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleTestLoadCustomUrl}
                    disabled={isLoadingPreview || !customUrl.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                    <span>ทดสอบโหลด</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  💡 รองรับทั้งลิงก์แบบ <code>raw.githubusercontent.com</code> และลิงก์ทั่วไป <code>github.com/.../blob/...</code> (ระบบจะแปลงเป็น Raw Image อัตโนมัติ)
                </p>
              </div>
            </div>
          )}

          {/* Live Preview Container */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>ตัวอย่างภาพแม่แบบจาก GitHub:</span>
              </span>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-sky-600 hover:underline flex items-center gap-1"
                >
                  <span>เปิดดูไฟล์ต้นฉบับในแท็บใหม่</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="w-full min-h-[140px] max-h-[220px] bg-white border border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center p-2 relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Cheque template preview"
                  onLoad={() => {
                    setIsLoadingPreview(false);
                    setPreviewLoaded(true);
                    setPreviewError(null);
                  }}
                  onError={() => {
                    setIsLoadingPreview(false);
                    setPreviewLoaded(false);
                    setPreviewError('ไม่สามารถโหลดภาพจาก GitHub URL นี้ได้ กรุณาตรวจสอบว่าเป็นลิงก์สาธารณะ (Public) หรือไฟล์ยังคงมีอยู่จริง');
                  }}
                  className="max-h-[180px] w-auto object-contain shadow-xs border border-slate-200 rounded-lg"
                />
              ) : (
                <div className="text-center text-slate-400 text-xs py-6">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <span>ยังไม่ได้เลือกรูปภาพ หรือกดทดสอบโหลด</span>
                </div>
              )}
            </div>

            {previewError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{previewError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirmApply}
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>นำไปใช้เป็นรูปแม่แบบ {selectedBank} ทันที</span>
          </button>
        </div>

      </div>
    </div>
  );
};
