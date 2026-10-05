import React, { useState, useRef } from 'react';
import { Cheque, User } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate, formatThaiDateTime } from '../utils/dateUtils';
import {
  Plus,
  Search,
  Filter,
  Printer,
  History,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Building,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
  X,
  Download,
  Upload,
  FileText,
  Ban,
  FileUp,
  HelpCircle,
  MoreVertical,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { PaymentVoucherModal } from './PaymentVoucherModal';

interface ChequeManagementProps {
  currentUser: User;
  onOpenAddModal: () => void;
  onOpenEditModal: (cheque: Cheque) => void;
  onOpenPrintModal: (cheque: Cheque, batch?: Cheque[]) => void;
  onOpenHistoryModal: (cheque: Cheque) => void;
  cheques: Cheque[];
  onRefreshData: () => void;
}

export const ChequeManagement: React.FC<ChequeManagementProps> = ({
  currentUser,
  onOpenAddModal,
  onOpenEditModal,
  onOpenPrintModal,
  onOpenHistoryModal,
  cheques,
  onRefreshData,
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'NOT_ISSUED' | 'VOID'>('ALL');
  const [bankFilter, setBankFilter] = useState<'ALL' | 'KTB' | 'BAAC' | 'GSB'>('ALL');

  // Batch Selection State
  const [selectedChequeIds, setSelectedChequeIds] = useState<string[]>([]);

  // Payment Voucher Modal State
  const [voucherCheques, setVoucherCheques] = useState<Cheque[] | null>(null);

  // View Details Modal State
  const [viewingCheque, setViewingCheque] = useState<Cheque | null>(null);

  // Delete State
  const [chequeToDelete, setChequeToDelete] = useState<Cheque | null>(null);

  // Void Cheque State
  const [chequeToVoid, setChequeToVoid] = useState<Cheque | null>(null);
  const [voidReasonPreset, setVoidReasonPreset] = useState<string>('พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน');
  const [voidReasonNote, setVoidReasonNote] = useState<string>('');

  // Import CSV State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importStatus, setImportStatus] = useState<{ count?: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Start Guide & Action Dropdown States
  const [showQuickGuide, setShowQuickGuide] = useState<boolean>(() => {
    return localStorage.getItem('cheque_quick_guide_dismissed') !== 'true';
  });
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);

  // Close dropdown menu when clicking anywhere on document
  React.useEffect(() => {
    if (!activeMenuRowId) return;
    const handleDocClick = () => setActiveMenuRowId(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [activeMenuRowId]);

  // Filtered Cheques
  const filteredCheques = cheques.filter((item) => {
    // 1. Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDika = (item.dikaNumber || '').toLowerCase().includes(term);
      const matchChequeNo = (item.chequeNumber || '').toLowerCase().includes(term);
      const matchPayee = item.chequePayeeName.toLowerCase().includes(term) || item.stubPayeeName.toLowerCase().includes(term);
      const matchCreatedBy = item.createdBy.toLowerCase().includes(term);
      const matchPrintedBy = (item.lastPrintedBy || '').toLowerCase().includes(term);
      const matchItemDesc = item.items.some(it => it.description.toLowerCase().includes(term));

      if (!matchDika && !matchChequeNo && !matchPayee && !matchCreatedBy && !matchPrintedBy && !matchItemDesc) {
        return false;
      }
    }

    // 2. Date range filter (based on stubDate YYYY-MM-DD)
    if (startDate && item.stubDate < startDate) return false;
    if (endDate && item.stubDate > endDate) return false;

    // 2.5 Amount range filter
    if (minAmount && item.totalAmount < parseFloat(minAmount)) return false;
    if (maxAmount && item.totalAmount > parseFloat(maxAmount)) return false;

    // 3. Status filter
    if (statusFilter === 'VOID' && item.status !== 'VOID') return false;
    if (statusFilter === 'ISSUED' && (item.status === 'VOID' || item.printCount === 0)) return false;
    if (statusFilter === 'NOT_ISSUED' && (item.status === 'VOID' || item.printCount > 0)) return false;

    // 4. Bank filter
    if (bankFilter !== 'ALL' && item.lastBankType !== bankFilter) return false;

    return true;
  });

  // Calculate Quick Metric Summary
  const totalCheques = cheques.length;
  const voidCheques = cheques.filter(c => c.status === 'VOID').length;
  const issuedCheques = cheques.filter(c => c.status !== 'VOID' && c.printCount > 0).length;
  const pendingCheques = cheques.filter(c => c.status !== 'VOID' && c.printCount === 0).length;
  const totalAmountFiltered = filteredCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);
  const selectedCheques = filteredCheques.filter(c => selectedChequeIds.includes(c.id));
  const selectedTotalNet = selectedCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);

  // Toggle Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedChequeIds.length === filteredCheques.length && filteredCheques.length > 0) {
      setSelectedChequeIds([]);
    } else {
      setSelectedChequeIds(filteredCheques.map(c => c.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedChequeIds.includes(id)) {
      setSelectedChequeIds(selectedChequeIds.filter(item => item !== id));
    } else {
      setSelectedChequeIds([...selectedChequeIds, id]);
    }
  };

  // Export to Excel / CSV with UTF-8 BOM for Thai compatibility
  const handleExportExcel = () => {
    const headers = [
      'ลำดับ',
      'วันที่',
      'เลขที่ฎีกาคลังรับ',
      'ผู้รับเงิน (ตัวเช็ค)',
      'ผู้รับเงินต้นขั้ว',
      'รายการฎีกา',
      'ยอดรวม (บาท)',
      'จำนวนเงินตัวอักษร',
      'สถานะ',
      'จำนวนครั้งที่พิมพ์',
      'ออกเช็คล่าสุดโดย',
      'วันที่พิมพ์ล่าสุด',
      'ธนาคาร',
    ];

    const rows = filteredCheques.map((item, idx) => [
      idx + 1,
      item.stubDate,
      item.dikaNumber,
      `"${item.chequePayeeName.replace(/"/g, '""')}"`,
      `"${(item.stubPayeeName || item.chequePayeeName).replace(/"/g, '""')}"`,
      `"${item.items.map(it => it.description).join('; ').replace(/"/g, '""')}"`,
      item.totalAmount.toFixed(2),
      `"=${item.totalAmountThaiText}="`,
      item.printCount > 0 ? 'ออกแล้ว' : 'ยังไม่ออก',
      item.printCount,
      `"${(item.lastPrintedBy || '-').replace(/"/g, '""')}"`,
      `"${(item.lastPrintedAt ? formatThaiDateTime(item.lastPrintedAt) : '-').replace(/"/g, '""')}"`,
      `"${(item.lastBankType || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ทะเบียนคุมเช็คจ่าย_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteConfirm = () => {
    if (chequeToDelete) {
      StorageService.deleteCheque(chequeToDelete.id, currentUser);
      setChequeToDelete(null);
      onRefreshData();
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setStatusFilter('ALL');
    setBankFilter('ALL');
    setSelectedChequeIds([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            หน้าออกเช็คและจัดการรายการ (Cheque Management)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ศูนย์กลางบันทึก จัดทำ ตรวจสอบสถานะ และสั่งพิมพ์เช็ค (ทดแทน พิมพ์เช็ค(100).xlsm)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import from Excel / CSV Button */}
          <button
            type="button"
            onClick={() => {
              setCsvContent('');
              setImportStatus(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            title="นำเข้ารายการออกเช็คจำนวนมากจากไฟล์ Excel หรือ CSV"
          >
            <FileUp className="w-4 h-4 text-emerald-400" />
            <span>นำเข้า Excel/CSV</span>
          </button>

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            title="ดาวน์โหลดทะเบียนคุมเช็คจ่ายเป็นไฟล์ Excel (CSV ภาษาไทย)"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel ({filteredCheques.length})</span>
          </button>

          {/* Add Cheque Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 h-11 px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>+ เพิ่มข้อมูลออกเช็ค</span>
          </button>
        </div>
      </div>

      {/* QUICK START GUIDE (คำแนะนำการใช้งานง่ายๆ 3 ขั้นตอน) */}
      {showQuickGuide ? (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  คู่มือออกเช็คง่ายๆ ใน 3 ขั้นตอน (Quick Guide)
                </h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                  เริ่มต้นง่าย
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 text-xs">
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-800 block font-bold">1. 📝 บันทึกข้อมูลฎีกา</strong>
                  <span className="text-slate-600">กดปุ่มสีเขียว "+ เพิ่มข้อมูลออกเช็ค" กรอกเพียง 3 ช่อง (ฎีกา, ผู้รับเงิน, ยอดเงิน)</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                  <strong className="text-sky-800 block font-bold">2. 🔍 ตรวจสอบยอดสุทธิ</strong>
                  <span className="text-slate-600">คลิกที่แถวในตารางเพื่อดูสรุปยอดเงินและภาษีหัก ณ ที่จ่าย 1% อัตโนมัติ</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-800 block font-bold">3. 🖨️ สั่งพิมพ์เช็คทันที</strong>
                  <span className="text-slate-600">กดปุ่มสีเขียว "ออกเช็ค" ในตาราง ตรวจดูตัวอย่างเช็คจริง แล้วกดพิมพ์ได้ในคลิกเดียว</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowQuickGuide(false);
                localStorage.setItem('cheque_quick_guide_dismissed', 'true');
              }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-white/70 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-300"
            >
              เข้าใจแล้ว (ซ่อนคำแนะนำ)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setShowQuickGuide(true);
              localStorage.removeItem('cheque_quick_guide_dismissed');
            }}
            className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-medium cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>แสดงคู่มือ 3 ขั้นตอน</span>
          </button>
        </div>
      )}

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">จำนวนรายการทั้งหมด</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{totalCheques} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
        </div>

        <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-emerald-700">ออกเช็คแล้ว</div>
          <div className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">{issuedCheques} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
        </div>

        <div className="p-3.5 bg-white border border-amber-200/80 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-amber-700">ยังไม่ออกเช็ค (รอดำเนินการ)</div>
          <div className="text-xl font-bold text-amber-700 tabular-nums mt-0.5">{pendingCheques} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
        </div>

        {voidCheques > 0 ? (
          <div className="p-3.5 bg-white border border-rose-200/80 rounded-xl shadow-xs">
            <div className="text-[11px] font-medium text-rose-700">เช็คยกเลิก (Void)</div>
            <div className="text-xl font-bold text-rose-700 tabular-nums mt-0.5">{voidCheques} <span className="text-xs font-normal text-slate-500">ฉบับ</span></div>
          </div>
        ) : (
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">ยอดสุทธิตามเงื่อนไข</div>
            <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {totalAmountFiltered.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">บาท</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="ค้นหา: เลขฎีกา, เลขที่เช็ค, ผู้รับเงิน, รายการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Date Range: Start Date */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 shrink-0">ตั้งแต่:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Date Range: End Date */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 shrink-0">ถึง:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Amount Range Filter */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 shrink-0">ยอดเงิน:</span>
            <input
              type="number"
              placeholder="ต่ำสุด"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white tabular-nums"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              placeholder="สูงสุด"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white tabular-nums"
            />
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="ล้างตัวกรองทั้งหมด"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้าง</span>
            </button>
          </div>

        </div>

        {/* Status and Bank Filter Pills/Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-bold mr-1">กรองสถานะ:</span>
            
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>📋 ทั้งหมด</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'ALL' ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700'}`}>
                {cheques.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('NOT_ISSUED')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'NOT_ISSUED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>⏳ รอพิมพ์เช็ค</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === 'NOT_ISSUED' ? 'bg-amber-800 text-white' : 'bg-white text-amber-800'}`}>
                {pendingCheques}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ISSUED')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'ISSUED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>✓ ออกเช็คแล้ว</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === 'ISSUED' ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-800'}`}>
                {issuedCheques}
              </span>
            </button>

            {voidCheques > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('VOID')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'VOID'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>🚫 ยกเลิก/เช็คเสีย</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === 'VOID' ? 'bg-rose-900 text-white' : 'bg-white text-rose-800'}`}>
                  {voidCheques}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1">ธนาคาร:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setBankFilter('ALL')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  bankFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setBankFilter('KTB')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  bankFilter === 'KTB' ? 'bg-white text-sky-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KTB
              </button>
              <button
                type="button"
                onClick={() => setBankFilter('BAAC')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  bankFilter === 'BAAC' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                BAAC
              </button>
              <button
                type="button"
                onClick={() => setBankFilter('GSB')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  bankFilter === 'GSB' ? 'bg-white text-pink-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GSB
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Cheque Table (High Density, Immediate Scannability) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Batch Actions Strip if rows selected */}
        {selectedChequeIds.length > 0 ? (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-900">
                ✓ เลือกอยู่ {selectedChequeIds.length} รายการ
              </span>
              <button
                type="button"
                onClick={() => setSelectedChequeIds([])}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                (ยกเลิกการเลือก)
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Batch Print All Selected Button */}
              <button
                type="button"
                onClick={() => {
                  const selectedItems = filteredCheques.filter(c => selectedChequeIds.includes(c.id));
                  if (selectedItems.length > 0) {
                    onOpenPrintModal(selectedItems[0], selectedItems);
                  }
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                title="สั่งพิมพ์เช็คที่เลือกทั้งหมดต่อเนื่อง"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>🖨️ พิมพ์เช็คที่เลือก ({selectedChequeIds.length} ใบ)</span>
              </button>

              {/* Batch Voucher Print */}
              <button
                type="button"
                onClick={() => {
                  const selectedItems = filteredCheques.filter(c => selectedChequeIds.includes(c.id));
                  if (selectedItems.length > 0) {
                    setVoucherCheques(selectedItems);
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>พิมพ์ใบสำคัญจ่าย / ใบปะหน้า ({selectedChequeIds.length} ใบ)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Eye className="w-4 h-4 text-sky-600 shrink-0" />
              <span>💡 <strong>คำแนะนำ:</strong> สามารถคลิกที่แถวในตารางเพื่อเปิดดูป๊อปอัปรายละเอียดข้อมูลเช็คได้ทันที</span>
            </span>
            <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
              แสดง {filteredCheques.length} รายการ
            </span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200 text-xs sm:text-sm">
              <tr>
                <th className="py-3.5 px-3 text-center w-8">
                  <input
                    type="checkbox"
                    checked={selectedChequeIds.length === filteredCheques.length && filteredCheques.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    title="เลือกทั้งหมด / ยกเลิกทั้งหมด"
                  />
                </th>
                <th className="py-3.5 px-3 text-center w-12">ลำดับ</th>
                <th className="py-3.5 px-3 whitespace-nowrap">วันที่</th>
                <th className="py-3.5 px-3 whitespace-nowrap">เลขที่ฎีกา</th>
                <th className="py-3.5 px-3">ผู้รับเงิน (ตัวเช็ค) / ต้นขั้ว</th>
                <th className="py-3.5 px-3">รายการฎีกา</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">ยอดรวม (บาท)</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">สถานะ</th>
                <th className="py-3.5 px-3 whitespace-nowrap">ออกล่าสุด</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">จำนวนครั้ง</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap w-48">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">ไม่พบรายการออกเช็คตามเงื่อนไข</p>
                    <p className="text-xs text-slate-400 mt-1">สามารถกดปุ่ม "+ เพิ่มข้อมูลออกเช็ค" เพื่อเริ่มต้นสร้างรายการใหม่</p>
                  </td>
                </tr>
              ) : (
                filteredCheques.map((item, index) => {
                  const isIssued = item.printCount > 0;
                  const isChecked = selectedChequeIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setViewingCheque(item)}
                      className={`transition-colors group cursor-pointer ${
                        isChecked ? 'bg-emerald-50/70 hover:bg-emerald-100/70' : 'hover:bg-sky-50/70'
                      }`}
                      title="คลิกที่แถวเพื่อเปิดดูป๊อปอัปรายละเอียดข้อมูลเช็ค"
                    >
                      {/* 0. Checkbox */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* 1. ลำดับ */}
                      <td className="py-3 px-3 text-center font-medium text-slate-500 tabular-nums">
                        {index + 1}
                      </td>

                      {/* 2. วันที่ */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 tabular-nums">
                        {formatThaiDate(item.stubDate)}
                      </td>

                      {/* 3. เลขที่ฎีกา & เลขที่เช็ค */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {item.dikaNumber}
                        </div>
                        {item.chequeNumber ? (
                          <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-emerald-600 uppercase font-sans">เช็ค:</span>
                            <span className="font-bold">{item.chequeNumber}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            ยังไม่ระบุเลขเช็ค
                          </div>
                        )}
                      </td>

                      {/* 4. ผู้รับเงิน (ตัวเช็ค) & ต้นขั้ว */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {item.chequePayeeName}
                        </div>
                        {item.stubPayeeName && item.stubPayeeName !== item.chequePayeeName && (
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            ต้นขั้ว: {item.stubPayeeName}
                          </div>
                        )}
                      </td>

                      {/* 5. รายการฎีกา */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800 truncate max-w-[160px]">
                            {item.items[0]?.description || '-'}
                          </span>
                          {item.items.length > 1 && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              +{item.items.length - 1} รายการ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. ยอดเงินรวม & สุทธิ */}
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {item.withholdingTaxAmount && item.withholdingTaxAmount > 0 ? (
                          <div className="text-[11px] text-emerald-700 font-medium">
                            สุทธิ: {(item.netPaidAmount || item.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        ) : null}
                      </td>

                      {/* 7. สถานะ Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.status === 'VOID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title={`ยกเลิกโดย ${item.voidBy || '-'}: ${item.voidReason || ''}`}>
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>ยกเลิก (Void)</span>
                          </span>
                        ) : isIssued ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ออกแล้ว</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>ยังไม่ออก</span>
                          </span>
                        )}
                      </td>

                      {/* 8. ออกล่าสุด */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 text-[11px]">
                        {isIssued ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {item.lastPrintedBy}
                            </div>
                            <div className="text-slate-500 flex items-center gap-1">
                              <span>{formatThaiDateTime(item.lastPrintedAt)}</span>
                              {item.lastBankType && (
                                <span className="font-semibold text-slate-700">({item.lastBankType})</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 9. จำนวนครั้ง */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold tabular-nums">
                        {item.printCount > 0 ? (
                          <span className="text-emerald-700">
                            {item.printCount} ครั้ง
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">0 ครั้ง</span>
                        )}
                      </td>

                      {/* 10. จัดการ Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 relative">
                          
                          {/* ออกเช็ค / Print (ปุ่มหลักเด่นชัดที่สุด) */}
                          <button
                            type="button"
                            onClick={() => onOpenPrintModal(item)}
                            title="ออกเช็ค / พิมพ์เช็ค"
                            className="px-3.5 py-1.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5 font-bold text-xs sm:text-sm"
                          >
                            <Printer className="w-4 h-4" />
                            <span>ออกเช็ค</span>
                          </button>

                          {/* แก้ไขด่วน */}
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(item)}
                            title="แก้ไขข้อมูล"
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* เมนูตัวเลือกเพิ่มเติม (...) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuRowId(activeMenuRowId === item.id ? null : item.id)}
                              title="คำสั่งเพิ่มเติม"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                activeMenuRowId === item.id
                                  ? 'bg-slate-200 text-slate-900'
                                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuRowId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs text-left animate-in fade-in duration-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    setViewingCheque(item);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                                  <span>ดูรายละเอียดเช็ค</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    setVoucherCheques([item]);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>พิมพ์ใบสำคัญจ่าย (A4)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    onOpenHistoryModal(item);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5 text-amber-600" />
                                  <span>ดูประวัติการพิมพ์</span>
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                {item.status !== 'VOID' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuRowId(null);
                                      setChequeToVoid(item);
                                      setVoidReasonPreset('พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน');
                                      setVoidReasonNote('');
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 cursor-pointer font-medium"
                                  >
                                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                                    <span>ยกเลิกเช็ค (Void)</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    setChequeToDelete(item);
                                  }}
                                  className="w-full px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>ลบรายการนี้</span>
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            แสดงทั้งหมด <strong>{filteredCheques.length}</strong> จาก <strong>{cheques.length}</strong> รายการ {selectedChequeIds.length > 0 && <span className="text-emerald-700 font-semibold ml-1">(เลือกอยู่ {selectedChequeIds.length} รายการ)</span>}
          </div>
          <div className="flex items-center gap-3">
            <span>
              ออกแล้ว: <strong className="text-emerald-700 font-semibold">{filteredCheques.filter(c => c.printCount > 0).length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              ยังไม่ออก: <strong className="text-amber-700 font-semibold">{filteredCheques.filter(c => c.printCount === 0).length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              ยอดรวมแสดงผล: <strong className="text-slate-900 font-bold tabular-nums">{totalAmountFiltered.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> บาท
            </span>
          </div>
        </div>

      </div>

      {/* Floating Sticky Batch Action Bar (When 1+ cheques selected) */}
      {selectedChequeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-sm">
              เลือกแล้ว {selectedChequeIds.length} รายการ
            </span>
            <span className="text-slate-300">
              (รวม {cheques.filter(c => selectedChequeIds.includes(c.id)).reduce((s, c) => s + c.totalAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Print Cheques */}
            <button
              type="button"
              onClick={() => {
                const selected = cheques.filter(c => selectedChequeIds.includes(c.id));
                if (selected.length > 0) {
                  onOpenPrintModal(selected[0], selected);
                }
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เช็คต่อเนื่อง ({selectedChequeIds.length} ฉบับ)</span>
            </button>

            {/* Batch Print A4 Voucher */}
            <button
              type="button"
              onClick={() => {
                const selected = cheques.filter(c => selectedChequeIds.includes(c.id));
                setVoucherCheques(selected);
              }}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>พิมพ์ใบสำคัญจ่าย A4 ({selectedChequeIds.length} ฉบับ)</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedChequeIds([])}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingCheque && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      รายละเอียดข้อมูลเช็ค — ฎีกา {viewingCheque.dikaNumber}
                    </h2>
                    {viewingCheque.printCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>ออกแล้ว {viewingCheque.printCount} ครั้ง</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>ยังไม่ออกเช็ค</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ข้อมูลต้นขั้ว ตัวเช็ค และรายการฎีกาย่อย
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCheque(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              
              {/* Void Alert Banner if VOID */}
              {viewingCheque.status === 'VOID' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                  <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm font-bold text-rose-900 block">
                      เช็คฉบับนี้ถูกยกเลิกแล้ว (VOID)
                    </strong>
                    <div className="mt-1 text-xs">
                      <span>เหตุผล: <strong>{viewingCheque.voidReason || 'ไม่ได้ระบุ'}</strong></span>
                      <span className="mx-2">·</span>
                      <span>ยกเลิกโดย: {viewingCheque.voidBy || '-'} ({viewingCheque.voidAt ? formatThaiDateTime(viewingCheque.voidAt) : '-'})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    เลขที่ฎีกาคลังรับ:
                  </span>
                  <div className="font-bold text-base text-slate-900 font-mono mt-0.5">
                    {viewingCheque.dikaNumber}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    เลขที่เช็ค (Cheque No.):
                  </span>
                  <div className="font-bold text-base text-emerald-800 font-mono mt-0.5">
                    {viewingCheque.chequeNumber || (
                      <span className="text-slate-400 font-sans text-xs font-normal">ยังไม่ได้ระบุเลขที่เช็ค</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    วันที่ต้นขั้ว:
                  </span>
                  <div className="font-medium text-sm text-slate-800 mt-0.5">
                    {formatThaiDate(viewingCheque.stubDate)}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    วันที่บนหน้าเช็ค:
                  </span>
                  <div className="font-medium text-sm text-slate-800 mt-0.5">
                    {formatThaiDate(viewingCheque.chequeDate || viewingCheque.stubDate)}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    ชื่อผู้รับเงิน (ตัวเช็ค):
                  </span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {viewingCheque.chequePayeeName}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    ชื่อผู้รับต้นขั้ว (Stub Payee):
                  </span>
                  <div className="font-medium text-sm text-slate-800 mt-0.5">
                    {viewingCheque.stubPayeeName || viewingCheque.chequePayeeName}
                  </div>
                </div>

                {viewingCheque.bankAccountNo && (
                  <div className="pt-2 border-t border-slate-200 sm:col-span-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      เลขที่บัญชีธนาคารสั่งจ่าย:
                    </span>
                    <div className="font-mono text-sm text-slate-800 font-semibold mt-0.5">
                      {viewingCheque.bankAccountNo}
                    </div>
                  </div>
                )}
              </div>

              {/* Withholding Tax Breakdown if any */}
              {viewingCheque.withholdingTaxAmount && viewingCheque.withholdingTaxAmount > 0 ? (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-amber-950 block">การหักภาษี ณ ที่จ่าย ({viewingCheque.withholdingTaxPercent || 1}%):</span>
                    <span className="text-amber-800">
                      หักภาษี {viewingCheque.withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">ยอดสั่งจ่ายสุทธิบนหน้าเช็ค:</span>
                    <span className="text-base font-extrabold text-emerald-700 tabular-nums">
                      {(viewingCheque.netPaidAmount || viewingCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Sub items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-xs">
                    รายการฎีกาย่อย ({viewingCheque.items.length} รายการ):
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    ยอดรวมสุทธิ: <strong className="text-slate-900 font-bold">{viewingCheque.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                        <th className="py-2.5 px-3">รายการฎีกา</th>
                        <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingCheque.items.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium">{it.description}</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums text-slate-900">
                            {it.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/80 font-bold border-t border-slate-200">
                        <td colSpan={2} className="py-2.5 px-3 text-right text-emerald-950 font-bold">
                          ยอดรวมทั้งสิ้น:
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 text-sm tabular-nums font-black">
                          {viewingCheque.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="text-slate-500 font-semibold mr-1.5">จำนวนเงินตัวอักษร:</span>
                  <span className="font-bold text-slate-900">={viewingCheque.totalAmountThaiText}=</span>
                </div>
              </div>

              {/* Audit & Print Log Summary */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-500 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">ผู้บันทึกสร้างรายการ:</span>
                  <strong className="text-slate-700 font-semibold">{viewingCheque.createdBy}</strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ({formatThaiDateTime(viewingCheque.createdAt)})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">ประวัติการพิมพ์ล่าสุด:</span>
                  {viewingCheque.printCount > 0 ? (
                    <div>
                      <strong className="text-emerald-700 font-semibold">
                        ออกล่าสุดโดย: {viewingCheque.lastPrintedBy || '-'}
                      </strong>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        ธนาคาร: {viewingCheque.lastBankType || '-'} · {formatThaiDateTime(viewingCheque.lastPrintedAt)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-600 font-medium">ยังไม่เคยสั่งพิมพ์</span>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingCheque;
                    setViewingCheque(null);
                    onOpenPrintModal(target);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>ออกเช็ค / พิมพ์เช็คฉบับนี้</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = viewingCheque;
                    setVoucherCheques([target]);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="พิมพ์ใบสำคัญจ่ายและใบนำส่งเช็คลงกระดาษ A4"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>พิมพ์ใบสำคัญจ่าย (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = viewingCheque;
                    setViewingCheque(null);
                    onOpenEditModal(target);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>แก้ไขข้อมูล</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = viewingCheque;
                    setViewingCheque(null);
                    onOpenHistoryModal(target);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>ประวัติการพิมพ์</span>
                </button>

                {viewingCheque.status !== 'VOID' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingCheque;
                      setViewingCheque(null);
                      setChequeToVoid(target);
                      setVoidReasonPreset('พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน');
                      setVoidReasonNote('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>ยกเลิกเช็ค (Void)</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingCheque(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VOID CHEQUE CONFIRMATION MODAL */}
      {chequeToVoid && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการยกเลิกเช็ค (Void Cheque)?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  ยกเลิกเช็คฎีกา <strong>{chequeToVoid.dikaNumber}</strong> {chequeToVoid.chequeNumber ? `(เลขที่เช็ค ${chequeToVoid.chequeNumber})` : ''} ผู้รับเงิน: {chequeToVoid.chequePayeeName}
                </p>
              </div>
            </div>

            {/* Reason Selector */}
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">
                ระบุเหตุผลการยกเลิกเช็ค: <span className="text-rose-500">*</span>
              </label>
              <select
                value={voidReasonPreset}
                onChange={(e) => setVoidReasonPreset(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs font-medium"
              >
                <option value="พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน">พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน</option>
                <option value="เครื่องพิมพ์ขัดข้อง / กระดาษติดชำรุด">เครื่องพิมพ์ขัดข้อง / กระดาษติดชำรุด</option>
                <option value="ยกเลิกฎีกา / แก้ไขสัญญา">ยกเลิกฎีกา / แก้ไขสัญญา</option>
                <option value="ขอเปลี่ยนแปลงชื่อผู้รับเงิน">ขอเปลี่ยนแปลงชื่อผู้รับเงิน</option>
                <option value="ระบุเลขที่เช็คผิดพลาด">ระบุเลขที่เช็คผิดพลาด</option>
                <option value="อื่น ๆ">อื่น ๆ (ระบุเอง)</option>
              </select>

              {voidReasonPreset === 'อื่น ๆ' && (
                <textarea
                  rows={2}
                  required
                  value={voidReasonNote}
                  onChange={(e) => setVoidReasonNote(e.target.value)}
                  placeholder="ระบุเหตุผลเพิ่มเติม..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setChequeToVoid(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason = voidReasonPreset === 'อื่น ๆ' ? (voidReasonNote.trim() || 'อื่น ๆ') : voidReasonPreset;
                  StorageService.voidCheque(chequeToVoid.id, finalReason, currentUser);
                  setChequeToVoid(null);
                  onRefreshData();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                ยืนยันยกเลิกเช็ค (Void)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT CHEQUES MODAL (EXCEL / CSV) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    นำเข้ารายการออกเช็คจาก Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    นำเข้ารายการฎีกาและเช็คจำนวนมากเข้ามาในระบบได้ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Download Template Strip */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>ดาวน์โหลดไฟล์แม่แบบตัวอย่าง CSV ภาษาไทย (เปิดใน Excel ได้ทันที)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sample = StorageService.generateCsvTemplate();
                  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `แม่แบบนำเข้าเช็ค_ตัวอย่าง.csv`;
                  a.click();
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>โหลดแม่แบบ CSV</span>
              </button>
            </div>

            {/* File upload or text area */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกไฟล์ CSV จากเครื่องคอมพิวเตอร์ของคุณ:
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target?.result as string;
                        setCsvContent(text);
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หรือวางข้อความรูปแบบ CSV ที่คัดลอกมาจาก Excel:
                </label>
                <textarea
                  rows={5}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`วันที่,เลขที่ฎีกาคลังรับ,ผู้รับเงิน(ตัวเช็ค),ผู้รับเงิน(ต้นขั้ว),รายการฎีกา,จำนวนเงิน(บาท),เลขที่เช็ค(ถ้ามี)\n2026-10-02,130/69,บริษัท ABC จำกัด,บริษัท ABC จำกัด,ค่าวัสดุสำนักงาน,15000.00,1029305`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Import Feedback / Errors */}
            {importStatus?.errors && importStatus.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>พบข้อผิดพลาดในการประมวลผล:</span>
                </div>
                {importStatus.errors.map((err, i) => (
                  <div key={i} className="pl-4">• {err}</div>
                ))}
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!csvContent.trim()}
                onClick={() => {
                  const res = StorageService.importChequesFromCsv(csvContent, currentUser);
                  if (res.success) {
                    setIsImportModalOpen(false);
                    setCsvContent('');
                    onRefreshData();
                  } else {
                    setImportStatus({ errors: res.errors });
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                นำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {chequeToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบรายการออกเช็ค?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  คุณกำลังจะลบรายการฎีกา <strong>{chequeToDelete.dikaNumber}</strong> ({chequeToDelete.chequePayeeName}) มูลค่า <strong>{chequeToDelete.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
                </p>
                {chequeToDelete.printCount > 0 && (
                  <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    ⚠ รายการนี้เคยออกเช็คไปแล้ว {chequeToDelete.printCount} ครั้ง การลบจะถูกบันทึกใน Audit Log
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setChequeToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Batch Bar when rows are selected */}
      {selectedChequeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4 max-w-2xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
              {selectedChequeIds.length}
            </span>
            <div className="text-xs">
              <div className="font-bold text-white">
                เลือกไว้ {selectedChequeIds.length} รายการ
              </div>
              <div className="text-[11px] text-emerald-400">
                ยอดสุทธิรวม: <strong>{selectedTotalNet.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Print All Selected */}
            <button
              type="button"
              onClick={() => {
                if (selectedCheques.length > 0) {
                  onOpenPrintModal(selectedCheques[0], selectedCheques);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-900/50 flex items-center gap-1.5 cursor-pointer text-xs transition-all active:scale-95"
              title="สั่งพิมพ์เช็คที่เลือกทั้งหมดอย่างต่อเนื่อง"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ สั่งพิมพ์เช็คต่อเนื่อง ({selectedChequeIds.length})</span>
            </button>

            {/* Batch Voucher Print */}
            <button
              type="button"
              onClick={() => {
                if (selectedCheques.length > 0) {
                  setVoucherCheques(selectedCheques);
                }
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-600 font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
              title="พิมพ์ใบสำคัญจ่าย / ใบปะหน้า ฎีกาที่เลือกทั้งหมด"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>ใบสำคัญจ่ายรวม</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedChequeIds([])}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs"
              title="ยกเลิกการเลือกทั้งหมด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Printable Payment Voucher & Cheque Handover Modal (A4) */}
      {voucherCheques && (
        <PaymentVoucherModal
          isOpen={Boolean(voucherCheques)}
          onClose={() => setVoucherCheques(null)}
          cheques={voucherCheques}
          currentUser={currentUser}
        />
      )}

    </div>
  );
};
