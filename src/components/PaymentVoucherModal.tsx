import React from 'react';
import { Cheque, User } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/dateUtils';
import { thaiBahtText } from '../utils/thaiBahtText';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface PaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque?: Cheque | null;
  cheques?: Cheque[];
  currentUser: User;
}

export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  cheque,
  cheques,
  currentUser,
}) => {
  const [docType, setDocType] = React.useState<'VOUCHER' | 'TAX_50' | 'CHEQUE_SLIP'>('VOUCHER');

  if (!isOpen) return null;

  // Determine items to display (single or batch)
  const itemsToRender: Cheque[] = cheques && cheques.length > 0 ? cheques : cheque ? [cheque] : [];

  if (itemsToRender.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:z-auto">
      
      {/* Modal Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar (Strictly hidden during physical print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {docType === 'VOUCHER'
                  ? 'ใบสำคัญจ่ายและใบนำส่งเช็ค (Payment Voucher & Handover Slip)'
                  : docType === 'CHEQUE_SLIP'
                  ? 'ใบปะหน้าเช็คเสนอลงนาม (Cheque Approval Slip)'
                  : 'หนังสือรับรองการหักภาษี ณ ที่จ่าย (ตามมาตรา 50 ทวิ)'}
              </h2>
              <p className="text-[11px] text-slate-500">
                พิมพ์ลงกระดาษ A4 {itemsToRender.length > 1 ? `(พิมพ์ต่อเนื่อง ${itemsToRender.length} รายการ)` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Document Type Switcher */}
            <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDocType('VOUCHER')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  docType === 'VOUCHER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. ใบสำคัญจ่าย A4
              </button>
              <button
                type="button"
                onClick={() => setDocType('CHEQUE_SLIP')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  docType === 'CHEQUE_SLIP' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. ใบปะหน้าเสนอลงนาม
              </button>
              <button
                type="button"
                onClick={() => setDocType('TAX_50')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  docType === 'TAX_50' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. หนังสือหักภาษี 50 ทวิ
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ A4 ({itemsToRender.length} ฉบับ)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/50 flex flex-col items-center gap-6 print:p-0 print:bg-white print:overflow-visible">
          
          {itemsToRender.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white border border-slate-300 shadow-lg rounded-xl p-8 sm:p-10 w-full max-w-[210mm] min-h-[297mm] text-slate-800 text-xs flex flex-col justify-between print:border-none print:shadow-none print:rounded-none print:p-8 print:w-full print:max-w-none print:min-h-0 print:page-break-after-always"
              style={{ boxSizing: 'border-box' }}
            >
              {docType === 'VOUCHER' ? (
                /* === DOCUMENT 1: STANDARD PAYMENT VOUCHER & HANDOVER SLIP === */
                <div className="flex flex-col justify-between h-full space-y-6">
                  <div className="space-y-5">
                    {/* 1. Header */}
                    <div className="text-center border-b-2 border-slate-800 pb-3">
                      <div className="text-[15px] font-bold text-slate-900 tracking-wide uppercase">
                        ใบสำคัญจ่ายและใบนำส่งเช็คประกอบฎีกาคลังรับ
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        ระบบบริหารจัดการการออกเช็คและฎีกา · งานการเงินและบัญชี
                      </div>
                    </div>

                    {/* 2. Top Info Grid */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">เลขที่ฎีกาคลังรับ:</span>
                        <span className="font-bold text-slate-900 ml-2 font-mono text-sm">{item.dikaNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-semibold">วันที่ออกเช็ค:</span>
                        <span className="font-bold text-slate-900 ml-2">{formatThaiDate(item.chequeDate || item.stubDate)}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-semibold">เลขที่เช็ค (Cheque No.):</span>
                        <span className="font-bold text-emerald-800 ml-2 font-mono text-sm">
                          {item.chequeNumber || '......................................'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-semibold">ธนาคาร / บัญชี:</span>
                        <span className="font-medium text-slate-800 ml-2">
                          {item.lastBankType || 'KTB'} {item.bankAccountNo ? `(${item.bankAccountNo})` : ''}
                        </span>
                      </div>

                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-500 font-semibold">สั่งจ่ายให้แก่ (ผู้รับเงิน):</span>
                        <span className="font-bold text-slate-900 ml-2 text-sm">{item.chequePayeeName}</span>
                        {item.stubPayeeName && item.stubPayeeName !== item.chequePayeeName && (
                          <span className="text-slate-500 ml-2"> (ต้นขั้ว: {item.stubPayeeName})</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Items Table */}
                    <div>
                      <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>รายการขอเบิกจ่ายตามฎีกา:</span>
                        <span className="text-[11px] text-slate-500">รวมทั้งหมด {item.items.length} รายการ</span>
                      </div>

                      <table className="w-full border-collapse border border-slate-300 text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th className="border border-slate-300 py-2 px-2.5 w-12 text-center">ลำดับ</th>
                            <th className="border border-slate-300 py-2 px-3 text-left">รายการ</th>
                            <th className="border border-slate-300 py-2 px-3 text-right w-40">จำนวนเงิน (บาท)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.items.map((it, i) => (
                            <tr key={it.id || i}>
                              <td className="border border-slate-300 py-2 px-2.5 text-center text-slate-600">{i + 1}</td>
                              <td className="border border-slate-300 py-2 px-3 text-slate-800">{it.description}</td>
                              <td className="border border-slate-300 py-2 px-3 text-right font-semibold tabular-nums text-slate-900">
                                {it.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          {/* Blank rows filler */}
                          {item.items.length < 3 && Array.from({ length: 3 - item.items.length }).map((_, emptyIdx) => (
                            <tr key={`empty_${emptyIdx}`} className="h-6">
                              <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-300">·</td>
                              <td className="border border-slate-300 py-1.5 px-3"></td>
                              <td className="border border-slate-300 py-1.5 px-3"></td>
                            </tr>
                          ))}
                          
                          <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                            <td colSpan={2} className="border border-slate-300 py-2 px-3 text-right text-slate-700">
                              จำนวนเงินรวมตามฎีกา:
                            </td>
                            <td className="border border-slate-300 py-2 px-3 text-right text-slate-900 tabular-nums">
                              {item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>

                          {/* Withholding Tax Row if any */}
                          {item.withholdingTaxAmount && item.withholdingTaxAmount > 0 ? (
                            <>
                              <tr className="bg-amber-50/60 text-amber-900">
                                <td colSpan={2} className="border border-slate-300 py-1.5 px-3 text-right">
                                  หักภาษี ณ ที่จ่าย ({item.withholdingTaxPercent || 1}%):
                                </td>
                                <td className="border border-slate-300 py-1.5 px-3 text-right font-medium tabular-nums text-amber-800">
                                  - {item.withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              <tr className="bg-emerald-50 font-bold border-t-2 border-slate-400">
                                <td colSpan={2} className="border border-slate-300 py-2.5 px-3 text-right text-emerald-950 font-bold">
                                  ยอดเงินสุทธิที่สั่งจ่ายเช็ค:
                                </td>
                                <td className="border border-slate-300 py-2.5 px-3 text-right text-emerald-800 text-sm tabular-nums font-black">
                                  {(item.netPaidAmount || item.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr className="bg-emerald-50 font-bold border-t-2 border-slate-400">
                              <td colSpan={2} className="border border-slate-300 py-2.5 px-3 text-right text-emerald-950 font-bold">
                                ยอดเงินสุทธิที่สั่งจ่ายเช็ค:
                              </td>
                              <td className="border border-slate-300 py-2.5 px-3 text-right text-emerald-800 text-sm tabular-nums font-black">
                                {item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Thai Baht Text Box */}
                      <div className="mt-2.5 p-2.5 border border-slate-300 rounded bg-slate-50 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">จำนวนเงินตัวอักษร:</span>
                        <span className="font-bold text-slate-900 font-mono">={item.totalAmountThaiText}=</span>
                      </div>
                    </div>

                    {/* 4. Cheque Details Status */}
                    <div className="p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                      <div>
                        <span>ธนาคาร: <strong>{item.lastBankType || 'KTB'}</strong></span>
                        <span className="ml-3">สถานะเช็ค: <strong>{item.status === 'VOID' ? 'ยกเลิก (Void)' : item.printCount > 0 ? `พิมพ์ออกเช็คแล้ว (${item.printCount} ครั้ง)` : 'รอออกเช็ค'}</strong></span>
                      </div>
                      <div>
                        <span>ผู้บันทึก: <strong>{item.createdBy}</strong></span>
                        {item.lastPrintedBy && (
                          <span className="ml-3">ผู้สั่งพิมพ์: <strong>{item.lastPrintedBy}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5. Signatures Zone */}
                  <div className="space-y-6 pt-4 border-t-2 border-slate-300">
                    <div className="grid grid-cols-2 gap-8 text-center text-xs">
                      <div>
                        <div className="mb-8">ลงชื่อ...................................................... ผู้จัดทำเช็ค</div>
                        <div className="text-slate-600">( {item.createdBy || currentUser.fullName} )</div>
                        <div className="text-[11px] text-slate-400 mt-1">วันที่ ........./........./............</div>
                      </div>
                      <div>
                        <div className="mb-8">ลงชื่อ...................................................... ผู้ตรวจจ่าย</div>
                        <div className="text-slate-600">( ...................................................... )</div>
                        <div className="text-[11px] text-slate-400 mt-1">หัวหน้ากลุ่มงานการเงินและบัญชี</div>
                      </div>
                    </div>

                    {/* Handover Acknowledgement */}
                    <div className="p-4 border-2 border-slate-400 rounded-xl bg-slate-50/70 space-y-3">
                      <div className="font-bold text-xs text-slate-900 border-b border-slate-300 pb-1">
                        หลักฐานการรับเช็ค (สำหรับผู้มีสิทธิรับเงินลงลายมือชื่อเมื่อมารับเช็ค)
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        ข้าพเจ้าได้รับเช็คฉบับดังกล่าวข้างต้นไปถูกต้องครบถ้วนแล้ว จึงได้ลงลายมือชื่อไว้เป็นหลักฐานประกอบฎีกา
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <div>
                            เลขที่เช็คที่ได้รับ: <strong className="font-mono text-emerald-900">{item.chequeNumber || '......................................................'}</strong>
                          </div>
                          <div>เลขประจำตัว ปชช./ผู้เสียภาษี: .......................................</div>
                          <div>เบอร์โทรศัพท์ติดต่อ: ......................................................</div>
                        </div>
                        <div className="text-center space-y-1">
                          <div>ลงชื่อ...................................................... ผู้รับเช็ค</div>
                          <div className="text-slate-600">( {item.chequePayeeName} หรือผู้รับมอบอำนาจ )</div>
                          <div className="text-[11px] text-slate-400">วันที่รับเช็ค: ........./........./............</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* === DOCUMENT 2: WITHHOLDING TAX CERTIFICATE (50 ทวิ) === */
                <div className="flex flex-col justify-between h-full space-y-5">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="text-center border-b-2 border-slate-900 pb-3">
                      <div className="text-[16px] font-bold text-slate-900">
                        หนังสือรับรองการหักภาษี ณ ที่จ่าย
                      </div>
                      <div className="text-[12px] font-semibold text-slate-700 mt-0.5">
                        ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร
                      </div>
                    </div>

                    {/* Issuer & Payee details */}
                    <div className="border border-slate-400 rounded-lg p-3 space-y-2 text-xs">
                      <div className="font-bold text-slate-900 underline">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย:</div>
                      <div className="grid grid-cols-2 gap-2 pl-3">
                        <div>ชื่อ: <strong>ส่วนราชการ / องค์กรปกครองส่วนท้องถิ่น</strong></div>
                        <div>เลขประจำตัวผู้เสียภาษี: <strong>0994000160000</strong></div>
                        <div className="col-span-2">ที่อยู่: งานการเงินและบัญชี กองคลัง</div>
                      </div>
                    </div>

                    <div className="border border-slate-400 rounded-lg p-3 space-y-2 text-xs">
                      <div className="font-bold text-slate-900 underline">ผู้ถูกหักภาษี ณ ที่จ่าย:</div>
                      <div className="grid grid-cols-2 gap-2 pl-3">
                        <div className="col-span-2">ชื่อ: <strong className="text-sm">{item.chequePayeeName}</strong></div>
                        <div>เลขประจำตัวผู้เสียภาษี / บัตรประชาชน: .................................................</div>
                        <div>อ้างอิงฎีกา: <strong className="font-mono">{item.dikaNumber}</strong> {item.chequeNumber ? `(เช็คเลขที่ ${item.chequeNumber})` : ''}</div>
                      </div>
                    </div>

                    {/* Tax assessment table */}
                    <div>
                      <table className="w-full border-collapse border border-slate-400 text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 text-center">
                            <th className="border border-slate-400 p-2">ประเภทเงินได้พึงประเมินที่จ่าย</th>
                            <th className="border border-slate-400 p-2 w-32">วัน เดือน ปี ที่จ่าย</th>
                            <th className="border border-slate-400 p-2 w-36">จำนวนเงินที่จ่าย</th>
                            <th className="border border-slate-400 p-2 w-36">ภาษีที่หักและนำส่ง</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-slate-400 p-2.5">
                              {item.items[0]?.description || 'ค่าจ้างเหมาบริการ / พัสดุ'} (ตามฎีกา {item.dikaNumber})
                            </td>
                            <td className="border border-slate-400 p-2.5 text-center">
                              {formatThaiDate(item.chequeDate || item.stubDate)}
                            </td>
                            <td className="border border-slate-400 p-2.5 text-right font-bold tabular-nums">
                              {item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-slate-400 p-2.5 text-right font-bold tabular-nums text-emerald-800">
                              {(item.withholdingTaxAmount || (item.totalAmount * 0.01)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                            <td colSpan={2} className="border border-slate-400 p-2.5 text-right font-bold">
                              รวมเงินที่จ่ายและภาษีที่หักนำส่ง:
                            </td>
                            <td className="border border-slate-400 p-2.5 text-right font-black tabular-nums">
                              {item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-slate-400 p-2.5 text-right font-black tabular-nums text-emerald-800">
                              {(item.withholdingTaxAmount || (item.totalAmount * 0.01)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-2.5 p-2.5 border border-slate-400 rounded bg-slate-50 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">รวมเงินภาษีที่หักนำส่ง (ตัวอักษร):</span>
                        <span className="font-bold text-slate-900 font-mono">
                          ={thaiBahtText(item.withholdingTaxAmount || (item.totalAmount * 0.01))}=
                        </span>
                      </div>
                    </div>

                    <div className="p-3 border border-slate-300 rounded text-xs space-y-1">
                      <div className="font-semibold">ผู้จ่ายเงิน:</div>
                      <div className="flex items-center gap-6 pl-4 pt-1">
                        <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked readOnly className="rounded" /> หัก ณ ที่จ่าย</label>
                        <label className="flex items-center gap-1.5"><input type="checkbox" readOnly className="rounded" /> ออกให้ตลอดไป</label>
                        <label className="flex items-center gap-1.5"><input type="checkbox" readOnly className="rounded" /> ออกให้ครั้งเดียว</label>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="pt-6 border-t-2 border-slate-300 space-y-4">
                    <p className="text-[11px] text-slate-600 text-center">
                      ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความเป็นจริงทุกประการ
                    </p>
                    <div className="flex justify-end pt-4 pr-10">
                      <div className="text-center space-y-1">
                        <div className="mb-8">ลงชื่อ............................................................ ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</div>
                        <div className="text-slate-600">( ............................................................ )</div>
                        <div className="text-[11px] text-slate-500">ตำแหน่ง หัวหน้าหน่วยงานคลัง / เจ้าหน้าที่ผู้รับมอบหมาย</div>
                        <div className="text-[11px] text-slate-400">วันที่ ........../........../............. [ประทับตรานิติบุคคล]</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

      </div>
    </div>
  );
};
