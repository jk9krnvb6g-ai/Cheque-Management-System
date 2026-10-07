import React, { useState, useEffect } from 'react';
import { BankTemplateConfig, BankType, CrossingType } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate } from '../utils/dateUtils';
import { Sparkles, Eye, ShieldCheck, Check, Image as ImageIcon, ExternalLink, Sliders } from 'lucide-react';

interface LiveChequePreviewProps {
  bankType: BankType;
  chequeNumber: string;
  chequeDate: string;
  payeeName: string;
  totalAmount: number;
  totalAmountThaiText: string;
  netPaidAmount: number;
  dikaNumber?: string;
  strikeBearer?: boolean;
  crossingType?: CrossingType;
  template?: BankTemplateConfig | null;
  onNavigateToTemplates?: (bank: BankType) => void;
}

export const LiveChequePreview: React.FC<LiveChequePreviewProps> = ({
  bankType,
  chequeNumber,
  chequeDate,
  payeeName,
  totalAmount,
  totalAmountThaiText,
  netPaidAmount,
  dikaNumber,
  strikeBearer = true,
  crossingType = 'AC_PAYEE',
  template: propTemplate,
  onNavigateToTemplates,
}) => {
  // Always fetch latest template configuration to get user's uploaded customBgImageUrl
  const [template, setTemplate] = useState<BankTemplateConfig>(() => {
    return propTemplate || StorageService.getTemplates()[bankType];
  });

  // Re-fetch template when bankType or propTemplate changes
  useEffect(() => {
    if (propTemplate) {
      setTemplate(propTemplate);
    } else {
      setTemplate(StorageService.getTemplates()[bankType]);
    }
  }, [bankType, propTemplate]);

  // Mode: 'REAL_IMAGE' (if customBgImageUrl exists) or 'SIMULATED' (photorealistic vector)
  const hasCustomImage = Boolean(template?.customBgImageUrl);
  const [viewMode, setViewMode] = useState<'REAL_IMAGE' | 'SIMULATED'>(() => {
    return hasCustomImage ? 'REAL_IMAGE' : 'SIMULATED';
  });

  // Keep viewMode synced if custom image is uploaded
  useEffect(() => {
    if (hasCustomImage) {
      setViewMode('REAL_IMAGE');
    } else {
      setViewMode('SIMULATED');
    }
  }, [hasCustomImage, template?.customBgImageUrl]);

  // Theme settings based on bank identity
  const bankTheme = {
    KTB: {
      name: 'ธนาคารกรุงไทย',
      nameEn: 'KRUNGTHAI BANK',
      code: 'KTB',
      accentColor: '#0085cd',
      borderTint: 'border-sky-300',
      bgGradient: 'from-sky-50/70 via-white to-blue-50/50',
      watermarkText: 'KTB CHEQUE',
      logoBadge: 'bg-sky-600 text-white',
      patternColor: 'rgba(0, 133, 205, 0.04)',
      stubBg: 'bg-sky-50/40',
    },
    BAAC: {
      name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
      nameEn: 'BAAC',
      code: 'ธ.ก.ส.',
      accentColor: '#008040',
      borderTint: 'border-emerald-300',
      bgGradient: 'from-emerald-50/70 via-white to-teal-50/50',
      watermarkText: 'BAAC CHEQUE',
      logoBadge: 'bg-emerald-700 text-white',
      patternColor: 'rgba(0, 128, 64, 0.04)',
      stubBg: 'bg-emerald-50/40',
    },
    GSB: {
      name: 'ธนาคารออมสิน',
      nameEn: 'GOVERNMENT SAVINGS BANK',
      code: 'GSB',
      accentColor: '#eb008b',
      borderTint: 'border-pink-300',
      bgGradient: 'from-pink-50/70 via-white to-rose-50/50',
      watermarkText: 'GSB CHEQUE',
      logoBadge: 'bg-pink-600 text-white',
      patternColor: 'rgba(235, 0, 139, 0.04)',
      stubBg: 'bg-pink-50/40',
    },
  }[bankType] || {
    name: template?.bankNameThai || 'ธนาคารพาณิชย์',
    nameEn: template?.bankNameEng || 'COMMERCIAL BANK',
    code: bankType,
    accentColor: '#b91c1c',
    borderTint: 'border-slate-300',
    bgGradient: 'from-slate-50 via-white to-zinc-50',
    watermarkText: 'CHEQUE',
    logoBadge: 'bg-slate-800 text-white',
    patternColor: 'rgba(0, 0, 0, 0.03)',
    stubBg: 'bg-slate-50',
  };

  const displayAmount = netPaidAmount > 0 ? netPaidAmount : totalAmount;
  const formattedAmount = displayAmount > 0 ? displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  // Calculate percentage positions for custom image overlay mode
  const widthMm = template?.widthMm || 241;
  const heightMm = template?.heightMm || 90;

  const getPercentPos = (xMm: number, yMm: number) => ({
    left: `${(xMm / widthMm) * 100}%`,
    top: `${(yMm / heightMm) * 100}%`,
  });

  return (
    <div className="w-full bg-white rounded-2xl border-2 border-slate-200/90 shadow-md overflow-hidden transition-all duration-300">
      {/* Header bar of Live Preview */}
      <div className="px-3.5 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-slate-200">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>ตัวอย่างหน้าเช็ค</span>
          </span>
          {hasCustomImage && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span>ภาพจริง</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          {/* Toggle between Uploaded Real Image and Simulated Vector Paper */}
          {hasCustomImage && (
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('REAL_IMAGE')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'REAL_IMAGE'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>ภาพจริง</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('SIMULATED')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'SIMULATED'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>จำลอง</span>
              </button>
            </div>
          )}

          <span className="font-bold text-white">{bankTheme.code}</span>

          {onNavigateToTemplates && (
            <button
              type="button"
              onClick={() => onNavigateToTemplates(bankType)}
              className="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-0.5 cursor-pointer ml-1"
            >
              <Sliders className="w-3 h-3" />
              <span>{hasCustomImage ? 'ปรับพิกัด' : 'อัปโหลดภาพ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cheque Canvas Viewport */}
      <div className="p-3 sm:p-5 bg-gradient-to-b from-slate-100 to-slate-200/70 overflow-x-auto">
        
        {/* CASE 1: REAL UPLOADED CHEQUE IMAGE MODE */}
        {hasCustomImage && viewMode === 'REAL_IMAGE' ? (
          <div className="min-w-[720px] max-w-[940px] mx-auto bg-white rounded-xl shadow-xl border-2 border-slate-300/80 relative overflow-hidden select-none font-sans"
            style={{
              aspectRatio: `${widthMm} / ${heightMm}`,
              fontFamily: template?.fontFamily || "'Sarabun', 'Cordia New', sans-serif",
            }}
          >
            {/* The Real Scanned Cheque Image uploaded by user */}
            <img
              src={template.customBgImageUrl}
              alt={`Real Cheque ${bankType}`}
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
            />

            {/* Live Data Positioned on Top of the Real Cheque according to Template Millimeter Coordinates */}
            
            {/* 1. Date */}
            {template.fields?.date && (
              <div
                className="absolute font-bold text-slate-900 pointer-events-none leading-none tracking-wider text-xs sm:text-sm drop-shadow-xs"
                style={getPercentPos(template.fields.date.x, template.fields.date.y)}
              >
                {chequeDate ? formatThaiDate(chequeDate) : '-'}
              </div>
            )}

            {/* 2. Payee Name */}
            {template.fields?.payee && (
              <div
                className="absolute font-extrabold text-slate-900 pointer-events-none leading-none truncate max-w-[60%] text-sm sm:text-base drop-shadow-xs"
                style={getPercentPos(template.fields.payee.x, template.fields.payee.y)}
              >
                {payeeName || <span className="text-slate-400 font-normal italic">(ระบุชื่อผู้รับเงินในฟอร์ม)</span>}
              </div>
            )}

            {/* 3. Thai Baht Text */}
            {template.fields?.amountText && (
              <div
                className="absolute font-bold text-slate-900 pointer-events-none leading-none text-xs sm:text-sm drop-shadow-xs"
                style={getPercentPos(template.fields.amountText.x, template.fields.amountText.y)}
              >
                {totalAmountThaiText || <span className="text-slate-400 font-normal italic">(-บาทถ้วน-)</span>}
              </div>
            )}

            {/* 4. Amount Number Box */}
            {template.fields?.amountNumber && (
              <div
                className="absolute font-mono font-black text-slate-900 pointer-events-none leading-none tabular-nums text-sm sm:text-base drop-shadow-xs"
                style={getPercentPos(template.fields.amountNumber.x, template.fields.amountNumber.y)}
              >
                ฿ {formattedAmount}
              </div>
            )}

            {/* 5. Crossing (A/C PAYEE ONLY) */}
            {crossingType !== 'NONE' && (
              <div
                className="absolute pointer-events-none"
                style={template.crossing ? getPercentPos(template.crossing.x, template.crossing.y) : { left: '18%', top: '6%' }}
              >
                <div className="w-20 h-10 border-l-2 border-r-2 border-slate-900/90 -rotate-12 flex items-center justify-center bg-slate-900/5 px-1">
                  <span className="text-[8px] font-black tracking-tighter text-slate-900 uppercase font-sans text-center leading-none">
                    {crossingType === 'AC_PAYEE' ? 'A/C PAYEE ONLY' : '& CO.'}
                  </span>
                </div>
              </div>
            )}

            {/* 6. Strike Bearer */}
            {strikeBearer && (
              <div
                className="absolute pointer-events-none"
                style={template.strikeBearer ? getPercentPos(template.strikeBearer.x, template.strikeBearer.y) : { right: '12%', top: '27%' }}
              >
                <div className="w-16 h-[2px] bg-red-600 rotate-[-4deg] shadow-xs" />
              </div>
            )}

            {/* Top-Right Tag indicator */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/65 backdrop-blur-xs text-white text-[9px] font-bold pointer-events-none flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>ภาพเช็คจริงที่คุณอัปโหลด</span>
            </div>
          </div>
        ) : (
          /* CASE 2: PHOTOREALISTIC VECTOR REPLICA & GUILLOCHE PAPER */
          <div className="min-w-[720px] max-w-[940px] mx-auto bg-white rounded-xl shadow-xl border-2 border-slate-300/80 relative flex overflow-hidden select-none font-serif">
            
            {/* Subtle Guilloche Security SVG Background Pattern */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, ${bankTheme.patternColor} 10%, transparent 10.5%), radial-gradient(circle at 0% 0%, ${bankTheme.patternColor} 15%, transparent 15.5%)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* LEFT: Perforated Stub (ต้นขั้วเช็ค) */}
            <div className={`w-[26%] border-r-2 border-dashed border-slate-400/80 p-3.5 ${bankTheme.stubBg} relative flex flex-col justify-between text-[11px] text-slate-700 leading-tight`}>
              {/* Perforated scissors indicator */}
              <div className="absolute -right-3 top-2 w-6 h-6 rounded-full bg-slate-200 border border-slate-400 flex items-center justify-center text-[10px] text-slate-600 shadow-xs z-10">
                ✂️
              </div>

              <div>
                <div className="border-b border-slate-300 pb-1.5 mb-2">
                  <span className="font-black text-slate-900 text-xs block">ต้นขั้วเช็ค (STUB)</span>
                  <span className="text-[10px] text-slate-500 font-sans">{bankTheme.nameEn}</span>
                </div>

                <div className="space-y-1.5 text-[11px] font-sans">
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="text-slate-500">วันที่:</span>
                    <span className="font-bold text-slate-800">{chequeDate ? formatThaiDate(chequeDate) : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="text-slate-500">เลขที่ฎีกา:</span>
                    <span className="font-bold text-slate-800">{dikaNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="text-slate-500">เลขที่เช็ค:</span>
                    <span className="font-mono font-bold text-red-700">{chequeNumber || '••••••'}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block text-[10px]">จ่ายให้:</span>
                    <span className="font-bold text-slate-900 line-clamp-2">{payeeName || '(ยังไม่ระบุชื่อผู้รับเงิน)'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-300/80 mt-2 font-sans">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600 text-[10px] font-medium">ยอดสั่งจ่ายสุทธิ:</span>
                  <span className="font-mono font-black text-slate-900 text-xs tabular-nums">฿{formattedAmount}</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-1 italic">
                  * ฉีกตามรอยปรุเพื่อพิมพ์ลงตัวเช็ค
                </div>
              </div>
            </div>

            {/* RIGHT: Actual Cheque Paper (ตัวเช็คจริง) */}
            <div className={`w-[74%] p-4 sm:p-5 relative flex flex-col justify-between bg-gradient-to-br ${bankTheme.bgGradient}`}>
              
              {/* Watermark in background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <span className="text-6xl font-black text-slate-900 rotate-[-15deg] tracking-widest font-sans">
                  {bankTheme.watermarkText}
                </span>
              </div>

              {/* Top row: Bank Header, Crossing Type & Cheque Number / Date */}
              <div className="flex justify-between items-start relative z-10">
                
                {/* Left Top: Bank Brand & Crossing */}
                <div className="flex items-start gap-3">
                  {/* Crossing Lines (A/C PAYEE ONLY) */}
                  {crossingType !== 'NONE' && (
                    <div className="relative w-20 h-10 border-l-2 border-r-2 border-slate-800/80 -rotate-12 flex items-center justify-center bg-slate-900/5 px-1">
                      <span className="text-[8px] font-black tracking-tighter text-slate-900 uppercase font-sans text-center leading-none">
                        {crossingType === 'AC_PAYEE' ? 'A/C PAYEE ONLY' : '& CO.'}
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-sans shadow-xs ${bankTheme.logoBadge}`}>
                        {bankTheme.code}
                      </span>
                      <span className="text-xs font-black text-slate-900 font-sans tracking-tight">
                        {bankTheme.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 block font-sans tracking-wide">
                      {bankTheme.nameEn}
                    </span>
                  </div>
                </div>

                {/* Right Top: Date & Cheque Number */}
                <div className="text-right">
                  <div className="text-[11px] font-mono font-bold text-slate-700 mb-1">
                    เลขที่: <strong className="text-red-700 tracking-wider text-xs">{chequeNumber || '••••••••'}</strong>
                  </div>
                  
                  {/* Date boxes styled like bank cheques */}
                  <div className="inline-flex items-center gap-1.5 bg-white/90 border border-slate-300 rounded px-2 py-1 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-sans font-semibold">วันที่:</span>
                    <span className="text-xs font-bold text-slate-900 font-sans tracking-wide">
                      {chequeDate ? formatThaiDate(chequeDate) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Payee Name and "หรือผู้ถือ" (BEARER) */}
              <div className="my-3 space-y-2.5 relative z-10 font-sans">
                {/* Payee Line */}
                <div className="flex items-baseline gap-2 border-b border-slate-400/70 pb-1">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">จ่าย:</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 flex-1 px-1 tracking-tight truncate">
                    {payeeName || <span className="text-slate-300 italic font-normal">(กรุณาระบุชื่อผู้รับเงินในฟอร์ม)</span>}
                  </span>
                  
                  {/* หรือผู้ถือ with Strike-through */}
                  <span className="relative text-xs font-medium text-slate-600 whitespace-nowrap pl-2">
                    หรือผู้ถือ
                    {strikeBearer && (
                      <span className="absolute left-0 right-0 top-1/2 h-[2px] bg-red-600 rotate-[-4deg]" />
                    )}
                  </span>
                </div>

                {/* Thai Baht Text Line */}
                <div className="flex items-baseline gap-2 border-b border-slate-400/70 pb-1">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">บาท:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 flex-1 px-1 tracking-tight italic bg-amber-50/50 rounded py-0.5">
                    {totalAmountThaiText || <span className="text-slate-300 font-normal">(-บาทถ้วน-)</span>}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Signature Line & Numeric Amount Box */}
              <div className="flex justify-between items-end pt-1 relative z-10">
                
                {/* Left Bottom: Dika / Memo note */}
                <div className="text-[10px] text-slate-500 font-sans max-w-[200px]">
                  {dikaNumber && (
                    <span className="inline-block bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
                      ฎีกาคลังรับ: <strong>{dikaNumber}</strong>
                    </span>
                  )}
                </div>

                {/* Right Bottom: Numeric Box & Signatures */}
                <div className="flex items-end gap-4">
                  
                  {/* Signature blank */}
                  <div className="text-center font-sans">
                    <div className="w-32 border-b border-slate-400 mb-1" />
                    <span className="text-[9px] text-slate-500 font-medium">ผู้สั่งจ่ายที่ได้รับมอบอำนาจ</span>
                  </div>

                  {/* Amount in Numbers Box */}
                  <div className="border-2 border-slate-800 bg-white px-3 py-1.5 rounded shadow-xs text-right min-w-[150px]">
                    <div className="text-[9px] text-slate-500 font-mono font-bold leading-none mb-0.5">
                      จำนวนเงิน (บาท)
                    </div>
                    <div className="text-base sm:text-lg font-mono font-black text-slate-900 tracking-tight tabular-nums">
                      ฿ {formattedAmount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom MICR Band Simulation */}
              <div className="mt-3 pt-1.5 border-t border-slate-300/80 flex items-center justify-between text-[10px] font-mono text-slate-500 select-none tracking-widest opacity-75">
                <span>⑈ {chequeNumber || '000000'} ⑈</span>
                <span>0040000 ⑆ 0000000000 ⑈ 01</span>
                <span className="text-[9px] font-sans font-semibold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>พร้อมสั่งพิมพ์</span>
                </span>
              </div>

            </div>

          </div>
        )}
      </div>
      
      {/* Footer tips */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {hasCustomImage ? (
            <span className="text-emerald-800 font-semibold">
              ✓ กำลังแสดงผลบนภาพเช็คจริงที่คุณอัปโหลดไว้ ({bankTheme.code})
            </span>
          ) : (
            <span>
              💡 แนะนำ: คุณสามารถอัปโหลดรูปเช็คจริงในเมนู <strong>"ตั้งค่าแม่แบบพิมพ์"</strong> เพื่อให้ภาพจำลองตรงกับเช็คจริง 100%
            </span>
          )}
        </span>
        <span className="font-semibold text-slate-700">
          คีย์ลัด: กด <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] shadow-2xs font-bold text-red-700">Ctrl + P</kbd> เพื่อสั่งพิมพ์ด่วน
        </span>
      </div>
    </div>
  );
};
