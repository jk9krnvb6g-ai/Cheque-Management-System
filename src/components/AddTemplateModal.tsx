import React, { useState } from 'react';
import { BankTemplateConfig, User } from '../types';
import { StorageService } from '../utils/storage';
import {
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  Check,
  Building2,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: (newBankCode: string) => void;
}

// Preset popular Thai banks for quick 1-click template setup
const THAI_BANK_PRESETS = [
  { code: 'SCB', nameThai: 'ธนาคารไทยพาณิชย์', nameEng: 'Siam Commercial Bank', color: '#4e2a84', width: 241, height: 90 },
  { code: 'BBL', nameThai: 'ธนาคารกรุงเทพ', nameEng: 'Bangkok Bank', color: '#1e3a8a', width: 241, height: 90 },
  { code: 'KBANK', nameThai: 'ธนาคารกสิกรไทย', nameEng: 'Kasikornbank', color: '#138236', width: 241, height: 90 },
  { code: 'BAY', nameThai: 'ธนาคารกรุงศรีอยุธยา', nameEng: 'Bank of Ayudhya', color: '#d97706', width: 241, height: 90 },
  { code: 'TTB', nameThai: 'ธนาคารทหารไทยธนชาต', nameEng: 'TMBThanachart Bank', color: '#002d62', width: 241, height: 90 },
  { code: 'UOB', nameThai: 'ธนาคารยูโอบี', nameEng: 'United Overseas Bank', color: '#003865', width: 241, height: 90 },
  { code: 'COOP', nameThai: 'สหกรณ์ออมทรัพย์ / สถาบันการเงิน', nameEng: 'Savings and Credit Cooperative', color: '#0f766e', width: 241, height: 90 },
];

export const AddTemplateModal: React.FC<AddTemplateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const templates = StorageService.getTemplates();
  const templateKeys = Object.keys(templates);

  const [bankNameThai, setBankNameThai] = useState('');
  const [bankType, setBankType] = useState('');
  const [bankNameEng, setBankNameEng] = useState('');
  const [bankColor, setBankColor] = useState('#0284c7');
  const [widthMm, setWidthMm] = useState<number>(241);
  const [heightMm, setHeightMm] = useState<number>(90);
  const [baseTemplate, setBaseTemplate] = useState<string>(templateKeys[0] || 'KTB');
  const [customBgImageUrl, setCustomBgImageUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const applyPreset = (preset: typeof THAI_BANK_PRESETS[0]) => {
    setBankType(preset.code);
    setBankNameThai(preset.nameThai);
    setBankNameEng(preset.nameEng);
    setBankColor(preset.color);
    setWidthMm(preset.width);
    setHeightMm(preset.height);
    setErrorMsg(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomBgImageUrl(dataUrl);
      setImageFileName(file.name);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setCustomBgImageUrl(null);
    setImageFileName(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = bankType.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    if (!code) {
      setErrorMsg('กรุณาระบุรหัสย่อแม่แบบ (ภาษาอังกฤษหรือตัวเลข)');
      return;
    }

    if (!bankNameThai.trim()) {
      setErrorMsg('กรุณาระบุชื่อธนาคาร / ชื่อแม่แบบ (ภาษาไทย)');
      return;
    }

    if (templates[code]) {
      setErrorMsg(`รหัสแม่แบบ "${code}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`);
      return;
    }

    const baseConfig = templates[baseTemplate] || Object.values(templates)[0];

    const newConfig: BankTemplateConfig = {
      bankType: code,
      bankNameThai: bankNameThai.trim(),
      bankNameEng: bankNameEng.trim() || code,
      bankColor: bankColor || '#0284c7',
      widthMm: Number(widthMm) || 241,
      heightMm: Number(heightMm) || 90,
      globalOffsetX: 0,
      globalOffsetY: 0,
      isCustom: true,
      customBgImageUrl: customBgImageUrl || undefined,
      fields: JSON.parse(JSON.stringify(baseConfig.fields)),
    };

    StorageService.saveTemplate(newConfig, currentUser);
    onSuccess(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                เพิ่มแม่แบบเช็คใหม่ (Add Cheque Template)
              </h3>
              <p className="text-[11px] text-slate-500">
                สร้างแม่แบบเช็คธนาคารหรือหน่วยงาน กำหนดขนาด และใส่ภาพเช็คจริงได้เอง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs flex-1">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Quick Bank Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>เลือกแม่แบบธนาคารด่วน (Quick Presets):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {THAI_BANK_PRESETS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                ชื่อธนาคาร / ชื่อแม่แบบ (ภาษาไทย) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bankNameThai}
                onChange={(e) => { setBankNameThai(e.target.value); setErrorMsg(null); }}
                placeholder="เช่น ธนาคารไทยพาณิชย์ หรือ เช็คเงินสดย่อย"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                รหัสย่อแม่แบบ (Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bankType}
                onChange={(e) => { setBankType(e.target.value.toUpperCase()); setErrorMsg(null); }}
                placeholder="เช่น SCB, BBL, KBANK"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 uppercase font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ชื่อภาษาอังกฤษ (Optional)
              </label>
              <input
                type="text"
                value={bankNameEng}
                onChange={(e) => setBankNameEng(e.target.value)}
                placeholder="เช่น Siam Commercial Bank"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Physical Dimensions and Bank Color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ความกว้างเช็ค (มม.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="1"
                min="100"
                max="350"
                value={widthMm}
                onChange={(e) => setWidthMm(parseFloat(e.target.value) || 241)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold text-xs tabular-nums focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">มาตรฐาน ~241 มม. (24.1 ซม.)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ความสูงเช็ค (มม.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="1"
                min="50"
                max="200"
                value={heightMm}
                onChange={(e) => setHeightMm(parseFloat(e.target.value) || 90)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold text-xs tabular-nums focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">มาตรฐาน ~90 มม. (3.5 นิ้ว)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                สีประจำธนาคาร (Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bankColor}
                  onChange={(e) => setBankColor(e.target.value)}
                  className="w-10 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={bankColor}
                  onChange={(e) => setBankColor(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Copy Coordinates from Existing Template */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-slate-700 font-semibold mb-1">
              คัดลอกตำแหน่งพิกัดพิมพ์เริ่มต้นจาก:
            </label>
            <select
              value={baseTemplate}
              onChange={(e) => setBaseTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {Object.values(templates).map((tpl) => (
                <option key={tpl.bankType} value={tpl.bankType}>
                  {tpl.bankType} — {tpl.bankNameThai} ({tpl.widthMm} × {tpl.heightMm} มม.)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              💡 ระบบจะคัดลอกพิกัดวันที่, ชื่อผู้รับเงิน, ยอดเงินตัวหนังสือ และตัวเลข มาให้ตั้งต้น เพื่อให้ลากปรับต่อได้ทันที
            </p>
          </div>

          {/* Upload Cheque Background Image */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-slate-800 font-semibold">
                  ใส่รูปภาพแบบเช็คจริง (Cheque Background Scan)
                </label>
                <p className="text-[11px] text-slate-500">
                  อัปโหลดรูปภาพสแกนเช็คจริงเพื่อใช้เป็นพื้นหลังอ้างอิงตอนจัดตำแหน่งพิกัด (รูปจะไม่ถูกพิมพ์ออกมาบนกระดาษเช็คจริง)
                </p>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                ทางเลือก (Optional)
              </span>
            </div>

            {customBgImageUrl ? (
              <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-white p-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={customBgImageUrl}
                    alt="Cheque Preview"
                    className="w-20 h-10 object-cover rounded border border-slate-200"
                  />
                  <span className="text-xs text-slate-700 font-medium truncate max-w-[200px]">
                    {imageFileName || 'รูปภาพเช็คพื้นหลัง'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูป</span>
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white transition-colors">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">
                  คลิกเพื่อเลือกไฟล์รูปภาพเช็ค (JPG, PNG, WEBP)
                </span>
                <span className="text-[11px] text-slate-400">ขนาดไฟล์ไม่เกิน 5 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer font-medium transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>สร้างแม่แบบเช็ค</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
