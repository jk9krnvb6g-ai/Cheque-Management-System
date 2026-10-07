import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, X, Server } from 'lucide-react';
import { apiClient } from '../services/api';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced?: () => void;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({ isOpen, onClose, onDataSynced }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getDbStatus();
      setStatus(res);
      if (res?.connected && onDataSynced) {
        onDataSynced();
      }
    } catch (err: any) {
      setStatus({
        connected: false,
        apiConnected: false,
        error: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = status?.connected === true;
  const targetHost = status?.host || '10.1.0.201';
  const targetPort = status?.port || 3306;
  const targetDatabase = status?.database || 'cheque_system';
  const targetUser = status?.user || 'root';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">สถานะการเชื่อมต่อฐานข้อมูล MySQL</h2>
              <p className="text-xs text-slate-400">กำหนดค่าผ่านไฟล์ .env ของระบบ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main Status Badge Card */}
          {loading ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
              <div className="text-xs font-bold text-slate-600">กำลังตรวจสอบการเชื่อมต่อ MySQL...</div>
            </div>
          ) : isConnected ? (
            <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-black">เชื่อมต่อฐานข้อมูล MySQL สำเร็จ (ออนไลน์)</div>
                  <div className="text-xs text-emerald-700">ระบบกำลังบันทึกและอ่านข้อมูลจากฐานข้อมูล MySQL เครื่อง {targetHost}</div>
                </div>
              </div>

              {/* Counts */}
              {status?.counts && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 text-xs">
                  <div className="bg-white/80 p-2 rounded-xl">
                    <span className="text-slate-500 text-[11px] block">จำนวนเช็คในฐานข้อมูล:</span>
                    <span className="font-bold text-emerald-900 text-sm">{status.counts.cheques || 0} รายการ</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl">
                    <span className="text-slate-500 text-[11px] block">จำนวนผู้ใช้งานในระบบ:</span>
                    <span className="font-bold text-emerald-900 text-sm">{status.counts.users || 0} คน</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-rose-950">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <div>
                  <div className="text-sm font-black">ยังไม่ได้เชื่อมต่อฐานข้อมูล MySQL (ออฟไลน์)</div>
                  <div className="text-xs text-rose-800">
                    {status?.error?.includes('404')
                      ? 'HTTP Error 404: ไม่พบเส้นทาง Cash_Cheque บนพอร์ต 3002 (เนื่องจากเป็นเซิร์ฟเวอร์ของระบบ Procurement กรุณาเปิดไฟล์ start-backend.bat ของระบบเช็ค)'
                      : (status?.error || `ไม่สามารถเชื่อมต่อไปยังเครื่อง ${targetHost}:${targetPort} ได้`)}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/90 border border-rose-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-rose-900">💡 โหมดสำรองพร้อมทำงาน:</span> คุณยังสามารถเข้าใช้งาน จัดทำเช็ค และพิมพ์เช็คได้ตามปกติ ข้อมูลจะถูกบันทึกสำรองไว้ในเครื่อง และระบบจะตรวจจับพร้อมส่งขึ้น MySQL ให้อัตโนมัติเมื่อฐานข้อมูลเปิดใช้งาน
              </div>
            </div>
          )}

          {/* Config Summary from .env */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-slate-600" />
              <span>ค่าคอนฟิกฐานข้อมูลจากไฟล์ .env:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[10px] block">DB_HOST</span>
                <span className="font-bold text-slate-800">{targetHost}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[10px] block">DB_PORT</span>
                <span className="font-bold text-slate-800">{targetPort}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[10px] block">DB_NAME</span>
                <span className="font-bold text-slate-800">{targetDatabase}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[10px] block">DB_USER</span>
                <span className="font-bold text-slate-800">{targetUser}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={checkStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ทดสอบการเชื่อมต่อใหม่</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
