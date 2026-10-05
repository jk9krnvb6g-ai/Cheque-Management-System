import React, { useState } from 'react';
import { BankTemplateConfig, BankType, Cheque, CrossingType, FeedDirection, User } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate, formatThaiDateTime, formatChequePrintDate, getTodayISODate } from '../utils/dateUtils';
import { ChequeBackground } from './ChequeBackground';
import { ZoomController } from './ZoomController';
import { AddTemplateModal } from './AddTemplateModal';
import { PrinterFeedGuide, FEED_DIRECTION_LABELS } from './PrinterFeedGuide';
import {
  Printer,
  X,
  AlertTriangle,
  History,
  Sliders,
  CheckCircle2,
  FileText,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ChequePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: Cheque;
  batchCheques?: Cheque[];
  currentUser: User;
  onPrintSuccess: (chequeId: string) => void;
  onOpenHistory: (cheque: Cheque) => void;
  onOpenPaymentVoucher?: (cheque: Cheque) => void;
}

const REPRINT_REASONS = [
  'เช็คพิมพ์ผิด',
  'กระดาษติด',
  'ตำแหน่งพิมพ์ไม่ตรง',
  'เช็คเสีย',
  'แก้ไขข้อมูล',
  'อื่น ๆ',
];

export const ChequePrintModal: React.FC<ChequePrintModalProps> = ({
  isOpen,
  onClose,
  cheque,
  batchCheques,
  currentUser,
  onPrintSuccess,
  onOpenHistory,
  onOpenPaymentVoucher,
}) => {
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const activeCheque = batchCheques && batchCheques.length > 0 ? (batchCheques[batchIndex] || cheque) : cheque;

  const [selectedBank, setSelectedBank] = useState<BankType>(activeCheque.lastBankType || 'KTB');
  const [templates, setTemplates] = useState<Record<BankType, BankTemplateConfig>>(StorageService.getTemplates());
  
  // Offset controls for immediate printer calibration
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  
  // Cheque Number & Cheque Date for printing
  const [chequeNumber, setChequeNumber] = useState<string>(activeCheque.chequeNumber || '');
  const [chequeDate, setChequeDate] = useState<string>(activeCheque.chequeDate || activeCheque.stubDate || getTodayISODate());
  const [printDate, setPrintDate] = useState<boolean>(false); // ค่าเดิม: วันที่พิมพ์เช็คไม่ต้องแสดง
  const [feedDirection, setFeedDirection] = useState<FeedDirection>('LANDSCAPE_NORMAL');
  const [rotatePreviewMatchingFeed, setRotatePreviewMatchingFeed] = useState<boolean>(false);

  // Zoom & Scale Control (Default 100% 1:1 scale)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState<boolean>(false);

  // Cheque Options (Strike "หรือผู้ถือ" & Crossing)
  const [strikeBearer, setStrikeBearer] = useState<boolean>(true);
  const [crossingType, setCrossingType] = useState<CrossingType>('NONE');

  // UI Controls
  const [showBackgroundGuide, setShowBackgroundGuide] = useState<boolean>(true);
  const [confirmedReprint, setConfirmedReprint] = useState<boolean>(activeCheque.printCount === 0);
  const [reprintReason, setReprintReason] = useState<string>(REPRINT_REASONS[0]);
  const [reprintOtherNote, setReprintOtherNote] = useState<string>('');
  const [isTestPrint, setIsTestPrint] = useState<boolean>(false);
  const [isSavedOffset, setIsSavedOffset] = useState<boolean>(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false); // Easy/Simple view by default

  // Initialize offset and fields when template, bank, or activeCheque changes
  React.useEffect(() => {
    if (isOpen) {
      const currentTemplates = StorageService.getTemplates();
      setTemplates(currentTemplates);
      const bankConf = currentTemplates[selectedBank] || Object.values(currentTemplates)[0];
      if (bankConf) {
        setOffsetX(bankConf.globalOffsetX || 0);
        setOffsetY(bankConf.globalOffsetY || 0);
        if (bankConf.strikeBearer) {
          setStrikeBearer(bankConf.strikeBearer.enabledDefault ?? true);
        }
        if (bankConf.crossing) {
          setCrossingType(bankConf.crossing.typeDefault || 'NONE');
        }
        setPrintDate(!bankConf.hideDateDefault && bankConf.fields?.date?.enabled === true);
        const currentDir = bankConf.feedDirection || 'LANDSCAPE_NORMAL';
        setFeedDirection(currentDir);
        setRotatePreviewMatchingFeed(currentDir === 'PORTRAIT_TOP' || currentDir === 'PORTRAIT_BOTTOM');
      }
      setConfirmedReprint(activeCheque.printCount === 0);
      setIsTestPrint(false);
      setIsSavedOffset(false);
      setZoomLevel(1.0); // Reset zoom to 100% on open

      // Update cheque number & date
      if (activeCheque.chequeNumber) {
        setChequeNumber(activeCheque.chequeNumber);
      } else if (batchIndex > 0 && chequeNumber && !isNaN(Number(chequeNumber))) {
        // Auto increment next cheque number in batch
        const nextNum = String(Number(chequeNumber) + 1).padStart(chequeNumber.length, '0');
        setChequeNumber(nextNum);
      } else {
        setChequeNumber(activeCheque.chequeNumber || '');
      }
      setChequeDate(activeCheque.chequeDate || activeCheque.stubDate || getTodayISODate());
    }
  }, [isOpen, selectedBank, activeCheque.id, activeCheque.printCount, batchIndex]);

  if (!isOpen) return null;

  const currentTemplate = templates[selectedBank] || Object.values(templates)[0];
  const isReprint = activeCheque.printCount > 0;

  // Handle saving global offset to template settings
  const handleSaveOffset = () => {
    const updated = {
      ...currentTemplate,
      globalOffsetX: offsetX,
      globalOffsetY: offsetY,
    };
    StorageService.saveTemplate(updated, currentUser);
    setTemplates({
      ...templates,
      [selectedBank]: updated,
    });
    setIsSavedOffset(true);
    setTimeout(() => setIsSavedOffset(false), 2500);
  };

  // Nudge offset by delta millimeters
  const nudgeOffset = (dx: number, dy: number) => {
    setOffsetX((prev) => Number((prev + dx).toFixed(1)));
    setOffsetY((prev) => Number((prev + dy).toFixed(1)));
  };

  // Reset selected bank template to system standard defaults
  const handleResetBankDefaults = () => {
    const defaults = StorageService.getDefaultTemplates();
    const def = defaults[selectedBank];
    if (def) {
      StorageService.saveTemplate(def, currentUser);
      setTemplates(StorageService.getTemplates());
      setOffsetX(def.globalOffsetX || 0);
      setOffsetY(def.globalOffsetY || 0);
      setIsSavedOffset(true);
      setTimeout(() => setIsSavedOffset(false), 2500);
    }
  };

  // Perform actual print or A4 Calibration Test print
  const handleExecutePrint = (testMode: boolean = false) => {
    setIsTestPrint(testMode);

    // Apply print mode class to body for CSS targeting
    if (testMode) {
      document.body.classList.add('printing-cheque', 'printing-test-sheet');
    } else {
      document.body.classList.add('printing-cheque');
    }

    // Trigger browser print
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-cheque', 'printing-test-sheet');

      // If this was real print (not test), record the log!
      if (!testMode) {
        const finalReason = isReprint ? (reprintReason === 'อื่น ๆ' ? `อื่น ๆ: ${reprintOtherNote}` : reprintReason) : undefined;
        StorageService.recordPrintLog({
          chequeId: activeCheque.id,
          chequeNumber: chequeNumber.trim() || undefined,
          bankType: selectedBank,
          reprintReason: finalReason,
          reprintNote: reprintOtherNote.trim() || undefined,
          operator: currentUser,
        });

        onPrintSuccess(activeCheque.id);
        if (batchCheques && batchIndex < batchCheques.length - 1) {
          setBatchIndex(batchIndex + 1);
        } else {
          onClose();
        }
      }
    }, 150);
  };

  // Keyboard Shortcuts (Ctrl+P to print, Esc to close, Arrow keys for batch)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleExecutePrint(false);
        return;
      }

      // Escape key to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Batch Navigation with Arrow keys when not focused on an input
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        if (e.key === 'ArrowLeft' && batchCheques && batchIndex > 0) {
          setBatchIndex((prev) => prev - 1);
        } else if (e.key === 'ArrowRight' && batchCheques && batchIndex < batchCheques.length - 1) {
          setBatchIndex((prev) => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, batchIndex, batchCheques, chequeNumber, selectedBank, reprintReason, reprintOtherNote, isReprint, confirmedReprint]);

  // Coordinates converted to mm with offsets
  const getFieldPos = (field: { x: number; y: number }) => {
    return {
      left: `${field.x + offsetX}mm`,
      top: `${field.y + offsetY}mm`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Header with Quick 1-Click Print Button in Red & White Theme */}
        <div className="px-5 py-3.5 border-b border-red-900 bg-red-800 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white text-red-800 rounded-lg shadow-xs font-black">
              <Printer className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ออกและพิมพ์เช็ค — ฎีกาคลังรับ {cheque.dikaNumber}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-900 text-red-100 border border-red-700">
                  {selectedBank} ({currentTemplate.widthMm} × {currentTemplate.heightMm} มม.)
                </span>
              </h2>
              <p className="text-xs text-red-100">
                ผู้รับเงิน: <strong className="text-white">{cheque.chequePayeeName}</strong> · ยอดสั่งจ่ายสุทธิ <strong className="text-white tabular-nums font-bold">{(activeCheque.netPaidAmount || activeCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Shortcut to Payment Voucher */}
            {onOpenPaymentVoucher && (
              <button
                type="button"
                onClick={() => onOpenPaymentVoucher(activeCheque)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-400/50 bg-red-900/60 text-white hover:bg-red-900 transition-all flex items-center gap-1.5 cursor-pointer"
                title="พิมพ์ใบสำคัญจ่ายสำหรับแนบฎีกานี้ต่อทันที"
              >
                <FileText className="w-3.5 h-3.5 text-red-200" />
                <span>📄 ใบสำคัญจ่าย</span>
              </button>
            )}

            {/* View Mode Toggle: Simple vs Advanced */}
            <button
              type="button"
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                isAdvancedMode
                  ? 'bg-red-950 text-amber-300 border-amber-500/50'
                  : 'bg-red-900/80 text-red-100 border-red-700 hover:text-white'
              }`}
              title="สลับระหว่างโหมดใช้งานง่าย และโหมดปรับพิกัดเครื่องพิมพ์ละเอียด"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isAdvancedMode ? '⚙️ ปิดโหมดปรับพิกัด' : '⚙️ ปรับพิกัดมิลลิเมตร'}</span>
            </button>

            {/* QUICK 1-CLICK PRINT BUTTON (PROMINENT AT TOP) */}
            <button
              type="button"
              disabled={isReprint && !confirmedReprint}
              onClick={() => handleExecutePrint(false)}
              className="px-5 py-2 text-xs font-black text-red-900 bg-white hover:bg-red-50 active:scale-95 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none hover:shadow-red-950/50 ring-2 ring-red-300"
              title="คลิกเดียวเพื่อพิมพ์เช็คนี้ลงเครื่องพิมพ์ทันที"
            >
              <Printer className="w-4 h-4 text-red-700" />
              <span>{isReprint ? `🖨️ สั่งพิมพ์เช็คทันที (${activeCheque.printCount + 1})` : `🖨️ สั่งพิมพ์เช็คทันที`}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-red-200 hover:text-white p-1.5 rounded-lg hover:bg-red-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          
          {/* STEP 1: If already printed, show prominent warning and require reprint reason */}
          {isReprint && !confirmedReprint && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-900">
                    ⚠ รายการนี้เคยออกเช็คแล้ว
                  </h3>
                  
                  <div className="mt-2 text-xs text-amber-800 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-amber-100/60 p-3 rounded-lg border border-amber-200">
                    <div>
                      ออกล่าสุด: <strong>{formatThaiDateTime(cheque.lastPrintedAt)}</strong>
                    </div>
                    <div>
                      ผู้ดำเนินการล่าสุด: <strong>{cheque.lastPrintedBy || '-'}</strong>
                    </div>
                    <div>
                      ธนาคารที่ออกล่าสุด: <strong>{cheque.lastBankType || '-'}</strong>
                    </div>
                    <div>
                      จำนวนครั้งที่เคยออกแล้ว: <strong className="text-amber-950 font-bold">{cheque.printCount} ครั้ง</strong>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200/80">
                    <label className="block text-xs font-semibold text-amber-950 mb-1.5">
                      ระบุเหตุผลในการออกเช็คซ้ำ <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                      {REPRINT_REASONS.map((reason) => (
                        <label
                          key={reason}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                            reprintReason === reason
                              ? 'bg-amber-200/80 border-amber-500 text-amber-950 font-semibold'
                              : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="reprintReason"
                            value={reason}
                            checked={reprintReason === reason}
                            onChange={(e) => setReprintReason(e.target.value)}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>{reason}</span>
                        </label>
                      ))}
                    </div>

                    {reprintReason === 'อื่น ๆ' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          required
                          value={reprintOtherNote}
                          onChange={(e) => setReprintOtherNote(e.target.value)}
                          placeholder="กรุณาระบุรายละเอียดเหตุผลเพิ่มเติม..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenHistory(cheque)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>ดูประวัติทั้งหมด</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmedReprint(true)}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      ยืนยันออกเช็คซ้ำ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Bank Selector & Template Dimension Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                เลือกรูปแบบเช็คธนาคาร / แม่แบบ:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {Object.values(templates).map((tpl) => (
                  <button
                    key={tpl.bankType}
                    type="button"
                    onClick={() => setSelectedBank(tpl.bankType)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedBank === tpl.bankType
                        ? 'text-white shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                    style={
                      selectedBank === tpl.bankType
                        ? { backgroundColor: tpl.bankColor || '#0284c7', borderColor: tpl.bankColor || '#0284c7' }
                        : {}
                    }
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedBank === tpl.bankType ? '#ffffff' : (tpl.bankColor || '#0284c7') }}
                    />
                    <span>{tpl.bankType} — {tpl.bankNameThai} ({tpl.widthMm} × {tpl.heightMm} มม.)</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddTemplateModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-dashed border-emerald-500 text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer bg-white"
                  title="สร้างและเพิ่มแม่แบบเช็คใหม่ด้วยตนเอง (กำหนดขนาดและใส่ภาพเช็คได้)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มแม่แบบเช็คใหม่</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBackgroundGuide(!showBackgroundGuide)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="แสดงโครงร่างเช็คเพื่อช่วยกะตำแหน่ง (จะถูกซ่อนอัตโนมัติเมื่อสั่งพิมพ์จริง)"
              >
                {showBackgroundGuide ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{showBackgroundGuide ? 'ซ่อนโครงร่างเช็ค' : 'แสดงโครงร่างเช็ค'}</span>
              </button>
            </div>
          </div>

          {/* STEP 3: Live Offset Calibration Bar (แสดงเฉพาะเมื่อเปิดโหมดปรับพิกัด) */}
          {isAdvancedMode && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>ปรับจูนตำแหน่งพิมพ์ชดเชย (Global Offset สำหรับเครื่องพิมพ์นี้):</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-slate-700 font-medium">แนวนอน (X):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-1 text-center bg-white border border-amber-300 rounded text-xs font-semibold tabular-nums"
                  />
                  <span className="text-slate-500">มม.</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-slate-700 font-medium">แนวตั้ง (Y):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-1 text-center bg-white border border-amber-300 rounded text-xs font-semibold tabular-nums"
                  />
                  <span className="text-slate-500">มม.</span>
                </div>

                {/* Arrow Nudge Buttons (ขยับทีละ 1 มม.) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-[11px] text-amber-900 font-bold px-1">ขยับด่วน:</span>
                  <button
                    type="button"
                    onClick={() => nudgeOffset(-1, 0)}
                    title="ขยับตำแหน่งไปทางซ้าย 1 มิลลิเมตร"
                    className="px-2 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded font-bold cursor-pointer transition-colors"
                  >
                    ⬅ ซ้าย
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeOffset(1, 0)}
                    title="ขยับตำแหน่งไปทางขวา 1 มิลลิเมตร"
                    className="px-2 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded font-bold cursor-pointer transition-colors"
                  >
                    ➡ ขวา
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeOffset(0, -1)}
                    title="ขยับตำแหน่งขึ้น 1 มิลลิเมตร"
                    className="px-2 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded font-bold cursor-pointer transition-colors"
                  >
                    ⬆ ขึ้น
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeOffset(0, 1)}
                    title="ขยับตำแหน่งลง 1 มิลลิเมตร"
                    className="px-2 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded font-bold cursor-pointer transition-colors"
                  >
                    ⬇ ลง
                  </button>
                </div>

                {/* Reset to standard template defaults */}
                <button
                  type="button"
                  onClick={handleResetBankDefaults}
                  title="คืนค่าพิกัดเริ่มต้นมาตรฐานของธนาคารนี้"
                  className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded font-medium transition-colors cursor-pointer"
                >
                  🔄 คืนค่ามาตรฐาน {selectedBank}
                </button>

                <button
                  type="button"
                  onClick={handleSaveOffset}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  {isSavedOffset ? '✓ บันทึกแล้ว' : 'บันทึกเป็นค่าเริ่มต้น'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3.5: Cheque Options Bar (เลขที่เช็ค, วันที่, ขีดฆ่า หรือผู้ถือ & ขีดคร่อมเช็ค & Batch Navigator) */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Cheque Number & Date Inputs */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">เลขที่เช็ค (Cheque No.):</span>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="เช่น 1029301"
                    className="w-28 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {batchCheques && batchCheques.length > 1 && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                      Auto +1
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={printDate}
                      onChange={(e) => setPrintDate(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                    />
                    <span>พิมพ์วันที่บนเช็ค:</span>
                  </label>
                  {printDate ? (
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded italic">
                      (ไม่พิมพ์วันที่ตามข้อกำหนด)
                    </span>
                  )}
                </div>
              </div>

              {/* Tax Info Badge if any */}
              {activeCheque.withholdingTaxAmount && activeCheque.withholdingTaxAmount > 0 ? (
                <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center gap-1.5">
                  <span>หักภาษี {activeCheque.withholdingTaxPercent}% ({activeCheque.withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.)</span>
                  <span className="font-bold text-emerald-700">
                    → สั่งจ่ายสุทธิ {(activeCheque.netPaidAmount || activeCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-4">
                {/* Strike Bearer Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={strikeBearer}
                    onChange={(e) => setStrikeBearer(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>ขีดฆ่าคำว่า "หรือผู้ถือ" (Cross out Bearer)</span>
                </label>

                {/* Crossing Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold">การขีดคร่อมเช็ค:</span>
                  <select
                    value={crossingType}
                    onChange={(e) => setCrossingType(e.target.value as CrossingType)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="NONE">ไม่ขีดคร่อม</option>
                    <option value="AC_PAYEE">// A/C PAYEE ONLY // (เข้าบัญชีเท่านั้น)</option>
                    <option value="AND_CO">// & CO. // (เข้าบัญชีธนาคาร)</option>
                  </select>
                </div>
              </div>

              {/* Batch Navigation if printing multiple cheques */}
              {batchCheques && batchCheques.length > 1 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                  <button
                    type="button"
                    disabled={batchIndex === 0}
                    onClick={() => setBatchIndex(batchIndex - 1)}
                    className="p-1 rounded hover:bg-emerald-100 disabled:opacity-30 cursor-pointer text-emerald-800"
                    title="ใบก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-xs text-emerald-950">
                    ฉบับที่ {batchIndex + 1} จาก {batchCheques.length} (ฎีกา {activeCheque.dikaNumber})
                  </span>
                  <button
                    type="button"
                    disabled={batchIndex === batchCheques.length - 1}
                    onClick={() => setBatchIndex(batchIndex + 1)}
                    className="p-1 rounded hover:bg-emerald-100 disabled:opacity-30 cursor-pointer text-emerald-800"
                    title="ใบถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Visual Printer Feeding Guide with adjustable direction */}
          <PrinterFeedGuide
            bankType={selectedBank}
            direction={feedDirection}
            onChangeDirection={(newDir) => {
              setFeedDirection(newDir);
              const updated = {
                ...currentTemplate,
                feedDirection: newDir,
              };
              StorageService.saveTemplate(updated, currentUser);
              setTemplates({
                ...templates,
                [selectedBank]: updated,
              });
              if (newDir === 'PORTRAIT_TOP' || newDir === 'PORTRAIT_BOTTOM') {
                setRotatePreviewMatchingFeed(true);
              }
            }}
            compact={true}
          />

          {/* STEP 4: CHEQUE PREVIEW & PRINT ZONE */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-200/60 rounded-xl overflow-x-auto border border-slate-300">
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                <span>
                  ขนาดเช็ค: <strong>{currentTemplate.widthMm} × {currentTemplate.heightMm} มม.</strong> ({currentTemplate.bankNameThai})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                  <span>{FEED_DIRECTION_LABELS[feedDirection]?.icon}</span>
                  <span>{FEED_DIRECTION_LABELS[feedDirection]?.label}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle preview in feed orientation */}
                <button
                  type="button"
                  onClick={() => setRotatePreviewMatchingFeed(!rotatePreviewMatchingFeed)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    rotatePreviewMatchingFeed
                      ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title="หมุนมุมมองตัวอย่างเช็คตามทิศทางป้อนกระดาษของเครื่องพิมพ์"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>
                    {rotatePreviewMatchingFeed
                      ? `หมุนตามเครื่อง (${FEED_DIRECTION_LABELS[feedDirection]?.rotationDeg || 0}°)`
                      : 'ดูแนวนอนปกติ'}
                  </span>
                </button>

                <ZoomController
                  zoomLevel={zoomLevel}
                  onZoomChange={setZoomLevel}
                />
              </div>
            </div>

            {/* Cheque Canvas Container with Zoom & Orientation Transform */}
            {(() => {
              const rotationDeg = rotatePreviewMatchingFeed ? (FEED_DIRECTION_LABELS[feedDirection]?.rotationDeg || 0) : 0;
              const isRotated90or270 = rotationDeg === 90 || rotationDeg === 270;

              return (
                <div className="overflow-auto max-w-full p-3 flex items-center justify-center w-full min-h-[140px]">
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out',
                    }}
                  >
                    {/* Bounding box wrapper to hold rotated dimensions without overflow clipping */}
                    <div
                      style={{
                        width: isRotated90or270 ? `${currentTemplate.heightMm}mm` : `${currentTemplate.widthMm}mm`,
                        height: isRotated90or270 ? `${currentTemplate.widthMm}mm` : `${currentTemplate.heightMm}mm`,
                        position: 'relative',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Physical Cheque Preview Container (MM Units converted or styled directly) */}
                      <div
                        id="cheque-print-zone"
                        style={{
                          width: `${currentTemplate.widthMm}mm`,
                          height: `${currentTemplate.heightMm}mm`,
                          position: 'relative',
                          boxSizing: 'border-box',
                          transformOrigin: 'top left',
                          transform: rotationDeg === 90
                            ? 'rotate(90deg) translateY(-100%)'
                            : rotationDeg === 270
                            ? 'rotate(270deg) translateX(-100%)'
                            : rotationDeg === 180
                            ? 'rotate(180deg) translate(-100%, -100%)'
                            : 'none',
                          transition: 'transform 0.3s ease',
                        }}
                        className={`bg-white border border-slate-300 shadow-md relative overflow-hidden text-black select-none feed-direction-${feedDirection.toLowerCase().replace('_', '-')}`}
                      >
              
              {/* Direction Ribbon (Screen preview only, strictly hidden in print) */}
              {feedDirection === 'PORTRAIT_TOP' && (
                <div className="no-print absolute top-0 inset-x-0 h-4 bg-emerald-600/90 text-white flex items-center justify-center text-[8.5px] font-bold tracking-wider z-20 shadow-xs">
                  ⬆ ด้านนี้สอดเข้าเครื่องพิมพ์ก่อน (หัวเช็ค / วันที่ 90°)
                </div>
              )}
              {feedDirection === 'PORTRAIT_BOTTOM' && (
                <div className="no-print absolute bottom-0 inset-x-0 h-4 bg-amber-600/90 text-white flex items-center justify-center text-[8.5px] font-bold tracking-wider z-20 shadow-xs">
                  ⬇ ด้านนี้สอดเข้าเครื่องพิมพ์ก่อน (ท้ายเช็ค / ลายเซ็นต์ 270°)
                </div>
              )}
              {feedDirection === 'LANDSCAPE_NORMAL' && (
                <div className="no-print absolute top-0 bottom-0 left-0 w-3.5 bg-sky-600/85 text-white flex items-center justify-center text-[7.5px] font-bold z-20 [writing-mode:vertical-lr] rotate-180">
                  ⬅ ต้นขั้ว สอดเข้าก่อน (0°)
                </div>
              )}
              {feedDirection === 'LANDSCAPE_FLIPPED' && (
                <div className="no-print absolute top-0 bottom-0 right-0 w-3.5 bg-purple-600/85 text-white flex items-center justify-center text-[7.5px] font-bold z-20 [writing-mode:vertical-lr]">
                  ยอดเงิน สอดเข้าก่อน (180°) ➔
                </div>
              )}

              {/* Reference Cheque Guide Background (Visible on screen if enabled, STRICTLY HIDDEN in print) */}
              {showBackgroundGuide && (
                <ChequeBackground
                  bankType={selectedBank}
                  customImageUrl={currentTemplate.customBgImageUrl}
                />
              )}

              {/* A4 Alignment Calibration Test Sheet overlay (Prints ONLY when printing test sheet) */}
              <div className="test-sheet-guide absolute inset-0 pointer-events-none">
                <div className="w-full h-full border-2 border-dashed border-slate-700 relative">
                  {/* Top-left alignment label */}
                  <div className="absolute left-1 top-1 bg-white/95 px-2 py-0.5 border border-slate-600 rounded text-[9px] font-bold text-slate-900 leading-tight">
                    ┌ วางมุมบนซ้ายของเช็คจริงให้ตรงกับมุมนี้ ({currentTemplate.bankNameThai} {currentTemplate.widthMm} × {currentTemplate.heightMm} มม.)
                  </div>

                  {/* Corner Crosshairs */}
                  <div className="absolute left-0 top-0 text-[11px] font-mono font-bold text-slate-800 -translate-x-1.5 -translate-y-2">┼</div>
                  <div className="absolute right-0 top-0 text-[11px] font-mono font-bold text-slate-800 translate-x-1.5 -translate-y-2">┼</div>
                  <div className="absolute left-0 bottom-0 text-[11px] font-mono font-bold text-slate-800 -translate-x-1.5 translate-y-2">┼</div>
                  <div className="absolute right-0 bottom-0 text-[11px] font-mono font-bold text-slate-800 translate-x-1.5 translate-y-2">┼</div>

                  {/* Top scale ticks */}
                  <div className="absolute left-0 top-0 w-full flex justify-between text-[7px] font-mono text-slate-600 px-1 pt-0.5 border-b border-slate-400">
                    <span>| 0mm</span>
                    <span>| 50mm</span>
                    <span>| 100mm</span>
                    <span>| 150mm</span>
                    <span>| 200mm</span>
                    <span>| {currentTemplate.widthMm}mm</span>
                  </div>

                  {/* Watermark instruction in center */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <span className="text-xs font-bold text-slate-700 border border-slate-400 p-2 rounded">
                      [ แผ่นทดสอบทาบตำแหน่งเช็ค — ส่องกับแสงไฟเพื่อดูตำแหน่งข้อความ ]
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTUAL CHEQUE TEXT DATA TO BE PRINTED */}
              
              {/* 1. Date (วันที่พิมพ์เช็ค: ปกติไม่ต้องแสดง/ไม่พิมพ์) */}
              {printDate && (
                <div
                  className="cheque-field-text absolute whitespace-nowrap font-semibold leading-none"
                  style={{
                    ...getFieldPos(currentTemplate.fields.date),
                    fontSize: `${currentTemplate.fields.date.fontSizePt}pt`,
                    letterSpacing: `${currentTemplate.fields.date.letterSpacingMm || 2.5}mm`,
                  }}
                >
                  {formatChequePrintDate(chequeDate || activeCheque.chequeDate || activeCheque.stubDate)}
                </div>
              )}

              {/* 2. Payee Name (จุดที่ 1) */}
              <div
                className="cheque-field-text absolute whitespace-nowrap font-bold leading-none"
                style={{
                  ...getFieldPos(currentTemplate.fields.payee),
                  fontSize: `${currentTemplate.fields.payee.fontSizePt}pt`,
                }}
              >
                {activeCheque.chequePayeeName}
              </div>

              {/* 2.1 Payee Name (จุดที่ 2 - ปรับแยกกันได้) */}
              {currentTemplate.fields.payee2 && currentTemplate.fields.payee2.enabled !== false && (
                <div
                  className="cheque-field-text absolute whitespace-nowrap font-bold leading-none"
                  style={{
                    ...getFieldPos(currentTemplate.fields.payee2),
                    fontSize: `${currentTemplate.fields.payee2.fontSizePt}pt`,
                  }}
                >
                  {activeCheque.chequePayeeName}
                </div>
              )}

              {/* 3. Thai Baht Text */}
              <div
                className="cheque-field-text absolute whitespace-nowrap font-bold leading-none"
                style={{
                  ...getFieldPos(currentTemplate.fields.amountText),
                  fontSize: `${currentTemplate.fields.amountText.fontSizePt}pt`,
                }}
              >
                {currentTemplate.fields.amountText.prefix || '='}
                {activeCheque.totalAmountThaiText}
                {currentTemplate.fields.amountText.suffix || '='}
              </div>

              {/* 4. Numeric Amount (จุดที่ 1) */}
              <div
                className="cheque-field-text absolute whitespace-nowrap font-bold tabular-nums leading-none tracking-wider"
                style={{
                  ...getFieldPos(currentTemplate.fields.amountNumber),
                  fontSize: `${currentTemplate.fields.amountNumber.fontSizePt}pt`,
                }}
              >
                {currentTemplate.fields.amountNumber.prefix || '*'}
                {(activeCheque.netPaidAmount || activeCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {currentTemplate.fields.amountNumber.suffix || '*'}
              </div>

              {/* 4.1 Numeric Amount (จุดที่ 2 - ปรับแยกกันได้) */}
              {currentTemplate.fields.amountNumber2 && currentTemplate.fields.amountNumber2.enabled !== false && (
                <div
                  className="cheque-field-text absolute whitespace-nowrap font-bold tabular-nums leading-none tracking-wider"
                  style={{
                    ...getFieldPos(currentTemplate.fields.amountNumber2),
                    fontSize: `${currentTemplate.fields.amountNumber2.fontSizePt}pt`,
                  }}
                >
                  {currentTemplate.fields.amountNumber2.prefix || '*'}
                  {(activeCheque.netPaidAmount || activeCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {currentTemplate.fields.amountNumber2.suffix || '*'}
                </div>
              )}

              {/* 4.2 Numeric Amount (จุดที่ 3 - ปรับแยกกันได้) */}
              {currentTemplate.fields.amountNumber3 && currentTemplate.fields.amountNumber3.enabled !== false && (
                <div
                  className="cheque-field-text absolute whitespace-nowrap font-bold tabular-nums leading-none tracking-wider"
                  style={{
                    ...getFieldPos(currentTemplate.fields.amountNumber3),
                    fontSize: `${currentTemplate.fields.amountNumber3.fontSizePt}pt`,
                  }}
                >
                  {currentTemplate.fields.amountNumber3.prefix || '*'}
                  {(activeCheque.netPaidAmount || activeCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {currentTemplate.fields.amountNumber3.suffix || '*'}
                </div>
              )}

              {/* 5. ขีดฆ่าคำว่า "หรือผู้ถือ" (Strike-through bearer) */}
              {strikeBearer && (
                <div
                  className="cheque-field-text absolute pointer-events-none"
                  style={{
                    left: `${(currentTemplate.strikeBearer?.x || 216) + offsetX}mm`,
                    top: `${(currentTemplate.strikeBearer?.y || 24) + offsetY}mm`,
                    width: `${currentTemplate.strikeBearer?.widthMm || 16}mm`,
                    height: '4px',
                  }}
                >
                  <div className="w-full h-[1.8px] bg-black mb-[1.5px]" />
                  <div className="w-full h-[1.8px] bg-black" />
                </div>
              )}

              {/* 6. ขีดคร่อมเช็ค (A/C PAYEE ONLY / & CO.) */}
              {crossingType !== 'NONE' && (
                <div
                  className="cheque-field-text absolute pointer-events-none -rotate-12 border-y-2 border-black py-0.5 px-3 text-center font-mono font-bold text-[8.5pt] leading-tight text-black"
                  style={{
                    left: `${(currentTemplate.crossing?.x || 65) + offsetX}mm`,
                    top: `${(currentTemplate.crossing?.y || 8) + offsetY}mm`,
                  }}
                >
                  {crossingType === 'AC_PAYEE' ? '// A/C PAYEE ONLY //' : '// & CO. //'}
                </div>
              )}

              {/* 7. Stub info (Optional preview) */}
              <div
                className="cheque-field-text absolute text-slate-800 leading-snug"
                style={{
                  left: `${8 + offsetX}mm`,
                  top: `${12 + offsetY}mm`,
                  fontSize: '8.5pt',
                }}
              >
                <div className="font-semibold">ฎีกา: {activeCheque.dikaNumber}</div>
                <div>{formatThaiDate(activeCheque.stubDate)}</div>
                <div className="truncate max-w-[26mm]">{activeCheque.stubPayeeName}</div>
                <div className="font-bold">{activeCheque.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</div>
              </div>

                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Prompt Guidelines Summary */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">คำแนะนำการพิมพ์:</span>
              <p className="mt-0.5">
                ใส่กระดาษเช็คจริงในทิศทางแนวนอน (Landscape) หากไม่แน่ใจตำแหน่ง สามารถกด <strong>"ทดสอบพิมพ์บนกระดาษ A4"</strong> เพื่อนำกระดาษธรรมดาไปทาบเทียบตำแหน่งกับเช็คจริงก่อนได้ เมื่อพิมพ์จริงระบบจะพิมพ์เฉพาะข้อมูลข้อความลงในช่องที่ถูกต้องโดยไม่พิมพ์ภาพพื้นหลัง
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Shortcut: Open Payment Voucher immediately */}
            {onOpenPaymentVoucher && (
              <button
                type="button"
                onClick={() => onOpenPaymentVoucher(activeCheque)}
                className="h-12 px-4 text-sm font-bold text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                title="เปิดพิมพ์ใบสำคัญจ่ายสำหรับแนบฎีกานี้ต่อทันที"
              >
                <FileText className="w-4 h-4 text-sky-600" />
                <span>📄 พิมพ์ใบสำคัญจ่าย</span>
              </button>
            )}

            {/* Test Print button */}
            <button
              type="button"
              onClick={() => handleExecutePrint(true)}
              className="h-12 px-4 text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 border-2 border-slate-300 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              title="พิมพ์แผ่นกรอบและจุดทาบขนาดเช็คลงกระดาษ A4 เพื่อนำเช็คจริงมาทาบดูความตรงช่อง"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>📄 ทดสอบพิมพ์บน A4</span>
            </button>

            {/* Real Print button */}
            <button
              type="button"
              disabled={isReprint && !confirmedReprint}
              onClick={() => handleExecutePrint(false)}
              className="h-12 px-6 text-base font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <Printer className="w-5 h-5" />
              <span>{isReprint ? `พิมพ์เช็ค (${selectedBank} ครั้งที่ ${activeCheque.printCount + 1})` : `🖨️ พิมพ์เช็ค (${selectedBank})`}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Add Custom Cheque Template Modal */}
      {isAddTemplateModalOpen && (
        <AddTemplateModal
          isOpen={isAddTemplateModalOpen}
          onClose={() => setIsAddTemplateModalOpen(false)}
          currentUser={currentUser}
          onSuccess={(newCode) => {
            const updated = StorageService.getTemplates();
            setTemplates(updated);
            setSelectedBank(newCode);
          }}
        />
      )}
    </div>
  );
};
