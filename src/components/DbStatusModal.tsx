import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, UploadCloud, CheckCircle2, AlertTriangle, X, Server, Cpu, Search, ExternalLink, HelpCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient, autoDetectApiUrl } from '../services/api';
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

  // MySQL Settings Form state
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [dbHost, setDbHost] = useState('10.1.0.201');
  const [dbPort, setDbPort] = useState(3306);
  const [dbName, setDbName] = useState('cheque_system');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('');

  const host = typeof window !== 'undefined' ? window.location.hostname : '10.2.0.13';

  const checkStatus = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.getDbStatus();
      setStatus(res);
      if (res?.host) setDbHost(res.host);
      if (res?.port) setDbPort(res.port);
      if (res?.database) setDbName(res.database);

      if (res?.connected) {
        setMessage({ text: 'เชื่อมต่อกับฐานข้อมูล MySQL สำเร็จ 100%!', type: 'success' });
      } else if (!res?.apiConnected) {
        setMessage({
          text: res?.apiError || `ไม่สามารถติดต่อ Backend API ได้ กรุณาเปิดไฟล์ start-backend.bat หรือ start-backend-hidden.vbs`,
          type: 'error',
        });
      } else {
        setMessage({
          text: `Backend ติดต่อได้แล้ว แต่ MySQL (${res?.host || '10.1.0.201'}:3306) ปฏิเสธการเชื่อมต่อ: ${res?.error || 'กรุณาตรวจสอบ MySQL Service'}`,
          type: 'error',
        });
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

  const handleAutoDetect = async () => {
    setLoading(true);
    setMessage({ text: 'กำลังสแกนหาเซิร์ฟเวอร์ Backend API ที่กำลังทำงานอยู่...', type: 'info' });
    try {
      const detected = await autoDetectApiUrl();
      if (detected) {
        setCustomUrl(detected);
        setMessage({ text: `ตรวจพบเซิร์ฟเวอร์ที่: ${detected} กำลังเชื่อมต่อ...`, type: 'success' });
        await checkStatus();
      } else {
        setMessage({
          text: 'ไม่พบเซิร์ฟเวอร์ Backend ที่เปิดอยู่ กรุณาเปิดไฟล์ start-backend.bat บนเครื่องก่อน แล้วลองอีกครั้ง',
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (url: string) => {
    setCustomUrl(url);
    apiClient.setCustomApiUrl(url);
    setMessage({ text: `บันทึก URL เป็น ${url} แล้ว กำลังทดสอบการเชื่อมต่อ...`, type: 'info' });
    setTimeout(checkStatus, 300);
  };

  const handleSaveDbConfig = async () => {
    setLoading(true);
    setMessage({ text: `กำลังเปลี่ยนการเชื่อมต่อ MySQL ไปยัง ${dbHost}:${dbPort}...`, type: 'info' });
    try {
      const res = await apiClient.updateDbConfig({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
      });
      if (res.connected) {
        setMessage({ text: `เชื่อมต่อกับฐานข้อมูล MySQL ที่ ${dbHost} สำเร็จเรียบร้อยแล้ว!`, type: 'success' });
        if (onDataSynced) onDataSynced();
      } else {
        setMessage({ text: `บันทึกแล้ว แต่ MySQL ยังเชื่อมต่อไม่ได้: ${res.error || 'กรุณาตรวจสอบการตั้งค่า'}`, type: 'error' });
      }
      await checkStatus();
    } catch (err: any) {
      setMessage({ text: err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนการตั้งค่า', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPull = async () => {
    setLoading(true);
    setMessage({ text: 'กำลังดึงข้อมูลล่าสุดจาก MySQL...', type: 'info' });
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
    if (!window.confirm('คุณต้องการนำข้อมูลทั้งหมดที่มีในเครื่องนี้ อัปโหลดขึ้นสู่ฐานข้อมูล MySQL หรือไม่?')) {
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

  const directNodeUrl = `http://${host}:3003/Cash_Cheque/`;
  const isEtimedout = status?.error && (status.error.includes('ETIMEDOUT') || status.error.includes('timeout'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-red-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-800 to-red-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Database className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">สถานะการเชื่อมต่อฐานข้อมูล MySQL</h2>
              <p className="text-xs text-red-200">เครื่องเซิร์ฟเวอร์ฐานข้อมูล {status?.host || '10.1.0.201'}:3306</p>
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Status Alert Banner */}
          {message && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-start gap-3 ${
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
              <div className="flex-1 leading-relaxed">{message.text}</div>
            </div>
          )}

          {/* ETIMEDOUT Troubleshooting Card */}
          {isEtimedout && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 space-y-2">
              <div className="font-black flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>คำแนะนำแก้ไข: connect ETIMEDOUT (เชื่อมต่อเครื่อง {status?.host || '10.1.0.201'} หมดเวลา)</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong>กรณี MySQL อยู่บนเครื่องนี้ (เครื่องเดียวกับเว็บ):</strong> ให้กดปุ่ม <code>localhost</code> ในส่วนตั้งค่าด้านล่าง แล้วกดบันทึก
                </li>
                <li>
                  <strong>กรณี MySQL อยู่ที่เครื่อง 10.1.0.201:</strong> พอร์ต 3306 อาจถูก Windows Firewall บล็อก — ให้ไปที่เครื่อง 10.1.0.201 แล้วเปิดพอร์ต 3306 ใน Firewall
                </li>
                <li>
                  <strong>การตั้งค่าไฟล์ my.ini (XAMPP):</strong> ในเครื่อง 10.1.0.201 ต้องตั้งค่า <code>bind-address = 0.0.0.0</code> เพื่อให้เครื่องในวง LAN เข้าถึงได้
                </li>
              </ul>
            </div>
          )}

          {/* Dual Status Card: 1. Backend Server & 2. MySQL DB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Box 1: Backend API Status */}
            <div className={`p-4 rounded-2xl border ${status?.apiConnected ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-slate-700" />
                  เซิร์ฟเวอร์ Backend API
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status?.apiConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                  {status?.apiConnected ? '🟢 ออนไลน์' : '🔴 ยังไม่เริ่มทำงาน'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-mono break-all">
                {apiClient.getApiBaseUrl()}
              </div>
              {!status?.apiConnected && (
                <p className="text-[11px] text-rose-700 mt-2 font-medium">
                  ⚠️ กรุณาดับเบิ้ลคลิกไฟล์ <span className="font-mono font-bold">start-backend.bat</span> หรือ <span className="font-mono font-bold">start-backend-hidden.vbs</span>
                </p>
              )}
            </div>

            {/* Box 2: MySQL Status */}
            <div className={`p-4 rounded-2xl border ${status?.connected ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-700" />
                  ฐานข้อมูล MySQL
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status?.connected ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                  {status?.connected ? '🟢 เชื่อมต่อแล้ว' : '🔴 ยังไม่เชื่อมต่อ'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                Host: {status?.host || dbHost}:{status?.port || dbPort} ({status?.database || dbName})
              </div>
              {!status?.connected && status?.apiConnected && (
                <p className="text-[11px] text-rose-700 mt-2 font-medium">
                  {status?.error || 'ไม่สามารถต่อ MySQL ได้ กรุณาตรวจสอบการตั้งค่า'}
                </p>
              )}
            </div>
          </div>

          {/* Quick Preset Buttons for Backend API */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>เลือก URL เซิร์ฟเวอร์ API:</span>
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={loading}
                className="text-[11px] text-red-700 hover:text-red-900 font-black flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>ค้นหาอัตโนมัติ (Auto-Detect)</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset('/api')}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-300 rounded-lg text-red-950 font-mono text-[11px] font-bold cursor-pointer"
              >
                /api (Same-Origin แนะนำ ⭐)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('/Cash_Cheque/api')}
                className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-lg text-slate-800 font-mono text-[11px] cursor-pointer"
              >
                /Cash_Cheque/api (IIS Subpath)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(`http://${host}:3003/api`)}
                className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-lg text-slate-800 font-mono text-[11px] cursor-pointer"
              >
                http://{host}:3003/api
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('http://localhost:3003/api')}
                className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-lg text-slate-800 font-mono text-[11px] cursor-pointer"
              >
                http://localhost:3003/api
              </button>
            </div>
          </div>

          {/* MySQL Configuration Form (Expandable) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDbSettings(!showDbSettings)}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-black text-slate-800 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-700" />
                <span>กำหนด IP / Host และพารามิเตอร์ฐานข้อมูล MySQL</span>
              </span>
              {showDbSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDbSettings && (
              <div className="p-4 bg-slate-50 space-y-3 text-xs animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Host IP / Domain:</label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={(e) => setDbHost(e.target.value)}
                      placeholder="เช่น 10.1.0.201 หรือ localhost"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setDbHost('10.1.0.201')}
                        className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-red-50 rounded text-[10px] font-mono cursor-pointer"
                      >
                        10.1.0.201
                      </button>
                      <button
                        type="button"
                        onClick={() => setDbHost('localhost')}
                        className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-red-50 rounded text-[10px] font-mono cursor-pointer"
                      >
                        localhost
                      </button>
                      <button
                        type="button"
                        onClick={() => setDbHost('127.0.0.1')}
                        className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-red-50 rounded text-[10px] font-mono cursor-pointer"
                      >
                        127.0.0.1
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Port:</label>
                    <input
                      type="number"
                      value={dbPort}
                      onChange={(e) => setDbPort(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Database Name:</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Username:</label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Password (เว้นว่างได้ถ้าไม่มี):</label>
                    <input
                      type="password"
                      value={dbPassword}
                      onChange={(e) => setDbPassword(e.target.value)}
                      placeholder="รหัสผ่าน MySQL (ค่าเริ่มต้น XAMPP คือว่างไว้)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDbConfig}
                    disabled={loading}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-50"
                  >
                    บันทึก & ทดสอบเชื่อมต่อ MySQL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table Counts in MySQL (when connected) */}
          {status?.tables && status?.connected && (
            <div>
              <div className="text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-red-700" />
                <span>จำนวนข้อมูลจริงในตาราง MySQL (Real-time Count)</span>
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
                  <div className="text-[11px] text-red-700">อัปเดตหน้าจอให้ตรงกับฐานข้อมูล MySQL</div>
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

          {/* Direct URL Tip Card */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
            <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">💡 ทางเลือกที่แนะนำ:</span> หากเปิดผ่าน IIS แล้วติดปัญหา สามารถเข้าใช้งานผ่านเซิร์ฟเวอร์ Node.js โดยตรงที่:{' '}
              <a
                href={directNodeUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-black text-blue-700 underline inline-flex items-center gap-1 hover:text-blue-950"
              >
                {directNodeUrl}
                <ExternalLink className="w-3 h-3 inline" />
              </a>{' '}
              ระบบจะเชื่อมต่อฐานข้อมูล MySQL ได้ 100% ทันทีโดยไม่ต้องตั้งค่าใดๆ เพิ่มเติม
            </div>
          </div>

          {/* API URL Custom Input */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              กำหนด Backend API URL ด้วยตนเอง:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="เช่น http://10.2.0.13:3003/api"
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
