import React from 'react';
import { Cheque, ChequePrintLog } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDateTime } from '../utils/dateUtils';
import { History, X, Clock, User, Building, AlertCircle, FileCheck } from 'lucide-react';

interface ChequeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: Cheque | null;
}

export const ChequeHistoryModal: React.FC<ChequeHistoryModalProps> = ({
  isOpen,
  onClose,
  cheque,
}) => {
  if (!isOpen || !cheque) return null;

  const printLogs: ChequePrintLog[] = StorageService.getPrintLogs(cheque.id);
  const auditLogs = StorageService.getAuditLogs().filter(a => cheque.dikaNumber ? a.target.includes(cheque.dikaNumber) : a.target.includes(cheque.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ประวัติการออกและพิมพ์เช็ค (Append-Only Audit Trail)
              </h2>
              <p className="text-xs text-slate-500">
                ฎีกา: <strong>{cheque.dikaNumber}</strong> · ผู้รับเงิน: <strong>{cheque.chequePayeeName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">สถานะการออกเช็ค:</span>
              <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mt-0.5">
                {cheque.printCount > 0 ? (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">ออกแล้วทั้งหมด {cheque.printCount} ครั้ง</span>
                  </>
                ) : (
                  <span className="text-slate-500 font-medium">ยังไม่เคยออกเช็ค</span>
                )}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">ออกเช็คล่าสุดเมื่อ:</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {cheque.lastPrintedAt ? formatThaiDateTime(cheque.lastPrintedAt) : '-'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">ผู้ดำเนินการล่าสุด:</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {cheque.lastPrintedBy || '-'}
              </span>
            </div>
          </div>

          {/* Section 1: Print Logs Table (Append-Only) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>บันทึกประวัติการพิมพ์เช็คแต่ละครั้ง (Print History)</span>
              </h3>
              <span className="text-xs text-slate-400">
                รวม {printLogs.length} รายการ
              </span>
            </div>

            {printLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                ยังไม่มีประวัติการพิมพ์เช็คสำหรับรายการนี้
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14">ครั้งที่</th>
                      <th className="py-2.5 px-3">วันที่ / เวลา</th>
                      <th className="py-2.5 px-3">ธนาคาร</th>
                      <th className="py-2.5 px-3">ผู้ดำเนินการ</th>
                      <th className="py-2.5 px-3">เหตุผล (กรณีพิมพ์ซ้ำ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {printLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {log.printNo}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                          {formatThaiDateTime(log.printedAt)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
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
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-800 font-medium">
                          {log.printedBy}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {log.reprintReason ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block text-[11px]">
                                {log.reprintReason}
                              </span>
                              {log.reprintNote && (
                                <p className="text-[11px] text-slate-500 italic">{log.reprintNote}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">- พิมพ์ครั้งแรก -</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Audit Logs & Modification Trail */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-600" />
              <span>ประวัติการสร้างและแก้ไขรายการ (Audit Trail)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between">
                <div>
                  <span className="font-semibold text-slate-800">ผู้สร้างรายการ: </span>
                  <span className="text-slate-700">{cheque.createdBy}</span>
                </div>
                <span className="text-slate-500">{formatThaiDateTime(cheque.createdAt)}</span>
              </div>

              {cheque.updatedBy && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">ผู้แก้ไขล่าสุด: </span>
                    <span className="text-slate-700">{cheque.updatedBy}</span>
                  </div>
                  <span className="text-slate-500">{formatThaiDateTime(cheque.updatedAt)}</span>
                </div>
              )}

              {auditLogs.map((audit) => (
                <div key={audit.id} className="p-2.5 bg-slate-50/50 rounded-md border border-slate-100 flex items-start justify-between text-[11px] text-slate-600">
                  <span>
                    <strong className="text-slate-700">{audit.userFullName}</strong>: {audit.details}
                  </span>
                  <span className="text-slate-400 shrink-0 ml-3">{formatThaiDateTime(audit.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
