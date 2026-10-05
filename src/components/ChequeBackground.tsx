import React from 'react';
import { BankType } from '../types';

interface ChequeBackgroundProps {
  bankType: BankType;
  customImageUrl?: string | null;
  opacity?: number;
}

export const ChequeBackground: React.FC<ChequeBackgroundProps> = ({
  bankType,
  customImageUrl,
  opacity = 1,
}) => {
  const containerStyle = {
    opacity: opacity,
  };

  if (customImageUrl) {
    return (
      <div style={containerStyle} className="absolute inset-0 w-full h-full pointer-events-none select-none cheque-background-guide">
        <img
          src={customImageUrl}
          alt={`Cheque background ${bankType}`}
          className="w-full h-full object-fill pointer-events-none select-none"
        />
      </div>
    );
  }

  // 1. KTB - ธนาคารกรุงไทย (Exact 1:1 photorealistic replica of the real scanned cheque)
  if (bankType === 'KTB') {
    return (
      <div style={containerStyle} className="absolute inset-0 w-full h-full pointer-events-none select-none cheque-background-guide bg-[#f8fcff] overflow-hidden text-slate-800 font-sans border border-slate-300 shadow-inner">
        
        {/* SVG Guilloche Security Waves across cheque body */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" preserveAspectRatio="none" viewBox="0 0 241 90">
          <defs>
            <pattern id="ktb-waves" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 Q 10 0 20 10 T 40 10" fill="none" stroke="#bae6fd" strokeWidth="0.35" />
              <path d="M 0 15 Q 10 5 20 15 T 40 15" fill="none" stroke="#e0f2fe" strokeWidth="0.25" />
            </pattern>
          </defs>
          <rect x="36" y="20" width="205" height="60" fill="url(#ktb-waves)" />
          {/* Subtle wave arc lines */}
          <path d="M 36 65 Q 90 40 150 70 T 241 60" fill="none" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.6" />
          <path d="M 36 68 Q 95 43 155 73 T 241 63" fill="none" stroke="#38bdf8" strokeWidth="0.3" opacity="0.4" />
          <path d="M 36 71 Q 100 46 160 76 T 241 66" fill="none" stroke="#bae6fd" strokeWidth="0.3" opacity="0.5" />
        </svg>

        {/* Faded Watermark "KTB GROWING TOGETHER" */}
        <div className="absolute top-[22mm] left-[42mm] right-[10mm] flex items-center justify-center opacity-15 pointer-events-none">
          <div className="text-xl md:text-2xl font-black text-sky-800 tracking-[0.3em] font-serif select-none">
            KTB GROWING TOGETHER
          </div>
        </div>

        {/* ================= LEFT STUB (Width 36mm of 241mm ~ 15%) ================= */}
        <div className="absolute top-0 bottom-0 left-0 w-[15.2%] border-r border-dotted border-slate-400 p-2 flex flex-col justify-between text-[7px] bg-[#fbfdff]">
          
          {/* Left vertical edge barcode */}
          <div className="flex items-start gap-1">
            <div className="w-2.5 h-16 bg-slate-900 flex flex-col justify-between p-0.5 opacity-90 shrink-0">
              <div className="h-0.5 bg-white w-full" />
              <div className="h-1 bg-white w-full" />
              <div className="h-0.5 bg-white w-full" />
              <div className="h-0.5 bg-white w-full" />
              <div className="h-1.5 bg-white w-full" />
              <div className="h-0.5 bg-white w-full" />
            </div>
            <div className="text-[6.5px] text-slate-500 leading-tight">
              <div>KTB BRA CHQ.</div>
              <div>WKM ไม่ส่งมอบ V.1</div>
              <div className="text-slate-400">P. 276</div>
            </div>
          </div>

          {/* Stub handwritten rows */}
          <div className="space-y-1.5 text-slate-700 font-medium">
            <div className="border-b border-slate-300 pb-0.5">วันที่ ....................</div>
            <div className="border-b border-slate-300 pb-0.5">จ่าย ....................</div>
            <div className="border-b border-slate-300 pb-0.5">บาท ....................</div>
          </div>

          {/* Stub Financial Ledger Table */}
          <div className="border border-slate-300 bg-white text-[6px] text-slate-700">
            <div className="grid grid-cols-2 border-b border-slate-300 px-1 py-0.5 font-semibold bg-slate-50">
              <span>ยอดยกมา</span>
              <span className="text-right">จำนวนเงิน</span>
            </div>
            <div className="border-b border-slate-200 px-1 py-0.5">เงินนำฝาก</div>
            <div className="border-b border-slate-200 px-1 py-0.5">รวม</div>
            <div className="border-b border-slate-200 px-1 py-0.5">เงินจ่ายตามเช็ค</div>
            <div className="border-b border-slate-200 px-1 py-0.5">เงินตัดจากบัญชี</div>
            <div className="border-b border-slate-200 px-1 py-0.5">ยอดยกไป</div>
            <div className="p-0.5 text-[5px] text-slate-500 leading-tight">
              การขีดฆ่าในเช็ค ต้องเซ็นชื่อเต็มกำกับทุกแห่ง
            </div>
          </div>

          {/* Bottom stub number */}
          <div className="font-mono text-[7.5px] font-bold text-slate-800 tracking-wider">
            CH.B 10250656
          </div>
        </div>

        {/* ================= CHEQUE BODY (Right of Stub) ================= */}
        <div className="absolute top-0 bottom-0 left-[15.2%] right-0 p-3 flex flex-col justify-between">
          
          {/* Header Row: Vayupak Bird Logo + Krungthai Typography + Branch + Date Cells */}
          <div className="flex items-start justify-between">
            
            {/* Logo and Branch Information */}
            <div className="flex items-center gap-2.5">
              
              {/* Authentic Krungthai Vayupak Bird Icon */}
              <div className="w-9 h-9 text-[#00a5e5] shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current filter drop-shadow-xs">
                  {/* Detailed stylized bird motif */}
                  <circle cx="50" cy="50" r="46" fill="#00a5e5" />
                  <path d="M50 18 C38 18 30 26 30 38 C30 52 42 62 50 82 C58 62 70 52 70 38 C70 26 62 18 50 18 Z" fill="#ffffff" opacity="0.9" />
                  <path d="M50 24 C45 24 40 28 40 36 C40 45 47 52 50 64 C53 52 60 45 60 36 C60 28 55 24 50 24 Z" fill="#00a5e5" />
                  <circle cx="50" cy="34" r="4" fill="#ffffff" />
                </svg>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-black text-[#00a5e5] tracking-tight">
                    ธนาคารกรุงไทย
                  </span>
                  <span className="text-[10px] font-extrabold text-[#0284c7] tracking-wider">
                    KRUNGTHAI BANK
                  </span>
                </div>
                <div className="text-[8.5px] font-bold text-slate-900 mt-0.5">
                  0422-สาขาเมืองพล
                </div>
                <div className="text-[7.5px] text-slate-600 font-normal">
                  48 ถ.พาณิชย์เจริญ ต.เมืองพล อ.พล จ.ขอนแก่น
                </div>
              </div>
            </div>

            {/* Top Right Date Box (ว/D ว/D  ด/M ด/M  ป/Y ป/Y ป/Y ป/Y) */}
            <div className="flex flex-col items-end pt-0.5">
              <div className="text-[8px] font-bold text-slate-800 mb-0.5">
                วันที่ <span className="font-normal text-slate-500">Date</span>
              </div>
              <div className="flex items-center gap-1">
                {/* 2 Day cells */}
                <div className="flex border border-sky-400 bg-white shadow-2xs">
                  <div className="w-[14px] h-[18px] border-r border-sky-200 flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ว/D</span>
                  </div>
                  <div className="w-[14px] h-[18px] flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ว/D</span>
                  </div>
                </div>
                
                {/* 2 Month cells */}
                <div className="flex border border-sky-400 bg-white shadow-2xs">
                  <div className="w-[14px] h-[18px] border-r border-sky-200 flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ด/M</span>
                  </div>
                  <div className="w-[14px] h-[18px] flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ด/M</span>
                  </div>
                </div>

                {/* 4 Year cells */}
                <div className="flex border border-sky-400 bg-white shadow-2xs">
                  <div className="w-[14px] h-[18px] border-r border-sky-200 flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ป/Y</span>
                  </div>
                  <div className="w-[14px] h-[18px] border-r border-sky-200 flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ป/Y</span>
                  </div>
                  <div className="w-[14px] h-[18px] border-r border-sky-200 flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ป/Y</span>
                  </div>
                  <div className="w-[14px] h-[18px] flex flex-col justify-end items-center pb-0.5">
                    <span className="text-[6px] text-slate-400 font-mono">ป/Y</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Vertical Bar on left of body: "ยกเว้นอากร" + barcode + "TBSP." */}
          <div className="absolute top-[28mm] left-[3mm] flex flex-col items-center">
            <div className="w-1.5 h-10 bg-slate-900 flex flex-col justify-between p-0.2">
              <div className="h-0.5 bg-white w-full" />
              <div className="h-1 bg-white w-full" />
              <div className="h-0.5 bg-white w-full" />
            </div>
            <span className="text-[5.5px] -rotate-90 origin-center text-slate-600 mt-2 font-bold whitespace-nowrap">
              ยกเว้นอากร
            </span>
          </div>

          {/* Payee Line: "จ่าย Pay .................................................... หรือผู้ถือ or bearer" */}
          <div className="pl-6 pt-1 text-[9.5px]">
            <div className="flex items-baseline justify-between border-b border-dotted border-sky-400 pb-0.5">
              <div className="flex items-baseline gap-1.5 font-bold text-slate-800">
                <span>จ่าย</span>
                <span className="text-[8px] font-normal text-slate-500">Pay</span>
              </div>
              <div className="text-[8px] font-bold text-slate-700">
                หรือผู้ถือ <span className="font-normal text-slate-400">or bearer</span>
              </div>
            </div>
          </div>

          {/* Amount in Words Line + Numeric Box */}
          <div className="pl-6 flex items-center gap-3">
            {/* Amount words line */}
            <div className="flex-1 border-b border-dotted border-sky-400 pb-0.5 text-[9.5px]">
              <div className="flex items-baseline gap-1.5 font-bold text-slate-800">
                <span>จำนวนเงิน (บาท)</span>
                <span className="text-[8px] font-normal text-slate-500">The sum of (Baht)</span>
              </div>
            </div>

            {/* Numeric Box on right with "B" sign (Exact to Image 2) */}
            <div className="w-44 h-8 bg-white border border-sky-400/80 rounded-xs flex items-center px-2 shadow-inner">
              <span className="font-serif font-bold text-slate-800 text-sm mr-2 select-none">B</span>
            </div>
          </div>

          {/* Pre-printed Account Title in Center */}
          <div className="pl-6 text-center font-bold text-slate-800 text-[10.5px] -mt-1 tracking-wide">
            -องค์การบริหารส่วนตำบลหนองมะเขือ
          </div>

          {/* Bottom Area: Cheque ID + Form Field Labels + MICR */}
          <div>
            <div className="flex items-center justify-between text-[7px] text-slate-500 border-t border-sky-300 pt-0.5">
              <span className="font-mono font-bold text-slate-800 text-[8px]">
                CH.B 10250656
              </span>
              <div className="flex gap-4">
                <span>เช็คเลขที่ Cheque No.</span>
                <span>สาขาเลขที่ Branch No.</span>
                <span>บัญชีเลขที่ Account No.</span>
                <span>จำนวนเงิน Amount</span>
              </div>
            </div>

            {/* Bottom MICR Font Line (Exact from real photo) */}
            <div className="mt-1 font-mono text-[9.5px] font-black text-slate-900 tracking-[0.22em] text-center">
              ⑆05 ⑈ 10250656⑈006⑉0422⑆ 4226009436⑈
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 2. BAAC - ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (Exact photorealistic replica of รูปภาพ2.png)
  if (bankType === 'BAAC') {
    return (
      <div style={containerStyle} className="absolute inset-0 w-full h-full pointer-events-none select-none cheque-background-guide bg-[#f5fbf7] overflow-hidden text-emerald-950 font-sans border border-emerald-400 shadow-inner">
        
        {/* Security Microprint Texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none" viewBox="0 0 235 90">
          <defs>
            <pattern id="baac-texture" width="30" height="15" patternUnits="userSpaceOnUse">
              <path d="M 0 7.5 Q 7.5 0 15 7.5 T 30 7.5" fill="none" stroke="#86efac" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect x="36" y="20" width="200" height="60" fill="url(#baac-texture)" />
        </svg>

        {/* LEFT STUB */}
        <div className="absolute top-0 bottom-0 left-0 w-[15.5%] border-r-2 border-emerald-500/80 p-2 flex flex-col justify-between text-[7px] bg-[#edf8f0]">
          
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-16 bg-emerald-950 flex flex-col justify-between p-0.5 opacity-90 shrink-0">
              <div className="h-0.5 bg-white w-full" />
              <div className="h-1 bg-white w-full" />
              <div className="h-0.5 bg-white w-full" />
              <div className="h-1 bg-white w-full" />
            </div>
            <div className="text-[6px] text-emerald-900 -rotate-90 origin-left whitespace-nowrap ml-1 font-mono font-bold">
              034104450003220496324
            </div>
          </div>

          <div className="space-y-1.5 font-medium">
            <div className="border-b border-emerald-400 pb-0.5">วันที่ Date / /</div>
            <div className="border-b border-emerald-400 pb-0.5">บาท Baht</div>
          </div>

          <div className="border border-emerald-500 bg-white text-[6px]">
            <div className="border-b border-emerald-300 px-1 py-0.5 bg-emerald-50 font-semibold">ยอดยกมา</div>
            <div className="border-b border-emerald-200 px-1 py-0.5">ฝาก</div>
            <div className="border-b border-emerald-200 px-1 py-0.5">รวม</div>
            <div className="border-b border-emerald-200 px-1 py-0.5">ถอน</div>
            <div className="px-1 py-0.5 font-bold">คงเหลือ</div>
          </div>

          <div className="font-mono text-[7.5px] font-bold text-emerald-900">
            No. 20496324
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="absolute top-0 bottom-0 left-[15.5%] right-0 p-3 flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              
              {/* BAAC Green Emblem */}
              <div className="w-8 h-8 rounded bg-[#00703c] flex items-center justify-center text-white shrink-0 shadow-xs p-1">
                <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
                  <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm-1 6h2v2h-2V8zm0 4h2v6h-2v-6z"/>
                </svg>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-black text-[#00703c]">
                    ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร
                  </span>
                  <span className="text-[8px] font-bold text-emerald-800">
                    สาขาเมืองพล
                  </span>
                </div>
                <div className="text-[7.5px] font-bold text-emerald-800">
                  BANK FOR AGRICULTURE AND AGRICULTURAL COOPERATIVES
                </div>
                <div className="text-[7.5px] text-emerald-700">
                  42 ถนนเพลินจิตต์ ต.เมืองพล อ.พล จ.ขอนแก่น
                </div>
              </div>
            </div>

            {/* Date Box: 8 boxes */}
            <div className="flex flex-col items-end pt-0.5">
              <div className="text-[8px] font-bold text-emerald-900 mb-0.5">
                วันที่ <span className="font-normal text-emerald-700">Date</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex border border-emerald-600 bg-white">
                  <div className="w-[14px] h-[18px] border-r border-emerald-300 flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ว</div>
                  <div className="w-[14px] h-[18px] flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ว</div>
                </div>
                <span className="text-[8px] text-emerald-600">/</span>
                <div className="flex border border-emerald-600 bg-white">
                  <div className="w-[14px] h-[18px] border-r border-emerald-300 flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ด</div>
                  <div className="w-[14px] h-[18px] flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ด</div>
                </div>
                <span className="text-[8px] text-emerald-600">/</span>
                <div className="flex border border-emerald-600 bg-white">
                  <div className="w-[14px] h-[18px] border-r border-emerald-300 flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ป</div>
                  <div className="w-[14px] h-[18px] border-r border-emerald-300 flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ป</div>
                  <div className="w-[14px] h-[18px] border-r border-emerald-300 flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ป</div>
                  <div className="w-[14px] h-[18px] flex items-center justify-center text-[7px] text-emerald-700 font-semibold">ป</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payee Line */}
          <div className="pt-1 text-[9.5px]">
            <div className="flex items-baseline justify-between border-b border-emerald-400 pb-0.5">
              <div className="flex items-baseline gap-1.5 font-bold text-emerald-900">
                <span>จ่าย</span>
                <span className="text-[8px] font-normal text-emerald-700">Pay</span>
              </div>
              <div className="text-[8px] font-bold text-emerald-800">
                หรือผู้ถือ <span className="font-normal text-emerald-600">or Bearer</span>
              </div>
            </div>
          </div>

          {/* Amount in words & Number Box */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-b border-emerald-400 pb-0.5 text-[9.5px]">
              <div className="flex items-baseline gap-1.5 font-bold text-emerald-900">
                <span>จำนวนเงิน (บาท)</span>
                <span className="text-[8px] font-normal text-emerald-700">The sum of (Baht)</span>
              </div>
            </div>

            {/* Box with ฿ */}
            <div className="w-44 h-8 bg-white border border-emerald-600 rounded-xs flex items-center px-2 shadow-inner">
              <span className="font-serif font-bold text-emerald-900 text-sm mr-2 select-none">฿</span>
            </div>
          </div>

          {/* Pre-printed Account Title */}
          <div className="text-center font-bold text-emerald-900 text-[10.5px] -mt-1 tracking-wide">
            องค์การบริหารส่วนตำบลหนองมะเขือ
          </div>

          {/* Bottom Table Labels & MICR */}
          <div>
            <div className="flex items-center justify-between text-[7px] text-emerald-800 border-t border-emerald-300 pt-0.5">
              <span className="font-mono font-bold text-[8px]">20496324</span>
              <div className="flex gap-4">
                <span>เช็คเลขที่ Cheque No.</span>
                <span>สำนักงานเลขที่ Office No.</span>
                <span>บัญชีเลขที่ Account No.</span>
                <span>สำหรับเจ้าหน้าที่ For Official Use Only</span>
              </div>
            </div>

            <div className="mt-1 font-mono text-[9.5px] font-black text-emerald-950 tracking-[0.22em] text-center">
              ⑆70 ⑈ 20496324⑈034⑉0330⑆ 8065000330⑈
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 3. GSB - ธนาคารออมสิน (Exact photorealistic replica of รูปภาพ1.png)
  if (bankType === 'GSB') {
    return (
    <div style={containerStyle} className="absolute inset-0 w-full h-full pointer-events-none select-none cheque-background-guide bg-[#fdf6fa] overflow-hidden text-pink-950 font-sans border border-pink-400 shadow-inner">
      
      {/* Pink Watermark Wave Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none" viewBox="0 0 239 90">
        <defs>
          <pattern id="gsb-pattern" width="35" height="18" patternUnits="userSpaceOnUse">
            <path d="M 0 9 Q 8.75 0 17.5 9 T 35 9" fill="none" stroke="#f472b6" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect x="36" y="20" width="200" height="60" fill="url(#gsb-pattern)" />
      </svg>

      {/* LEFT STUB */}
      <div className="absolute top-0 bottom-0 left-0 w-[15.5%] border-r-2 border-pink-400 p-2 flex flex-col justify-between text-[7px] bg-[#fdf0f7]">
        <div className="flex items-start gap-1">
          <div className="w-2.5 h-14 bg-pink-950 flex flex-col justify-between p-0.5 opacity-90 shrink-0">
            <div className="h-0.5 bg-white w-full" />
            <div className="h-1 bg-white w-full" />
            <div className="h-0.5 bg-white w-full" />
          </div>
          <div className="text-[6.5px] font-bold text-pink-900 leading-tight">
            <div>เช็ค Cheque</div>
            <div className="font-mono text-[7px]">17391934</div>
          </div>
        </div>

        <div className="space-y-1.5 font-medium">
          <div className="border-b border-pink-300 pb-0.5">วันที่ Date</div>
          <div className="border-b border-pink-300 pb-0.5">จ่าย Pay</div>
          <div className="border-b border-pink-300 pb-0.5">บาท Baht</div>
        </div>

        <div className="border border-pink-400 bg-white text-[6px]">
          <div className="border-b border-pink-200 px-1 py-0.5 bg-pink-50 font-semibold">ยกมา</div>
          <div className="border-b border-pink-200 px-1 py-0.5">ฝาก</div>
          <div className="border-b border-pink-200 px-1 py-0.5">รวม</div>
          <div className="border-b border-pink-200 px-1 py-0.5">ถอน</div>
          <div className="px-1 py-0.5 font-bold">คงเหลือ</div>
        </div>

        <div className="font-mono text-[6.5px] text-pink-800">
          0830 0000724559 (2)
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="absolute top-0 bottom-0 left-[15.5%] right-0 p-3 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* GSB Pink Box Emblem */}
            <div className="px-2.5 py-1 bg-[#e6007e] rounded text-white flex items-center gap-1.5 shrink-0 shadow-xs">
              <span className="text-xs">👑</span>
              <span className="font-black text-[11px] tracking-wider">ออมสิน</span>
            </div>

            <div>
              <div className="text-[8px] font-bold text-pink-950 leading-tight">
                830 สาขา หนองบุญมาก เลขที่ 245 หมู่ที่ 6 ต.หนองหัวแรด
              </div>
              <div className="text-[7.5px] text-pink-800">
                อ.หนองบุญมาก จ.นครราชสีมา 30410
              </div>
            </div>
          </div>

          {/* Date Box: 8 boxes */}
          <div className="flex flex-col items-end pt-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono font-bold text-[9px] text-slate-800">17391934</span>
              <span className="text-[8px] font-bold text-pink-900">วันที่ Date</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex border border-pink-500 bg-white">
                <div className="w-[14px] h-[18px] border-r border-pink-200 flex items-center justify-center text-[7px] text-pink-700 font-semibold">ว</div>
                <div className="w-[14px] h-[18px] flex items-center justify-center text-[7px] text-pink-700 font-semibold">ว</div>
              </div>
              <span className="text-[8px] text-pink-500">/</span>
              <div className="flex border border-pink-500 bg-white">
                <div className="w-[14px] h-[18px] border-r border-pink-200 flex items-center justify-center text-[7px] text-pink-700 font-semibold">ด</div>
                <div className="w-[14px] h-[18px] flex items-center justify-center text-[7px] text-pink-700 font-semibold">ด</div>
              </div>
              <span className="text-[8px] text-pink-500">/</span>
              <div className="flex border border-pink-500 bg-white">
                <div className="w-[14px] h-[18px] border-r border-pink-200 flex items-center justify-center text-[7px] text-pink-700 font-semibold">ป</div>
                <div className="w-[14px] h-[18px] border-r border-pink-200 flex items-center justify-center text-[7px] text-pink-700 font-semibold">ป</div>
                <div className="w-[14px] h-[18px] border-r border-pink-200 flex items-center justify-center text-[7px] text-pink-700 font-semibold">ป</div>
                <div className="w-[14px] h-[18px] flex items-center justify-center text-[7px] text-pink-700 font-semibold">ป</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payee Line */}
        <div className="pt-1 text-[9.5px]">
          <div className="flex items-baseline justify-between border-b border-pink-300 pb-0.5">
            <div className="flex items-baseline gap-1.5 font-bold text-pink-900">
              <span>จ่าย</span>
              <span className="text-[8px] font-normal text-pink-700">Pay</span>
            </div>
            <div className="text-[8px] font-bold text-pink-800">
              หรือผู้ถือ <span className="font-normal text-pink-600">or bearer</span>
            </div>
          </div>
        </div>

        {/* Amount line + Box */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-b border-pink-300 pb-0.5 text-[9.5px]">
            <div className="flex items-baseline gap-1.5 font-bold text-pink-900">
              <span>(บาท)</span>
              <span className="text-[8px] font-normal text-pink-700">(Baht)</span>
            </div>
          </div>

          <div className="w-44 h-8 bg-white border border-pink-400 rounded-xs flex items-center px-2 shadow-inner">
            <span className="font-serif font-bold text-pink-900 text-sm mr-2 select-none">฿</span>
          </div>
        </div>

        {/* Pre-printed Account Title */}
        <div className="text-center font-bold text-pink-950 text-[10.5px] -mt-1 tracking-wide">
          -องค์การบริหารส่วนตำบลบ้านใหม่(ประปา)
          <span className="font-mono font-normal ml-2">00000724559</span>
        </div>

        {/* Bottom */}
        <div>
          <div className="flex items-center justify-between text-[7px] text-pink-800 border-t border-pink-300 pt-0.5">
            <div className="flex gap-4">
              <span>เช็คเลขที่ Cheque No.</span>
              <span>สาขาเลขที่ Branch No.</span>
              <span>บัญชีเลขที่ Account No.</span>
            </div>
            <span>ลายมือชื่อ Signature</span>
          </div>

          <div className="mt-1 font-mono text-[9.5px] font-black text-pink-950 tracking-[0.22em] text-center">
            ⑆84 ⑈ 17391934⑈030⑉0830⑆ 0000724559⑈01
          </div>
        </div>

      </div>
    </div>
    );
  }

  // 4. Custom Bank Template Fallback (Clean Vector Outline)
  return (
    <div style={containerStyle} className="absolute inset-0 w-full h-full pointer-events-none select-none cheque-background-guide bg-[#f8fafc] overflow-hidden text-slate-800 font-sans border border-slate-300 shadow-inner">
      {/* Subtle Guilloche Waves */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" preserveAspectRatio="none" viewBox="0 0 240 90">
        <defs>
          <pattern id="custom-pattern" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 Q 10 0 20 10 T 40 10" fill="none" stroke="#94a3b8" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect x="36" y="15" width="200" height="65" fill="url(#custom-pattern)" />
      </svg>

      {/* LEFT STUB */}
      <div className="absolute top-0 bottom-0 left-0 w-[15.5%] border-r border-dashed border-slate-400 p-2 flex flex-col justify-between text-[7.5px] bg-slate-50">
        <div className="font-bold text-slate-800 text-[8px] border-b border-slate-300 pb-1">
          ต้นขั้วเช็ค (Stub)
        </div>
        <div className="space-y-1.5 text-slate-700">
          <div className="border-b border-slate-200 pb-0.5">วันที่:</div>
          <div className="border-b border-slate-200 pb-0.5">จ่ายให้:</div>
          <div className="border-b border-slate-200 pb-0.5">เลขที่ฎีกา:</div>
          <div className="border-b border-slate-200 pb-0.5">จำนวนเงิน:</div>
        </div>
        <div className="text-[6.5px] text-slate-400 font-mono">
          {bankType}
        </div>
      </div>

      {/* RIGHT MAIN CHEQUE */}
      <div className="absolute top-0 bottom-0 right-0 left-[15.5%] p-3 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900">
              {bankType}
            </div>
            <div className="text-[8px] text-slate-500">
              แม่แบบเช็คที่กำหนดเอง (Custom Cheque Template)
            </div>
          </div>
          <div className="text-[8.5px] font-semibold text-slate-700">
            วันที่ <span className="inline-block w-28 border-b border-slate-400 ml-1"></span>
          </div>
        </div>

        <div className="text-[9.5px]">
          <div className="flex items-baseline justify-between border-b border-slate-300 pb-0.5">
            <span className="font-bold text-slate-800">จ่าย (Pay)</span>
            <span className="text-[8px] text-slate-500">หรือผู้ถือ (or bearer)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-b border-slate-300 pb-0.5 text-[9.5px] font-bold text-slate-800">
            จำนวนเงินตัวอักษร (Baht)
          </div>
          <div className="w-44 h-8 bg-white border border-slate-300 rounded flex items-center px-2 shadow-inner">
            <span className="font-serif font-bold text-slate-600 text-sm mr-2 select-none">฿</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[7.5px] text-slate-500 border-t border-slate-300 pt-1">
          <span>เช็คเลขที่ Cheque No.</span>
          <span>ลายมือชื่อผู้สั่งจ่าย Authorized Signature</span>
        </div>
      </div>
    </div>
  );
};
