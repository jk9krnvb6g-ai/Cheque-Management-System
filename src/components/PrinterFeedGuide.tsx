import React from 'react';
import { BankType, FeedDirection } from '../types';
import { RotateCw, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

interface PrinterFeedGuideProps {
  bankType: BankType;
  direction?: FeedDirection;
  onChangeDirection?: (direction: FeedDirection) => void;
  compact?: boolean;
}

export const FEED_DIRECTION_LABELS: Record<FeedDirection, { label: string; desc: string; rotationDeg: number; icon: string; shortLabel: string }> = {
  LANDSCAPE_NORMAL: {
    label: 'แนวนอนปกติ (สอดซ้าย/ต้นขั้วเข้าก่อน 0°)',
    shortLabel: '↔ แนวนอนปกติ (0°)',
    desc: 'ป้อนเช็คตามแนวนอน หันด้านต้นขั้วเช็คเข้าหาตัวเครื่องพิมพ์ก่อน',
    rotationDeg: 0,
    icon: '⬅️',
  },
  LANDSCAPE_FLIPPED: {
    label: 'แนวนอนกลับด้าน (สอดขวา/ยอดเงินเข้าก่อน 180°)',
    shortLabel: '🔄 แนวนอนกลับ (180°)',
    desc: 'ป้อนเช็คตามแนวนอน หันด้านยอดเงินเข้าหาตัวเครื่องพิมพ์ก่อน',
    rotationDeg: 180,
    icon: '➡️',
  },
  PORTRAIT_TOP: {
    label: 'แนวตั้ง (สอดหัว/ด้านบนเข้าก่อน 90°)',
    shortLabel: '⬆ แนวตั้งสอดหัว (90°)',
    desc: 'ป้อนเช็คตามแนวตั้ง หันขอบบนของเช็ค (ด้านวันที่/ผู้รับเงิน) เข้าหาตัวเครื่องพิมพ์ก่อน',
    rotationDeg: 90,
    icon: '⬆️',
  },
  PORTRAIT_BOTTOM: {
    label: 'แนวตั้ง (สอดท้าย/ด้านล่างเข้าก่อน 270°)',
    shortLabel: '⬇ แนวตั้งสอดท้าย (270°)',
    desc: 'ป้อนเช็คตามแนวตั้ง หันขอบล่างของเช็ค (ด้านลายมือชื่อผู้สั่งจ่าย) เข้าหาตัวเครื่องพิมพ์ก่อน',
    rotationDeg: 270,
    icon: '⬇️',
  },
};

export const PrinterFeedGuide: React.FC<PrinterFeedGuideProps> = ({
  bankType,
  direction = 'LANDSCAPE_NORMAL',
  onChangeDirection,
  compact = false,
}) => {
  const bankNames: Record<BankType, string> = {
    KTB: 'ธ.กรุงไทย (241×90 มม.)',
    BAAC: 'ธ.ก.ส. (235×90 มม.)',
    GSB: 'ธ.ออมสิน (239×90 มม.)',
  };

  const bankColors: Record<BankType, { bg: string; border: string; text: string; labelBg: string }> = {
    KTB: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-900', labelBg: 'bg-sky-600 text-white' },
    BAAC: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', labelBg: 'bg-emerald-600 text-white' },
    GSB: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900', labelBg: 'bg-pink-600 text-white' },
  };

  const style = bankColors[bankType] || bankColors.KTB;
  const currentDirConfig = FEED_DIRECTION_LABELS[direction] || FEED_DIRECTION_LABELS.LANDSCAPE_NORMAL;
  const isPortrait = direction === 'PORTRAIT_TOP' || direction === 'PORTRAIT_BOTTOM';

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4 transition-all shadow-xs`}>
      <div className="flex flex-col lg:flex-row items-center gap-5">
        {/* Visual Diagram - Realistic Animated Feeder Tray */}
        <div className="relative shrink-0 w-72 sm:w-80 h-48 bg-slate-900/90 rounded-xl border-2 border-slate-700 flex flex-col items-center justify-between p-2 shadow-md overflow-hidden select-none">
          {/* Top Paper Feeder Slot simulation with sliding paper guides */}
          <div className="relative w-full h-7 bg-slate-800 border-b border-slate-700 rounded-t-lg flex items-center justify-center shadow-inner">
            {/* Left sliding paper guide */}
            <div
              className="absolute left-3 top-0 bottom-0 bg-slate-600 border-r border-slate-500 rounded-l transition-all duration-300 flex items-center px-1"
              style={{ width: isPortrait ? '56px' : '24px' }}
            >
              <div className="w-1 h-3 bg-slate-400 rounded-full" />
            </div>

            {/* Feeder Slot Opening */}
            <div className="h-2.5 bg-slate-950 rounded-sm border border-slate-700 flex items-center justify-center px-2 z-10">
              <span className="text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">
                ช่องใส่กระดาษเครื่องพิมพ์ (FEED TRAY)
              </span>
            </div>

            {/* Right sliding paper guide */}
            <div
              className="absolute right-3 top-0 bottom-0 bg-slate-600 border-l border-slate-500 rounded-r transition-all duration-300 flex items-center justify-end px-1"
              style={{ width: isPortrait ? '56px' : '24px' }}
            >
              <div className="w-1 h-3 bg-slate-400 rounded-full" />
            </div>
          </div>

          {/* Direction Indicator Arrow */}
          <div className="flex flex-col items-center text-emerald-400 -mt-1">
            <span className="text-[9px] font-bold flex items-center gap-1 bg-slate-800/90 px-2 py-0.5 rounded-full border border-slate-700 text-emerald-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {direction === 'PORTRAIT_TOP' && '⬆ ขอบบน (หัวเช็ค 90°) สอดเข้าก่อน'}
              {direction === 'PORTRAIT_BOTTOM' && '⬆ ขอบล่าง (ท้ายเช็ค 270°) สอดเข้าก่อน'}
              {direction === 'LANDSCAPE_NORMAL' && '⬆ ขอบซ้าย (ต้นขั้ว 0°) สอดเข้าก่อน'}
              {direction === 'LANDSCAPE_FLIPPED' && '⬆ ขอบขวา (ยอดเงิน 180°) สอดเข้าก่อน'}
            </span>
            <ArrowDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce mt-0.5" />
          </div>

          {/* Cheque Paper Representation: Dynamic Landscape vs Portrait Rotation */}
          <div className="flex-1 flex items-center justify-center w-full">
            {/* PORTRAIT ORIENTATIONS (90° and 270°) */}
            {isPortrait ? (
              <div
                className={`w-28 h-32 rounded-lg border-2 shadow-lg flex flex-col justify-between p-2 transition-all duration-300 text-slate-800 ${
                  direction === 'PORTRAIT_TOP'
                    ? 'border-emerald-400 bg-white ring-2 ring-emerald-500/40'
                    : 'border-amber-400 bg-white ring-2 ring-amber-500/40'
                }`}
              >
                {/* Top edge (entering slot first) */}
                <div className="flex flex-col gap-0.5 border-b border-dashed pb-1">
                  <div className="flex items-center justify-between text-[7.5px] font-bold">
                    <span className={`px-1 py-0.2 rounded text-[7px] font-black ${
                      direction === 'PORTRAIT_TOP'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}>
                      ⬆ สอดเข้าเครื่องก่อน
                    </span>
                    <span className="text-slate-500 font-mono text-[7px]">
                      {direction === 'PORTRAIT_TOP' ? '90°' : '270°'}
                    </span>
                  </div>
                  <div className="text-[8px] font-black text-slate-900 leading-tight">
                    {direction === 'PORTRAIT_TOP'
                      ? '📅 ขอบบน: วันที่ & จ่าย'
                      : '✍️ ขอบล่าง: ลายเซ็นต์'}
                  </div>
                </div>

                {/* Middle area (amount text & numbers simulation) */}
                <div className="py-1 px-1 bg-slate-50 rounded border border-slate-200 text-center space-y-0.5">
                  <div className="text-[7.5px] text-slate-500 font-semibold truncate">
                    {direction === 'PORTRAIT_TOP' ? '(=จำนวนเงินตัวหนังสือ=)' : '(*123,456.78*)'}
                  </div>
                  <div className="text-[7.5px] text-slate-700 font-bold truncate">
                    {direction === 'PORTRAIT_TOP' ? '(*123,456.78*)' : '(=จำนวนเงินตัวหนังสือ=)'}
                  </div>
                </div>

                {/* Bottom edge (entering slot last) */}
                <div className="border-t border-dashed pt-0.5 flex items-center justify-between text-[7.5px] text-slate-500">
                  <span className="font-semibold">
                    {direction === 'PORTRAIT_TOP' ? 'ขอบล่าง / ท้ายเช็ค' : 'ขอบบน / หัวเช็ค'}
                  </span>
                  <span className="text-[7px] text-slate-400">หงายหน้าเช็คขึ้น</span>
                </div>
              </div>
            ) : (
              /* LANDSCAPE ORIENTATIONS (0° and 180°) */
              <div
                className={`w-56 h-20 rounded-lg border-2 shadow-lg flex flex-col justify-between p-2 transition-all duration-300 text-slate-800 ${
                  direction === 'LANDSCAPE_NORMAL'
                    ? 'border-sky-400 bg-white ring-2 ring-sky-500/40'
                    : 'border-purple-400 bg-white ring-2 ring-purple-500/40'
                }`}
              >
                {/* Top info */}
                <div className="flex items-center justify-between text-[8px] font-bold">
                  <span className="px-1.5 py-0.2 rounded text-[7px] bg-slate-800 text-white">
                    หงายหน้าเช็คขึ้น
                  </span>
                  <span className="text-slate-600 text-[8px] font-semibold">
                    {direction === 'LANDSCAPE_FLIPPED' ? 'ยอดเงิน ➔ สอดเข้าก่อน' : 'วันที่ / สั่งจ่าย'}
                  </span>
                  <span className="font-mono text-[7px] text-slate-500">
                    {direction === 'LANDSCAPE_NORMAL' ? '0° ปกติ' : '180° กลับด้าน'}
                  </span>
                </div>

                {/* Simulation cheque text lines */}
                <div className="flex items-center justify-between px-1 text-[7.5px] text-slate-600">
                  <span className="font-bold text-sky-800">
                    {direction === 'LANDSCAPE_FLIPPED' ? 'ยอดเงิน *123,456.78*' : '⬅ ต้นขั้วเช็ค'}
                  </span>
                  <span className="font-bold text-purple-800">
                    {direction === 'LANDSCAPE_FLIPPED' ? 'ต้นขั้วเช็ค ➔' : 'ยอดเงิน *123,456.78*'}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="flex items-center justify-between text-[7px] text-slate-500 border-t border-slate-100 pt-0.5">
                  <span className="text-emerald-700 font-bold">
                    {direction === 'LANDSCAPE_FLIPPED' ? '⬆ หันขวาเข้าเครื่อง' : '⬆ หันซ้ายเข้าเครื่อง'}
                  </span>
                  <span className="text-slate-400">แนวนอน (Landscape)</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Feed Status Pill */}
          <div className="w-full text-center py-0.5 bg-slate-800/80 rounded border border-slate-700 text-[8px] text-slate-300 font-bold">
            โหมดปัจจุบัน: <span className="text-emerald-400">{currentDirConfig.label}</span>
          </div>
        </div>

        {/* Text Instructions & Interactive Direction Selector */}
        <div className="space-y-2.5 text-slate-800 flex-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-slate-800 text-white shadow-xs">
                วิธีใส่เช็ค
              </span>
              <span className="font-bold text-sm text-slate-900">
                {bankNames[bankType] || bankType}
              </span>
            </div>

            {onChangeDirection && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600">ปรับทิศทาง:</span>
                <select
                  value={direction}
                  onChange={(e) => onChangeDirection(e.target.value as FeedDirection)}
                  className="px-2.5 py-1 bg-white border-2 border-red-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer shadow-xs"
                >
                  <option value="LANDSCAPE_NORMAL">↔ แนวนอนปกติ (สอดซ้าย 0°)</option>
                  <option value="LANDSCAPE_FLIPPED">🔄 แนวนอนกลับด้าน (สอดขวา 180°)</option>
                  <option value="PORTRAIT_TOP">⬆ แนวตั้ง (สอดหัวเข้า 90°)</option>
                  <option value="PORTRAIT_BOTTOM">⬇ แนวตั้ง (สอดท้ายเข้า 270°)</option>
                </select>
              </div>
            )}
          </div>

          {/* Quick Click Orientation Switcher Buttons */}
          {onChangeDirection && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
              {(Object.keys(FEED_DIRECTION_LABELS) as FeedDirection[]).map((key) => {
                const opt = FEED_DIRECTION_LABELS[key];
                const isActive = direction === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChangeDirection(key)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border flex flex-col items-center justify-center text-center cursor-pointer shadow-xs ${
                      isActive
                        ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-400 shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{opt.icon}</span>
                      <span className="text-[11px] font-extrabold">{opt.rotationDeg}°</span>
                    </div>
                    <span className="text-[9.5px] leading-tight mt-0.5 opacity-90">{opt.shortLabel.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-2.5 bg-white/95 rounded-xl border border-slate-200/90 text-xs text-slate-700 shadow-xs">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <span className="text-sm">{currentDirConfig.icon}</span>
              <span className="text-sm">{currentDirConfig.label}</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono font-bold">
                หมุน {currentDirConfig.rotationDeg}°
              </span>
            </div>
            <p className="mt-1 text-slate-600 leading-relaxed">{currentDirConfig.desc}</p>
          </div>

          <div className="space-y-1 text-xs text-slate-700 bg-white/60 p-2 rounded-lg border border-slate-200/60">
            <p>1. <strong>หงายหน้าเช็คขึ้นเสมอ</strong> (มองเห็นชื่อธนาคารและช่องสั่งจ่ายชัดเจน)</p>
            <p>2. จัดชิดขอบถาดป้อนกระดาษตามทิศทางที่ตั้งค่าไว้ ({isPortrait ? 'แนวตั้ง หัว/ท้ายเช็คเข้าเครื่อง' : 'แนวนอน ป้อนตามความยาว'})</p>
          </div>

          {!compact && (
            <p className="text-[11px] text-slate-500 pt-0.5">
              💡 <em>ข้อแนะนำ: สามารถกด <strong>"ทดสอบพิมพ์บนกระดาษ A4"</strong> เพื่อนำเช็คจริงมาทาบดูก่อนพิมพ์จริงได้</em>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
