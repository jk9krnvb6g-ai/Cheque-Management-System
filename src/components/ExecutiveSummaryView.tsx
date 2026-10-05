import React, { useState } from 'react';
import { Cheque } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/dateUtils';
import { ChequeDetailModal } from './ChequeDetailModal';
import {
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  CheckCircle,
  Clock,
  Ban,
  XCircle,
  Printer,
  Calendar,
  Layers,
  FileText,
  ArrowRight,
  Eye,
  X,
  ExternalLink,
  User as UserIcon,
} from 'lucide-react';

interface ExecutiveSummaryViewProps {
  cheques: Cheque[];
  onOpenPrintModal?: (cheque: Cheque) => void;
  onNavigateToHistory?: () => void;
}

export const ExecutiveSummaryView: React.FC<ExecutiveSummaryViewProps> = ({
  cheques,
  onOpenPrintModal,
  onNavigateToHistory,
}) => {
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'MONTH' | 'TODAY'>('ALL');

  // Cheque Detail popup state
  const [selectedChequeForModal, setSelectedChequeForModal] = useState<Cheque | null>(null);

  // Drilldown List popup state (เมื่อคลิกที่การ์ดสรุป ธนาคาร หรือผู้รับเงิน)
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    cheques: Cheque[];
  } | null>(null);

  // Dates
  const now = new Date();
  const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Active / Void / Pending / Printed
  const activeCheques = cheques.filter((c) => c.status !== 'VOID');
  const voidCheques = cheques.filter((c) => c.status === 'VOID');
  const printedCheques = cheques.filter((c) => c.status !== 'VOID' && c.printCount > 0);
  const pendingCheques = cheques.filter((c) => c.status !== 'VOID' && c.printCount === 0);

  // Recently printed cheques for Print History Widget
  const recentPrintedCheques = [...printedCheques]
    .sort((a, b) => new Date(b.lastPrintedAt || b.createdAt).getTime() - new Date(a.lastPrintedAt || a.createdAt).getTime())
    .slice(0, 5);

  // Time-filtered cheques for metrics
  const displayCheques = activeCheques.filter((c) => {
    const d = c.chequeDate || c.stubDate;
    if (timeFilter === 'TODAY') return d === todayStr;
    if (timeFilter === 'MONTH') return d.startsWith(currentMonthPrefix);
    return true;
  });

  const totalAmount = displayCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);
  const totalTaxWithheld = displayCheques.reduce((sum, c) => sum + (c.withholdingTaxAmount || 0), 0);

  // Month & Today amounts
  const monthCheques = activeCheques.filter((c) => (c.chequeDate || c.stubDate).startsWith(currentMonthPrefix));
  const monthAmount = monthCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);

  const todayCheques = activeCheques.filter((c) => (c.chequeDate || c.stubDate) === todayStr);
  const todayAmount = todayCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);

  // Bank breakdown
  const bankStats: Record<string, { count: number; total: number; name: string; color: string; badgeBg: string }> = {
    KTB: { count: 0, total: 0, name: 'ธ.กรุงไทย (KTB)', color: 'bg-sky-600', badgeBg: 'bg-sky-100 text-sky-800' },
    BAAC: { count: 0, total: 0, name: 'ธ.ก.ส. (BAAC)', color: 'bg-emerald-600', badgeBg: 'bg-emerald-100 text-emerald-800' },
    GSB: { count: 0, total: 0, name: 'ธ.ออมสิน (GSB)', color: 'bg-pink-600', badgeBg: 'bg-pink-100 text-pink-800' },
  };

  displayCheques.forEach((c) => {
    const bank = c.lastBankType || 'KTB';
    if (!bankStats[bank]) {
      bankStats[bank] = { count: 0, total: 0, name: bank, color: 'bg-red-600', badgeBg: 'bg-red-100 text-red-800' };
    }
    bankStats[bank].count += 1;
    bankStats[bank].total += (c.netPaidAmount || c.totalAmount);
  });

  // Top Payees
  const payeeMap: Record<string, { total: number; count: number }> = {};
  displayCheques.forEach((c) => {
    const name = c.chequePayeeName || c.stubPayeeName;
    if (!payeeMap[name]) payeeMap[name] = { total: 0, count: 0 };
    payeeMap[name].total += (c.netPaidAmount || c.totalAmount);
    payeeMap[name].count += 1;
  });

  const topPayees = Object.entries(payeeMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 w-full animate-in fade-in">
      {/* Top Header Card in Red & White */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-black rounded-lg">
              📊 แดชบอร์ดสรุปผู้บริหาร
            </span>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              กะทัดรัด · ชัดเจน · อ่านง่ายในแวบเดียว
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
            ภาพรวมการสั่งจ่ายและพิมพ์เช็ค
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
            สรุปยอดเงินเบิกจ่าย เช็คที่พิมพ์แล้ว เช็คที่รอพิมพ์ และยอดจำแนกตามธนาคาร
          </p>
        </div>

        {/* Time Filter & Print Report */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTimeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeFilter === 'ALL'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeFilter === 'MONTH'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('TODAY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeFilter === 'TODAY'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              วันนี้
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintReport}
            className="h-10 px-4 bg-white hover:bg-red-50 text-red-700 border-2 border-red-300 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs no-print"
          >
            <Printer className="w-4 h-4 text-red-600" />
            <span>พิมพ์รายงานสรุป (A4)</span>
          </button>
        </div>
      </div>

      {/* 4 Core Summary Stat Cards (Red & White Theme - คลิกเพื่อดูรายการป็อปอัปได้) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Amount */}
        <div
          onClick={() =>
            setDrilldownModal({
              title: 'รายการเช็คสั่งจ่ายทั้งหมด',
              subtitle: `รวม ${displayCheques.length} ฉบับ ยอดเงินรวม ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
              icon: <CreditCard className="w-5 h-5 text-red-700" />,
              cheques: displayCheques,
            })
          }
          className="bg-white border-2 border-red-200 hover:border-red-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group active:scale-[0.99]"
          title="คลิกเพื่อเปิดดูรายการเช็คทั้งหมด"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 group-hover:bg-red-100 transition-colors" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-red-800 uppercase tracking-wide flex items-center gap-1">
              <span>{timeFilter === 'ALL' ? 'ยอดสั่งจ่ายสุทธิรวม' : timeFilter === 'MONTH' ? 'ยอดสั่งจ่ายเดือนนี้' : 'ยอดสั่งจ่ายวันนี้'}</span>
            </span>
            <span className="p-2 rounded-xl bg-red-50 text-red-700 border border-red-200 group-hover:bg-red-700 group-hover:text-white transition-colors">
              <CreditCard className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-700 tabular-nums">
            {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-500">บาท</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>หักภาษี: <strong className="text-slate-800">{totalTaxWithheld.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong></span>
            <span className="text-[10px] text-red-700 font-bold group-hover:underline flex items-center gap-0.5">
              <span>🔍 คลิกดูรายการ</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Cheques Status Breakdown */}
        <div
          onClick={() =>
            setDrilldownModal({
              title: 'รายการเช็คจำแนกตามสถานะ',
              subtitle: `รวม ${displayCheques.length} ฉบับ (สั่งจ่ายแล้ว ${displayCheques.filter((c) => c.printCount > 0).length} · รอพิมพ์ ${pendingCheques.length} · ยกเลิก ${voidCheques.length})`,
              icon: <Layers className="w-5 h-5 text-slate-700" />,
              cheques: displayCheques,
            })
          }
          className="bg-white border-2 border-slate-200 hover:border-red-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
          title="คลิกเพื่อเปิดดูรายการเช็คตามสถานะ"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">จำนวนเช็ค</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {displayCheques.length} <span className="text-sm font-bold text-slate-500">ฉบับ</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs font-semibold">
            {/* Click to view only printed cheques */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const printed = displayCheques.filter((c) => c.printCount > 0);
                const printedTotal = printed.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);
                setDrilldownModal({
                  title: 'รายการเช็คที่พิมพ์แล้ว (Issued Cheques)',
                  subtitle: `จำนวน ${printed.length} ฉบับ ยอดรวม ${printedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (สั่งพิมพ์เรียบร้อยแล้ว)`,
                  icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
                  cheques: printed,
                });
              }}
              title="คลิกเพื่อดูเฉพาะรายการเช็คที่พิมพ์แล้ว"
              className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-2.5 py-1 rounded-lg border border-emerald-300 transition-all cursor-pointer font-bold flex items-center gap-1 shadow-2xs hover:shadow-xs"
            >
              <span>✓ พิมพ์แล้ว {displayCheques.filter((c) => c.printCount > 0).length}</span>
            </button>

            {/* Click to view only pending cheques */}
            {pendingCheques.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const pendingTotal = pendingCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);
                  setDrilldownModal({
                    title: 'รายการเช็คที่รอพิมพ์ (Pending Cheques)',
                    subtitle: `จำนวน ${pendingCheques.length} ฉบับ ยอดรวม ${pendingTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ยังไม่ได้สั่งพิมพ์)`,
                    icon: <Clock className="w-5 h-5 text-amber-600" />,
                    cheques: pendingCheques,
                  });
                }}
                title="คลิกเพื่อดูเฉพาะรายการเช็คที่รอพิมพ์"
                className="text-amber-900 bg-amber-50 hover:bg-amber-100 active:scale-95 px-2.5 py-1 rounded-lg border border-amber-300 transition-all cursor-pointer font-bold flex items-center gap-1 shadow-2xs hover:shadow-xs"
              >
                <span>⏳ รอพิมพ์ {pendingCheques.length}</span>
              </button>
            )}

            {/* Click to view only voided cheques */}
            {voidCheques.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const voidTotal = voidCheques.reduce((sum, c) => sum + (c.netPaidAmount || c.totalAmount), 0);
                  setDrilldownModal({
                    title: 'รายการเช็คที่ยกเลิก (Voided Cheques)',
                    subtitle: `จำนวน ${voidCheques.length} ฉบับ ยอดรวม ${voidTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
                    icon: <XCircle className="w-5 h-5 text-rose-600" />,
                    cheques: voidCheques,
                  });
                }}
                title="คลิกเพื่อดูเฉพาะรายการเช็คที่ยกเลิก"
                className="text-rose-900 bg-rose-50 hover:bg-rose-100 active:scale-95 px-2.5 py-1 rounded-lg border border-rose-300 transition-all cursor-pointer font-bold flex items-center gap-1 shadow-2xs hover:shadow-xs"
              >
                <span>🚫 ยกเลิก {voidCheques.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Month Summary */}
        <div
          onClick={() =>
            setDrilldownModal({
              title: 'รายการเช็คสั่งจ่ายในรอบเดือนนี้',
              subtitle: `รวม ${monthCheques.length} ฉบับ ยอดรวม ${monthAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
              icon: <Calendar className="w-5 h-5 text-red-700" />,
              cheques: monthCheques,
            })
          }
          className="bg-white border-2 border-slate-200 hover:border-red-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
          title="คลิกเพื่อเปิดดูรายการเช็คเดือนนี้"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">ยอดสั่งจ่ายเดือนนี้</span>
            <span className="p-2 rounded-xl bg-red-50 text-red-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {monthAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-500">บาท</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>รวม <strong className="text-slate-800">{monthCheques.length} ฉบับ</strong> ในรอบเดือน</span>
            <span className="text-[10px] text-red-700 font-bold group-hover:underline">🔍 ดูรายการ</span>
          </div>
        </div>

        {/* Card 4: Today Summary */}
        <div
          onClick={() =>
            setDrilldownModal({
              title: 'รายการเช็คสั่งจ่ายของวันนี้',
              subtitle: `รวม ${todayCheques.length} ฉบับ ยอดรวม ${todayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
              icon: <Clock className="w-5 h-5 text-amber-700" />,
              cheques: todayCheques,
            })
          }
          className="bg-white border-2 border-slate-200 hover:border-red-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
          title="คลิกเพื่อเปิดดูรายการเช็ควันนี้"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">ยอดสั่งจ่ายวันนี้</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {todayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-500">บาท</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>ออกเช็ควันนี้: <strong className="text-slate-800">{todayCheques.length} ฉบับ</strong></span>
            <span className="text-[10px] text-red-700 font-bold group-hover:underline">🔍 ดูรายการ</span>
          </div>
        </div>
      </div>

      {/* Direct Alert / Section for Pending Cheques (เช็คที่รอพิมพ์) */}
      {pendingCheques.length > 0 && (
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-700 shrink-0" />
              <h2 className="text-base font-extrabold text-amber-950">
                เช็คที่บันทึกแล้วแต่ยังไม่ได้พิมพ์ ({pendingCheques.length} ฉบับ)
              </h2>
            </div>
            {onNavigateToHistory && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer"
              >
                <span>ดูทั้งหมดในทะเบียนประวัติ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-amber-900 font-bold border-b border-amber-200">
                <tr>
                  <th className="py-2 px-3">วันที่</th>
                  <th className="py-2 px-3">เลขที่ฎีกา / เช็ค</th>
                  <th className="py-2 px-3">สั่งจ่ายใคร</th>
                  <th className="py-2 px-3 text-right">ยอดสั่งจ่าย</th>
                  <th className="py-2 px-3 text-center">ธนาคาร</th>
                  <th className="py-2 px-3 text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingCheques.slice(0, 5).map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedChequeForModal(item)}
                    className="hover:bg-amber-100/70 transition-colors cursor-pointer group"
                    title="คลิกเพื่อเปิดดูรายละเอียดเช็คฉบับเต็ม"
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap text-xs font-semibold text-slate-800">
                      {formatThaiDate(item.chequeDate || item.stubDate)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900 text-xs">
                      {item.dikaNumber}
                      {item.chequeNumber && <span className="text-amber-800 ml-1 font-mono">({item.chequeNumber})</span>}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                      {item.chequePayeeName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums text-sm">
                      {(item.netPaidAmount || item.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-white text-slate-800 border border-amber-300">
                        {item.lastBankType || 'KTB'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChequeForModal(item);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-200 text-amber-950 rounded-lg text-xs font-bold border border-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="คลิกดูรายละเอียดเช็คฉบับเต็ม"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-800" />
                          <span>ดูข้อมูล</span>
                        </button>

                        {onOpenPrintModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPrintModal(item);
                            }}
                            className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="สั่งพิมพ์เช็คทันที"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>สั่งพิมพ์</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2-Column Split: Bank Breakdown & Top Payees */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Bank Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-red-700" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ยอดสั่งจ่ายจำแนกตามธนาคาร
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {Object.keys(bankStats).length} แม่แบบ
            </span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(bankStats).map(([code, stat]) => {
              const percent = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;
              return (
                <div
                  key={code}
                  onClick={() => {
                    const bChqs = displayCheques.filter((c) => (c.lastBankType || 'KTB') === code);
                    setDrilldownModal({
                      title: `รายการเช็ค ${stat.name}`,
                      subtitle: `รวม ${stat.count} ฉบับ ยอดเงินรวม ${stat.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
                      icon: <Building className="w-5 h-5 text-red-700" />,
                      cheques: bChqs,
                    });
                  }}
                  className="p-4 bg-slate-50 hover:bg-red-50/50 border border-slate-200 hover:border-red-300 rounded-xl space-y-2 transition-all cursor-pointer group active:scale-[0.99]"
                  title={`คลิกเพื่อดูรายการเช็คของ ${stat.name}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-lg bg-red-800 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {code}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-slate-900 group-hover:text-red-900">{stat.name}</div>
                        <div className="text-xs text-slate-500 font-medium">ออกแล้ว {stat.count} ฉบับ</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-base text-slate-900 tabular-nums">
                        {stat.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                      </div>
                      <div className="text-xs text-slate-500 font-bold flex items-center justify-end gap-1">
                        <span>{percent.toFixed(1)}%</span>
                        <span className="text-red-700 text-[10px] group-hover:underline">· 🔍 ดูรายการ</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${code === 'KTB' ? 'bg-sky-500' : code === 'BAAC' ? 'bg-emerald-600' : 'bg-pink-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top 5 Payees (6 cols) */}
        <div className="lg:col-span-6 bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-700" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                5 อันดับผู้รับเงินยอดสูงสุด
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">ภาพรวมการเบิกจ่าย</span>
          </div>

          {topPayees.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              ยังไม่มีข้อมูลการออกเช็ค
            </div>
          ) : (
            <div className="space-y-3">
              {topPayees.map(([payee, data], idx) => {
                const percent = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
                return (
                  <div
                    key={payee}
                    onClick={() => {
                      const pChqs = displayCheques.filter((c) => (c.chequePayeeName || c.stubPayeeName) === payee);
                      setDrilldownModal({
                        title: `ประวัติการสั่งจ่าย: ${payee}`,
                        subtitle: `รวม ${data.count} ฉบับ ยอดเงินรวม ${data.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
                        icon: <TrendingUp className="w-5 h-5 text-red-700" />,
                        cheques: pChqs,
                      });
                    }}
                    className="p-3.5 bg-slate-50 hover:bg-red-50/50 border border-slate-200 hover:border-red-300 rounded-xl space-y-1.5 transition-all cursor-pointer group active:scale-[0.99]"
                    title={`คลิกเพื่อดูรายการเช็คของ ${payee}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-800 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm text-slate-900 truncate group-hover:text-red-900">
                          {payee}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-slate-900 tabular-nums">
                          {data.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                        </span>
                        <span className="text-xs text-slate-500 ml-1 font-semibold">({data.count} ใบ)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>สัดส่วน {percent.toFixed(1)}%</span>
                      <span className="text-red-700 font-bold group-hover:underline">🔍 ดูรายการทั้งหมด</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-700 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Print History Section in Executive Dashboard (คลิกดูป็อปอัปประวัติการพิมพ์ได้ทันที) */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-800 rounded-xl">
              <Printer className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>📜 ประวัติการพิมพ์เช็คล่าสุด</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  พิมพ์แล้ว {printedCheques.length} ฉบับ
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                รายงานว่าใครพิมพ์แล้ว จำนวนการพิมพ์ และพิมพ์เมื่อไร (คลิกที่แถวใดเพื่อเปิดป็อปอัปดูรายละเอียดฉบับเต็ม)
              </p>
            </div>
          </div>

          {onNavigateToHistory && (
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="text-xs font-bold text-red-800 hover:text-red-950 underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>เปิดดูทะเบียนประวัติทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentPrintedCheques.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-medium text-sm">
            ยังไม่มีประวัติการพิมพ์เช็คในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">วันที่บนเช็ค</th>
                  <th className="py-2.5 px-3">เลขที่ฎีกา / เช็ค</th>
                  <th className="py-2.5 px-3">สั่งจ่ายให้แก่</th>
                  <th className="py-2.5 px-3 text-right">ยอดสั่งจ่าย</th>
                  <th className="py-2.5 px-3 text-center">ธนาคาร</th>
                  <th className="py-2.5 px-3 text-left">ใครพิมพ์แล้ว (ผู้พิมพ์)</th>
                  <th className="py-2.5 px-3 text-center">จำนวนครั้งที่พิมพ์</th>
                  <th className="py-2.5 px-3 text-left">พิมพ์เมื่อไร</th>
                  <th className="py-2.5 px-3 text-center">ดูป็อปอัป</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPrintedCheques.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedChequeForModal(item)}
                    className="hover:bg-red-50/60 transition-colors cursor-pointer group"
                    title="คลิกเพื่อเปิดดูรายละเอียดเช็คและประวัติการพิมพ์ฉบับเต็ม"
                  >
                    <td className="py-3 px-3 whitespace-nowrap text-xs font-semibold text-slate-800">
                      {formatThaiDate(item.chequeDate || item.stubDate)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      <span className="font-extrabold text-slate-900">{item.dikaNumber}</span>
                      {item.chequeNumber && (
                        <span className="text-red-800 font-mono ml-1 font-bold">({item.chequeNumber})</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                      {item.chequePayeeName}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums text-sm whitespace-nowrap">
                      {(item.netPaidAmount || item.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        {item.lastBankType || 'KTB'}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <UserIcon className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span>{item.lastPrintedBy || item.createdBy || 'ผู้ดูแลระบบ'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                        พิมพ์แล้ว {item.printCount} ครั้ง
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap font-medium">
                      {item.lastPrintedAt ? formatThaiDateTime(item.lastPrintedAt) : formatThaiDate(item.chequeDate || item.stubDate)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChequeForModal(item);
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto border border-red-200"
                      >
                        <Eye className="w-3.5 h-3.5 text-red-700" />
                        <span>ดูข้อมูล</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODALS: 1. Drilldown Cheque List & 2. Full Cheque Detail Modal */}
      {/* ========================================================================= */}

      {/* 1. Drilldown Cheque List Popup Modal */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border-2 border-red-200 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-red-800 to-red-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white text-red-800 rounded-xl shadow-xs shrink-0">
                  {drilldownModal.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <span>{drilldownModal.title}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-700 text-white border border-red-500">
                      {drilldownModal.cheques.length} ฉบับ
                    </span>
                  </h3>
                  <p className="text-xs text-red-100 font-medium mt-0.5">
                    {drilldownModal.subtitle} (คลิกที่แถวใดเพื่อดูรายละเอียดเช็คฉบับเต็ม)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cheque Table */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
              {drilldownModal.cheques.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  ไม่พบรายการเช็คในหมวดหมู่นี้
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-3">วันที่</th>
                        <th className="py-2.5 px-3">เลขที่ฎีกา / เช็ค</th>
                        <th className="py-2.5 px-3">สั่งจ่ายให้แก่</th>
                        <th className="py-2.5 px-3 text-right">ยอดเงินสั่งจ่าย</th>
                        <th className="py-2.5 px-3 text-center">ธนาคาร</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                        <th className="py-2.5 px-3 text-center">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drilldownModal.cheques.map((item, idx) => {
                        const isVoid = item.status === 'VOID';
                        const isPending = !isVoid && item.printCount === 0;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedChequeForModal(item)}
                            className="hover:bg-red-50/60 transition-colors cursor-pointer group"
                            title="คลิกเพื่อเปิดดูรายละเอียดฉบับเต็ม"
                          >
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs font-semibold text-slate-800">
                              {formatThaiDate(item.chequeDate || item.stubDate)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                              <span className="font-bold text-slate-900">{item.dikaNumber}</span>
                              {item.chequeNumber && (
                                <span className="text-red-800 font-mono ml-1">({item.chequeNumber})</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                              {item.chequePayeeName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums text-sm">
                              {(item.netPaidAmount || item.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                {item.lastBankType || 'KTB'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {isVoid ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                  ยกเลิก
                                </span>
                              ) : isPending ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  รอพิมพ์
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  พิมพ์แล้ว
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChequeForModal(item);
                                }}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto border border-red-200"
                              >
                                <Eye className="w-3.5 h-3.5 text-red-700" />
                                <span>ดูข้อมูล</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              {onNavigateToHistory ? (
                <button
                  type="button"
                  onClick={() => {
                    setDrilldownModal(null);
                    onNavigateToHistory();
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-red-700" />
                  <span>เปิดดูในทะเบียนประวัติเช็คทั้งหมด</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Full Cheque Detail Popup Modal (เมื่อคลิกที่เช็คใดๆ) */}
      <ChequeDetailModal
        cheque={selectedChequeForModal}
        onClose={() => setSelectedChequeForModal(null)}
        onPrint={onOpenPrintModal}
      />
    </div>
  );
};
