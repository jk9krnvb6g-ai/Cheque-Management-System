import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControllerProps {
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  className?: string;
}

export const ZoomController: React.FC<ZoomControllerProps> = ({
  zoomLevel,
  onZoomChange,
  minZoom = 0.5,
  maxZoom = 2.5,
  step = 0.1,
  className = '',
}) => {
  const handleZoomOut = () => {
    onZoomChange(Math.max(minZoom, Math.round((zoomLevel - step) * 10) / 10));
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(maxZoom, Math.round((zoomLevel + step) * 10) / 10));
  };

  const handleReset = () => {
    onZoomChange(1.0); // Reset to standard 100% (1:1 millimeter scale)
  };

  return (
    <div
      className={`inline-flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-xs select-none ${className}`}
    >
      <button
        type="button"
        onClick={handleZoomOut}
        className="p-0.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        title="ย่อมุมมอง (-10%)"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <span className="text-xs font-bold font-mono w-10 text-center text-slate-800">
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        type="button"
        onClick={handleZoomIn}
        className="p-0.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        title="ขยายมุมมอง (+10%)"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <div className="h-3.5 w-px bg-slate-200" />

      <button
        type="button"
        onClick={handleReset}
        className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer transition-colors"
        title="รีเซ็ตสเกลกลับสู่ 100% (ขนาดเช็คจริง 1:1)"
      >
        รีเซ็ต
      </button>
    </div>
  );
};
