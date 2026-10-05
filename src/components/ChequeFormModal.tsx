import React, { useState, useEffect } from 'react';
import { Cheque, ChequeItem, User } from '../types';
import { StorageService } from '../utils/storage';
import { getTodayISODate, formatThaiDate } from '../utils/dateUtils';
import { thaiBahtText } from '../utils/thaiBahtText';
import { Plus, Trash2, X, AlertCircle, Copy, Check, Printer, Sparkles, RefreshCw } from 'lucide-react';

interface ChequeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cheque: Cheque) => void;
  onSaveAndPrint?: (cheque: Cheque) => void;
  editingCheque?: Cheque | null;
  currentUser: User;
}

export const ChequeFormModal: React.FC<ChequeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndPrint,
  editingCheque,
  currentUser,
}) => {
  const [stubDate, setStubDate] = useState(getTodayISODate());
  const [chequeDate, setChequeDate] = useState(getTodayISODate());
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('123-1-45678-9');
  const [stubPayeeName, setStubPayeeName] = useState('');
  const [chequePayeeName, setChequePayeeName] = useState('');
  const [dikaNumber, setDikaNumber] = useState('');
  const [items, setItems] = useState<ChequeItem[]>([
    { id: 'item_1', description: '', amount: 0 }
  ]);
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<number>(0);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedPayee, setCopiedPayee] = useState(false);
  const [formMode, setFormMode] = useState<'QUICK' | 'DETAILED'>('QUICK'); // Quick mode default for speed

  // Autocomplete data
  const [autocomplete, setAutocomplete] = useState<{
    payees: string[];
    descriptions: string[];
    dikaNumbers: string[];
  }>({ payees: [], descriptions: [], dikaNumbers: [] });

  useEffect(() => {
    if (isOpen) {
      setAutocomplete(StorageService.getAutocompleteData());
      if (editingCheque) {
        setStubDate(editingCheque.stubDate || getTodayISODate());
        setChequeDate(editingCheque.chequeDate || editingCheque.stubDate || getTodayISODate());
        setChequeNumber(editingCheque.chequeNumber || '');
        setBankAccountNo(editingCheque.bankAccountNo || '123-1-45678-9');
        setStubPayeeName(editingCheque.stubPayeeName || '');
        setChequePayeeName(editingCheque.chequePayeeName || '');
        setDikaNumber(editingCheque.dikaNumber || '');
        setWithholdingTaxPercent(editingCheque.withholdingTaxPercent || 0);
        setMemo(editingCheque.memo || '');
        setItems(
          editingCheque.items.length > 0
            ? editingCheque.items.map(it => ({ ...it }))
            : [{ id: 'item_1', description: '', amount: 0 }]
        );
      } else {
        // Reset form for new entry with +1 Auto-Increment cheque number
        const defaultAccount = '123-1-45678-9';
        const nextChequeNo = StorageService.getNextChequeNumber(defaultAccount);
        setStubDate(getTodayISODate());
        setChequeDate(getTodayISODate());
        setChequeNumber(nextChequeNo);
        setBankAccountNo(defaultAccount);
        setStubPayeeName('');
        setChequePayeeName('');
        setDikaNumber('');
        setWithholdingTaxPercent(0);
        setMemo('');
        setItems([{ id: 'item_1', description: '', amount: 0 }]);
      }
      setError(null);
      setCopiedPayee(false);
    }
  }, [isOpen, editingCheque]);

  if (!isOpen) return null;

  // Dynamic calculations
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxAmount = withholdingTaxPercent > 0 ? Math.round((totalAmount * withholdingTaxPercent / 100) * 100) / 100 : 0;
  const netPaidAmount = Math.max(0, Math.round((totalAmount - taxAmount) * 100) / 100);
  const totalAmountThai = thaiBahtText(netPaidAmount > 0 ? netPaidAmount : totalAmount);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), description: '', amount: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...items];
    if (field === 'amount') {
      const num = parseFloat(value as string);
      updated[index].amount = isNaN(num) ? 0 : num;
    } else {
      updated[index].description = value as string;
    }
    setItems(updated);
  };

  const handleCopyPayee = () => {
    if (stubPayeeName) {
      setChequePayeeName(stubPayeeName);
      setCopiedPayee(true);
      setTimeout(() => setCopiedPayee(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();
    
    const effectiveChequePayee = chequePayeeName.trim();
    const effectiveStubPayee = stubPayeeName.trim() || effectiveChequePayee;

    if (!effectiveChequePayee) {
      setError('กรุณาระบุชื่อผู้รับเงิน (สั่งจ่ายใคร)');
      return;
    }
    if (!dikaNumber.trim()) {
      setError('กรุณาระบุเลขที่ฎีกาคลังรับ');
      return;
    }
    if (totalAmount <= 0) {
      setError('ยอดเงินรวมต้องมากกว่า 0 บาท');
      return;
    }

    let validItems = items.filter(it => it.description.trim() || it.amount > 0);
    if (validItems.length === 0) {
      if (totalAmount > 0) {
        validItems = [{
          id: 'item_1',
          description: `จ่ายตามฎีกาคลังรับ ${dikaNumber.trim()}`,
          amount: totalAmount,
        }];
      } else {
        setError('กรุณาระบุจำนวนเงินอย่างน้อย 1 รายการ');
        return;
      }
    }

    const chequeToSave: Cheque = {
      id: editingCheque ? editingCheque.id : 'chq_' + Date.now(),
      chequeNumber: chequeNumber.trim() || undefined,
      stubDate: stubDate || getTodayISODate(),
      chequeDate: chequeDate || stubDate || getTodayISODate(),
      bankAccountNo: bankAccountNo.trim() || undefined,
      stubPayeeName: effectiveStubPayee,
      chequePayeeName: effectiveChequePayee,
      dikaNumber: dikaNumber.trim(),
      items: validItems,
      totalAmount,
      withholdingTaxPercent: withholdingTaxPercent > 0 ? withholdingTaxPercent : undefined,
      withholdingTaxAmount: taxAmount > 0 ? taxAmount : undefined,
      netPaidAmount,
      totalAmountThaiText: totalAmountThai,
      memo: memo.trim() || undefined,
      status: editingCheque ? editingCheque.status : (chequeNumber.trim() ? 'ISSUED' : 'PENDING'),
      createdBy: editingCheque ? editingCheque.createdBy : currentUser.fullName,
      createdByUsername: editingCheque ? editingCheque.createdByUsername : currentUser.username,
      createdAt: editingCheque ? editingCheque.createdAt : new Date().toISOString(),
      printCount: editingCheque ? editingCheque.printCount : (chequeNumber.trim() ? 1 : 0),
      lastPrintedAt: editingCheque?.lastPrintedAt,
      lastPrintedBy: editingCheque?.lastPrintedBy,
      lastBankType: editingCheque?.lastBankType,
    };

    if (andPrint && onSaveAndPrint) {
      onSaveAndPrint(chequeToSave);
    } else {
      onSave(chequeToSave);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingCheque ? 'แก้ไขข้อมูลรายการออกเช็ค' : 'เพิ่มรายการออกเช็คใหม่'}
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>ผู้บันทึก: <strong className="text-slate-700">{editingCheque ? editingCheque.createdBy : currentUser.fullName}</strong></span>
              <span aria-hidden="true">·</span>
              <span>วันที่ทำรายการ: {formatThaiDate(new Date())}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Mode Toggle: Quick Mode vs Detailed Mode */}
          <div className="flex items-center justify-between p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFormMode('QUICK')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                formMode === 'QUICK'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>⚡ โหมดกรอกด่วน (Quick Mode - 3 ขั้นตอนเสร็จ)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormMode('DETAILED')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                formMode === 'DETAILED'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>📋 โหมดกรอกแบบละเอียด (Detailed Mode)</span>
            </button>
          </div>

          {formMode === 'QUICK' ? (
            <div className="space-y-4">
              
              {/* Step 1: เลขที่ฎีกา & เลขที่เช็ค & วันที่ */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>ข้อมูลฎีกาและเลขที่เช็ค</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลขที่ฎีกาคลังรับ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="dika-list-quick"
                      value={dikaNumber}
                      onChange={(e) => setDikaNumber(e.target.value)}
                      placeholder="เช่น 123/69"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <datalist id="dika-list-quick">
                      {autocomplete.dikaNumbers.map((d, i) => (
                        <option key={i} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        เลขที่เช็ค
                      </label>
                      {!editingCheque && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          <span>รันเลขอัตโนมัติ +1</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="เช่น 1029302"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      วันที่สั่งจ่าย
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => {
                        setChequeDate(e.target.value);
                        setStubDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: สั่งจ่ายใคร (ผู้รับเงิน) พร้อมระบบแนะนำชื่อ */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
                    <span>สั่งจ่ายใคร (ชื่อผู้รับเงินบนเช็ค)</span> <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    พิมพ์ 1-2 ตัวอักษรเพื่อค้นหาอัตโนมัติ
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    list="payee-list-quick"
                    value={chequePayeeName}
                    onChange={(e) => {
                      setChequePayeeName(e.target.value);
                      setStubPayeeName(e.target.value);
                    }}
                    placeholder="พิมพ์ชื่อบุคคล / นิติบุคคล / ร้านค้า ที่ต้องการสั่งจ่าย..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <datalist id="payee-list-quick">
                    {autocomplete.payees.map((p, i) => (
                      <option key={i} value={p} />
                    ))}
                  </datalist>
                </div>

                {/* Quick Suggestion Chips */}
                {autocomplete.payees.length > 0 && (
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1.5">
                      💡 ผู้รับเงินที่เคยสั่งจ่ายบ่อย (คลิกเพื่อเลือกทันที):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {autocomplete.payees.slice(0, 6).map((payee, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setChequePayeeName(payee);
                            setStubPayeeName(payee);
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                        >
                          + {payee}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: จำนวนเงิน & ภาษีหัก ณ ที่จ่าย 1% */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">3</span>
                  <span>จำนวนเงินสั่งจ่าย (บาท) & ภาษีหัก ณ ที่จ่าย</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={items[0]?.amount === 0 ? '' : items[0]?.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleItemChange(0, 'amount', val);
                          if (!items[0]?.description) {
                            handleItemChange(0, 'description', `จ่ายตามฎีกาคลังรับ ${dikaNumber || ''}`);
                          }
                        }}
                        className="w-full pl-3.5 pr-8 py-2.5 text-base bg-white border border-slate-300 rounded-lg text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                        ฿
                      </span>
                    </div>
                  </div>

                  {/* 1% Tax Checkbox */}
                  <div className="sm:pt-5">
                    <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={withholdingTaxPercent === 1}
                        onChange={(e) => setWithholdingTaxPercent(e.target.checked ? 1 : 0)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        หักภาษี ณ ที่จ่าย 1% (คำนวณหักอัตโนมัติ)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Net Summary Box */}
                {totalAmount > 0 && (
                  <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        {withholdingTaxPercent > 0 ? 'ยอดสั่งจ่ายสุทธิหลังหักภาษี 1%:' : 'ยอดสั่งจ่ายบนหน้าเช็ค:'}
                      </div>
                      <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                        ตัวอักษร: <strong className="underline decoration-emerald-500 font-bold">{totalAmountThai}</strong>
                      </div>
                      {withholdingTaxPercent > 0 && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ยอดรวมก่อนหัก: {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ. · ภาษี 1%: {taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                        {netPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-emerald-900 ml-1">บาท</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <>
          {/* Section 1: Main Cheque Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* วันที่ต้นขั้ว */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                1. วันที่ต้นขั้ว <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={stubDate}
                onChange={(e) => {
                  setStubDate(e.target.value);
                  if (!editingCheque) setChequeDate(e.target.value);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                แสดงผล พ.ศ.: {formatThaiDate(stubDate)}
              </span>
            </div>

            {/* วันที่สั่งจ่ายบนหน้าเช็ค */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                2. วันที่สั่งจ่ายบนหน้าเช็ค <span className="text-slate-400 font-normal">(ถ้าไม่ระบุใช้วันที่ต้นขั้ว)</span>
              </label>
              <input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                แสดงผล พ.ศ.: {formatThaiDate(chequeDate)}
              </span>
            </div>

            {/* เลขที่ฎีกาคลังรับ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                3. เลขที่ฎีกาคลังรับ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                list="dika-list"
                value={dikaNumber}
                onChange={(e) => setDikaNumber(e.target.value)}
                placeholder="เช่น 123/69"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
              />
              <datalist id="dika-list">
                {autocomplete.dikaNumbers.map((d, i) => (
                  <option key={i} value={d} />
                ))}
              </datalist>
            </div>

            {/* เลขที่เช็ค (ถ้ามี) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                4. เลขที่เช็ค (Cheque No.) <span className="text-slate-400 font-normal">(ระบุล่วงหน้าหรือใส่ตอนสั่งพิมพ์)</span>
              </label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="เช่น 1029301 (7-8 หลัก)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* ชื่อผู้รับต้นขั้วเช็ค */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                5. ชื่อผู้รับต้นขั้วเช็ค <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="payee-list-stub"
                  value={stubPayeeName}
                  onChange={(e) => setStubPayeeName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี หรือ บริษัท ABC จำกัด"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <datalist id="payee-list-stub">
                  {autocomplete.payees.map((p, i) => (
                    <option key={i} value={p} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* ชื่อผู้รับเงิน (ตัวเช็ค) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  6. ชื่อผู้รับเงิน (ตัวเช็ค) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyPayee}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
                  title="คัดลอกจากชื่อผู้รับต้นขั้ว"
                >
                  {copiedPayee ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอกจากต้นขั้ว</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                required
                list="payee-list-cheque"
                value={chequePayeeName}
                onChange={(e) => setChequePayeeName(e.target.value)}
                placeholder="ชื่อบุคคล/นิติบุคคลที่ระบุบนหน้าเช็ค"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
              />
              <datalist id="payee-list-cheque">
                {autocomplete.payees.map((p, i) => (
                  <option key={i} value={p} />
                ))}
              </datalist>
            </div>

            {/* เลขที่บัญชีธนาคารสั่งจ่าย */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                7. บัญชีธนาคารสั่งจ่าย (Bank Account)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="เช่น 123-1-45678-9"
                  className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <select
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
                >
                  <option value="123-1-45678-9">ธ.กรุงไทย (123-1-45678-9)</option>
                  <option value="987-2-12345-0">ธ.ก.ส. (987-2-12345-0)</option>
                  <option value="345-0-98765-4">ธ.ออมสิน (345-0-98765-4)</option>
                  <option value="">บัญชีอื่น ๆ (ระบุเอง)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Section 2: รายการฎีกาและจำนวนเงิน (1 Cheque to Many Items) */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  5. รายการฎีกาและจำนวนเงิน
                </h3>
                <p className="text-xs text-slate-500">
                  หนึ่งรายการออกเช็คสามารถเพิ่มรายการฎีกาย่อยได้หลายรายการ ระบบจะคำนวณยอดรวมให้อัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการฎีกา</span>
              </button>
            </div>

            {/* Items Table / List */}
            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80"
                >
                  <span className="text-xs font-semibold text-slate-500 w-6 text-center shrink-0">
                    {index + 1}.
                  </span>
                  
                  {/* รายการฎีกา Description */}
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      list="desc-list"
                      placeholder="รายการฎีกา เช่น ค่าวัสดุสำนักงาน, ค่าจ้างเหมาบริการ..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* จำนวนเงิน Amount */}
                  <div className="w-full sm:w-44">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={item.amount === 0 ? '' : item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 text-right tabular-nums font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400 pointer-events-none">
                        ฿
                      </span>
                    </div>
                  </div>

                  {/* ลบปุ่ม */}
                  <div className="flex justify-end sm:justify-center">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(index)}
                      title="ลบรายการนี้"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <datalist id="desc-list">
              {autocomplete.descriptions.map((desc, i) => (
                <option key={i} value={desc} />
              ))}
            </datalist>

            {/* Section 3: Withholding Tax (ภาษีหัก ณ ที่จ่าย) */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    6. ภาษีหัก ณ ที่จ่าย (Withholding Tax)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    เลือกร้อยละที่ต้องการหักภาษี ระบบจะคำนวณภาษีและยอดสั่งจ่ายสุทธิ (Net Amount) บนหน้าเช็คให้อัตโนมัติ
                  </p>
                </div>

                {/* Quick Tax Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: 'ไม่หัก (0%)', val: 0 },
                    { label: 'หัก 1% (บริการ)', val: 1 },
                    { label: 'หัก 0.75%', val: 0.75 },
                    { label: 'หัก 2%', val: 2 },
                    { label: 'หัก 3%', val: 3 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setWithholdingTaxPercent(preset.val)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors cursor-pointer ${
                        withholdingTaxPercent === preset.val
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {withholdingTaxPercent > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">ยอดรวมก่อนภาษี:</span>
                    <span className="font-bold text-slate-800 text-sm tabular-nums">
                      {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                    <span className="block text-[11px] text-amber-700">หักภาษี ณ ที่จ่าย ({withholdingTaxPercent}%):</span>
                    <span className="font-bold text-sm tabular-nums">
                      - {taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                    <span className="block text-[11px] text-emerald-700">ยอดสั่งจ่ายสุทธิ (บนหน้าเช็ค):</span>
                    <span className="font-bold text-sm tabular-nums text-emerald-700">
                      {netPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Total Summary Box */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  ยอดสั่งจ่ายสุทธิบนหน้าเช็ค (Net Cheque Amount)
                </div>
                <div className="text-sm font-semibold text-emerald-800 mt-1">
                  ตัวอักษร: <span className="underline decoration-emerald-500/50 font-bold">{totalAmountThai}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {netPaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-emerald-900 ml-1.5">บาท</span>
                </div>
                {withholdingTaxPercent > 0 && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    (จากยอดก่อนหักภาษี {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.)
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: หมายเหตุ / บันทึกช่วยจำ */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                7. หมายเหตุ / บันทึกช่วยจำ (Memo) <span className="text-slate-400 font-normal">(ถ้ามี)</span>
              </label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม เช่น สัญญาจ้างเลขที่... หรือ เอกสารประกอบเพิ่มเติม..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

          </div>
          </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <div className="flex items-center gap-2.5">
              {/* Secondary: Save only */}
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                title="บันทึกข้อมูลและปิดหน้าต่างกลับสู่ตาราง"
              >
                <span>💾 {editingCheque ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลเท่านั้น'}</span>
              </button>

              {/* Primary: Save and Open Print Modal immediately */}
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md hover:shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="บันทึกข้อมูลและเปิดหน้าต่างพิมพ์เช็คฉบับนี้ทันทีใน 1 คลิก ไม่ต้องไปหาในตาราง"
              >
                <Printer className="w-4 h-4" />
                <span>⚡ บันทึกและสั่งพิมพ์เช็คทันที</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
