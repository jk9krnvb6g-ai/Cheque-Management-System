import React, { useState, useEffect } from 'react';
import { BankTemplateConfig, BankType, Cheque, ChequeItem, User } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate, getTodayISODate, getThaiFiscalYear } from '../utils/dateUtils';
import { thaiBahtText } from '../utils/thaiBahtText';
import { PrinterFeedGuide } from './PrinterFeedGuide';
import {
  Printer,
  RotateCcw,
  CheckCircle2,
  Calendar,
  CreditCard,
  Hash,
  X,
  Plus,
  Trash2,
  Sliders,
  Save,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Copy,
} from 'lucide-react';

interface EasyChequeWriterProps {
  currentUser: User;
  onPrintCheque: (cheque: Cheque) => void;
  onRefreshData: () => void;
  cheques: Cheque[];
  onNavigateToTemplates?: (bank: BankType) => void;
  onNavigateToHistory?: () => void;
  initialDraftCheque?: Cheque | null;
  onClearInitialDraft?: () => void;
}

// Quick Frequent Payees
const FREQUENT_PAYEES = [
  'องค์การเภสัชกรรม',
  'การไฟฟ้านครหลวง',
  'การไฟฟ้าส่วนภูมิภาค',
  'การประปานครหลวง',
  'การประปาส่วนภูมิภาค',
  'บริษัท โทรคมนาคมแห่งชาติ จำกัด (มหาชน)',
  'บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)',
  'บริษัท ไปรษณีย์ไทย จำกัด',
  'ค่าจ้างเหมาบริการรักษาความปลอดภัย',
  'ค่าจ้างเหมาบริการทำความสะอาด',
];

interface EasyItemRow {
  id: string;
  description: string;
  amountStr: string;
  amount: number;
}

type ConfirmModalType = 'SAVE_ONLY' | 'SAVE_AND_PRINT' | 'CLEAR' | 'REMOVE_ITEM' | 'ADD_ITEM';

interface MissingFieldItem {
  id: string;
  field: string;
  label: string;
  message: string;
  focusTarget: 'payee' | 'amount' | 'date';
}

export const EasyChequeWriter: React.FC<EasyChequeWriterProps> = ({
  currentUser,
  onPrintCheque,
  onRefreshData,
  cheques,
  onNavigateToTemplates,
  onNavigateToHistory,
  initialDraftCheque,
  onClearInitialDraft,
}) => {
  // Input references for auto-focusing on missing fields
  const payeeInputRef = React.useRef<HTMLInputElement>(null);
  const firstAmountInputRef = React.useRef<HTMLInputElement>(null);

  // Form fields
  const [chequeDate, setChequeDate] = useState<string>(getTodayISODate());
  const [dikaNumber, setDikaNumber] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<BankType>('KTB');
  const [copiedDikaToast, setCopiedDikaToast] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Record<BankType, BankTemplateConfig>>(() => StorageService.getTemplates());

  // Quick append .00
  const handleAppendDoubleZero = (itemId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        let val = it.amountStr.trim();
        if (!val) return it;
        if (!val.includes('.')) {
          val = `${val}.00`;
        }
        const num = parseFloat(val) || 0;
        return { ...it, amountStr: val, amount: num };
      })
    );
  };

  // Quick copy dika number
  const handleCopyDika = () => {
    if (!dikaNumber) return;
    navigator.clipboard.writeText(dikaNumber);
    setCopiedDikaToast(true);
    setTimeout(() => setCopiedDikaToast(false), 2000);
  };

  // Source cheque banner when pulled from history (ไม่ถือว่าพิมพ์ซ้ำ)
  const [sourceChequeBanner, setSourceChequeBanner] = useState<string | null>(null);
  const [showHistoryPickerModal, setShowHistoryPickerModal] = useState<boolean>(false);
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  // Multiple Items State (รองรับได้มากกว่า 1 รายการ)
  const [items, setItems] = useState<EasyItemRow[]>([
    {
      id: 'it_1',
      description: 'ค่าวัสดุและค่าใช้จ่ายตามฎีกา',
      amountStr: '',
      amount: 0,
    },
  ]);

  // Tax withholding options
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<number>(0);

  // Security checkboxes
  const [strikeBearer, setStrikeBearer] = useState<boolean>(true);
  const [crossingType, setCrossingType] = useState<'NONE' | 'AC_PAYEE' | 'AND_CO'>('AC_PAYEE');

  // Validation Error State (In-app, no window.alert)
  const [validationError, setValidationError] = useState<string | null>(null);

  // Missing Fields In-App Alert Modal (เมื่อใส่ข้อมูลไม่ครบ)
  const [missingFieldsModal, setMissingFieldsModal] = useState<MissingFieldItem[] | null>(null);

  // Success and Info Feedback
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // In-App Confirmation Modal State (ก่อนเพิ่ม ลบ หรือแก้ไข)
  const [confirmModal, setConfirmModal] = useState<{
    type: ConfirmModalType;
    itemId?: string;
  } | null>(null);

  // Modal after saving without printing
  const [savedPendingCheque, setSavedPendingCheque] = useState<Cheque | null>(null);

  // Calculate total amounts from all items
  const totalNumericAmount = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const taxAmount = withholdingTaxPercent > 0 ? (totalNumericAmount * withholdingTaxPercent) / 100 : 0;
  const netPaidAmount = totalNumericAmount - taxAmount;
  const thaiText = totalNumericAmount > 0 ? thaiBahtText(netPaidAmount > 0 ? netPaidAmount : totalNumericAmount) : '';

  // Auto-generate or suggest next Dika Number & Cheque Number
  useEffect(() => {
    if (!dikaNumber && cheques.length > 0) {
      const latest = cheques[0];
      if (latest && latest.dikaNumber && latest.dikaNumber.includes('/')) {
        const parts = latest.dikaNumber.split('/');
        const num = parseInt(parts[0], 10);
        if (!isNaN(num)) {
          setDikaNumber(`${num + 1}/${parts[1] || '69'}`);
        }
      }
    }
  }, [cheques]);

  // Handle pre-fill from initialDraftCheque (when user clicks "ดึงข้อมูลมาออกเช็คใหม่" from History)
  useEffect(() => {
    if (initialDraftCheque) {
      handleSelectSourceCheque(initialDraftCheque);
      if (onClearInitialDraft) {
        onClearInitialDraft();
      }
    }
  }, [initialDraftCheque]);

  // Load past cheque data into form as a fresh new cheque (ไม่ถือว่าพิมพ์ซ้ำ)
  const handleSelectSourceCheque = (source: Cheque) => {
    setPayeeName(source.chequePayeeName || source.stubPayeeName || '');
    if (source.lastBankType) {
      setSelectedBank(source.lastBankType);
    }
    setChequeDate(getTodayISODate());
    setDikaNumber(source.dikaNumber || '');
    setChequeNumber(''); // ให้รันเลขที่เช็คใหม่ของรอบเดือนนี้
    setWithholdingTaxPercent(source.withholdingTaxPercent || 0);

    if (source.items && source.items.length > 0) {
      setItems(
        source.items.map((it, idx) => ({
          id: `it_${Date.now()}_${idx}`,
          description: it.description || 'ค่าใช้จ่ายตามฎีกา',
          amountStr: it.amount ? String(it.amount) : '',
          amount: it.amount || 0,
        }))
      );
    } else {
      const amt = source.netPaidAmount || source.totalAmount;
      setItems([
        {
          id: `it_${Date.now()}_0`,
          description: `สั่งจ่ายให้แก่ ${source.chequePayeeName}`,
          amountStr: amt ? String(amt) : '',
          amount: amt || 0,
        },
      ]);
    }

    setSourceChequeBanner(
      `📋 ดึงข้อมูลจากประวัติเดิมของ "${source.chequePayeeName}" เรียบร้อยแล้ว (ระบบออกเป็นเช็คฉบับใหม่รอบนี้ — กรอกเลขที่เช็คแล้วสั่งพิมพ์ได้ทันที ไม่ถือว่าพิมพ์ซ้ำ)`
    );
    setShowHistoryPickerModal(false);
  };

  // Multiple Items Handlers with Confirmation (ยืนยันก่อนเพิ่มทุกครั้ง)
  const handleRequestAddItem = () => {
    setConfirmModal({ type: 'ADD_ITEM' });
  };

  const handleConfirmAddItem = () => {
    const nextIdx = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `it_${Date.now()}_${nextIdx}`,
        description: '',
        amountStr: '',
        amount: 0,
      },
    ]);
    setConfirmModal(null);
    setSuccessBanner('✅ เพิ่มแถวรายการฎีกาใหม่เรียบร้อยแล้ว');
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const handleRequestRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setConfirmModal({ type: 'REMOVE_ITEM', itemId: id });
  };

  const handleConfirmRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setConfirmModal(null);
    setSuccessBanner('ลบรายการฎีกาเรียบร้อยแล้ว');
    setTimeout(() => setSuccessBanner(null), 2500);
  };

  const handleItemDescChange = (id: string, desc: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: desc } : item))
    );
  };

  const handleItemAmountChange = (id: string, val: string) => {
    setValidationError(null);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cleanVal = val.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleanVal) || 0;
        return {
          ...item,
          amountStr: val,
          amount: num,
        };
      })
    );
  };

  // Handle Clear / Reset with Confirmation
  const handleRequestClearForm = () => {
    setConfirmModal({ type: 'CLEAR' });
  };

  const handleConfirmClearForm = () => {
    setPayeeName('');
    setItems([
      {
        id: `it_${Date.now()}`,
        description: 'ค่าวัสดุและค่าใช้จ่ายตามฎีกา',
        amountStr: '',
        amount: 0,
      },
    ]);
    setWithholdingTaxPercent(0);
    setChequeDate(getTodayISODate());
    setValidationError(null);
    setSuccessBanner('ล้างข้อมูลในแบบฟอร์มเรียบร้อยแล้ว');
    setTimeout(() => setSuccessBanner(null), 3000);
    setConfirmModal(null);
  };

  // Helper to build Cheque object
  const buildChequeData = (status: 'PENDING' | 'ISSUED'): Cheque => {
    const validItems: ChequeItem[] = items
      .filter((it) => it.amount > 0 || it.description.trim())
      .map((it, idx) => ({
        id: it.id || `item_${idx + 1}`,
        description: it.description.trim() || `รายการที่ ${idx + 1}`,
        amount: it.amount || 0,
      }));

    const finalItems = validItems.length > 0 ? validItems : [
      {
        id: `item_1`,
        description: `สั่งจ่ายเช็ค ${selectedBank} ให้แก่ ${payeeName.trim()}`,
        amount: totalNumericAmount,
      },
    ];

    return {
      id: `chq_${Date.now()}`,
      chequeNumber: chequeNumber.trim() || undefined,
      stubDate: chequeDate,
      chequeDate: chequeDate,
      stubPayeeName: payeeName.trim(),
      chequePayeeName: payeeName.trim(),
      dikaNumber: dikaNumber.trim() || undefined,
      items: finalItems,
      totalAmount: totalNumericAmount,
      totalAmountThaiText: thaiText,
      withholdingTaxPercent: withholdingTaxPercent > 0 ? withholdingTaxPercent : undefined,
      withholdingTaxAmount: taxAmount > 0 ? taxAmount : undefined,
      netPaidAmount: netPaidAmount > 0 ? netPaidAmount : totalNumericAmount,
      status: status,
      createdBy: currentUser.fullName,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      printCount: 0,
      lastBankType: selectedBank,
    };
  };

  // Form Validation check with In-App Alert Modal (แจ้งเตือนอย่างชัดเจนเมื่อข้อมูลไม่ครบ)
  const checkValidation = (): boolean => {
    const errors: MissingFieldItem[] = [];

    if (!chequeDate) {
      errors.push({
        id: 'date',
        field: 'วันที่บนเช็ค',
        label: 'วันที่สั่งจ่ายบนหน้าเช็ค',
        message: 'กรุณาระบุวันที่สั่งจ่ายบนหน้าเช็ค',
        focusTarget: 'date',
      });
    }

    if (!payeeName.trim()) {
      errors.push({
        id: 'payee',
        field: 'ชื่อผู้รับเงิน',
        label: 'สั่งจ่ายให้แก่ (ชื่อผู้รับเงิน)',
        message: 'กรุณากรอกชื่อบริษัท หน่วยงาน หรือบุคคลผู้รับเงินบนหน้าเช็ค',
        focusTarget: 'payee',
      });
    }

    if (totalNumericAmount <= 0) {
      errors.push({
        id: 'amount',
        field: 'จำนวนเงินสั่งจ่าย',
        label: 'จำนวนเงินในรายการฎีกา (บาท)',
        message: 'กรุณากรอกจำนวนเงินในรายการฎีกาอย่างน้อย 1 รายการ และยอดเงินรวมต้องมากกว่า 0.00 บาท',
        focusTarget: 'amount',
      });
    }

    // Check if any row has description but amount is 0
    items.forEach((it, idx) => {
      if (it.description.trim() && (!it.amount || it.amount <= 0)) {
        errors.push({
          id: `item_val_${it.id}`,
          field: `จำนวนเงินรายการที่ ${idx + 1}`,
          label: `จำนวนเงิน: ${it.description.trim()}`,
          message: `กรุณากรอกจำนวนเงินสั่งจ่าย (บาท) สำหรับรายการที่ ${idx + 1}`,
          focusTarget: 'amount',
        });
      }
    });

    if (errors.length > 0) {
      setMissingFieldsModal(errors);
      setValidationError('ข้อมูลยังไม่ครบถ้วน: กรุณากรอก ' + errors.map((e) => e.field).join(' และ '));
      return false;
    }

    setMissingFieldsModal(null);
    setValidationError(null);
    return true;
  };

  // Focus and scroll to first missing input
  const handleResolveMissingField = () => {
    if (!missingFieldsModal || missingFieldsModal.length === 0) {
      setMissingFieldsModal(null);
      return;
    }
    const target = missingFieldsModal[0].focusTarget;
    setMissingFieldsModal(null);

    setTimeout(() => {
      if (target === 'payee' && payeeInputRef.current) {
        payeeInputRef.current.focus();
        payeeInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (target === 'amount' && firstAmountInputRef.current) {
        firstAmountInputRef.current.focus();
        firstAmountInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (target === 'date') {
        const el = document.getElementById('chequeDateInput');
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 150);
  };

  // Initiate Save Only (เปิดกล่องยืนยันก่อนบันทึก)
  const handleInitiateSaveOnly = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!checkValidation()) return;
    setConfirmModal({ type: 'SAVE_ONLY' });
  };

  // Execute Save Only after user confirms
  const handleExecuteSaveOnly = () => {
    const newCheque = buildChequeData('PENDING');
    const saved = StorageService.saveCheque(newCheque, currentUser);
    onRefreshData();

    setConfirmModal(null);
    setSavedPendingCheque(saved);
  };

  // Initiate Save and Print (เปิดกล่องยืนยันก่อนบันทึกและพิมพ์)
  const handleInitiateSaveAndPrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!checkValidation()) return;
    setConfirmModal({ type: 'SAVE_AND_PRINT' });
  };

  // Execute Save and Print after user confirms
  const handleExecuteSaveAndPrint = () => {
    const newCheque = buildChequeData('ISSUED');
    const saved = StorageService.saveCheque(newCheque, currentUser);
    onRefreshData();

    setConfirmModal(null);
    setSuccessBanner(`บันทึกข้อมูลเรียบร้อยแล้ว! กำลังส่งไปยังเครื่องพิมพ์เช็ค ${selectedBank}...`);
    setTimeout(() => setSuccessBanner(null), 4000);

    // Open Print Modal
    onPrintCheque(saved);
  };

  // Bank name Thai helper
  const getBankNameThai = (code: BankType) => {
    if (code === 'KTB') return 'ธนาคารกรุงไทย (KTB)';
    if (code === 'BAAC') return 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)';
    if (code === 'GSB') return 'ธนาคารออมสิน (GSB)';
    return code;
  };

  // Keyboard shortcut: Ctrl + P to Save and Print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleInitiateSaveAndPrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, payeeName, chequeDate, dikaNumber, chequeNumber, selectedBank, withholdingTaxPercent, strikeBearer, crossingType]);

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in">
      {/* Top Banner Notice */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-950 font-extrabold text-base flex items-center gap-3 animate-in fade-in shadow-md">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Validation Error Banner (ชัดเจน ไม่ใช้ window.alert) */}
      {validationError && (
        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl text-red-950 font-bold text-base flex items-center justify-between gap-3 animate-in fade-in shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <span>⚠ {validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="p-1 text-red-600 hover:text-red-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Container Form */}
      <div className="space-y-5">
        {/* Step 1: Select Bank & Direct Templates Shortcut */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-800 text-white font-black text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                เลือกสมุดเช็ค
              </h2>
            </div>

            {/* Direct Link to Templates Settings */}
            {onNavigateToTemplates && (
              <button
                type="button"
                onClick={() => onNavigateToTemplates(selectedBank)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-800 rounded-lg text-xs font-bold border border-slate-200 hover:border-red-200 transition-colors cursor-pointer self-start sm:self-auto"
                title="ปรับระยะพิกัดพิมพ์ของธนาคารนี้"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>ตั้งค่าพิกัด ({selectedBank})</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* KTB */}
            <button
              type="button"
              onClick={() => setSelectedBank('KTB')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer flex items-center gap-3 relative ${
                selectedBank === 'KTB'
                  ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-sky-500 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                KTB
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base text-slate-900">ธ.กรุงไทย</span>
                  {selectedBank === 'KTB' && (
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </div>
                <div className="text-xs text-slate-500 font-medium">241 × 90 มม.</div>
              </div>
            </button>

            {/* BAAC */}
            <button
              type="button"
              onClick={() => setSelectedBank('BAAC')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer flex items-center gap-3 relative ${
                selectedBank === 'BAAC'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                BAAC
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base text-slate-900">ธ.ก.ส.</span>
                  {selectedBank === 'BAAC' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div className="text-xs text-slate-500 font-medium">235 × 90 มม.</div>
              </div>
            </button>

            {/* GSB */}
            <button
              type="button"
              onClick={() => setSelectedBank('GSB')}
              className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer flex items-center gap-3 relative ${
                selectedBank === 'GSB'
                  ? 'border-pink-500 bg-pink-50/70 shadow-xs ring-2 ring-pink-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-pink-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                GSB
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base text-slate-900">ธ.ออมสิน</span>
                  {selectedBank === 'GSB' && (
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                  )}
                </div>
                <div className="text-xs text-slate-500 font-medium">239 × 90 มม.</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Cheque Details */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          {/* Banner if pulled from past cheque history */}
          {sourceChequeBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-emerald-950 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sourceChequeBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setSourceChequeBanner(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-800 text-white font-black text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                ข้อมูลหน้าเช็ค
              </h2>
            </div>

            {/* Pull past cheque history button */}
            <button
              type="button"
              onClick={() => {
                setHistorySearchTerm('');
                setShowHistoryPickerModal(true);
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-800 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📋 ดึงประวัติสั่งจ่าย</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-red-700" />
                  <span>วันที่สั่งจ่าย:</span>
                </label>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                  ปีงบฯ {getThaiFiscalYear(chequeDate, dikaNumber)}
                </span>
              </div>
              <input
                id="chequeDateInput"
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="w-full h-11 px-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-600 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                {formatThaiDate(chequeDate)}
              </span>
            </div>

            {/* 2. Dika Number (ไม่บังคับ) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>เลขที่ฎีกา (ถ้ามี):</span>
                </label>
                {copiedDikaToast && (
                  <span className="text-[11px] text-emerald-700 font-bold">
                    ✓ คัดลอกแล้ว
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={dikaNumber}
                  onChange={(e) => setDikaNumber(e.target.value)}
                  placeholder="เช่น 142/69"
                  className="w-full h-11 pl-3 pr-9 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-600 focus:outline-none"
                />
                {dikaNumber.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyDika}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-700 rounded transition-colors cursor-pointer"
                    title="คัดลอก"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Cheque Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>เลขที่เช็ค (7-8 หลัก):</span>
              </label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="เช่น 1029384"
                className="w-full h-11 px-3 text-sm font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Payee Name */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="block text-sm font-bold text-slate-800">
                สั่งจ่ายให้แก่ (ชื่อผู้รับเงิน): <span className="text-red-600">*</span>
              </label>
            </div>
            <input
              ref={payeeInputRef}
              type="text"
              value={payeeName}
              onChange={(e) => {
                setPayeeName(e.target.value);
                if (validationError) setValidationError(null);
                if (missingFieldsModal) setMissingFieldsModal(null);
              }}
              placeholder="กรอกชื่อบริษัท ห้างหุ้นส่วนจำกัด หรือบุคคลผู้รับเงิน..."
              className={`w-full h-13 px-4 text-lg font-bold text-slate-900 rounded-xl focus:bg-white focus:outline-none transition-all ${
                validationError && !payeeName.trim()
                  ? 'bg-red-50/50 border-2 border-red-500 focus:border-red-600'
                  : 'bg-slate-50 border-2 border-slate-300 focus:border-red-600'
              }`}
            />

            {/* Frequent Payees Fast-Click Buttons */}
            <div className="mt-2.5">
              <span className="text-xs font-bold text-slate-500 mr-1.5">เลือกจากที่ใช้บ่อย:</span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1">
                {FREQUENT_PAYEES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setPayeeName(name);
                      if (validationError) setValidationError(null);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-red-50 hover:text-red-800 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Dika Expense Items (Multiple Items Support) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-800 text-white font-black text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                รายการสั่งจ่าย
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRequestAddItem}
              className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มรายการ</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">
                  {index + 1}.
                </span>

                <div className="flex-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemDescChange(item.id, e.target.value)}
                    placeholder="รายละเอียด เช่น ค่าเวชภัณฑ์ยา, ค่าจ้างเหมา..."
                    className="w-full h-10 px-3 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="w-full sm:w-52 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      ref={index === 0 ? firstAmountInputRef : undefined}
                      type="text"
                      value={item.amountStr}
                      onChange={(e) => {
                        handleItemAmountChange(item.id, e.target.value);
                        if (missingFieldsModal) setMissingFieldsModal(null);
                      }}
                      placeholder="0.00"
                      className={`w-full h-10 pl-3 pr-8 text-sm font-black text-slate-900 text-right bg-white rounded-lg focus:border-red-600 focus:outline-none tabular-nums ${
                        validationError && totalNumericAmount <= 0
                          ? 'border-2 border-red-500 bg-red-50/30'
                          : 'border border-slate-300'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      บาท
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAppendDoubleZero(item.id)}
                    className="h-10 px-2 bg-slate-100 hover:bg-red-50 hover:text-red-800 text-slate-700 border border-slate-300 hover:border-red-300 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer shrink-0"
                    title="เติม .00 สตางค์ถ้วน"
                  >
                    .00
                  </button>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRequestRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Tax Withholding Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">ภาษีหัก ณ ที่จ่าย:</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setWithholdingTaxPercent(pct)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      withholdingTaxPercent === pct
                        ? 'bg-red-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pct === 0 ? '0%' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {withholdingTaxPercent > 0 && (
              <div className="text-xs text-red-800 font-bold">
                หักภาษี: -{taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </div>
            )}
          </div>

          {/* Grand Total Amount Display with Clean Typography */}
          <div className="relative overflow-hidden rounded-xl p-4 mt-3 border border-red-200 bg-gradient-to-br from-red-50/80 via-white to-red-50/40 shadow-xs">
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-red-900 tracking-wide uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                  ยอดสุทธิหน้าเช็ค:
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  {withholdingTaxPercent > 0 ? `หักภาษี ${withholdingTaxPercent}% แล้ว` : 'ยอดรวมทั้งสิ้น'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-700 tracking-tight tabular-nums flex items-baseline gap-1">
                <span>{netPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                <span className="text-sm font-bold text-slate-600">บาท</span>
              </div>
            </div>

            {/* Thai Baht text */}
            {thaiText && (
              <div className="pt-2.5 mt-2.5 border-t border-red-200/70 relative z-10 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-slate-500 font-bold">ตัวอักษร:</span>
                  <span className="text-sm sm:text-base font-bold text-red-950 font-['Sarabun','Prompt',sans-serif]">
                    {thaiText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Clear, Save Draft, and Save & Print */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleRequestClearForm}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>ล้างฟอร์ม</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {/* Button 1: Save Only */}
            <button
              type="button"
              onClick={handleInitiateSaveOnly}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-red-50 text-red-800 border border-red-300 rounded-xl font-bold text-sm transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4 text-red-700" />
              <span>บันทึกแบบร่าง</span>
            </button>

            {/* Button 2: Save and Print */}
            <button
              type="button"
              onClick={handleInitiateSaveAndPrint}
              className="w-full sm:w-auto px-6 py-2.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-xl font-black text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ring-2 ring-red-200"
            >
              <Printer className="w-5 h-5" />
              <span>บันทึกและพิมพ์</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-red-950/40 text-red-100 text-xs font-mono font-bold">
                Ctrl+P
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* IN-APP CONFIRMATION & ALERT MODALS (แจ้งเตือนและยืนยันก่อนทุกการกระทำ) */}
      {/* ========================================================================= */}

      {/* 0. IN-APP ALERT MODAL: แจ้งเตือนเมื่อข้อมูลไม่ครบถ้วน (ไม่ใช้ window.alert) */}
      {missingFieldsModal && missingFieldsModal.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 border-2 border-red-500">
            {/* Modal Header */}
            <div className="flex items-start gap-3.5 border-b border-red-100 pb-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0 ring-4 ring-red-50">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    ข้อมูลยังไม่ครบถ้วน
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMissingFieldsModal(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-red-600 mt-1">
                  ไม่สามารถบันทึกหรือสั่งพิมพ์ได้ กรุณากรอกข้อมูลที่จำเป็นต่อไปนี้ให้ครบถ้วน:
                </p>
              </div>
            </div>

            {/* Missing Fields List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {missingFieldsModal.map((err, idx) => (
                <div
                  key={err.id || idx}
                  className="p-3.5 bg-red-50/80 border border-red-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm"
                >
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-black text-red-950">
                      {err.label}
                    </div>
                    <div className="text-red-700 font-medium text-xs mt-0.5">
                      {err.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 <strong>คำแนะนำ:</strong> สามารถกดปุ่มด้านล่างเพื่อไปยังช่องที่ต้องกรอกได้ทันที
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMissingFieldsModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold cursor-pointer transition-colors"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleResolveMissingField}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-black shadow-md cursor-pointer flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <span>👉 ไปกรอกข้อมูลจุดที่ขาดทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0.1 Confirm Modal: Add Item (ยืนยันก่อนเพิ่มรายการฎีกาใหม่) */}
      {confirmModal?.type === 'ADD_ITEM' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-200 pb-3">
              <div className="p-2 bg-red-100 text-red-800 rounded-xl">
                <Plus className="w-5 h-5 text-red-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                ยืนยันการเพิ่มรายการฎีกา
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              ท่านต้องการเพิ่มแถวรายการฎีกาและจำนวนเงินใหม่ ใช่หรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAddItem}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>ยืนยันเพิ่มรายการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Confirm Modal: Save Only (ยังไม่พิมพ์) */}
      {confirmModal?.type === 'SAVE_ONLY' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-200 pb-3">
              <div className="p-2 bg-red-100 text-red-800 rounded-xl">
                <Save className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ยืนยันการบันทึกข้อมูลเช็ค
                </h3>
                <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  สถานะ: รอพิมพ์ (Pending)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              ท่านต้องการบันทึกข้อมูลเช็คนี้ลงในระบบ โดยยังไม่สั่งพิมพ์ไปยังเครื่องพิมพ์ ใช่หรือไม่?
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">สั่งจ่ายให้แก่:</span>
                <span className="font-extrabold text-slate-900 text-sm">{payeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">ยอดสุทธิสั่งจ่าย:</span>
                <span className="font-black text-red-700 text-sm tabular-nums">
                  {netPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">สมุดเช็คธนาคาร:</span>
                <span className="font-bold text-slate-800">{getBankNameThai(selectedBank)}</span>
              </div>
              {dikaNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">เลขที่ฎีกา:</span>
                  <span className="font-bold text-slate-800">{dikaNumber}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
              >
                ย้อนกลับไปแก้ไข
              </button>
              <button
                type="button"
                onClick={handleExecuteSaveOnly}
                className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>✓ ยืนยันบันทึกข้อมูล</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Confirm Modal: Save and Print Immediately */}
      {confirmModal?.type === 'SAVE_AND_PRINT' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-200 pb-3">
              <div className="p-2 bg-red-700 text-white rounded-xl">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ยืนยันบันทึกและสั่งพิมพ์เช็ค
                </h3>
                <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  บันทึกและส่งเข้าเครื่องพิมพ์ทันที
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนสั่งพิมพ์ลงเช็คจริง:
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">สั่งจ่ายให้แก่:</span>
                <span className="font-extrabold text-slate-900 text-sm">{payeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">ยอดสุทธิสั่งจ่าย:</span>
                <span className="font-black text-red-700 text-sm tabular-nums">
                  {netPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">สมุดเช็คธนาคาร:</span>
                <span className="font-bold text-slate-800">{getBankNameThai(selectedBank)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">วันที่บนเช็ค:</span>
                <span className="font-bold text-slate-800">{formatThaiDate(chequeDate)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
              >
                ย้อนกลับไปแก้ไข
              </button>
              <button
                type="button"
                onClick={handleExecuteSaveAndPrint}
                className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-black shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ ยืนยันและสั่งพิมพ์ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirm Modal: Clear Form */}
      {confirmModal?.type === 'CLEAR' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-slate-200">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-200 pb-3">
              <RotateCcw className="w-5 h-5 text-slate-600" />
              <h3 className="text-base font-bold text-slate-900">
                ยืนยันการล้างข้อมูล
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              ท่านต้องการล้างข้อมูลที่กรอกทั้งหมดในแบบฟอร์มเพื่อเริ่มต้นใหม่ ใช่หรือไม่? (ข้อมูลที่ยังไม่ได้บันทึกจะหายไป)
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmClearForm}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ยืนยันล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Confirm Modal: Remove Item */}
      {confirmModal?.type === 'REMOVE_ITEM' && confirmModal.itemId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-slate-200">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-200 pb-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-slate-900">
                ยืนยันการลบรายการฎีกา
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              ท่านต้องการลบรายการฎีกานี้ออกจากรายการสั่งจ่าย ใช่หรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRemoveItem(confirmModal.itemId!)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Successfully saved without printing (แจ้งยืนยันเมื่อบันทึกแบบยังไม่พิมพ์) */}
      {savedPendingCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-lg">
                <CheckCircle2 className="w-6 h-6" />
                <span>บันทึกข้อมูลเรียบร้อยแล้ว (สถานะ: รอพิมพ์)</span>
              </div>
              <button
                type="button"
                onClick={() => setSavedPendingCheque(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">เลขที่ฎีกา:</span>
                <span className="font-black text-slate-900">{savedPendingCheque.dikaNumber}</span>
              </div>
              {savedPendingCheque.chequeNumber && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">เลขที่เช็ค:</span>
                  <span className="font-black text-slate-900 font-mono">{savedPendingCheque.chequeNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">สั่งจ่ายให้แก่:</span>
                <span className="font-black text-slate-900">{savedPendingCheque.chequePayeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">ยอดสั่งจ่ายสุทธิ:</span>
                <span className="font-black text-red-700 tabular-nums">
                  {(savedPendingCheque.netPaidAmount || savedPendingCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">สมุดเช็คธนาคาร:</span>
                <span className="font-bold text-slate-900">{savedPendingCheque.lastBankType || selectedBank}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              💡 <strong>ข้อแนะนำ:</strong> ข้อมูลเช็คฉบับนี้ถูกจัดเก็บในระบบเรียบร้อยแล้ว ท่านสามารถกลับมาสั่งพิมพ์ได้ตลอดเวลาจากแท็บ <strong>"📋 ทะเบียนประวัติเช็ค"</strong> หรือ <strong>"📊 แดชบอร์ดผู้บริหาร"</strong>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSavedPendingCheque(null);
                  handleConfirmClearForm();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                ✍️ เขียนเช็คใบต่อไป
              </button>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={() => {
                    setSavedPendingCheque(null);
                    onNavigateToHistory();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-red-50 text-red-800 border border-red-300 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  📋 ไปดูทะเบียนประวัติ
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const toPrint = savedPendingCheque;
                  setSavedPendingCheque(null);
                  onPrintCheque(toPrint);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ สั่งพิมพ์เช็คนี้ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pull Past Cheque / Payee History (ออกเช็คใหม่ ไม่ถือว่าพิมพ์ซ้ำ) */}
      {showHistoryPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border-2 border-red-200 max-h-[90vh] flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-red-100 text-red-800 flex items-center justify-center text-sm font-black">
                    📋
                  </span>
                  <span>ดึงข้อมูลจากประวัติที่เคยสั่งจ่าย (ออกเช็คใหม่ในรอบนี้)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  เลือกรายการที่เคยสั่งจ่ายเจ้านั้นในเดือนก่อนๆ หรือรอบที่ผ่านมา เพื่อนำข้อมูลมาออกเป็นเช็คฉบับใหม่รอบนี้ <strong>โดยไม่ถือว่าเป็นการพิมพ์ซ้ำ</strong> (ระบบจะสร้างเป็นเช็คฉบับใหม่ ให้กรอกเลขที่เช็คใหม่)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryPickerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่อผู้รับเงิน, เลขที่ฎีกา, รายการค่าใช้จ่าย หรือยอดเงิน..."
                className="w-full h-11 pl-4 pr-10 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
                autoFocus
              />
              {historySearchTerm && (
                <button
                  type="button"
                  onClick={() => setHistorySearchTerm('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* List of Previous Cheques */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh]">
              {(() => {
                const term = historySearchTerm.trim().toLowerCase();
                const filtered = cheques.filter((c) => {
                  if (c.status === 'VOID') return false;
                  if (!term) return true;
                  const payeeMatch = (c.chequePayeeName || c.stubPayeeName || '').toLowerCase().includes(term);
                  const dikaMatch = (c.dikaNumber || '').toLowerCase().includes(term);
                  const bankMatch = (c.lastBankType || '').toLowerCase().includes(term);
                  const amountMatch = (c.netPaidAmount || c.totalAmount).toString().includes(term);
                  const itemsMatch = c.items?.some((it) => it.description.toLowerCase().includes(term));
                  return payeeMatch || dikaMatch || bankMatch || amountMatch || itemsMatch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-sm font-bold text-slate-600">ไม่พบประวัติการสั่งจ่ายที่ตรงกับการค้นหา</p>
                      <p className="text-xs text-slate-400 mt-1">ลองพิมพ์ค้นหาด้วยคำอื่น หรือกดปิดเพื่อกรอกข้อมูลใหม่</p>
                    </div>
                  );
                }

                return filtered.map((c) => {
                  const amt = c.netPaidAmount || c.totalAmount;
                  const bankName =
                    c.lastBankType === 'BAAC'
                      ? 'ธ.ก.ส.'
                      : c.lastBankType === 'GSB'
                      ? 'ธ.ออมสิน'
                      : 'ธ.กรุงไทย';
                  const bankBadgeBg =
                    c.lastBankType === 'BAAC'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.lastBankType === 'GSB'
                      ? 'bg-pink-100 text-pink-800'
                      : 'bg-sky-100 text-sky-800';

                  return (
                    <div
                      key={c.id}
                      className="p-3.5 bg-slate-50 hover:bg-red-50/50 border border-slate-200 hover:border-red-300 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">
                            {c.chequePayeeName || c.stubPayeeName}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${bankBadgeBg}`}>
                            {bankName}
                          </span>
                          {c.dikaNumber && (
                            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              ฎีกา: {c.dikaNumber}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                          <span>📅 วันที่ในประวัติ: {formatThaiDate(c.chequeDate || c.stubDate)}</span>
                          {c.chequeNumber && <span>เลขเช็คเดิม: {c.chequeNumber}</span>}
                          {c.items && c.items.length > 0 && (
                            <span className="text-slate-600 line-clamp-1">
                              ({c.items.map((it) => it.description).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block text-[11px] text-slate-400 font-semibold">ยอดเงินเดิม</span>
                          <span className="font-black text-sm text-red-700 tabular-nums">
                            {amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSourceCheque(c)}
                          className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="นำข้อมูลเจ้านี้มาออกเช็คใหม่ในรอบเดือนนี้ (ไม่ถือว่าพิมพ์ซ้ำ)"
                        >
                          <span>✓ เลือกออกเช็คใหม่</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>พบประวัติทั้งหมด {cheques.filter((c) => c.status !== 'VOID').length} รายการ</span>
              <button
                type="button"
                onClick={() => setShowHistoryPickerModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
