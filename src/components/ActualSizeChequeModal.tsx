import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BankTemplateConfig, User } from '../types';
import { EditableFieldKey } from './InteractiveChequeCanvas';
import { ChequeBackground } from './ChequeBackground';
import { StorageService } from '../utils/storage';
import {
  X,
  Printer,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Eye,
  Ruler,
  Info,
  Sliders,
  Move,
  Save,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Sparkles,
  Type,
} from 'lucide-react';

interface ActualSizeChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BankTemplateConfig;
  currentUser?: User;
  onUpdateFieldPosition?: (field: EditableFieldKey, x: number, y: number) => void;
  onUpdateFontSize?: (field: EditableFieldKey, fontSizePt: number) => void;
  onSaveConfig?: (config: BankTemplateConfig) => void;
}

export const ActualSizeChequeModal: React.FC<ActualSizeChequeModalProps> = ({
  isOpen,
  onClose,
  config,
  currentUser,
  onUpdateFieldPosition,
  onUpdateFontSize,
  onSaveConfig,
}) => {
  // Scale / display state
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 100% 1:1 physical millimeter scale
  const [showBgImage, setShowBgImage] = useState<boolean>(true);
  const [bgOpacity, setBgOpacity] = useState<number>(0.85);
  const [showRulerGuides, setShowRulerGuides] = useState<boolean>(true);

  // Local live configuration for interactive dragging
  const [liveConfig, setLiveConfig] = useState<BankTemplateConfig>(config);
  const [selectedField, setSelectedField] = useState<EditableFieldKey>('payee');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showFontSizeTable, setShowFontSizeTable] = useState<boolean>(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragField, setDragField] = useState<EditableFieldKey | null>(null);
  const [dragStart, setDragStart] = useState<{
    clientX: number;
    clientY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const paperRef = useRef<HTMLDivElement>(null);

  // Sync config when modal opens or config prop changes
  useEffect(() => {
    if (isOpen) {
      setLiveConfig(JSON.parse(JSON.stringify(config)));
      setHasUnsavedChanges(false);
      setSaveToast(null);
    }
  }, [isOpen, config]);

  const widthMm = liveConfig.widthMm;
  const heightMm = liveConfig.heightMm;
  const widthCm = (widthMm / 10).toFixed(1);
  const heightCm = (heightMm / 10).toFixed(1);

  // Get field coordinates
  const getFieldCoordinates = useCallback(
    (fieldKey: EditableFieldKey): { x: number; y: number } => {
      if (fieldKey === 'crossing') {
        return {
          x: liveConfig.crossing?.x ?? 45,
          y: liveConfig.crossing?.y ?? 8,
        };
      }
      if (fieldKey === 'strikeBearer') {
        return {
          x: liveConfig.strikeBearer?.x ?? 214,
          y: liveConfig.strikeBearer?.y ?? 27.5,
        };
      }
      if (fieldKey === 'payee2') {
        return {
          x: liveConfig.fields.payee2?.x ?? liveConfig.fields.payee.x,
          y: liveConfig.fields.payee2?.y ?? Math.max(5, liveConfig.fields.payee.y - 8),
        };
      }
      if (fieldKey === 'amountNumber2') {
        return {
          x: liveConfig.fields.amountNumber2?.x ?? liveConfig.fields.amountNumber.x,
          y: liveConfig.fields.amountNumber2?.y ?? Math.max(5, liveConfig.fields.amountNumber.y - 20),
        };
      }
      if (fieldKey === 'amountNumber3') {
        return {
          x: liveConfig.fields.amountNumber3?.x ?? liveConfig.fields.amountNumber.x,
          y: liveConfig.fields.amountNumber3?.y ?? Math.min(heightMm - 10, liveConfig.fields.amountNumber.y + 25),
        };
      }
      const field = liveConfig.fields[fieldKey as keyof typeof liveConfig.fields];
      return {
        x: field?.x ?? 10,
        y: field?.y ?? 10,
      };
    },
    [liveConfig, heightMm]
  );

  // Get field font size in pt
  const getFieldFontSize = useCallback(
    (fieldKey: EditableFieldKey): number => {
      if (fieldKey === 'crossing' || fieldKey === 'strikeBearer') return 11;
      if (fieldKey === 'payee2') {
        return liveConfig.fields.payee2?.fontSizePt ?? liveConfig.fields.payee?.fontSizePt ?? 11;
      }
      if (fieldKey === 'amountNumber2') {
        return liveConfig.fields.amountNumber2?.fontSizePt ?? liveConfig.fields.amountNumber?.fontSizePt ?? 10;
      }
      if (fieldKey === 'amountNumber3') {
        return liveConfig.fields.amountNumber3?.fontSizePt ?? liveConfig.fields.amountNumber?.fontSizePt ?? 10;
      }
      const field = liveConfig.fields[fieldKey as keyof typeof liveConfig.fields];
      return (field as any)?.fontSizePt ?? 12;
    },
    [liveConfig]
  );

  // Update field font size and trigger callback safely
  const updateFontSize = useCallback(
    (fieldKey: EditableFieldKey, newSizePt: number) => {
      if (fieldKey === 'crossing' || fieldKey === 'strikeBearer') return;
      const clamped = Math.round(Math.max(6, Math.min(28, newSizePt)) * 10) / 10;

      setLiveConfig((prev) => {
        const next = { ...prev, fields: { ...prev.fields } };
        const coords = getFieldCoordinates(fieldKey);
        const existing = (next.fields as any)[fieldKey] || {
          x: coords.x,
          y: coords.y,
          fontSizePt: clamped,
        };
        (next.fields as any)[fieldKey] = {
          ...existing,
          fontSizePt: clamped,
        };
        return next;
      });

      setHasUnsavedChanges(true);

      if (onUpdateFontSize) {
        onUpdateFontSize(fieldKey, clamped);
      }
    },
    [onUpdateFontSize, getFieldCoordinates]
  );

  // Batch scale all font sizes simultaneously (+0.5 pt or -0.5 pt)
  const scaleAllFonts = useCallback(
    (deltaPt: number) => {
      const textFields: EditableFieldKey[] = [
        'payee',
        'payee2',
        'amountText',
        'amountNumber',
        'amountNumber2',
        'amountNumber3',
        'date',
      ];
      setLiveConfig((prev) => {
        const next = { ...prev, fields: { ...prev.fields } };
        textFields.forEach((key) => {
          const currentSize = getFieldFontSize(key);
          const newSize = Math.round(Math.max(6, Math.min(28, currentSize + deltaPt)) * 10) / 10;
          const coords = getFieldCoordinates(key);
          const existing = (next.fields as any)[key] || {
            x: coords.x,
            y: coords.y,
            fontSizePt: newSize,
          };
          (next.fields as any)[key] = {
            ...existing,
            fontSizePt: newSize,
          };
          if (onUpdateFontSize) onUpdateFontSize(key, newSize);
        });
        return next;
      });
      setHasUnsavedChanges(true);
      setSaveToast(`ปรับขนาดฟอนต์ทุกช่อง ${deltaPt > 0 ? `+${deltaPt}` : deltaPt} pt เรียบร้อยแล้ว`);
      setTimeout(() => setSaveToast(null), 2500);
    },
    [getFieldFontSize, getFieldCoordinates, onUpdateFontSize]
  );

  // Update field position locally and trigger callback
  const updatePosition = useCallback(
    (fieldKey: EditableFieldKey, newX: number, newY: number) => {
      // Clamp within boundaries
      const clampedX = Math.round(Math.max(0, Math.min(widthMm - 5, newX)) * 10) / 10;
      const clampedY = Math.round(Math.max(0, Math.min(heightMm - 5, newY)) * 10) / 10;

      setLiveConfig((prev) => {
        const next = { ...prev, fields: { ...prev.fields } };
        if (fieldKey === 'crossing') {
          next.crossing = {
            ...(next.crossing || { typeDefault: 'NONE' }),
            x: clampedX,
            y: clampedY,
          };
        } else if (fieldKey === 'strikeBearer') {
          next.strikeBearer = {
            ...(next.strikeBearer || { widthMm: 16, enabledDefault: true }),
            x: clampedX,
            y: clampedY,
          };
        } else {
          const currentFont = getFieldFontSize(fieldKey);
          const existing = (next.fields as any)[fieldKey] || {
            x: clampedX,
            y: clampedY,
            fontSizePt: currentFont,
          };
          (next.fields as any)[fieldKey] = {
            ...existing,
            x: clampedX,
            y: clampedY,
          };
        }
        return next;
      });

      setHasUnsavedChanges(true);

      if (onUpdateFieldPosition) {
        onUpdateFieldPosition(fieldKey, clampedX, clampedY);
      }
    },
    [widthMm, heightMm, onUpdateFieldPosition, getFieldFontSize]
  );

  // Mouse / Touch Drag Start
  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    fieldKey: EditableFieldKey
  ) => {
    e.stopPropagation();
    setSelectedField(fieldKey);
    setDragField(fieldKey);
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentCoords = getFieldCoordinates(fieldKey);

    setDragStart({
      clientX,
      clientY,
      initialX: currentCoords.x,
      initialY: currentCoords.y,
    });
  };

  // Global mouse / touch move during drag
  const handleGlobalMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragField || !dragStart || !paperRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const rect = paperRef.current.getBoundingClientRect();
      const pxPerMmX = rect.width / widthMm;
      const pxPerMmY = rect.height / heightMm;

      const deltaPxX = clientX - dragStart.clientX;
      const deltaPxY = clientY - dragStart.clientY;

      const deltaMmX = deltaPxX / pxPerMmX;
      const deltaMmY = deltaPxY / pxPerMmY;

      // 0.5mm step snap (0.1mm if Shift held)
      const isFine = 'shiftKey' in e && (e as MouseEvent).shiftKey;
      const snapStep = isFine ? 0.1 : 0.5;

      const nextX = Math.round((dragStart.initialX + deltaMmX) / snapStep) * snapStep;
      const nextY = Math.round((dragStart.initialY + deltaMmY) / snapStep) * snapStep;

      updatePosition(dragField, nextX, nextY);
    },
    [isDragging, dragField, dragStart, widthMm, heightMm, updatePosition]
  );

  const handleGlobalEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragField(null);
      setDragStart(null);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchmove', handleGlobalMove);
      window.addEventListener('touchend', handleGlobalEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, handleGlobalMove, handleGlobalEnd]);

  // Keyboard arrow keys fine-tuning
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedField) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.5;
        const current = getFieldCoordinates(selectedField);
        let nextX = current.x;
        let nextY = current.y;

        if (e.key === 'ArrowLeft') nextX -= step;
        if (e.key === 'ArrowRight') nextX += step;
        if (e.key === 'ArrowUp') nextY -= step;
        if (e.key === 'ArrowDown') nextY += step;

        updatePosition(selectedField, nextX, nextY);
      }

      // Font size shortcuts: + or = to increase, - or _ to decrease
      if (['+', '=', '-', '_'].includes(e.key) && selectedField !== 'crossing' && selectedField !== 'strikeBearer') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        e.preventDefault();
        const currentSize = getFieldFontSize(selectedField);
        if (e.key === '+' || e.key === '=') {
          updateFontSize(selectedField, currentSize + 0.5);
        } else if (e.key === '-' || e.key === '_') {
          updateFontSize(selectedField, currentSize - 0.5);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedField, getFieldCoordinates, getFieldFontSize, updatePosition, updateFontSize]);

  // Save current adjusted coordinates
  const handleSave = () => {
    if (onSaveConfig) {
      onSaveConfig(liveConfig);
    } else if (currentUser) {
      StorageService.saveTemplate(liveConfig, currentUser);
    }
    setHasUnsavedChanges(false);
    setSaveToast('บันทึกพิกัดแม่แบบเช็คเรียบร้อยแล้ว!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Revert back to original config
  const handleResetToConfig = () => {
    setLiveConfig(JSON.parse(JSON.stringify(config)));
    setHasUnsavedChanges(false);
    setSaveToast('คืนค่าพิกัดตามแม่แบบเดิมแล้ว');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handlePrintTest = () => {
    window.print();
  };

  if (!isOpen) return null;

  const currentSelectedCoords = getFieldCoordinates(selectedField);

  const fieldOptions: { key: EditableFieldKey; label: string; icon: string }[] = [
    { key: 'payee', label: 'ผู้รับเงิน (จุด 1)', icon: '👤' },
    { key: 'payee2', label: 'ผู้รับเงิน (จุด 2)', icon: '👤' },
    { key: 'amountNumber', label: 'ตัวเลข (จุด 1)', icon: '🔢' },
    { key: 'amountNumber2', label: 'ตัวเลข (จุด 2)', icon: '🔢' },
    { key: 'amountNumber3', label: 'ตัวเลข (จุด 3)', icon: '🔢' },
    { key: 'amountText', label: 'จำนวนเงินอักษร', icon: '🔤' },
    { key: 'date', label: 'วันที่ (ค่าเดิมไม่พิมพ์)', icon: '📅' },
    { key: 'crossing', label: 'ขีดคร่อม (Crossing)', icon: '💳' },
    { key: 'strikeBearer', label: 'ขีดฆ่าหรือผู้ถือ', icon: '✂️' },
  ];

  // Floating Interactive Badge on Canvas for Selected Field
  const renderFieldBadge = (fieldKey: EditableFieldKey) => {
    if (selectedField !== fieldKey) return null;
    const coords = getFieldCoordinates(fieldKey);
    const size = getFieldFontSize(fieldKey);
    const isSpecial = fieldKey === 'crossing' || fieldKey === 'strikeBearer';

    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute -top-7 left-0 px-2 py-0.5 bg-slate-900/95 text-white text-[9px] font-mono rounded-md font-bold shadow-xl whitespace-nowrap z-50 flex items-center gap-1.5 border border-amber-400 ring-2 ring-red-500/40 select-none pointer-events-auto"
      >
        <span className="text-slate-200">X:{coords.x} Y:{coords.y}</span>
        {!isSpecial && (
          <>
            <span className="text-amber-300 font-black">| 🔤 {size}pt</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateFontSize(fieldKey, size - 0.5);
              }}
              className="w-4 h-4 bg-slate-800 hover:bg-red-700 text-white rounded flex items-center justify-center font-bold text-[10px] cursor-pointer transition-colors active:scale-90"
              title="ลดขนาดฟอนต์ 0.5 pt"
            >
              -
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateFontSize(fieldKey, size + 0.5);
              }}
              className="w-4 h-4 bg-slate-800 hover:bg-emerald-600 text-white rounded flex items-center justify-center font-bold text-white text-[10px] cursor-pointer transition-colors active:scale-90"
              title="เพิ่มขนาดฟอนต์ 0.5 pt"
            >
              +
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200 font-sans">
      
      {/* Top Header Bar */}
      <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-700 text-white rounded-xl shadow-xs shrink-0">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>จำลองเช็คขนาดจริง 100% (1:1 Physical Scale)</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {liveConfig.bankNameThai} ({widthMm} × {heightMm} มม. / {widthCm} × {heightCm} ซม.)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                <Move className="w-3 h-3" />
                <span>คลิกและลากขยับตำแหน่งได้ทันที</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              📐 สเกล 1:1 เทียบเท่าเช็คกระดาษจริง นำเช็คมาทาบหน้าจอ หรือคลิกลากขยับตัวหนังสือแล้วกดบันทึกพิกัดได้เลย
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer"
              title="ย่อขนาด"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.0)}
              className={`px-2 py-1 font-mono font-bold rounded-lg cursor-pointer ${
                zoom === 1.0 ? 'bg-red-700 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="กลับสู่สเกลจริง 100% 1:1"
            >
              {Math.round(zoom * 100)}% {zoom === 1.0 ? '(ขนาดจริง)' : ''}
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer"
              title="ขยายขนาด"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle background image */}
          <button
            type="button"
            onClick={() => setShowBgImage(!showBgImage)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              showBgImage
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showBgImage ? 'แสดงรูปเช็ค' : 'ซ่อนรูปเช็ค'}</span>
          </button>

          {/* Revert button if changed */}
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleResetToConfig}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="ยกเลิกการขยับและคืนค่าเดิม"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเดิม</span>
            </button>
          )}

          {/* Save Coordinates Button */}
          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer ring-2 ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-emerald-400 animate-pulse'
                : 'bg-red-700 hover:bg-red-800 text-white ring-red-400/80'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>💾 บันทึกพิกัด {hasUnsavedChanges ? '(มีพิกัดใหม่)' : ''}</span>
          </button>

          {/* Print Test button */}
          <button
            type="button"
            onClick={handlePrintTest}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="พิมพ์ลงกระดาษจริงเพื่อทาบตำแหน่ง"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ทดสอบ</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="absolute top-18 right-8 z-50 p-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Sub-bar: Field Selector Pills & Precision Nudge Controls */}
      <div className="px-5 py-2.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-red-400" />
            <span>เลือกข้อความที่จะขยับ:</span>
          </span>
          {fieldOptions.map((f) => {
            const isSelected = selectedField === f.key;
            const coords = getFieldCoordinates(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedField(f.key)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-red-700 text-white border-red-500 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                <span className={`text-[10px] font-mono ml-0.5 opacity-80 ${isSelected ? 'text-red-100' : 'text-slate-400'}`}>
                  ({coords.x}, {coords.y})
                </span>
              </button>
            );
          })}
        </div>

        {/* Nudge Controls for Selected Field */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl">
          <span className="text-slate-300 font-bold">
            พิกัด <strong className="text-red-400">{fieldOptions.find((f) => f.key === selectedField)?.label}</strong>:
          </span>
          <span className="text-amber-300 font-mono font-extrabold text-xs">
            X: {currentSelectedCoords.x} mm, Y: {currentSelectedCoords.y} mm
          </span>

          <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
            {/* Left */}
            <button
              type="button"
              onClick={() => updatePosition(selectedField, currentSelectedCoords.x - 0.5, currentSelectedCoords.y)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="เลื่อนซ้าย 0.5 มม."
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Right */}
            <button
              type="button"
              onClick={() => updatePosition(selectedField, currentSelectedCoords.x + 0.5, currentSelectedCoords.y)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="เลื่อนขวา 0.5 มม."
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Up */}
            <button
              type="button"
              onClick={() => updatePosition(selectedField, currentSelectedCoords.x, currentSelectedCoords.y - 0.5)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="เลื่อนขึ้น 0.5 มม."
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            {/* Down */}
            <button
              type="button"
              onClick={() => updatePosition(selectedField, currentSelectedCoords.x, currentSelectedCoords.y + 0.5)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="เลื่อนลง 0.5 มม."
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] text-slate-400 hidden xl:inline">(หรือกดปุ่มลูกศรบนคีย์บอร์ด)</span>
        </div>

        {/* Font Size Controls for Selected Field & All-Fields Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedField !== 'crossing' && selectedField !== 'strikeBearer' && (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <span>🔤 ขนาด Font <strong className="text-amber-400">({fieldOptions.find((f) => f.key === selectedField)?.label.split(' ')[0]})</strong>:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateFontSize(selectedField, getFieldFontSize(selectedField) - 0.5)}
                  className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-200 hover:text-white font-bold text-xs cursor-pointer active:scale-95"
                  title="ลดขนาดฟอนต์ 0.5 pt (หรือกด - บนคีย์บอร์ด)"
                >
                  -
                </button>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.5"
                    min="6"
                    max="28"
                    value={getFieldFontSize(selectedField)}
                    onChange={(e) => updateFontSize(selectedField, parseFloat(e.target.value) || 12)}
                    className="w-13 text-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-red-500"
                  />
                  <span className="text-slate-400 text-[10px] ml-1">pt</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateFontSize(selectedField, getFieldFontSize(selectedField) + 0.5)}
                  className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-200 hover:text-white font-bold text-xs cursor-pointer active:scale-95"
                  title="เพิ่มขนาดฟอนต์ 0.5 pt (หรือกด + บนคีย์บอร์ด)"
                >
                  +
                </button>
              </div>

              {/* Quick preset buttons */}
              <div className="hidden sm:flex items-center gap-1 border-l border-slate-700 pl-2">
                {[8, 9, 10, 11, 12, 13, 14, 16, 18].map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => updateFontSize(selectedField, pt)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      getFieldFontSize(selectedField) === pt
                        ? 'bg-red-700 text-white font-bold'
                        : 'bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={`ตั้งขนาด ${pt} pt`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Batch Scale All Fonts Tool */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
            <span className="text-slate-400 font-bold text-[11px] mr-1 hidden md:inline">
              ปรับทุกช่อง:
            </span>
            <button
              type="button"
              onClick={() => scaleAllFonts(-0.5)}
              className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-[10.5px] font-bold rounded cursor-pointer transition-colors"
              title="ลดขนาดตัวอักษรทุกช่องพร้อมกัน 0.5 pt"
            >
              - 0.5pt ทุกช่อง
            </button>
            <button
              type="button"
              onClick={() => scaleAllFonts(0.5)}
              className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-[10.5px] font-bold rounded cursor-pointer transition-colors"
              title="เพิ่มขนาดตัวอักษรทุกช่องพร้อมกัน 0.5 pt"
            >
              + 0.5pt ทุกช่อง
            </button>
          </div>

          {/* Toggle All Font Sizes Table Drawer */}
          <button
            type="button"
            onClick={() => setShowFontSizeTable(!showFontSizeTable)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
              showFontSizeTable
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="เปิดตารางดูและปรับขนาด Font ทุกตำแหน่งพร้อมกัน"
          >
            <Type className="w-3.5 h-3.5" />
            <span>ตารางขนาดฟอนต์</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area with Physical Millimeter Rulers */}
      <div className="flex-1 overflow-auto p-6 sm:p-10 flex flex-col items-center justify-center bg-slate-900/90 relative select-none">
        
        {/* Floating All Font Sizes Drawer */}
        {showFontSizeTable && (
          <div className="absolute top-4 right-4 sm:right-6 z-50 bg-slate-900/95 border-2 border-amber-400 rounded-2xl p-4 text-white shadow-2xl w-84 sm:w-92 max-h-[80vh] overflow-y-auto backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-700">
              <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
                <Type className="w-4 h-4" />
                <span>ตารางปรับขนาดฟอนต์ทุกตำแหน่ง (pt)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFontSizeTable(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 mb-3">
              ปรับขนาดฟอนต์แต่ละช่องได้ทันที และผลจะสะท้อนบนเช็คขนาดจริง 100% ทันที:
            </p>

            <div className="space-y-2.5">
              {[
                { key: 'payee' as EditableFieldKey, label: 'ชื่อผู้รับเงิน (จุด 1)' },
                { key: 'payee2' as EditableFieldKey, label: 'ชื่อผู้รับเงิน (จุด 2)' },
                { key: 'amountText' as EditableFieldKey, label: 'จำนวนเงินอักษร' },
                { key: 'amountNumber' as EditableFieldKey, label: 'จำนวนเงินตัวเลข (จุด 1)' },
                { key: 'amountNumber2' as EditableFieldKey, label: 'จำนวนเงินตัวเลข (จุด 2)' },
                { key: 'amountNumber3' as EditableFieldKey, label: 'จำนวนเงินตัวเลข (จุด 3)' },
                { key: 'date' as EditableFieldKey, label: 'วันที่ (ถ้าเปิดพิมพ์)' },
              ].map((f) => {
                const currentSize = getFieldFontSize(f.key);
                const isSelected = selectedField === f.key;
                return (
                  <div
                    key={f.key}
                    onClick={() => setSelectedField(f.key)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/60 border-red-500 ring-1 ring-red-400'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-200">{f.label}</span>
                      <span className="text-amber-300 font-mono font-black text-xs">{currentSize} pt</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateFontSize(f.key, currentSize - 0.5);
                          }}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.5"
                          min="6"
                          max="28"
                          value={currentSize}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateFontSize(f.key, parseFloat(e.target.value) || 12)}
                          className="w-13 text-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs font-mono font-bold text-amber-300"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateFontSize(f.key, currentSize + 0.5);
                          }}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {[10, 11, 12, 14].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateFontSize(f.key, pt);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                              currentSize === pt
                                ? 'bg-red-700 text-white font-bold'
                                : 'bg-slate-700/60 text-slate-400 hover:text-white'
                            }`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">ปรับทุกช่อง:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scaleAllFonts(-0.5)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer"
                >
                  - 0.5pt ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => scaleAllFonts(0.5)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer"
                >
                  + 0.5pt ทั้งหมด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruction pill */}
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-950/60 border border-amber-800/60 px-3.5 py-1.5 rounded-xl shadow-xs">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            💡 <strong>วิธีขยับและปรับขนาด:</strong> คลิกที่ตัวหนังสือเพื่อลากเมาส์ขยับตำแหน่ง · ปรับขนาด Font ได้จากแถบด้านบนหรือกด <strong>+ / -</strong> บนคีย์บอร์ด · กด <strong>"💾 บันทึกพิกัด"</strong> เพื่อนำไปใช้พิมพ์จริง
          </span>
        </div>

        {/* Cheque Wrapper with Scaled Transform */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease',
          }}
          className="relative shrink-0 shadow-2xl rounded-sm"
        >
          {/* Top Millimeter Ruler */}
          <div
            style={{ width: `${widthMm}mm` }}
            className="h-6 bg-slate-800 border-x border-t border-slate-700 text-[8px] font-mono text-slate-400 flex items-end justify-between px-1 select-none pointer-events-none"
          >
            {Array.from({ length: Math.floor(widthMm / 10) + 1 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center" style={{ width: '10mm' }}>
                <span className="text-[7.5px] text-slate-400">{i * 10}</span>
                <div className="w-[1px] h-2 bg-slate-500 mt-0.5" />
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Left Millimeter Ruler */}
            <div
              style={{ height: `${heightMm}mm` }}
              className="w-6 bg-slate-800 border-y border-l border-slate-700 text-[8px] font-mono text-slate-400 flex flex-col justify-between py-1 select-none pointer-events-none shrink-0"
            >
              {Array.from({ length: Math.floor(heightMm / 10) + 1 }).map((_, i) => (
                <div key={i} className="flex items-center justify-end pr-1" style={{ height: '10mm' }}>
                  <span className="text-[7.5px] text-slate-400 mr-1">{i * 10}</span>
                  <div className="h-[1px] w-2 bg-slate-500" />
                </div>
              ))}
            </div>

            {/* Cheque Paper Body (Actual Millimeters in CSS) */}
            <div
              ref={paperRef}
              style={{
                width: `${widthMm}mm`,
                height: `${heightMm}mm`,
              }}
              className="bg-white border-2 border-slate-500 relative overflow-hidden text-black select-none shadow-xl cursor-crosshair"
            >
              {/* Background Guide */}
              {showBgImage ? (
                <div style={{ opacity: bgOpacity }} className="absolute inset-0 w-full h-full pointer-events-none">
                  <ChequeBackground
                    bankType={liveConfig.bankType}
                    customImageUrl={liveConfig.customBgImageUrl}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-white pointer-events-none">
                  {/* Left stub guide */}
                  <div className="absolute top-0 bottom-0 left-0 w-[15.5%] border-r-2 border-dashed border-slate-300 p-2 text-[7px] text-slate-400">
                    <span className="font-bold">ต้นขั้วเช็ค (Stub)</span>
                  </div>
                </div>
              )}

              {/* Crosshair guidelines on active field */}
              {showRulerGuides && (
                <>
                  <div
                    style={{
                      left: `${currentSelectedCoords.x + (liveConfig.globalOffsetX || 0)}mm`,
                    }}
                    className="absolute top-0 bottom-0 w-[1px] border-l border-dashed border-red-500/50 pointer-events-none z-30"
                  />
                  <div
                    style={{
                      top: `${currentSelectedCoords.y + (liveConfig.globalOffsetY || 0)}mm`,
                    }}
                    className="absolute left-0 right-0 h-[1px] border-t border-dashed border-red-500/50 pointer-events-none z-30"
                  />
                </>
              )}

              {/* ========================================================= */}
              {/* 1. Date Field (Draggable) */}
              {/* ========================================================= */}
              <div
                onMouseDown={(e) => handleStartDrag(e, 'date')}
                onTouchStart={(e) => handleStartDrag(e, 'date')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedField('date');
                }}
                style={{
                  left: `${liveConfig.fields.date.x + (liveConfig.globalOffsetX || 0)}mm`,
                  top: `${liveConfig.fields.date.y + (liveConfig.globalOffsetY || 0)}mm`,
                  fontSize: `${liveConfig.fields.date.fontSizePt}pt`,
                  letterSpacing: `${liveConfig.fields.date.letterSpacingMm || 2.2}mm`,
                }}
                className={`absolute whitespace-nowrap font-bold text-slate-900 leading-none z-20 cursor-move p-1 rounded-sm transition-shadow ${
                  selectedField === 'date'
                    ? 'ring-2 ring-red-600 bg-red-100/70 text-red-950 shadow-md'
                    : 'hover:ring-1 hover:ring-red-400/80 hover:bg-red-50/50'
                } ${liveConfig.hideDateDefault || liveConfig.fields.date.enabled === false ? 'opacity-40 line-through decoration-red-500' : ''}`}
                title="ลากเพื่อย้ายพิกัดวันที่ (Date) [ปกติถูกตั้งไม่ให้พิมพ์ตามคำสั่ง]"
              >
                02  10  2569
                {liveConfig.hideDateDefault && (
                  <span className="ml-1 text-[8px] font-sans no-underline text-red-600 font-bold bg-white/90 px-1 rounded">
                    (ซ่อนไม่พิมพ์)
                  </span>
                )}
                {renderFieldBadge('date')}
              </div>

              {/* ========================================================= */}
              {/* 2. Payee Field 1 (Draggable) */}
              {/* ========================================================= */}
              <div
                onMouseDown={(e) => handleStartDrag(e, 'payee')}
                onTouchStart={(e) => handleStartDrag(e, 'payee')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedField('payee');
                }}
                style={{
                  left: `${liveConfig.fields.payee.x + (liveConfig.globalOffsetX || 0)}mm`,
                  top: `${liveConfig.fields.payee.y + (liveConfig.globalOffsetY || 0)}mm`,
                  fontSize: `${liveConfig.fields.payee.fontSizePt}pt`,
                }}
                className={`absolute whitespace-nowrap font-bold text-slate-900 leading-none z-20 cursor-move p-1 rounded-sm transition-shadow ${
                  selectedField === 'payee'
                    ? 'ring-2 ring-red-600 bg-red-100/70 text-red-950 shadow-md'
                    : 'hover:ring-1 hover:ring-red-400/80 hover:bg-red-50/50'
                }`}
                title="ลากเพื่อย้ายพิกัดชื่อผู้รับเงิน จุดที่ 1 (Payee 1)"
              >
                บริษัท ตัวอย่างเจริญพาณิชย์ จำกัด (จุด 1)
                {renderFieldBadge('payee')}
              </div>

              {/* ========================================================= */}
              {/* 2.1. Payee Field 2 (Draggable - จุดที่ 2 ปรับแยกกันได้) */}
              {/* ========================================================= */}
              {liveConfig.fields.payee2 && (
                <div
                  onMouseDown={(e) => handleStartDrag(e, 'payee2')}
                  onTouchStart={(e) => handleStartDrag(e, 'payee2')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField('payee2');
                  }}
                  style={{
                    left: `${liveConfig.fields.payee2.x + (liveConfig.globalOffsetX || 0)}mm`,
                    top: `${liveConfig.fields.payee2.y + (liveConfig.globalOffsetY || 0)}mm`,
                    fontSize: `${liveConfig.fields.payee2.fontSizePt}pt`,
                  }}
                  className={`absolute whitespace-nowrap font-bold text-slate-900 leading-none z-20 cursor-move p-1 rounded-sm transition-shadow ${
                    selectedField === 'payee2'
                      ? 'ring-2 ring-blue-600 bg-blue-100/70 text-blue-950 shadow-md'
                      : 'hover:ring-1 hover:ring-blue-400/80 hover:bg-blue-50/50'
                  }`}
                  title="ลากเพื่อย้ายพิกัดชื่อผู้รับเงิน จุดที่ 2 (Payee 2)"
                >
                  บริษัท ตัวอย่างเจริญพาณิชย์ จำกัด (จุด 2)
                  {renderFieldBadge('payee2')}
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. Amount Text Field (Draggable) */}
              {/* ========================================================= */}
              <div
                onMouseDown={(e) => handleStartDrag(e, 'amountText')}
                onTouchStart={(e) => handleStartDrag(e, 'amountText')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedField('amountText');
                }}
                style={{
                  left: `${liveConfig.fields.amountText.x + (liveConfig.globalOffsetX || 0)}mm`,
                  top: `${liveConfig.fields.amountText.y + (liveConfig.globalOffsetY || 0)}mm`,
                  fontSize: `${liveConfig.fields.amountText.fontSizePt}pt`,
                }}
                className={`absolute whitespace-nowrap font-bold text-slate-900 leading-none z-20 cursor-move p-1 rounded-sm transition-shadow ${
                  selectedField === 'amountText'
                    ? 'ring-2 ring-red-600 bg-red-100/70 text-red-950 shadow-md'
                    : 'hover:ring-1 hover:ring-red-400/80 hover:bg-red-50/50'
                }`}
                title="ลากเพื่อย้ายพิกัดจำนวนเงินตัวอักษร"
              >
                ( =สองหมื่นห้าพันเจ็ดร้อยห้าสิบบาทถ้วน= )
                {renderFieldBadge('amountText')}
              </div>

              {/* ========================================================= */}
              {/* 4. Amount Number Field 1 (Draggable - จุดที่ 1) */}
              {/* ========================================================= */}
              <div
                onMouseDown={(e) => handleStartDrag(e, 'amountNumber')}
                onTouchStart={(e) => handleStartDrag(e, 'amountNumber')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedField('amountNumber');
                }}
                style={{
                  left: `${liveConfig.fields.amountNumber.x + (liveConfig.globalOffsetX || 0)}mm`,
                  top: `${liveConfig.fields.amountNumber.y + (liveConfig.globalOffsetY || 0)}mm`,
                  fontSize: `${liveConfig.fields.amountNumber.fontSizePt}pt`,
                }}
                className={`absolute whitespace-nowrap font-black font-mono text-slate-900 leading-none z-20 tabular-nums cursor-move p-1 rounded-sm transition-shadow ${
                  selectedField === 'amountNumber'
                    ? 'ring-2 ring-red-600 bg-red-100/70 text-red-950 shadow-md'
                    : 'hover:ring-1 hover:ring-red-400/80 hover:bg-red-50/50'
                }`}
                title="ลากเพื่อย้ายพิกัดจำนวนเงินตัวเลข จุดที่ 1"
              >
                *25,750.00* (จุด 1)
                {renderFieldBadge('amountNumber')}
              </div>

              {/* ========================================================= */}
              {/* 4.1. Amount Number Field 2 (Draggable - จุดที่ 2 ปรับแยกกันได้) */}
              {/* ========================================================= */}
              {liveConfig.fields.amountNumber2 && (
                <div
                  onMouseDown={(e) => handleStartDrag(e, 'amountNumber2')}
                  onTouchStart={(e) => handleStartDrag(e, 'amountNumber2')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField('amountNumber2');
                  }}
                  style={{
                    left: `${liveConfig.fields.amountNumber2.x + (liveConfig.globalOffsetX || 0)}mm`,
                    top: `${liveConfig.fields.amountNumber2.y + (liveConfig.globalOffsetY || 0)}mm`,
                    fontSize: `${liveConfig.fields.amountNumber2.fontSizePt}pt`,
                  }}
                  className={`absolute whitespace-nowrap font-black font-mono text-slate-900 leading-none z-20 tabular-nums cursor-move p-1 rounded-sm transition-shadow ${
                    selectedField === 'amountNumber2'
                      ? 'ring-2 ring-emerald-600 bg-emerald-100/70 text-emerald-950 shadow-md'
                      : 'hover:ring-1 hover:ring-emerald-400/80 hover:bg-emerald-50/50'
                  }`}
                  title="ลากเพื่อย้ายพิกัดจำนวนเงินตัวเลข จุดที่ 2"
                >
                  *25,750.00* (จุด 2)
                  {renderFieldBadge('amountNumber2')}
                </div>
              )}

              {/* ========================================================= */}
              {/* 4.2. Amount Number Field 3 (Draggable - จุดที่ 3 ปรับแยกกันได้) */}
              {/* ========================================================= */}
              {liveConfig.fields.amountNumber3 && (
                <div
                  onMouseDown={(e) => handleStartDrag(e, 'amountNumber3')}
                  onTouchStart={(e) => handleStartDrag(e, 'amountNumber3')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField('amountNumber3');
                  }}
                  style={{
                    left: `${liveConfig.fields.amountNumber3.x + (liveConfig.globalOffsetX || 0)}mm`,
                    top: `${liveConfig.fields.amountNumber3.y + (liveConfig.globalOffsetY || 0)}mm`,
                    fontSize: `${liveConfig.fields.amountNumber3.fontSizePt}pt`,
                  }}
                  className={`absolute whitespace-nowrap font-black font-mono text-slate-900 leading-none z-20 tabular-nums cursor-move p-1 rounded-sm transition-shadow ${
                    selectedField === 'amountNumber3'
                      ? 'ring-2 ring-purple-600 bg-purple-100/70 text-purple-950 shadow-md'
                      : 'hover:ring-1 hover:ring-purple-400/80 hover:bg-purple-50/50'
                  }`}
                  title="ลากเพื่อย้ายพิกัดจำนวนเงินตัวเลข จุดที่ 3"
                >
                  *25,750.00* (จุด 3)
                  {renderFieldBadge('amountNumber3')}
                </div>
              )}

              {/* ========================================================= */}
              {/* 5. Crossing Preview (Draggable) */}
              {/* ========================================================= */}
              {liveConfig.crossing && (
                <div
                  onMouseDown={(e) => handleStartDrag(e, 'crossing')}
                  onTouchStart={(e) => handleStartDrag(e, 'crossing')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField('crossing');
                  }}
                  style={{
                    left: `${liveConfig.crossing.x + (liveConfig.globalOffsetX || 0)}mm`,
                    top: `${liveConfig.crossing.y + (liveConfig.globalOffsetY || 0)}mm`,
                  }}
                  className={`absolute z-20 cursor-move -rotate-12 border-y-2 border-red-600 px-2 py-0.5 text-center bg-white/60 select-none ${
                    selectedField === 'crossing'
                      ? 'ring-2 ring-red-600 bg-red-100 shadow-md'
                      : 'hover:ring-1 hover:ring-red-400'
                  }`}
                  title="ลากเพื่อย้ายเส้นขีดคร่อม (Crossing)"
                >
                  <span className="text-[8pt] font-black text-red-700 font-mono tracking-wider whitespace-nowrap block">
                    {liveConfig.crossing.typeDefault === 'AND_CO' ? '// & CO. //' : '// A/C PAYEE ONLY //'}
                  </span>
                  {renderFieldBadge('crossing')}
                </div>
              )}

              {/* ========================================================= */}
              {/* 6. Strike Bearer Preview (Draggable) */}
              {/* ========================================================= */}
              {liveConfig.strikeBearer && (
                <div
                  onMouseDown={(e) => handleStartDrag(e, 'strikeBearer')}
                  onTouchStart={(e) => handleStartDrag(e, 'strikeBearer')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField('strikeBearer');
                  }}
                  style={{
                    left: `${liveConfig.strikeBearer.x + (liveConfig.globalOffsetX || 0)}mm`,
                    top: `${liveConfig.strikeBearer.y + (liveConfig.globalOffsetY || 0)}mm`,
                    width: `${liveConfig.strikeBearer.widthMm || 16}mm`,
                  }}
                  className={`absolute z-20 cursor-move flex flex-col justify-center py-1 select-none ${
                    selectedField === 'strikeBearer'
                      ? 'ring-2 ring-red-600 bg-red-100/60'
                      : 'hover:ring-1 hover:ring-red-400'
                  }`}
                  title="ลากเพื่อย้ายเส้นขีดฆ่าหรือผู้ถือ"
                >
                  <div className="w-full h-[2px] bg-red-600 mb-[2px]" />
                  <div className="w-full h-[2px] bg-red-600" />
                  {renderFieldBadge('strikeBearer')}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>ขนาดเช็คจริง: {widthMm} × {heightMm} มม. ({widthCm} × {heightCm} ซม.)</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>ผู้รับเงิน: (X: {liveConfig.fields.payee.x}, Y: {liveConfig.fields.payee.y})</span>
          <span className="text-slate-600">|</span>
          <span>วันที่: (X: {liveConfig.fields.date.x}, Y: {liveConfig.fields.date.y})</span>
          <span className="text-slate-600">|</span>
          <span>ขีดคร่อม: (X: {liveConfig.crossing?.x || 45}, Y: {liveConfig.crossing?.y || 8})</span>
          <span className="text-slate-600">|</span>
          <span>ขีดฆ่า: (X: {liveConfig.strikeBearer?.x || 214}, Y: {liveConfig.strikeBearer?.y || 27.5})</span>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกพิกัดก่อนปิด</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
