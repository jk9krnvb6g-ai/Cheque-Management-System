import React, { useState } from 'react';
import { BankType, Cheque, User } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate, formatThaiDateTime } from '../utils/dateUtils';
import { ChequeDetailModal } from './ChequeDetailModal';
import {
  Printer,
  Search,
  Download,
  Ban,
  CheckCircle2,
  Clock,
  X,
  FileSpreadsheet,
  Building,
  Filter,
  Trash2,
  Eye,
  User as UserIcon,
} from 'lucide-react';

interface ChequeHistoryViewProps {
  currentUser: User;
  cheques: Cheque[];
  onOpenPrintModal: (cheque: Cheque) => void;
  onRefreshData: () => void;
  initialFilter?: 'ALL' | 'PENDING' | 'ISSUED' | 'VOID';
  onDuplicateAsNewCheque?: (cheque: Cheque) => void;
}

export const ChequeHistoryView: React.FC<ChequeHistoryViewProps> = ({
  currentUser,
  cheques,
  onOpenPrintModal,
  onRefreshData,
  initialFilter = 'ALL',
  onDuplicateAsNewCheque,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState<'ALL' | BankType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ISSUED' | 'VOID'>(initialFilter);

  // Cheque detail popup modal state (คลิกที่แถวหรือปุ่มดูข้อมูลเพื่อเปิด popup)
  const [selectedChequeForDetail, setSelectedChequeForDetail] = useState<Cheque | null>(null);

  // Void and Delete modal state
  const [voidModalCheque, setVoidModalCheque] = useState<Cheque | null>(null);
  const [deleteModalCheque, setDeleteModalCheque] = useState<Cheque | null>(null);
  const [voidReason, setVoidReason] = useState('พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  // Counts
  const totalPendingCount = cheques.filter((c) => c.status !== 'VOID' && c.printCount === 0).length;
  const totalIssuedCount = cheques.filter((c) => c.status !== 'VOID' && c.printCount > 0).length;
  const totalVoidCount = cheques.filter((c) => c.status === 'VOID').length;

  // Filtered cheques
  const filteredCheques = cheques.filter((item) => {
    // 1. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchPayee = item.chequePayeeName.toLowerCase().includes(term);
      const matchDika = (item.dikaNumber || '').toLowerCase().includes(term);
      const matchChequeNo = (item.chequeNumber || '').toLowerCase().includes(term);
      const matchItems = item.items?.some((it) => it.description.toLowerCase().includes(term));
      if (!matchPayee && !matchDika && !matchChequeNo && !matchItems) return false;
    }

    // 2. Bank filter
    if (bankFilter !== 'ALL' && item.lastBankType !== bankFilter) return false;

    // 3. Status filter
    if (statusFilter === 'VOID' && item.status !== 'VOID') return false;
    if (statusFilter === 'ISSUED' && (item.status === 'VOID' || item.printCount === 0)) return false;
    if (statusFilter === 'PENDING' && (item.status === 'VOID' || item.printCount > 0)) return false;

    return true;
  });

  // Calculate totals
  const totalAmount = filteredCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);

  // Handle Void
  const handleConfirmVoid = () => {
    if (!voidModalCheque) return;
    StorageService.voidCheque(voidModalCheque.id, voidReason, currentUser);
    onRefreshData();
    setVoidModalCheque(null);
    setSuccessMsg(`ยกเลิกเช็คฎีกา ${voidModalCheque.dikaNumber} เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Handle Delete (Admin Only)
  const handleConfirmDelete = async () => {
    if (!deleteModalCheque) return;
    if (!isAdmin) {
      setDeleteModalCheque(null);
      return;
    }
    await StorageService.deleteCheque(deleteModalCheque.id, currentUser);
    onRefreshData();
    setDeleteModalCheque(null);
    setSuccessMsg(`ลบรายการเช็คฎีกา ${deleteModalCheque.dikaNumber} เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Export to Excel / CSV with UTF-8 BOM for Thai
  const handleExportCSV = () => {
    const headers = [
      'ลำดับ',
      'วันที่บนเช็ค',
      'เลขที่ฎีกา',
      'เลขที่เช็ค',
      'สั่งจ่ายให้แก่',
      'รายการฎีกา',
      'ยอดรวมก่อนภาษี (บาท)',
      'ภาษีหัก ณ ที่จ่าย (บาท)',
      'ยอดสุทธิสั่งจ่าย (บาท)',
      'จำนวนเงินตัวอักษร',
      'ธนาคาร',
      'สถานะ',
      'จำนวนการพิมพ์แล้ว (ครั้ง)',
      'ใครพิมพ์แล้ว (ผู้สั่งพิมพ์ล่าสุด)',
      'พิมพ์เมื่อไร (วันเวลาที่พิมพ์)',
      'ผู้สร้างเอกสาร',
      'วันที่สร้างเอกสาร',
    ];

    const rows = filteredCheques.map((item, idx) => [
      idx + 1,
      item.chequeDate || item.stubDate,
      `"${item.dikaNumber}"`,
      `"${item.chequeNumber || '-'}"`,
      `"${item.chequePayeeName.replace(/"/g, '""')}"`,
      `"${(item.items || []).map((it) => it.description).join('; ').replace(/"/g, '""')}"`,
      item.totalAmount.toFixed(2),
      (item.withholdingTaxAmount || 0).toFixed(2),
      (item.netPaidAmount || item.totalAmount).toFixed(2),
      `"=${item.totalAmountThaiText}="`,
      `"${item.lastBankType || '-'}"`,
      item.status === 'VOID' ? 'ยกเลิก' : item.printCount > 0 ? 'พิมพ์แล้ว' : 'รอพิมพ์',
      item.printCount,
      `"${(item.lastPrintedBy || (item.printCount > 0 ? 'ผู้ดูแลระบบ' : '-')).replace(/"/g, '""')}"`,
      `"${item.lastPrintedAt ? formatThaiDateTime(item.lastPrintedAt) : (item.printCount > 0 ? formatThaiDate(item.chequeDate || item.stubDate) : '-')}"`,
      `"${(item.createdBy || '-').replace(/"/g, '""')}"`,
      `"${item.createdAt ? formatThaiDateTime(item.createdAt) : '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ทะเบียนคุมเช็ค_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in">
      {/* Header Strip in Red & White Theme */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              📋 ทะเบียนประวัติเช็คทั้งหมด
            </h1>
            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-black rounded-lg">
              รวม {cheques.length} ฉบับ
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
            ค้นหา ตรวจสอบย้อนหลัง สั่งพิมพ์ซ้ำ และสั่งพิมพ์เช็คที่บันทึกรอไว้ได้อย่างรวดเร็ว
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="h-11 px-5 bg-white hover:bg-red-50 text-red-800 border-2 border-red-300 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4 text-red-700" />
          <span>ส่งออกไฟล์ Excel / CSV</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-red-50 border-2 border-red-400 rounded-xl text-red-900 font-bold text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-red-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Fast Filters Bar */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 ค้นหา: ชื่อผู้รับเงิน, เลขที่ฎีกา, เลขที่เช็ค, หรือรายการ..."
            className="w-full h-12 pl-11 pr-4 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-600 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bank Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 mr-1 hidden sm:inline">ธนาคาร:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'KTB', label: 'กรุงไทย' },
              { id: 'BAAC', label: 'ธ.ก.ส.' },
              { id: 'GSB', label: 'ออมสิน' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBankFilter(b.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  bankFilter === b.id
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 mr-1 hidden sm:inline">สถานะ:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({cheques.length})
            </button>

            {/* Waiting to print filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100/70'
              }`}
            >
              <span>⏳ รอพิมพ์</span>
              {totalPendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-xs font-black bg-white text-amber-900">
                  {totalPendingCount}
                </span>
              )}
            </button>

            {/* Issued filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('ISSUED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ISSUED'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100/70'
              }`}
            >
              พิมพ์แล้ว ({totalIssuedCount})
            </button>

            {/* Void filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('VOID')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'VOID'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              ยกเลิก ({totalVoidCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full">
        {/* Table summary sub-header */}
        <div className="px-5 py-3 bg-red-50/50 border-b border-red-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-700">
          <div>
            แสดง {filteredCheques.length} รายการ
            {searchTerm && <span className="text-red-700 ml-1">(กรองจาก "{searchTerm}")</span>}
          </div>
          <div className="text-slate-900">
            ยอดรวมสุทธิ: <span className="text-red-700 text-base font-black tabular-nums">{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-800 font-bold border-b-2 border-slate-200 text-xs sm:text-sm">
              <tr>
                <th className="py-3.5 px-3 text-center w-12">ลำดับ</th>
                <th className="py-3.5 px-3 whitespace-nowrap">วันที่บนเช็ค</th>
                <th className="py-3.5 px-3 whitespace-nowrap">เลขที่ฎีกา / เช็ค</th>
                <th className="py-3.5 px-4">สั่งจ่ายให้แก่ (ผู้รับเงิน)</th>
                <th className="py-3.5 px-3">รายการฎีกา</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">ยอดสั่งจ่ายสุทธิ</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">ธนาคาร</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap text-red-900 bg-red-50/70 font-black border-b-2 border-red-300">
                  📜 ประวัติการพิมพ์ (ใครพิมพ์ / กี่ครั้ง / เมื่อไร)
                </th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap w-44">คำสั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-base font-bold text-slate-600">ไม่พบรายการออกเช็คตามที่ค้นหา</p>
                    <p className="text-xs text-slate-400 mt-1">สามารถไปที่แท็บ "✍️ เขียนและสั่งพิมพ์เช็คด่วน" เพื่อเขียนเช็คใหม่</p>
                  </td>
                </tr>
              ) : (
                filteredCheques.map((item, index) => {
                  const isVoid = item.status === 'VOID';
                  const isPending = !isVoid && item.printCount === 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedChequeForDetail(item)}
                      className={`transition-colors cursor-pointer group ${
                        isVoid
                          ? 'bg-slate-50/80 opacity-60 text-slate-500 hover:bg-slate-100'
                          : isPending
                          ? 'bg-amber-50/40 hover:bg-amber-100/70'
                          : 'hover:bg-red-50/60'
                      }`}
                      title="คลิกเพื่อเปิดดูรายละเอียดเช็คและเอกสารสั่งจ่ายฉบับเต็ม"
                    >
                      {/* 1. Index */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500 tabular-nums">
                        {index + 1}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800">
                        {formatThaiDate(item.chequeDate || item.stubDate)}
                      </td>

                      {/* 3. Dika & Cheque Number */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">
                          {item.dikaNumber}
                        </div>
                        {item.chequeNumber ? (
                          <div className="text-xs font-mono font-bold text-red-800">
                            เช็ค: {item.chequeNumber}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">-</div>
                        )}
                      </td>

                      {/* 4. Payee */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="text-base">{item.chequePayeeName}</div>
                        {item.stubPayeeName && item.stubPayeeName !== item.chequePayeeName && (
                          <div className="text-xs font-normal text-slate-500">
                            ต้นขั้ว: {item.stubPayeeName}
                          </div>
                        )}
                      </td>

                      {/* 5. Expense Items */}
                      <td className="py-3.5 px-3 text-slate-700 text-xs sm:text-sm">
                        {item.items && item.items.length > 0 ? (
                          <div>
                            <div>{item.items[0].description}</div>
                            {item.items.length > 1 && (
                              <div className="text-xs text-red-700 font-bold mt-0.5">
                                + อีก {item.items.length - 1} รายการ (รวม {item.items.length} รายการ)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 6. Net Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="text-base font-black text-slate-900 tabular-nums">
                          {(item.netPaidAmount || item.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บ.
                        </div>
                        {item.withholdingTaxAmount && item.withholdingTaxAmount > 0 ? (
                          <div className="text-[11px] text-amber-800 font-semibold">
                            (หัก {item.withholdingTaxPercent}% = {item.withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.)
                          </div>
                        ) : null}
                      </td>

                      {/* 7. Bank */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-300">
                          {item.lastBankType || 'KTB'}
                        </span>
                      </td>

                      {/* 8. Print History & Status (ใครพิมพ์ / จำนวนครั้งที่พิมพ์ / พิมพ์เมื่อไร) */}
                      <td className="py-3 px-3.5 text-left whitespace-nowrap bg-red-50/20">
                        {isVoid ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <Ban className="w-3.5 h-3.5 text-slate-500" />
                              <span>ยกเลิก (Void)</span>
                            </span>
                            <div className="text-xs text-slate-700 font-semibold">
                              ยกเลิกโดย: <span className="text-slate-900 font-bold">{item.voidBy || item.createdBy || '-'}</span>
                            </div>
                            {item.voidAt && (
                              <div className="text-[11px] text-slate-500">
                                ยกเลิกเมื่อ: {formatThaiDateTime(item.voidAt)}
                              </div>
                            )}
                          </div>
                        ) : isPending ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>ยังไม่เคยพิมพ์ (รอพิมพ์)</span>
                            </span>
                            <div className="text-xs text-slate-700 font-medium">
                              สร้างโดย: <strong className="text-slate-900">{item.createdBy || '-'}</strong>
                            </div>
                            {item.createdAt && (
                              <div className="text-[11px] text-slate-500">
                                บันทึกเมื่อ: {formatThaiDateTime(item.createdAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                                <span>พิมพ์แล้ว {item.printCount} ครั้ง</span>
                              </span>
                            </div>
                            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5 text-red-700 shrink-0" />
                              <span>พิมพ์โดย: {item.lastPrintedBy || item.createdBy || 'ผู้ดูแลระบบ'}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>เมื่อ: {item.lastPrintedAt ? formatThaiDateTime(item.lastPrintedAt) : formatThaiDate(item.chequeDate || item.stubDate)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChequeForDetail(item);
                              }}
                              className="text-[11px] font-bold text-red-700 hover:text-red-900 hover:underline flex items-center gap-0.5 cursor-pointer mt-0.5"
                            >
                              <span>📜 ดูประวัติการพิมพ์ฉบับเต็ม</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {!isVoid ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View detail button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChequeForDetail(item);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 hover:border-red-200"
                              title="คลิกดูรายละเอียดเช็คฉบับเต็ม"
                            >
                              <Eye className="w-3.5 h-3.5 text-red-700" />
                              <span className="hidden sm:inline">ดูข้อมูล</span>
                            </button>

                            {/* If pending print, show primary Red button */}
                            {isPending ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenPrintModal(item);
                                }}
                                className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-black shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="สั่งพิมพ์เช็คฉบับนี้"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>สั่งพิมพ์เลย</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                {/* Reprint button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPrintModal(item);
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  title="สั่งพิมพ์เช็คฉบับนี้อีกครั้ง"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>พิมพ์ซ้ำ</span>
                                </button>

                                {/* Issue new cheque from this one (not a reprint) */}
                                {onDuplicateAsNewCheque && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDuplicateAsNewCheque(item);
                                    }}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                    title="ดึงข้อมูลเจ้านี้มาออกเช็คใหม่ในรอบเดือนนี้ (ไม่ถือว่าเป็นการพิมพ์ซ้ำ)"
                                  >
                                    <span>📋 ออกเช็คใหม่</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Void button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoidModalCheque(item);
                              }}
                              className="px-2 py-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-red-200"
                              title="ยกเลิกเช็คฉบับนี้ (เช็คเสีย/พิมพ์ผิด)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>ยกเลิก</span>
                            </button>

                            {/* Delete button (Admin Only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModalCheque(item);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบรายการเช็คนี้ออกจากระบบ (เฉพาะ Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View detail for void cheque */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChequeForDetail(item);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="คลิกดูรายละเอียดเช็คที่ยกเลิก"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูข้อมูล</span>
                            </button>
                            <span className="text-xs text-slate-400">
                              {item.voidReason || 'ยกเลิกแล้ว'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModalCheque(item);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบรายการเช็คที่ยกเลิกนี้ออกจากระบบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gentle Void Cheque Modal */}
      {voidModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                ยกเลิกเช็ค (เช็คเสีย / พิมพ์ผิด)
              </h2>
              <button
                type="button"
                onClick={() => setVoidModalCheque(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              ท่านกำลังขอยกเลิกเช็คฎีกา <strong>{voidModalCheque.dikaNumber}</strong> สั่งจ่าย <strong>{voidModalCheque.chequePayeeName}</strong> ยอด <strong>{voidModalCheque.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกเหตุผลในการยกเลิก:
              </label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
              >
                <option value="พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน">พิมพ์ผิด / ตำแหน่งคลาดเคลื่อน</option>
                <option value="กระดาษติดเครื่องพิมพ์ / เช็คฉีกขาด">กระดาษติดเครื่องพิมพ์ / เช็คฉีกขาด</option>
                <option value="หมึกเปื้อน / ตัวเลขไม่ชัดเจน">หมึกเปื้อน / ตัวเลขไม่ชัดเจน</option>
                <option value="เปลี่ยนยอดเงิน หรือเปลี่ยนแปลงผู้รับเงิน">เปลี่ยนยอดเงิน หรือเปลี่ยนแปลงผู้รับเงิน</option>
                <option value="ยกเลิกรายการฎีกา">ยกเลิกรายการฎีกา</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setVoidModalCheque(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
              >
                ยืนยันการยกเลิกเช็ค
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for Deleting Cheque */}
      {deleteModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-red-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">
                  ยืนยันการลบรายการเช็ค
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalCheque(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              คุณต้องการลบรายการเช็คนี้ออกจากระบบอย่างถาวร ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">เลขที่ฎีกา:</span>
                <span className="font-bold text-slate-900">{deleteModalCheque.dikaNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">สั่งจ่ายให้แก่:</span>
                <span className="font-bold text-slate-900">{deleteModalCheque.chequePayeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">ยอดเงิน:</span>
                <span className="font-black text-red-700 tabular-nums">
                  {(deleteModalCheque.netPaidAmount || deleteModalCheque.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteModalCheque(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
              >
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Detail Popup Modal (คลิกที่แถวหรือปุ่มดูข้อมูลเพื่อดูรายละเอียดฉบับเต็ม) */}
      <ChequeDetailModal
        cheque={selectedChequeForDetail}
        onClose={() => setSelectedChequeForDetail(null)}
        onPrint={(chq) => {
          setSelectedChequeForDetail(null);
          onOpenPrintModal(chq);
        }}
        onVoid={(chq) => {
          setSelectedChequeForDetail(null);
          setVoidModalCheque(chq);
        }}
        onDuplicateAsNew={(chq) => {
          setSelectedChequeForDetail(null);
          onDuplicateAsNewCheque?.(chq);
        }}
      />
    </div>
  );
};
