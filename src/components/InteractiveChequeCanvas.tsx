import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BankTemplateConfig, BankType } from '../types';
import { ChequeBackground } from './ChequeBackground';
import { ZoomController } from './ZoomController';
import {
  Move,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  Maximize2,
} from 'lucide-react';

export type EditableFieldKey =
  | 'date'
  | 'payee'
  | 'payee2'
  | 'amountText'
  | 'amountNumber'
  | 'amountNumber2'
  | 'amountNumber3'
  | 'crossing'
  | 'strikeBearer';

interface InteractiveChequeCanvasProps {
  config: BankTemplateConfig;
  selectedField: EditableFieldKey | null;
  onSelectField: (field: EditableFieldKey | null) => void;
  onUpdateFieldPosition: (field: EditableFieldKey, x: number, y: number) => void;
  onUpdateFontSize?: (field: EditableFieldKey, fontSize: number) => void;
  isEnlarged?: boolean;
  onOpenEnlarged?: () => void;
  onOpenActualSize?: () => void;
  showCrosshairsDefault?: boolean;
  showBgImageDefault?: boolean;
  initialZoom?: number;
  onUploadImage?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage?: () => void;
}

// Clean, high-precision vector outline of cheque paper (without scanned photo clutter)
const CleanChequeOutline: React.FC<{ bankType: BankType; widthMm: number; heightMm: number }> = ({
  bankType,
  widthMm,
  heightMm,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none text-slate-500 bg-white">
      {/* Subtle 10mm alignment grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-15" width="100%" height="100%">
        <defs>
          <pattern id="grid-mm-subtle" width="10mm" height="10mm" patternUnits="userSpaceOnUse">
            <path d="M 10mm 0 L 0 0 0 10mm" fill="none" stroke="#94a3b8" strokeWidth="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-mm-subtle)" />
      </svg>

      {/* Left Stub Division (approx 15.5% / 36mm) */}
      <div className="absolute top-0 bottom-0 left-0 w-[15.5%] border-r-2 border-dashed border-slate-300 bg-slate-50/70 p-2 flex flex-col justify-between text-[7px] text-slate-400">
        <div className="space-y-1">
          <div className="font-bold text-[8px] text-slate-600">ต้นขั้วเช็ค (Stub)</div>
          <div className="border-b border-slate-200 pb-0.5 text-slate-400">วันที่ ....................</div>
          <div className="border-b border-slate-200 pb-0.5 text-slate-400">จ่าย ....................</div>
          <div className="border-b border-slate-200 pb-0.5 text-slate-400">บาท ....................</div>
        </div>
        <div className="border border-slate-200 bg-white p-1 text-[6.5px] space-y-0.5 rounded-xs">
          <div className="flex justify-between border-b border-slate-100 pb-0.5 font-semibold text-slate-600">
            <span>ยอดยกมา</span>
            <span>จำนวนเงิน</span>
          </div>
          <div className="text-slate-400">เงินฝาก</div>
          <div className="text-slate-400">รวม</div>
          <div className="text-slate-400">เงินจ่ายตามเช็ค</div>
          <div className="font-bold text-slate-600">คงเหลือ</div>
        </div>
        <div className="font-mono text-[7px] text-slate-400">
          {bankType} CHEQUE STUB
        </div>
      </div>

      {/* Main Cheque Body Guide */}
      <div className="absolute top-0 bottom-0 left-[15.5%] right-0 p-3 flex flex-col justify-between">
        {/* Top Header: Bank watermark label + Date box */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {bankType === 'KTB'
                ? 'ธนาคารกรุงไทย (KTB)'
                : bankType === 'BAAC'
                ? 'ธ.ก.ส. (BAAC)'
                : 'ธนาคารออมสิน (GSB)'}
            </span>
            <span className="text-[8.5px] text-slate-400 font-mono">
              ({widthMm} × {heightMm} มม.)
            </span>
          </div>

          {/* Date Segmented Boxes */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-slate-500 font-semibold mb-0.5">วันที่ Date:</span>
            <div className="flex items-center gap-0.5">
              <div className="flex border border-slate-300 bg-slate-50/70 text-[7px] font-mono text-slate-400">
                <span className="w-3.5 h-4 flex items-center justify-center border-r border-slate-200">ว</span>
                <span className="w-3.5 h-4 flex items-center justify-center">ว</span>
              </div>
              <span className="text-slate-300 text-xs">/</span>
              <div className="flex border border-slate-300 bg-slate-50/70 text-[7px] font-mono text-slate-400">
                <span className="w-3.5 h-4 flex items-center justify-center border-r border-slate-200">ด</span>
                <span className="w-3.5 h-4 flex items-center justify-center">ด</span>
              </div>
              <span className="text-slate-300 text-xs">/</span>
              <div className="flex border border-slate-300 bg-slate-50/70 text-[7px] font-mono text-slate-400">
                <span className="w-3.5 h-4 flex items-center justify-center border-r border-slate-200">ป</span>
                <span className="w-3.5 h-4 flex items-center justify-center border-r border-slate-200">ป</span>
                <span className="w-3.5 h-4 flex items-center justify-center border-r border-slate-200">ป</span>
                <span className="w-3.5 h-4 flex items-center justify-center">ป</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payee Line Guide */}
        <div className="pl-4 pt-1">
          <div className="flex items-baseline justify-between border-b border-dotted border-slate-300 pb-0.5 text-[9.5px] text-slate-400">
            <span>จ่าย (Pay) ............................................................................................................</span>
            <span className="text-[8px]">หรือผู้ถือ (or bearer)</span>
          </div>
        </div>

        {/* Amount in words & Numeric box Guide */}
        <div className="pl-4 flex items-center gap-3">
          <div className="flex-1 border-b border-dotted border-slate-300 pb-0.5 text-[9.5px] text-slate-400">
            จำนวนเงิน (บาท) The sum of (Baht) ................................................................
          </div>
          <div className="w-44 h-8 border border-slate-300 bg-slate-50/70 rounded-xs flex items-center px-2 text-slate-500 shadow-2xs">
            <span className="font-serif font-bold text-sm mr-2 text-slate-500">฿</span>
            <span className="text-[8px] text-slate-400 font-mono">[ ช่องจำนวนเงินตัวเลข ]</span>
          </div>
        </div>

        {/* Bottom MICR guide line */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[7px] text-slate-400 font-mono">
          <span>เช็คเลขที่ Cheque No.</span>
          <span className="tracking-[0.2em] font-semibold">⑆00 ⑈ 00000000⑈000⑉0000⑆ 0000000000⑈00</span>
          <span>สำหรับเจ้าหน้าที่</span>
        </div>
      </div>
    </div>
  );
};

export const InteractiveChequeCanvas: React.FC<InteractiveChequeCanvasProps> = ({
  config,
  selectedField,
  onSelectField,
  onUpdateFieldPosition,
  onUpdateFontSize,
  isEnlarged = false,
  showCrosshairsDefault = true,
  showBgImageDefault = false, // Clean white cheque paper by default as user requested ("เอาตรงรูปออกเลย")
  initialZoom = 1.0, // Default 100% (1:1 actual printing millimeter scale)
  onOpenActualSize,
  onUploadImage,
  onClearImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragField, setDragField] = useState<EditableFieldKey | null>(null);
  const [dragStart, setDragStart] = useState<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Helper to get coordinates for any field including crossing and strikeBearer
  const getFieldPos = useCallback(
    (fieldKey: EditableFieldKey) => {
      if (fieldKey === 'crossing') {
        return {
          x: config.crossing?.x ?? 45,
          y: config.crossing?.y ?? 8,
          fontSizePt: 9,
          prefix: '',
          suffix: '',
        };
      }
      if (fieldKey === 'strikeBearer') {
        return {
          x: config.strikeBearer?.x ?? 214,
          y: config.strikeBearer?.y ?? 27.5,
          fontSizePt: 9,
          prefix: '',
          suffix: '',
        };
      }
      if (fieldKey === 'payee2') {
        return (
          config.fields.payee2 || {
            x: config.fields.payee.x,
            y: Math.max(5, config.fields.payee.y - 9),
            fontSizePt: 11,
            prefix: '',
            suffix: '',
            enabled: false,
          }
        );
      }
      if (fieldKey === 'amountNumber2') {
        return (
          config.fields.amountNumber2 || {
            x: config.fields.amountNumber.x,
            y: Math.max(5, config.fields.amountNumber.y - 20),
            fontSizePt: 10,
            prefix: '*',
            suffix: '*',
            enabled: false,
          }
        );
      }
      if (fieldKey === 'amountNumber3') {
        return (
          config.fields.amountNumber3 || {
            x: config.fields.amountNumber.x,
            y: Math.min(config.heightMm - 10, config.fields.amountNumber.y + 25),
            fontSizePt: 10,
            prefix: '*',
            suffix: '*',
            enabled: false,
          }
        );
      }
      return config.fields[fieldKey] || { x: 0, y: 0, fontSizePt: 12 };
    },
    [config]
  );

  // Default 100% scale (1:1 actual printing millimeter scale)
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(showCrosshairsDefault);
  const [showBgImage, setShowBgImage] = useState<boolean>(Boolean(config.customBgImageUrl) || showBgImageDefault);
  const [bgOpacity, setBgOpacity] = useState<number>(0.75); // 75% default opacity
  const [isAxisLocked, setIsAxisLocked] = useState<boolean>(false);

  // Automatically show background when custom image is uploaded or present
  useEffect(() => {
    if (config.customBgImageUrl) {
      setShowBgImage(true);
    }
  }, [config.customBgImageUrl]);

  // Handle global mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragField || !dragStart || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const pxPerMmX = rect.width / config.widthMm;
      const pxPerMmY = rect.height / config.heightMm;

      let deltaPxX = e.clientX - dragStart.clientX;
      let deltaPxY = e.clientY - dragStart.clientY;

      // Axis Lock (Active when Shift is pressed or toggle is enabled)
      if (e.shiftKey || isAxisLocked) {
        if (Math.abs(deltaPxX) > Math.abs(deltaPxY)) {
          deltaPxY = 0; // Move horizontal only
        } else {
          deltaPxX = 0; // Move vertical only
        }
      }

      const deltaMmX = deltaPxX / pxPerMmX;
      const deltaMmY = deltaPxY / pxPerMmY;

      // Fine step 0.1mm when Shift is pressed, otherwise 0.5mm snap
      const snapStep = e.shiftKey ? 0.1 : 0.5;
      let newX = Math.round((dragStart.startX + deltaMmX) / snapStep) * snapStep;
      let newY = Math.round((dragStart.startY + deltaMmY) / snapStep) * snapStep;

      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;

      // Clamp within cheque boundaries
      newX = Math.max(0, Math.min(config.widthMm - 5, newX));
      newY = Math.max(0, Math.min(config.heightMm - 5, newY));

      onUpdateFieldPosition(dragField, newX, newY);
    },
    [isDragging, dragField, dragStart, config.widthMm, config.heightMm, onUpdateFieldPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard arrow keys fine-tuning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedField) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        // Prevent scrolling if not focusing an input
        const activeTagName = document.activeElement?.tagName.toLowerCase();
        if (activeTagName === 'input' || activeTagName === 'textarea') return;

        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.5;
        const currentPos = getFieldPos(selectedField);
        let newX = currentPos.x;
        let newY = currentPos.y;

        if (e.key === 'ArrowLeft') newX -= step;
        if (e.key === 'ArrowRight') newX += step;
        if (e.key === 'ArrowUp') newY -= step;
        if (e.key === 'ArrowDown') newY += step;

        newX = Math.round(Math.max(0, Math.min(config.widthMm - 5, newX)) * 10) / 10;
        newY = Math.round(Math.max(0, Math.min(config.heightMm - 5, newY)) * 10) / 10;

        onUpdateFieldPosition(selectedField, newX, newY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedField, getFieldPos, config.widthMm, config.heightMm, onUpdateFieldPosition]);

  const handleMouseDownOnField = (e: React.MouseEvent, fieldKey: EditableFieldKey) => {
    e.stopPropagation();
    e.preventDefault();

    onSelectField(fieldKey);
    setDragField(fieldKey);
    setIsDragging(true);

    const currentPos = getFieldPos(fieldKey);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      startX: currentPos.x,
      startY: currentPos.y,
    });
  };

  const handleNudge = (dx: number, dy: number) => {
    if (!selectedField) return;
    const currentPos = getFieldPos(selectedField);
    let newX = Math.round((currentPos.x + dx) * 10) / 10;
    let newY = Math.round((currentPos.y + dy) * 10) / 10;
    newX = Math.max(0, Math.min(config.widthMm - 5, newX));
    newY = Math.max(0, Math.min(config.heightMm - 5, newY));
    onUpdateFieldPosition(selectedField, newX, newY);
  };

  const currentFieldConfig = selectedField ? getFieldPos(selectedField) : null;

  return (
    <div className="flex flex-col items-center select-none w-full space-y-3">
      {/* Top Toolbar for Editor Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs">
        {/* Active field pill indicator */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              'date',
              'payee',
              'payee2',
              'amountText',
              'amountNumber',
              'amountNumber2',
              'amountNumber3',
              'crossing',
              'strikeBearer',
            ] as EditableFieldKey[]
          ).map((fieldKey) => {
            const labels: Record<EditableFieldKey, string> = {
              date: '1. วันที่',
              payee: '2. ผู้รับเงิน (จุด 1)',
              payee2: '3. ผู้รับเงิน (จุด 2)',
              amountText: '4. ตัวอักษร',
              amountNumber: '5. ตัวเลข (จุด 1)',
              amountNumber2: '6. ตัวเลข (จุด 2)',
              amountNumber3: '7. ตัวเลข (จุด 3)',
              crossing: '8. ขีดคร่อม',
              strikeBearer: '9. ขีดฆ่า "หรือผู้ถือ"',
            };
            const isSel = selectedField === fieldKey;
            const pos = getFieldPos(fieldKey);
            return (
              <button
                key={fieldKey}
                type="button"
                onClick={() => onSelectField(fieldKey)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? fieldKey === 'crossing' || fieldKey === 'strikeBearer'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{labels[fieldKey]}</span>
                <span className="text-[10px] font-mono opacity-85">
                  ({pos.x}, {pos.y})
                </span>
              </button>
            );
          })}
        </div>

        {/* Nudge Arrows, Font Size, Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1:1 Actual Size popup button */}
          {onOpenActualSize && (
            <button
              type="button"
              onClick={onOpenActualSize}
              className="px-2.5 py-1 rounded-lg border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="เปิดดูป็อปอัปขนาดจริง 100% 1:1 (Actual Physical Scale)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-red-700" />
              <span>ดูขนาดจริง 1:1</span>
            </button>
          )}
          {/* Nudge Arrows Pad */}
          {selectedField && (
            <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-300 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleNudge(-0.5, 0)}
                className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                title="เลื่อนซ้าย 0.5 มม."
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleNudge(0, -0.5)}
                  className="w-6 h-3 flex items-center justify-center text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                  title="เลื่อนขึ้น 0.5 มม."
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 0.5)}
                  className="w-6 h-3 flex items-center justify-center text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                  title="เลื่อนลง 0.5 มม."
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNudge(0.5, 0)}
                className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                title="เลื่อนขวา 0.5 มม."
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Font Size controls */}
          {selectedField && onUpdateFontSize && currentFieldConfig && (
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-600 font-medium">Font:</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateFontSize(selectedField, Math.max(8, currentFieldConfig.fontSizePt - 0.5))
                }
                className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-950 font-bold bg-slate-100 rounded hover:bg-slate-200 cursor-pointer"
                title="ลดขนาดตัวอักษร (-0.5pt)"
              >
                -
              </button>
              <span className="text-[12px] font-mono font-bold w-7 text-center text-slate-800">
                {currentFieldConfig.fontSizePt}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateFontSize(selectedField, Math.min(24, currentFieldConfig.fontSizePt + 0.5))
                }
                className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-950 font-bold bg-slate-100 rounded hover:bg-slate-200 cursor-pointer"
                title="เพิ่มขนาดตัวอักษร (+0.5pt)"
              >
                +
              </button>
            </div>
          )}

          {/* Crosshairs toggle */}
          <button
            type="button"
            onClick={() => setShowCrosshairs(!showCrosshairs)}
            className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              showCrosshairs
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="เปิด/ปิด เส้นไกด์กากบาทตำแหน่ง (Crosshairs)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>เส้นไกด์</span>
          </button>

          {/* Optional Background Image Toggle */}
          <button
            type="button"
            onClick={() => setShowBgImage(!showBgImage)}
            className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              showBgImage
                ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="สลับการแสดงภาพเช็คจริง / พื้นหลังกระดาษเช็คเรียบ"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{showBgImage ? 'ซ่อนภาพเช็ค' : 'แสดงภาพเช็ค'}</span>
          </button>

          {/* Background Opacity Slider (Only visible when bg image is enabled) */}
          {showBgImage && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
              <span className="text-[11px] text-slate-500">ความชัดภาพ:</span>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={Math.round(bgOpacity * 100)}
                onChange={(e) => setBgOpacity(Number(e.target.value) / 100)}
                className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                title={`ปรับความโปร่งใสของภาพเช็ค: ${Math.round(bgOpacity * 100)}%`}
              />
              <span className="text-[10px] font-mono text-slate-600 w-7 tabular-nums">{Math.round(bgOpacity * 100)}%</span>
            </div>
          )}

          {/* Axis Lock Button */}
          <button
            type="button"
            onClick={() => setIsAxisLocked(!isAxisLocked)}
            className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              isAxisLocked
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="ล็อคแกนการลาก: ลากได้เฉพาะแนวนอนหรือแนวตั้งตรงๆ (หรือกดปุ่ม Shift ค้างไว้ขณะลาก)"
          >
            {isAxisLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isAxisLocked ? 'ล็อคแกนเปิด' : 'ล็อคแกน (Shift)'}</span>
          </button>

          {/* Direct Upload Image in Canvas Toolbar */}
          {onUploadImage && (
            <div className="flex items-center gap-1">
              <label
                className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  config.customBgImageUrl
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-semibold'
                    : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 font-semibold'
                }`}
                title="อัปโหลดรูปภาพสแกนเช็คจริงเพื่อแสดงเป็นพื้นหลังอ้างอิง"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{config.customBgImageUrl ? 'เปลี่ยนภาพเช็ค' : 'อัปโหลดภาพเช็ค'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onUploadImage}
                  className="hidden"
                />
              </label>

              {config.customBgImageUrl && onClearImage && (
                <button
                  type="button"
                  onClick={onClearImage}
                  className="p-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                  title="ลบรูปภาพเช็คที่อัปโหลด"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Zoom Controls */}
          <ZoomController
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
          />
        </div>
      </div>

      {/* Cheque Canvas Container with Zoom Transform */}
      <div className="overflow-auto max-w-full p-4 sm:p-6 flex items-center justify-center w-full bg-slate-200/70 border border-slate-300 rounded-2xl shadow-inner min-h-[360px]">
        <div
          ref={containerRef}
          style={{
            width: `${config.widthMm}mm`,
            height: `${config.heightMm}mm`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
          }}
          className="bg-white border-2 border-slate-400 rounded-lg shadow-xl relative overflow-hidden text-black transition-transform duration-75 select-none shrink-0"
        >
          {/* Background: Clean White Cheque Outline by default OR Real Cheque Background if toggled */}
          {showBgImage ? (
            <div style={{ opacity: bgOpacity }} className="w-full h-full transition-opacity duration-150">
              <ChequeBackground
                bankType={config.bankType}
                customImageUrl={config.customBgImageUrl}
              />
            </div>
          ) : (
            <CleanChequeOutline
              bankType={config.bankType}
              widthMm={config.widthMm}
              heightMm={config.heightMm}
            />
          )}

          {/* Guide preview & draggable for "หรือผู้ถือ" Strike-through */}
          {config.strikeBearer && (
            <div
              onMouseDown={(e) => handleMouseDownOnField(e, 'strikeBearer')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField('strikeBearer');
              }}
              style={{
                left: `${config.strikeBearer.x + (config.globalOffsetX || 0)}mm`,
                top: `${config.strikeBearer.y + (config.globalOffsetY || 0)}mm`,
                width: `${config.strikeBearer.widthMm || 16}mm`,
              }}
              className={`absolute z-25 cursor-grab active:cursor-grabbing flex flex-col justify-center py-1 transition-all ${
                selectedField === 'strikeBearer'
                  ? 'ring-2 ring-red-600 bg-red-100/70 shadow-md rounded-xs'
                  : 'hover:ring-1 hover:ring-dashed hover:ring-red-400'
              }`}
              title="แนวตำแหน่งขีดฆ่า 'หรือผู้ถือ' (คลิกแล้วลากเพื่อปรับตำแหน่ง หรือใช้ลูกศรบนคีย์บอร์ด)"
            >
              <div className="w-full h-[2px] bg-red-600 mb-[2px]" />
              <div className="w-full h-[2px] bg-red-600" />
              {selectedField === 'strikeBearer' && (
                <span className="absolute -top-5 left-0 bg-red-800 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                  6. ขีดฆ่า: X:{config.strikeBearer.x} Y:{config.strikeBearer.y}
                </span>
              )}
            </div>
          )}

          {/* Guide preview & draggable for Cheque Crossing */}
          {config.crossing && (
            <div
              onMouseDown={(e) => handleMouseDownOnField(e, 'crossing')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField('crossing');
              }}
              style={{
                left: `${config.crossing.x + (config.globalOffsetX || 0)}mm`,
                top: `${config.crossing.y + (config.globalOffsetY || 0)}mm`,
              }}
              className={`absolute z-25 cursor-grab active:cursor-grabbing -rotate-12 border-y-2 border-red-600 px-2 py-0.5 text-center transition-all ${
                selectedField === 'crossing'
                  ? 'ring-2 ring-red-600 bg-red-100/90 shadow-md rounded-xs'
                  : 'hover:ring-1 hover:ring-dashed hover:ring-red-400 hover:bg-red-50/50'
              }`}
              title="แนวตำแหน่งขีดคร่อมเช็ค (คลิกแล้วลากเพื่อปรับตำแหน่ง หรือใช้ลูกศรบนคีย์บอร์ด)"
            >
              <span className="text-[7.5pt] font-black text-red-700 font-mono tracking-wider whitespace-nowrap">
                {config.crossing.typeDefault === 'AND_CO' ? '// & CO. //' : '// A/C PAYEE ONLY //'}
              </span>
              {selectedField === 'crossing' && (
                <span className="absolute -top-5 left-0 bg-red-800 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                  5. ขีดคร่อม: X:{config.crossing.x} Y:{config.crossing.y}
                </span>
              )}
            </div>
          )}

          {/* ================= CROSSHAIRS GUIDELINES ================= */}
          {showCrosshairs && selectedField && currentFieldConfig && (
            <div className="absolute inset-0 pointer-events-none z-15">
              {/* Horizontal Line across cheque */}
              <div
                style={{
                  top: `${currentFieldConfig.y + (config.globalOffsetY || 0)}mm`,
                }}
                className="absolute left-0 right-0 border-b border-dashed border-emerald-500"
              >
                <span className="absolute -top-3.5 right-1 bg-emerald-700 text-white text-[7px] font-mono px-1 rounded-xs">
                  Y: {currentFieldConfig.y}mm
                </span>
              </div>

              {/* Vertical Line across cheque */}
              <div
                style={{
                  left: `${currentFieldConfig.x + (config.globalOffsetX || 0)}mm`,
                }}
                className="absolute top-0 bottom-0 border-r border-dashed border-emerald-500"
              >
                <span className="absolute bottom-1 left-1 bg-emerald-700 text-white text-[7px] font-mono px-1 rounded-xs">
                  X: {currentFieldConfig.x}mm
                </span>
              </div>
            </div>
          )}

          {/* ================= DRAGGABLE TEXT ELEMENTS ================= */}

          {/* 1. วันที่ (Date) */}
          <div
            onMouseDown={(e) => handleMouseDownOnField(e, 'date')}
            onClick={(e) => {
              e.stopPropagation();
              onSelectField('date');
            }}
            style={{
              left: `${config.fields.date.x + (config.globalOffsetX || 0)}mm`,
              top: `${config.fields.date.y + (config.globalOffsetY || 0)}mm`,
              fontSize: `${config.fields.date.fontSizePt}pt`,
              letterSpacing: `${config.fields.date.letterSpacingMm || 2.2}mm`,
            }}
            className={`absolute whitespace-nowrap font-bold leading-none cursor-grab active:cursor-grabbing z-20 transition-all ${
              selectedField === 'date'
                ? 'ring-2 ring-emerald-500 bg-emerald-50 shadow-md rounded-xs px-1.5 py-0.5'
                : 'hover:ring-1 hover:ring-dashed hover:ring-sky-500 hover:bg-sky-50/50'
            }`}
          >
            02  10  2569
            {selectedField === 'date' && (
              <span className="absolute -top-5 left-0 bg-emerald-700 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                1. วันที่: X:{config.fields.date.x} Y:{config.fields.date.y}
              </span>
            )}
          </div>

          {/* 2. ชื่อผู้รับเงิน (Payee) จุดที่ 1 */}
          <div
            onMouseDown={(e) => handleMouseDownOnField(e, 'payee')}
            onClick={(e) => {
              e.stopPropagation();
              onSelectField('payee');
            }}
            style={{
              left: `${config.fields.payee.x + (config.globalOffsetX || 0)}mm`,
              top: `${config.fields.payee.y + (config.globalOffsetY || 0)}mm`,
              fontSize: `${config.fields.payee.fontSizePt}pt`,
            }}
            className={`absolute font-bold whitespace-nowrap leading-none cursor-grab active:cursor-grabbing z-20 transition-all ${
              selectedField === 'payee'
                ? 'ring-2 ring-emerald-500 bg-emerald-50 shadow-md rounded-xs px-1.5 py-0.5'
                : 'hover:ring-1 hover:ring-dashed hover:ring-sky-500 hover:bg-sky-50/50'
            }`}
          >
            บริษัท ตัวอย่างเจริญพาณิชย์ จำกัด (จุด 1)
            {selectedField === 'payee' && (
              <span className="absolute -top-5 left-0 bg-emerald-700 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                2. ผู้รับเงิน (จุด 1): X:{config.fields.payee.x} Y:{config.fields.payee.y}
              </span>
            )}
          </div>

          {/* 2.1 ชื่อผู้รับเงิน จุดที่ 2 (Payee 2) */}
          {config.fields.payee2 && (
            <div
              onMouseDown={(e) => handleMouseDownOnField(e, 'payee2')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField('payee2');
              }}
              style={{
                left: `${config.fields.payee2.x + (config.globalOffsetX || 0)}mm`,
                top: `${config.fields.payee2.y + (config.globalOffsetY || 0)}mm`,
                fontSize: `${config.fields.payee2.fontSizePt}pt`,
              }}
              className={`absolute font-bold whitespace-nowrap leading-none cursor-grab active:cursor-grabbing z-20 transition-all ${
                selectedField === 'payee2'
                  ? 'ring-2 ring-blue-500 bg-blue-50 shadow-md rounded-xs px-1.5 py-0.5'
                  : 'hover:ring-1 hover:ring-dashed hover:ring-blue-500 hover:bg-blue-50/50'
              }`}
            >
              บริษัท ตัวอย่างเจริญพาณิชย์ จำกัด (จุด 2)
              {selectedField === 'payee2' && (
                <span className="absolute -top-5 left-0 bg-blue-700 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                  3. ผู้รับเงิน (จุด 2): X:{config.fields.payee2.x} Y:{config.fields.payee2.y}
                </span>
              )}
            </div>
          )}

          {/* 3. จำนวนเงินตัวอักษร (Amount in Words) */}
          <div
            onMouseDown={(e) => handleMouseDownOnField(e, 'amountText')}
            onClick={(e) => {
              e.stopPropagation();
              onSelectField('amountText');
            }}
            style={{
              left: `${config.fields.amountText.x + (config.globalOffsetX || 0)}mm`,
              top: `${config.fields.amountText.y + (config.globalOffsetY || 0)}mm`,
              fontSize: `${config.fields.amountText.fontSizePt}pt`,
            }}
            className={`absolute font-bold whitespace-nowrap leading-none cursor-grab active:cursor-grabbing z-20 transition-all ${
              selectedField === 'amountText'
                ? 'ring-2 ring-emerald-500 bg-emerald-50 shadow-md rounded-xs px-1.5 py-0.5'
                : 'hover:ring-1 hover:ring-dashed hover:ring-sky-500 hover:bg-sky-50/50'
            }`}
          >
            {config.fields.amountText.prefix || '='}
            สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทถ้วน
            {config.fields.amountText.suffix || '='}
            {selectedField === 'amountText' && (
              <span className="absolute -top-5 left-0 bg-emerald-700 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                3. ตัวอักษร: X:{config.fields.amountText.x} Y:{config.fields.amountText.y}
              </span>
            )}
          </div>

          {/* 4. จำนวนเงินตัวเลข (Numeric Amount) จุดที่ 1 */}
          <div
            onMouseDown={(e) => handleMouseDownOnField(e, 'amountNumber')}
            onClick={(e) => {
              e.stopPropagation();
              onSelectField('amountNumber');
            }}
            style={{
              left: `${config.fields.amountNumber.x + (config.globalOffsetX || 0)}mm`,
              top: `${config.fields.amountNumber.y + (config.globalOffsetY || 0)}mm`,
              fontSize: `${config.fields.amountNumber.fontSizePt}pt`,
            }}
            className={`absolute font-bold tabular-nums whitespace-nowrap leading-none tracking-wider cursor-grab active:cursor-grabbing z-20 transition-all ${
              selectedField === 'amountNumber'
                ? 'ring-2 ring-emerald-500 bg-emerald-50 shadow-md rounded-xs px-1.5 py-0.5'
                : 'hover:ring-1 hover:ring-dashed hover:ring-sky-500 hover:bg-sky-50/50'
            }`}
          >
            {config.fields.amountNumber.prefix || '*'}
            25,750.00
            {config.fields.amountNumber.suffix || '*'}
            {selectedField === 'amountNumber' && (
              <span className="absolute -top-5 left-0 bg-emerald-700 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                5. ตัวเลข (จุด 1): X:{config.fields.amountNumber.x} Y:{config.fields.amountNumber.y}
              </span>
            )}
          </div>

          {/* 4.1 จำนวนเงินตัวเลข จุดที่ 2 (amountNumber2) */}
          {config.fields.amountNumber2 && (
            <div
              onMouseDown={(e) => handleMouseDownOnField(e, 'amountNumber2')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField('amountNumber2');
              }}
              style={{
                left: `${config.fields.amountNumber2.x + (config.globalOffsetX || 0)}mm`,
                top: `${config.fields.amountNumber2.y + (config.globalOffsetY || 0)}mm`,
                fontSize: `${config.fields.amountNumber2.fontSizePt}pt`,
              }}
              className={`absolute font-bold tabular-nums whitespace-nowrap leading-none tracking-wider cursor-grab active:cursor-grabbing z-20 transition-all ${
                selectedField === 'amountNumber2'
                  ? 'ring-2 ring-emerald-600 bg-emerald-100 shadow-md rounded-xs px-1.5 py-0.5 text-emerald-950'
                  : 'hover:ring-1 hover:ring-dashed hover:ring-emerald-500 hover:bg-emerald-50/50'
              }`}
            >
              {config.fields.amountNumber2.prefix || '*'}
              25,750.00 (จุด 2)
              {config.fields.amountNumber2.suffix || '*'}
              {selectedField === 'amountNumber2' && (
                <span className="absolute -top-5 left-0 bg-emerald-800 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                  6. ตัวเลข (จุด 2): X:{config.fields.amountNumber2.x} Y:{config.fields.amountNumber2.y}
                </span>
              )}
            </div>
          )}

          {/* 4.2 จำนวนเงินตัวเลข จุดที่ 3 (amountNumber3) */}
          {config.fields.amountNumber3 && (
            <div
              onMouseDown={(e) => handleMouseDownOnField(e, 'amountNumber3')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField('amountNumber3');
              }}
              style={{
                left: `${config.fields.amountNumber3.x + (config.globalOffsetX || 0)}mm`,
                top: `${config.fields.amountNumber3.y + (config.globalOffsetY || 0)}mm`,
                fontSize: `${config.fields.amountNumber3.fontSizePt}pt`,
              }}
              className={`absolute font-bold tabular-nums whitespace-nowrap leading-none tracking-wider cursor-grab active:cursor-grabbing z-20 transition-all ${
                selectedField === 'amountNumber3'
                  ? 'ring-2 ring-purple-600 bg-purple-100 shadow-md rounded-xs px-1.5 py-0.5 text-purple-950'
                  : 'hover:ring-1 hover:ring-dashed hover:ring-purple-500 hover:bg-purple-50/50'
              }`}
            >
              {config.fields.amountNumber3.prefix || '*'}
              25,750.00 (จุด 3)
              {config.fields.amountNumber3.suffix || '*'}
              {selectedField === 'amountNumber3' && (
                <span className="absolute -top-5 left-0 bg-purple-800 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-tight shadow-xs whitespace-nowrap z-30 pointer-events-none">
                  7. ตัวเลข (จุด 3): X:{config.fields.amountNumber3.x} Y:{config.fields.amountNumber3.y}
                </span>
              )}
            </div>
          )}

          {/* Left Stub Reference Text */}
          <div
            style={{
              left: `${(config.fields.stubDate?.x || 10) + (config.globalOffsetX || 0)}mm`,
              top: `${(config.fields.stubDate?.y || 15) + (config.globalOffsetY || 0)}mm`,
              fontSize: '7.5pt',
            }}
            className="absolute text-slate-700 leading-snug z-10 pointer-events-none"
          >
            <div className="font-semibold">02/10/2569</div>
            <div className="truncate max-w-[20mm]">บ. ตัวอย่าง</div>
            <div className="font-bold">25,750.00 บ.</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
        <span>💡 คลิกค้างที่ข้อความบนเช็คแล้วลากเมาส์ปรับตำแหน่งได้อย่างอิสระ หรือกดปุ่มลูกศรเพื่อปรับทีละ 0.5 มม.</span>
      </div>
    </div>
  );
};
