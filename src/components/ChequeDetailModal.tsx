import React from 'react';
import { Cheque, BankType } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate, formatThaiDateTime } from '../utils/dateUtils';
import {
  X,
  Printer,
  Ban,
  Calendar,
  CreditCard,
  Hash,
  Building,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface ChequeDetailModalProps {
  cheque: Cheque | null;
  onClose: () => void;
  onPrint?: (cheque: Cheque) => void;
  onVoid?: (cheque: Cheque) => void;
  onDuplicateAsNew?: (cheque: Cheque) => void;
}

export const ChequeDetailModal: React.FC<ChequeDetailModalProps> = ({
  cheque,
  onClose,
  onPrint,
  onVoid,
  onDuplicateAsNew,
}) => {
  if (!cheque) return null;

  const isPending = cheque.status !== 'VOID' && cheque.printCount === 0;
  const isVoid = cheque.status === 'VOID';
  const isPrinted = cheque.status !== 'VOID' && cheque.printCount > 0;

  const getBankBadge = (bank?: BankType) => {
    const code = bank || 'KTB';
    if (code === 'KTB') {
      return {
        bg: 'bg-sky-500',
        text: 'text-sky-900',
        badgeBg: 'bg-sky-100',
        label: 'ธ.กรุงไทย (KTB)',
      };
    }
    if (code === 'BAAC') {
      return {
        bg: 'bg-emerald-600',
        text: 'text-emerald-900',
        badgeBg: 'bg-emerald-100',
        label: 'ธ.ก.ส. (BAAC)',
      };
    }
    if (code === 'GSB') {
      return {
        bg: 'bg-pink-600',
        text: 'text-pink-900',
        badgeBg: 'bg-pink-100',
        label: 'ธ.ออมสิน (GSB)',
      };
    }
    return {
      bg: 'bg-red-700',
      text: 'text-red-900',
      badgeBg: 'bg-red-100',
      label: code,
    };
  };

  const bankInfo = getBankBadge(cheque.lastBankType);
  const netAmount = cheque.netPaidAmount || cheque.totalAmount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-red-200 overflow-hidden my-auto animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-800 to-red-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bankInfo.bg} text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white/30`}>
              {cheque.lastBankType || 'KTB'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  รายละเอียดเช็ค & เอกสารสั่งจ่าย
                </h3>
                {isPending && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950 flex items-center gap-1 shadow-xs">
                    <Clock className="w-3 h-3" />
                    <span>รอพิมพ์ (Pending)</span>
                  </span>
                )}
                {isPrinted && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-emerald-950 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>พิมพ์แล้ว ({cheque.printCount} ครั้ง)</span>
                  </span>
                )}
                {isVoid && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-300 text-slate-800 flex items-center gap-1 shadow-xs">
                    <Ban className="w-3 h-3" />
                    <span>ยกเลิก (Void)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-red-200 font-medium">
                เลขที่ฎีกา: <strong className="text-white">{cheque.dikaNumber}</strong>
                {cheque.chequeNumber && (
                  <> • เลขที่เช็ค: <strong className="text-white font-mono">{cheque.chequeNumber}</strong></>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          {/* Official Voucher Preview Card */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-inner relative overflow-hidden">
            <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
              <FileText className="w-36 h-36" />
            </div>

            {/* Row 1: Date & Bank */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">วันที่สั่งจ่ายบนเช็ค:</span>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-red-700" />
                  <span>{formatThaiDate(cheque.chequeDate || cheque.stubDate)}</span>
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 block">เลขที่ฎีกาคลังรับ:</span>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <Hash className="w-4 h-4 text-red-700" />
                  <span>{cheque.dikaNumber}</span>
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 block">สมุดเช็คธนาคาร:</span>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <Building className="w-4 h-4 text-red-700" />
                  <span>{bankInfo.label}</span>
                </span>
              </div>
            </div>

            {/* Row 2: Payee */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-500 block">สั่งจ่ายให้แก่ (ผู้รับเงินบนหน้าเช็ค):</span>
              <span className="text-lg font-black text-slate-900 block mt-0.5">
                {cheque.chequePayeeName || cheque.stubPayeeName}
              </span>
            </div>

            {/* Row 3: Items breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>รายการฎีกาที่เบิกจ่าย ({cheque.items?.length || 1} รายการ):</span>
                <span>จำนวนเงิน (บาท)</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {cheque.items && cheque.items.length > 0 ? (
                  cheque.items.map((it, idx) => (
                    <div key={it.id || idx} className="p-2.5 px-3.5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{it.description}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {it.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-500">
                    ค่าใช้จ่ายและวัสดุตามฎีกา
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Financial Summary */}
            <div className="p-4 bg-red-50/70 border-2 border-red-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 font-semibold">
                <span>ยอดเงินรวมก่อนหักภาษี:</span>
                <span className="tabular-nums font-bold text-slate-800">
                  {cheque.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>

              {cheque.withholdingTaxAmount && cheque.withholdingTaxAmount > 0 ? (
                <div className="flex items-center justify-between text-xs sm:text-sm text-amber-800 font-semibold">
                  <span>หักภาษี ณ ที่จ่าย ({cheque.withholdingTaxPercent}%):</span>
                  <span className="tabular-nums font-bold">
                    - {cheque.withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
              ) : null}

              <div className="border-t border-red-200 pt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-black text-red-900 uppercase">ยอดสุทธิสั่งจ่ายบนเช็ค (NET PAID):</span>
                  <div className="text-xs text-red-700 font-bold mt-0.5">
                    (={cheque.totalAmountThaiText}=)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-red-700 tabular-nums">
                    {netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-bold text-red-800 ml-1">บาท</span>
                </div>
              </div>
            </div>

            {/* Void Notice if Voided */}
            {isVoid && (
              <div className="p-3.5 bg-red-100 border-2 border-red-300 rounded-xl text-red-950 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-black text-sm text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  <span>เช็คฉบับนี้ถูกยกเลิกแล้ว (VOID)</span>
                </div>
                <p>
                  <strong>เหตุผล:</strong> {cheque.voidReason || 'พิมพ์ผิด / เปลี่ยนแปลงยอด'}
                </p>
                {cheque.voidBy && (
                  <p className="text-slate-600">
                    ยกเลิกโดย: {cheque.voidBy} {cheque.voidAt && `(${formatThaiDateTime(cheque.voidAt)})`}
                  </p>
                )}
              </div>
            )}

            {/* Detailed Print History Section (ประวัติการพิมพ์เช็คฉบับนี้: ใครพิมพ์, จำนวนครั้งที่พิมพ์, พิมพ์เมื่อไร) */}
            <div className="bg-white border-2 border-red-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 text-red-800 rounded-lg">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      ประวัติการพิมพ์เช็คฉบับนี้ (Print History & Audit)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      บันทึกประวัติการพิมพ์ ใครพิมพ์ จำนวนครั้งที่พิมพ์ และพิมพ์เมื่อไร
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPrinted ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>พิมพ์แล้วทั้งหมด {cheque.printCount} ครั้ง</span>
                    </span>
                  ) : isVoid ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      เช็คถูกยกเลิก (VOID)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>ยังไม่เคยพิมพ์ (รอพิมพ์)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Print History Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">ผู้สั่งพิมพ์ล่าสุด (ใครพิมพ์):</span>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-red-700 shrink-0" />
                    <span>{cheque.lastPrintedBy || (isPrinted ? 'ผู้ดูแลระบบ' : 'ยังไม่เคยพิมพ์')}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">จำนวนการพิมพ์แล้ว:</span>
                  <div className="text-xs sm:text-sm font-black text-slate-900 tabular-nums flex items-center gap-1.5 mt-0.5">
                    <Printer className="w-3.5 h-3.5 text-red-700 shrink-0" />
                    <span>{cheque.printCount} ครั้ง {cheque.printCount > 1 ? '(มีการพิมพ์ซ้ำ)' : ''}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold block">พิมพ์เมื่อไร (วันเวลาล่าสุด):</span>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-red-700 shrink-0" />
                    <span>{cheque.lastPrintedAt ? formatThaiDateTime(cheque.lastPrintedAt) : (isPrinted ? formatThaiDate(cheque.chequeDate || cheque.stubDate) : 'ยังไม่มีประวัติการพิมพ์')}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Print Logs Logbook Table */}
              {(() => {
                const logs = StorageService.getPrintLogs(cheque.id);
                if (logs.length > 0) {
                  return (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold text-slate-700 block">
                        รายละเอียดประวัติการพิมพ์แต่ละครั้ง (รวม {logs.length} รายการ):
                      </span>
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 text-center w-16">ครั้งที่</th>
                              <th className="py-2 px-3">ใครพิมพ์ (ผู้สั่งพิมพ์)</th>
                              <th className="py-2 px-3">พิมพ์เมื่อไร (วัน-เวลา)</th>
                              <th className="py-2 px-3 text-center">ธนาคาร</th>
                              <th className="py-2 px-3">หมายเหตุ / เหตุผลการพิมพ์ซ้ำ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {logs.map((log) => (
                              <tr key={log.id} className="hover:bg-red-50/40 transition-colors">
                                <td className="py-2 px-3 text-center font-black text-slate-800 tabular-nums">
                                  {log.printNo === 1 ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">1</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">{log.printNo}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-red-700 shrink-0" />
                                    <span>{log.printedBy}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-medium">
                                  {formatThaiDateTime(log.printedAt)}
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                                    {log.bankType}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {log.reprintReason ? (
                                    <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-900 rounded border border-amber-200 text-[11px] font-semibold">
                                      {log.reprintReason} {log.reprintNote ? `(${log.reprintNote})` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">สั่งพิมพ์ครั้งแรก (ปกติ)</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                if (isPrinted) {
                  return (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          เช็คนี้ได้รับการสั่งพิมพ์แล้ว <strong>{cheque.printCount} ครั้ง</strong> โดย <strong>{cheque.lastPrintedBy || 'ผู้ดูแลระบบ'}</strong>
                        </span>
                      </div>
                      <span className="text-slate-500 font-medium">
                        {cheque.lastPrintedAt ? formatThaiDateTime(cheque.lastPrintedAt) : formatThaiDate(cheque.chequeDate || cheque.stubDate)}
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>เช็คฉบับนี้ยังไม่เคยสั่งพิมพ์ (สถานะรอพิมพ์) กดปุ่ม "🖨️ สั่งพิมพ์เช็คนี้" ด้านล่างเพื่อออกเช็ค</span>
                  </div>
                );
              })()}
            </div>

            {/* Creation Audit Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
              <div>
                <span>สร้างและบันทึกเอกสารโดย:</span> <strong className="text-slate-800">{cheque.createdBy || '-'}</strong>
              </div>
              <div>
                <span>บันทึกเข้าระบบเมื่อ:</span> <strong className="text-slate-800">{cheque.createdAt ? formatThaiDateTime(cheque.createdAt) : '-'}</strong>
              </div>
              {cheque.updatedBy && (
                <div>
                  <span>แก้ไขล่าสุดโดย:</span> <strong className="text-slate-800">{cheque.updatedBy}</strong>
                </div>
              )}
              {cheque.updatedAt && (
                <div>
                  <span>แก้ไขเมื่อ:</span> <strong className="text-slate-800">{formatThaiDateTime(cheque.updatedAt)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!isVoid && onVoid && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onVoid(cheque);
                }}
                className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title="ขอยกเลิกเช็คฉบับนี้"
              >
                <Ban className="w-4 h-4 text-red-600" />
                <span>ยกเลิกเช็ค (Void)</span>
              </button>
            )}

            {onDuplicateAsNew && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDuplicateAsNew(cheque);
                }}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="ดึงข้อมูลเจ้านี้มาออกเป็นเช็คฉบับใหม่ในรอบเดือนนี้ (ไม่ถือว่าพิมพ์ซ้ำ)"
              >
                <span>📋 นำมาออกเช็คใหม่ (ไม่ถือว่าพิมพ์ซ้ำ)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-300 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            {!isVoid && onPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrint(cheque);
                }}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-black shadow-md transition-all flex items-center gap-2 cursor-pointer ring-2 ring-red-300 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>{isPending ? '🖨️ สั่งพิมพ์เช็คนี้' : '🖨️ พิมพ์ซ้ำ'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
