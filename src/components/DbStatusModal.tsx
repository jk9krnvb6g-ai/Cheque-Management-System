import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, UploadCloud, CheckCircle2, AlertTriangle, X, Server, Cpu } from 'lucide-react';
import { apiClient } from '../services/api';
import { StorageService } from '../utils/storage';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced?: () => void;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({ isOpen, onClose, onDataSynced }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('cheque_sys_api_url') || '');

  const checkStatus = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.getDbStatus();
      setStatus(res);
      if (res?.connected) {
        setMessage({ text: 'เชื่อมต่อกับฐานข้อมูล MySQL 10.1.0.201 สำเร็จ 100%', type: 'success' });
      } else {
        setMessage({ text: res?.error || 'ไม่สามารถเชื่อมต่อไปยังฐานข้อมูล MySQL 10.1.0.201 ได้', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'การเชื่อมต่อล้มเหลว', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleSyncPull = async () => {
    setLoading(true);
    setMessage({ text: 'กำลังดึงข้อมูลล่าสุดจาก MySQL 10.1.0.201...', type: 'info' });
    try {
      const res = await StorageService.syncWithBackend();
      if (res.success) {
        setMessage({
          text: `ดึงข้อมูลสำเร็จ! ได้รับเช็ค ${res.chequesCount} รายการ และผู้ใช้ ${res.usersCount} รายการ`,
          type: 'success',
        });
        if (onDataSynced) onDataSynced();
        await checkStatus();
      } else {
        setMessage({ text: res.error || 'ดึงข้อมูลไม่สำเร็จ', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPush = async () => {
    if (!window.confirm('คุณต้องการนำข้อมูลทั้งหมดที่มีในเครื่องนี้ อัปโหลดขึ้นสู่ฐานข้อมูล MySQL 10.1.0.201 หรือไม่?')) {
      return;
    }
    setLoading(true);
    setMessage({ text: 'กำลังส่งข้อมูลขึ้นฐานข้อมูล MySQL...', type: 'info' });
    try {
      const res = await StorageService.pushAllLocalToMysql();
      if (res.success) {
        setMessage({
          text: `ส่งข้อมูลสำเร็จ! นำเข้าเช็ค ${res.inserted?.cheques || 0} รายการ, ฎีกา ${res.inserted?.items || 0} รายการ, ผู้ใช้ ${res.inserted?.users || 0} รายการ`,
          type: 'success',
        });
        if (onDataSynced) onDataSynced();
        await checkStatus();
      } else {
        setMessage({ text: res.error || 'ส่งข้อมูลไม่สำเร็จ', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomUrl = () => {
    apiClient.setCustomApiUrl(customUrl);
    setMessage({ text: 'บันทึกการตั้งค่า API URL เรียบร้อยแล้ว กำลังทดสอบการเชื่อมต่อ...', type: 'info' });
    checkStatus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-red-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-800 to-red-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Database className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">สถานะการเชื่อมต่อฐานข้อมูล MySQL</h2>
              <p className="text-xs text-red-200">เครื่องเซิร์ฟเวอร์ฐานข้อมูล 10.1.0.201:3306</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Alert Banner */}
          {message && (
            <div
              className={`p-4 rounded-2xl border text-sm font-bold flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : message.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{message.text}</div>
            </div>
          )}

          {/* Connection Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                <Server className="w-4 h-4 text-red-700" />
                <span>รายละเอียดเซิร์ฟเวอร์ MySQL</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                  status?.connected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {status?.connected ? 'เชื่อมต่อแล้ว 100%' : 'ออฟไลน์ / ไม่สามารถเชื่อมต่อได้'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-bold">Host IP</div>
                <div className="text-slate-800 font-black text-sm mt-0.5">{status?.host || '10.1.0.201'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-bold">Port</div>
                <div className="text-slate-800 font-black text-sm mt-0.5">{status?.port || 3306}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-bold">Database</div>
                <div className="text-slate-800 font-black text-sm mt-0.5">{status?.database || 'cheque_system'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-bold">โหมดการทำงาน</div>
                <div className="text-slate-800 font-black text-sm mt-0.5">
                  {status?.connected ? 'MySQL Real-time' : 'Local Fallback'}
                </div>
              </div>
            </div>
          </div>

          {/* Table Counts in MySQL */}
          {status?.tables && (
            <div>
              <div className="text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-red-700" />
                <span>จำนวนข้อมูลในตาราง MySQL (Real-time Count)</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <div className="text-red-700 font-bold">ผู้ใช้งาน</div>
                  <div className="text-base font-black text-red-950 mt-0.5">{status.tables.users ?? 0}</div>
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <div className="text-red-700 font-bold">เช็ค</div>
                  <div className="text-base font-black text-red-950 mt-0.5">{status.tables.cheques ?? 0}</div>
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <div className="text-red-700 font-bold">รายการฎีกา</div>
                  <div className="text-base font-black text-red-950 mt-0.5">{status.tables.items ?? 0}</div>
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <div className="text-red-700 font-bold">แม่แบบธนาคาร</div>
                  <div className="text-base font-black text-red-950 mt-0.5">{status.tables.templates ?? 0}</div>
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <div className="text-red-700 font-bold">ประวัติพิมพ์</div>
                  <div className="text-base font-black text-red-950 mt-0.5">{status.tables.printLogs ?? 0}</div>
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <div className="text-red-700 font-bold">Audit Logs</div>
                  <div className="text-base font-black text-red-950 mt-0.5">{status.tables.auditLogs ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Operations */}
          <div className="space-y-2">
            <div className="text-xs font-black text-slate-700">การจัดการและซิงค์ข้อมูล (Synchronization)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSyncPull}
                disabled={loading}
                className="p-3.5 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-900 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-red-600 text-white rounded-xl">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-black">ดึงข้อมูลจาก MySQL (Pull)</div>
                  <div className="text-[11px] text-red-700">อัปเดตหน้าจอให้ตรงกับฐานข้อมูล 10.1.0.201</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSyncPush}
                disabled={loading}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-900 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-slate-800 text-white rounded-xl">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">ส่งข้อมูลขึ้น MySQL (Push)</div>
                  <div className="text-[11px] text-slate-600">อัปโหลดข้อมูลจากเครื่องนี้ไปบันทึกบนฐานข้อมูล</div>
                </div>
              </button>
            </div>
          </div>

          {/* API URL Config (For IIS Deployment) */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Backend API URL (ปล่อยว่างเพื่อใช้ค่าเริ่มต้นอัตโนมัติ):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="เช่น http://10.1.0.201:3000/api หรือ /api"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={handleSaveCustomUrl}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                บันทึก & ทดสอบ
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * ปัจจุบันเชื่อมต่อที่: <span className="font-mono text-slate-600">{apiClient.getApiBaseUrl()}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={checkStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
