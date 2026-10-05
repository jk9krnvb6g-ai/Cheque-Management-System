import React, { useState, useMemo } from 'react';
import { BankType, Cheque, ChequePrintLog } from '../types';
import { StorageService } from '../utils/storage';
import {
  formatThaiDate,
  formatThaiDateTime,
  formatThaiDateWithMonth,
  getThaiFiscalYear,
  getFiscalYearRange,
  getTodayISODate,
} from '../utils/dateUtils';
import {
  BarChart3,
  TrendingUp,
  Printer,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';

interface ExecutiveDashboardProps {
  cheques: Cheque[];
  onOpenPrintModal: (cheque: Cheque) => void;
  onOpenHistoryModal: (cheque: Cheque) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  cheques,
  onOpenPrintModal,
  onOpenHistoryModal,
}) => {
  // Preset timeframes: TODAY, THIS_MONTH, FISCAL_YEAR, CUSTOM
  const [timeframePreset, setTimeframePreset] = useState<'TODAY' | 'THIS_MONTH' | 'FISCAL_YEAR' | 'CUSTOM'>('FISCAL_YEAR');
  
  // Date ranges (YYYY-MM-DD)
  const defaultFiscal = getFiscalYearRange();
  const [startDate, setStartDate] = useState(defaultFiscal.start);
  const [endDate, setEndDate] = useState(defaultFiscal.end);

  const allPrintLogs: ChequePrintLog[] = useMemo(() => StorageService.getPrintLogs(), []);

  // Handle preset clicks
  const applyPreset = (preset: 'TODAY' | 'THIS_MONTH' | 'FISCAL_YEAR') => {
    setTimeframePreset(preset);
    const today = getTodayISODate();
    const d = new Date();

    if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'THIS_MONTH') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'FISCAL_YEAR') {
      const fiscalRange = getFiscalYearRange();
      setStartDate(fiscalRange.start);
      setEndDate(fiscalRange.end);
    }
  };

  // Filter cheques within range
  const filteredCheques = useMemo(() => {
    return cheques.filter(c => {
      if (startDate && c.stubDate < startDate) return false;
      if (endDate && c.stubDate > endDate) return false;
      return true;
    });
  }, [cheques, startDate, endDate]);

  // Filter print logs within range (by printedAt date)
  const filteredPrintLogs = useMemo(() => {
    return allPrintLogs.filter(log => {
      const logDate = log.printedAt.substring(0, 10);
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      return true;
    });
  }, [allPrintLogs, startDate, endDate]);

  // Executive Core Metrics
  const totalChequesCount = filteredCheques.length;
  const totalAmount = filteredCheques.reduce((sum, c) => sum + c.totalAmount, 0);
  const issuedCheques = filteredCheques.filter(c => c.printCount > 0);
  const issuedCount = issuedCheques.length;
  const pendingCheques = filteredCheques.filter(c => c.printCount === 0);
  const pendingCount = pendingCheques.length;
  const totalPrintTimes = filteredPrintLogs.length;

  // Breakdown by Bank
  const bankStats = useMemo(() => {
    const stats: Record<BankType, { count: number; amount: number }> = {
      KTB: { count: 0, amount: 0 },
      BAAC: { count: 0, amount: 0 },
      GSB: { count: 0, amount: 0 },
    };

    issuedCheques.forEach(c => {
      const bank = c.lastBankType || 'KTB';
      stats[bank].count += 1;
      stats[bank].amount += c.totalAmount;
    });

    return stats;
  }, [issuedCheques]);

  // Multi-print cheques (> 1 times)
  const multiPrintCheques = useMemo(() => {
    return filteredCheques.filter(c => c.printCount > 1).sort((a, b) => b.printCount - a.printCount);
  }, [filteredCheques]);

  // Monthly Amount Trend (aggregate by YYYY-MM)
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { label: string; amount: number; count: number }> = {};
    const shortNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // Collect past 6 months or present range
    filteredCheques.forEach(c => {
      const d = new Date(c.stubDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${shortNames[d.getMonth()]} ${String(d.getFullYear() + 543).slice(-2)}`;

      if (!monthsMap[key]) {
        monthsMap[key] = { label, amount: 0, count: 0 };
      }
      monthsMap[key].amount += c.totalAmount;
      monthsMap[key].count += 1;
    });

    return Object.keys(monthsMap)
      .sort()
      .map(k => ({ key: k, ...monthsMap[k] }));
  }, [filteredCheques]);

  const maxMonthAmount = Math.max(...monthlyData.map(m => m.amount), 1);

  // Print Executive Report (window.print with report class)
  const handlePrintReport = () => {
    document.body.classList.add('printing-report');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-report');
    }, 150);
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = ['ลำดับ', 'วันที่', 'เลขที่ฎีกา', 'ผู้รับเงิน (ตัวเช็ค)', 'ผู้รับต้นขั้ว', 'ยอดเงิน (บาท)', 'สถานะ', 'ธนาคาร', 'พิมพ์แล้ว (ครั้ง)', 'ผู้ดำเนินการล่าสุด', 'วันที่พิมพ์ล่าสุด'];
    
    const rows = filteredCheques.map((c, i) => [
      i + 1,
      formatThaiDate(c.stubDate),
      `"${c.dikaNumber}"`,
      `"${c.chequePayeeName.replace(/"/g, '""')}"`,
      `"${c.stubPayeeName.replace(/"/g, '""')}"`,
      c.totalAmount.toFixed(2),
      c.printCount > 0 ? 'ออกแล้ว' : 'ยังไม่ออก',
      c.lastBankType || '-',
      c.printCount,
      `"${(c.lastPrintedBy || '-').replace(/"/g, '""')}"`,
      c.lastPrintedAt ? formatThaiDateTime(c.lastPrintedAt) : '-',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานการจัดทำเช็ค_${startDate}_ถึง_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Report Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>สรุปเสนอผู้บริหาร (Executive Dashboard)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ภาพรวมการจัดทำและออกเช็ค พร้อมสถิติแยกธนาคาร และระบบตรวจสอบย้อนหลัง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>พิมพ์รายงานเสนอผู้บริหาร</span>
          </button>
        </div>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Preset Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => applyPreset('TODAY')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              timeframePreset === 'TODAY'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            วันนี้
          </button>
          
          <button
            type="button"
            onClick={() => applyPreset('THIS_MONTH')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              timeframePreset === 'THIS_MONTH'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เดือนนี้
          </button>

          <button
            type="button"
            onClick={() => applyPreset('FISCAL_YEAR')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              timeframePreset === 'FISCAL_YEAR'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ปีงบประมาณ ({getThaiFiscalYear()})
          </button>

          <button
            type="button"
            onClick={() => setTimeframePreset('CUSTOM')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              timeframePreset === 'CUSTOM'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            กำหนดช่วงวันที่
          </button>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">ช่วงวันที่:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setTimeframePreset('CUSTOM');
            }}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-slate-400">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setTimeframePreset('CUSTOM');
            }}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

      </div>

      {/* 5 Top Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        {/* 1. จำนวนรายการทั้งหมด */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">1. จำนวนรายการทั้งหมด</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {totalChequesCount}
            <span className="text-xs font-normal text-slate-500 ml-1">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            บันทึกในระบบทั้งหมด
          </div>
        </div>

        {/* 2. มูลค่ารวม */}
        <div className="p-4 bg-white border border-emerald-200/80 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-medium text-emerald-700">2. จำนวนเงินรวมทั้งสิ้น</div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-emerald-900 ml-1">บาท</span>
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1 truncate">
            {StorageService.getCheques().length > 0 ? 'ยอดเบิกจ่ายตามฎีกา' : '-'}
          </div>
        </div>

        {/* 3. ออกเช็คแล้ว */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">3. ออกเช็คแล้ว</div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {issuedCount}
            <span className="text-xs font-normal text-slate-500 ml-1">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            คิดเป็น {totalChequesCount > 0 ? ((issuedCount / totalChequesCount) * 100).toFixed(1) : 0}% ของรายการ
          </div>
        </div>

        {/* 4. ยังไม่ออกเช็ค */}
        <div className="p-4 bg-white border border-amber-200/80 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-amber-700">4. ยังไม่ออกเช็ค</div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {pendingCount}
            <span className="text-xs font-normal text-slate-500 ml-1">รายการ</span>
          </div>
          <div className="text-[11px] text-amber-600/90 mt-1">
            รอดำเนินการพิมพ์
          </div>
        </div>

        {/* 5. จำนวนครั้งที่มีการพิมพ์เช็ค */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">5. จำนวนครั้งที่พิมพ์เช็ค</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {totalPrintTimes}
            <span className="text-xs font-normal text-slate-500 ml-1">ครั้ง</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            (รวมการพิมพ์ซ้ำ {Math.max(0, totalPrintTimes - issuedCount)} ครั้ง)
          </div>
        </div>

      </div>

      {/* Bank Breakdown & Visual Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bank Breakdown Table & Proportions */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>สรุปแยกตามธนาคาร (Bank Distribution)</span>
            </h2>
            <span className="text-xs text-slate-400">
              เฉพาะรายการที่ออกเช็คแล้ว
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ธนาคาร</th>
                  <th className="py-2.5 px-3 text-center">จำนวนรายการ</th>
                  <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                  <th className="py-2.5 px-3 text-right">สัดส่วน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* KTB */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-sky-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>KTB — ธ.กรุงไทย</span>
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums font-bold text-slate-800">
                    {bankStats.KTB.count} รายการ
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900">
                    {bankStats.KTB.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                    {totalAmount > 0 ? ((bankStats.KTB.amount / totalAmount) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* BAAC */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-emerald-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>BAAC — ธ.ก.ส.</span>
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums font-bold text-slate-800">
                    {bankStats.BAAC.count} รายการ
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900">
                    {bankStats.BAAC.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                    {totalAmount > 0 ? ((bankStats.BAAC.amount / totalAmount) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* GSB */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-pink-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    <span>GSB — ธ.ออมสิน</span>
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums font-bold text-slate-800">
                    {bankStats.GSB.count} รายการ
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900">
                    {bankStats.GSB.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                    {totalAmount > 0 ? ((bankStats.GSB.amount / totalAmount) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* Total Row */}
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td className="py-2.5 px-3 text-slate-900">รวมทั้งหมด</td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-slate-900">
                    {issuedCount} รายการ
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-900">
                    {(bankStats.KTB.amount + bankStats.BAAC.amount + bankStats.GSB.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900">
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Visual Bank Proportional Bar */}
          <div>
            <div className="h-3 rounded-full bg-slate-100 flex overflow-hidden">
              <div
                style={{ width: `${totalAmount > 0 ? (bankStats.KTB.amount / totalAmount) * 100 : 0}%` }}
                className="bg-sky-500 h-full"
                title={`KTB: ${bankStats.KTB.amount.toLocaleString()} บาท`}
              />
              <div
                style={{ width: `${totalAmount > 0 ? (bankStats.BAAC.amount / totalAmount) * 100 : 0}%` }}
                className="bg-emerald-600 h-full"
                title={`BAAC: ${bankStats.BAAC.amount.toLocaleString()} บาท`}
              />
              <div
                style={{ width: `${totalAmount > 0 ? (bankStats.GSB.amount / totalAmount) * 100 : 0}%` }}
                className="bg-pink-500 h-full"
                title={`GSB: ${bankStats.GSB.amount.toLocaleString()} บาท`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500 inline-block" /> KTB</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-600 inline-block" /> BAAC</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-pink-500 inline-block" /> GSB</span>
            </div>
          </div>

        </div>

        {/* Monthly Trend Chart */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>แนวโน้มยอดเงินออกเช็ครายเดือน (Monthly Amount Trend)</span>
            </h2>
            <span className="text-xs text-slate-400">บาท (THB)</span>
          </div>

          {monthlyData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูลในช่วงเวลาที่เลือก
            </div>
          ) : (
            <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-200">
              {monthlyData.map((m) => {
                const heightPct = Math.max(10, Math.round((m.amount / maxMonthAmount) * 100));
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div className="text-[10px] text-slate-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">
                      {m.amount >= 1000000 ? `${(m.amount / 1000000).toFixed(2)}M` : `${Math.round(m.amount / 1000)}k`}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[48px] bg-emerald-600/80 hover:bg-emerald-600 rounded-t-md transition-all cursor-pointer relative"
                    />
                    <div className="text-[11px] text-slate-600 font-medium whitespace-nowrap mt-1">
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>แสดงสถิติยอดเงินรวมที่บันทึกจัดทำเช็คตามช่วงเวลา</span>
            <span className="font-semibold text-slate-700">สูงสุด: {maxMonthAmount.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท</span>
          </div>

        </div>

      </div>

      {/* Two Alert Action Columns: 1. Unissued Queue & 2. Reprint Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: รายการที่ยังไม่ได้ออกเช็ค (Pending Queue) */}
        <div className="bg-white border border-amber-200/90 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>รายการที่ยังไม่ได้ออกเช็ค ({pendingCount} รายการ)</span>
            </h2>
            <span className="text-xs text-amber-700 font-medium">รอดำเนินการ</span>
          </div>

          {pendingCheques.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-emerald-50/50 rounded-lg border border-emerald-100">
              ✓ ดำเนินการออกเช็คครบทุกรายการแล้ว ไม่มีรายการค้าง
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {pendingCheques.slice(0, 8).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="font-mono text-emerald-800">ฎีกา {c.dikaNumber}</span>
                      <span>·</span>
                      <span>{c.chequePayeeName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      บันทึกเมื่อ: {formatThaiDate(c.stubDate)} โดย {c.createdBy}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 tabular-nums">
                      {c.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPrintModal(c)}
                      className="mt-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium cursor-pointer"
                    >
                      ออกเช็คทันที
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: รายการที่มีการออกเช็คซ้ำ (Reprint Audit Queue) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>รายการที่มีการออกเช็คมากกว่า 1 ครั้ง ({multiPrintCheques.length} รายการ)</span>
            </h2>
            <span className="text-xs text-slate-400">ตรวจสอบย้อนหลัง</span>
          </div>

          {multiPrintCheques.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
              ไม่มีรายการที่มีการพิมพ์ซ้ำในช่วงเวลานี้
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {multiPrintCheques.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="font-mono text-emerald-800">ฎีกา {c.dikaNumber}</span>
                      <span>·</span>
                      <span>{c.chequePayeeName}</span>
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      ออกล่าสุด: {formatThaiDateTime(c.lastPrintedAt)} โดย {c.lastPrintedBy}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-xs">
                      ออกแล้ว {c.printCount} ครั้ง
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenHistoryModal(c)}
                      className="block mt-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium underline cursor-pointer"
                    >
                      ดูประวัติและเหตุผล
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Comprehensive Executive Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>รายละเอียดรายการจัดทำเช็คสำหรับเสนอผู้บริหาร</span>
          </h2>
          <span className="text-xs text-slate-500">
            ช่วงวันที่ {formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                <th className="py-2.5 px-3">วันที่</th>
                <th className="py-2.5 px-3">เลขที่ฎีกา</th>
                <th className="py-2.5 px-3">ชื่อผู้รับเงิน (ตัวเช็ค)</th>
                <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                <th className="py-2.5 px-3 text-center">ธนาคาร</th>
                <th className="py-2.5 px-3">ผู้ดำเนินการ</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
                <th className="py-2.5 px-3 text-center">จำนวนครั้ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{formatThaiDate(c.stubDate)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">{c.dikaNumber}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{c.chequePayeeName}</td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">
                    {c.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {c.lastBankType ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        c.lastBankType === 'KTB'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : c.lastBankType === 'BAAC'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-pink-50 text-pink-700 border border-pink-200'
                      }`}>
                        {c.lastBankType}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                    {c.lastPrintedBy || c.createdBy}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {c.printCount > 0 ? (
                      <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ออกแล้ว</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">ยังไม่ออก</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums font-bold whitespace-nowrap">
                    {c.printCount > 0 ? `${c.printCount} ครั้ง` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL EXECUTIVE REPORT TEMPLATE (Strictly styled for @media print) */}
      <div id="executive-report-print-zone" className="hidden print:block text-black bg-white">
        
        {/* Official Header */}
        <div className="text-center pb-4 border-b border-black mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">
            รายงานการจัดทำและพิมพ์เช็ค
          </h1>
          <p className="text-sm mt-1">
            ช่วงวันที่ {formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            พิมพ์รายงาน ณ วันที่: {formatThaiDateTime(new Date())}
          </p>
        </div>

        {/* Summary Table for Executive */}
        <div className="mb-4">
          <h2 className="text-sm font-bold mb-1">สรุปภาพรวมและแยกตามธนาคาร</h2>
          <table className="w-full border-collapse border border-black text-xs text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border border-black p-1.5">ธนาคาร / รายการ</th>
                <th className="border border-black p-1.5 text-center">จำนวนรายการ</th>
                <th className="border border-black p-1.5 text-right">จำนวนเงิน (บาท)</th>
                <th className="border border-black p-1.5 text-center">พิมพ์ทั้งหมด (ครั้ง)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5 font-semibold">KTB — ธนาคารกรุงไทย</td>
                <td className="border border-black p-1.5 text-center">{bankStats.KTB.count}</td>
                <td className="border border-black p-1.5 text-right">{bankStats.KTB.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="border border-black p-1.5 text-center">{filteredPrintLogs.filter(l => l.bankType === 'KTB').length}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-semibold">BAAC — ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร</td>
                <td className="border border-black p-1.5 text-center">{bankStats.BAAC.count}</td>
                <td className="border border-black p-1.5 text-right">{bankStats.BAAC.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="border border-black p-1.5 text-center">{filteredPrintLogs.filter(l => l.bankType === 'BAAC').length}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-semibold">GSB — ธนาคารออมสิน</td>
                <td className="border border-black p-1.5 text-center">{bankStats.GSB.count}</td>
                <td className="border border-black p-1.5 text-right">{bankStats.GSB.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="border border-black p-1.5 text-center">{filteredPrintLogs.filter(l => l.bankType === 'GSB').length}</td>
              </tr>
              <tr className="font-bold bg-slate-100">
                <td className="border border-black p-1.5">รวมทั้งสิ้น (ออกเช็คแล้ว: {issuedCount} / ยังไม่ออก: {pendingCount})</td>
                <td className="border border-black p-1.5 text-center">{totalChequesCount}</td>
                <td className="border border-black p-1.5 text-right">{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="border border-black p-1.5 text-center">{totalPrintTimes}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Items List */}
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-1">รายละเอียดรายการฎีกาและการออกเช็ค</h2>
          <table className="w-full border-collapse border border-black text-[11px] text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border border-black p-1 text-center w-8">ที่</th>
                <th className="border border-black p-1 w-20">วันที่</th>
                <th className="border border-black p-1 w-16">เลขฎีกา</th>
                <th className="border border-black p-1">ผู้รับเงิน (ตัวเช็ค)</th>
                <th className="border border-black p-1 text-right w-24">จำนวนเงิน</th>
                <th className="border border-black p-1 text-center w-14">ธนาคาร</th>
                <th className="border border-black p-1 text-center w-16">พิมพ์ (ครั้ง)</th>
                <th className="border border-black p-1 w-24">ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheques.map((c, i) => (
                <tr key={c.id}>
                  <td className="border border-black p-1 text-center">{i + 1}</td>
                  <td className="border border-black p-1">{formatThaiDate(c.stubDate)}</td>
                  <td className="border border-black p-1 font-semibold">{c.dikaNumber}</td>
                  <td className="border border-black p-1">{c.chequePayeeName}</td>
                  <td className="border border-black p-1 text-right font-bold">{c.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td className="border border-black p-1 text-center">{c.lastBankType || '-'}</td>
                  <td className="border border-black p-1 text-center">{c.printCount}</td>
                  <td className="border border-black p-1">{c.lastPrintedBy || c.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Executive Signatures Block */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
          <div>
            <p>ลงชื่อ..............................................................</p>
            <p className="mt-1">(..............................................................)</p>
            <p className="text-slate-600 mt-0.5">ผู้จัดทำและตรวจสอบรายงาน</p>
          </div>

          <div>
            <p>ลงชื่อ..............................................................</p>
            <p className="mt-1">(..............................................................)</p>
            <p className="text-slate-600 mt-0.5">หัวหน้าฝ่ายการเงินและบัญชี / ผู้อำนวยการ</p>
          </div>
        </div>

      </div>

    </div>
  );
};
