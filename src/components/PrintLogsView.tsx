import React, { useState } from 'react';
import { ChequePrintLog } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDateTime } from '../utils/dateUtils';
import { History, Search, Building, User, AlertTriangle, FileSpreadsheet, RotateCcw } from 'lucide-react';

export const PrintLogsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState<'ALL' | 'KTB' | 'BAAC' | 'GSB'>('ALL');
  const [onlyReprints, setOnlyReprints] = useState(false);

  const logs: ChequePrintLog[] = StorageService.getPrintLogs();

  const filteredLogs = logs.filter(log => {
    if (bankFilter !== 'ALL' && log.bankType !== bankFilter) return false;
    if (onlyReprints && log.printNo <= 1) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDika = log.dikaNumber.toLowerCase().includes(term);
      const matchPayee = log.chequePayeeName.toLowerCase().includes(term);
      const matchOperator = log.printedBy.toLowerCase().includes(term);
      const matchReason = (log.reprintReason || '').toLowerCase().includes(term);
      if (!matchDika && !matchPayee && !matchOperator && !matchReason) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>ประวัติการออกและพิมพ์เช็คทั้งหมด (System Print Logs)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกการพิมพ์เช็คแบบถาวร (Append-Only) ไม่มีการลบหรือเขียนทับประวัติ เพื่อความโปร่งใสและตรวจสอบย้อนหลัง
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
          บันทึกรวมทั้งหมด: <strong className="text-slate-900 font-bold">{logs.length}</strong> ครั้ง
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="ค้นหา: เลขที่ฎีกา, ผู้รับเงิน, ผู้ดำเนินการ, เหตุผลพิมพ์ซ้ำ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Bank Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setBankFilter('ALL')}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                bankFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทุกธนาคาร
            </button>
            <button
              type="button"
              onClick={() => setBankFilter('KTB')}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                bankFilter === 'KTB' ? 'bg-white text-sky-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              KTB
            </button>
            <button
              type="button"
              onClick={() => setBankFilter('BAAC')}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                bankFilter === 'BAAC' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              BAAC
            </button>
            <button
              type="button"
              onClick={() => setBankFilter('GSB')}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                bankFilter === 'GSB' ? 'bg-white text-pink-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GSB
            </button>
          </div>

          {/* Toggle Reprints Only */}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer px-2">
            <input
              type="checkbox"
              checked={onlyReprints}
              onChange={(e) => setOnlyReprints(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>เฉพาะรายการที่พิมพ์ซ้ำ</span>
          </label>

          {/* Reset */}
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setBankFilter('ALL'); setOnlyReprints(false); }}
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="ล้างเงื่อนไข"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                <th className="py-3 px-3 whitespace-nowrap">วันที่และเวลาพิมพ์</th>
                <th className="py-3 px-3 whitespace-nowrap">เลขที่ฎีกา</th>
                <th className="py-3 px-3">ชื่อผู้รับเงิน (ตัวเช็ค)</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">จำนวนเงิน (บาท)</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">ธนาคาร</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">ครั้งที่พิมพ์</th>
                <th className="py-3 px-3 whitespace-nowrap">ผู้ดำเนินการพิมพ์</th>
                <th className="py-3 px-3">เหตุผล (กรณีพิมพ์ซ้ำ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">ไม่พบประวัติการพิมพ์ตามเงื่อนไข</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-medium text-slate-400 tabular-nums">
                      {index + 1}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                      {formatThaiDateTime(log.printedAt)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                      {log.dikaNumber}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {log.chequePayeeName}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {log.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        log.bankType === 'KTB'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : log.bankType === 'BAAC'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-pink-50 text-pink-700 border border-pink-200'
                      }`}>
                        <Building className="w-3 h-3" />
                        {log.bankType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {log.printNo > 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] bg-amber-100 text-amber-900">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>ครั้งที่ {log.printNo}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium">ครั้งที่ 1</span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.printedBy}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {log.reprintReason ? (
                        <div>
                          <span className="font-semibold text-amber-800 text-[11px]">
                            {log.reprintReason}
                          </span>
                          {log.reprintNote && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              {log.reprintNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div>แสดง <strong>{filteredLogs.length}</strong> จากทั้งหมด <strong>{logs.length}</strong> รายการบันทึก</div>
        </div>
      </div>

    </div>
  );
};
