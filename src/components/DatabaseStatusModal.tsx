import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, UploadCloud, CheckCircle2, AlertTriangle, Server, Wifi, X, Check, Globe } from 'lucide-react';
import { apiClient, DbStatusInfo, getApiBaseUrl } from '../services/api';
import { StorageService } from '../utils/storage';
import { User } from '../types';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRefreshData: () => void;
  onNotify: (msg: string) => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRefreshData,
  onNotify,
}) => {
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Custom API URL configuration
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    return localStorage.getItem('cheque_sys_api_url') || '';
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  // Load database status
  const checkStatus = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const status = await apiClient.getDbStatus();
      setDbStatus(status);
    } catch {
      setDbStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle manual test connection
  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await apiClient.testDbConnection();
      if (res.success && res.data) {
        setDbStatus(res.data);
        setTestResult({
          success: true,
          message: `เชื่อมต่อฐานข้อมูล MySQL เครื่อง ${res.data.host}:${res.data.port} ฐานข้อมูล "${res.data.database}" สำเร็จสมบูรณ์ 100%!`,
        });
      } else {
        setTestResult({
          success: false,
          message: 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL 10.1.0.201 ได้ กรุณาตรวจสอบว่าเปิด MySQL/MariaDB ที่เครื่องแม่ข่ายแล้วหรือไม่',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทดสอบ: ' + err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Pull / Sync fresh data from MySQL
  const handleSyncFromMysql = async () => {
    setIsSyncing(true);
    try {
      const res = await StorageService.syncWithBackend();
      onRefreshData();
      await checkStatus();
      if (res.success) {
        onNotify(`ซิงค์ข้อมูลจาก MySQL สำเร็จ! ดึงข้อมูลเช็ค ${res.chequesCount} ฉบับ, ผู้ใช้งาน ${res.usersCount} คน เรียบร้อยแล้ว`);
      } else {
        onNotify('ซิงค์ข้อมูลไม่สำเร็จ กรุณาตรวจสอบสถานะเซิร์ฟเวอร์');
      }
    } catch (err: any) {
      onNotify('เกิดข้อผิดพลาดในการซิงค์: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Push local data into MySQL
  const handlePushToMysql = async () => {
    if (!window.confirm('คุณต้องการส่งข้อมูลเช็คและผู้ใช้งานทั้งหมดจากเครื่องนี้ ไปบันทึกลงฐานข้อมูล MySQL (10.1.0.201) ใช่หรือไม่?')) {
      return;
    }
    setIsPushing(true);
    try {
      const res = await StorageService.pushAllLocalToMysql();
      onRefreshData();
      await checkStatus();
      if (res.success) {
        onNotify('ส่งข้อมูลเข้าสู่ฐานข้อมูล MySQL เครื่อง 10.1.0.201 เรียบร้อยแล้ว 100%!');
      } else {
        onNotify('ส่งข้อมูลไม่สำเร็จ: ' + (res.error || 'ไม่สามารถติดต่อฐานข้อมูลได้'));
      }
    } catch (err: any) {
      onNotify('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  // Save custom API URL
  const handleSaveApiUrl = () => {
    const trimmed = customApiUrl.trim();
    if (trimmed) {
      localStorage.setItem('cheque_sys_api_url', trimmed);
    } else {
      localStorage.removeItem('cheque_sys_api_url');
    }
    setIsEditingUrl(false);
    onNotify('บันทึกการตั้งค่า API Base URL เรียบร้อยแล้ว');
    checkStatus();
  };

  const localCheques = StorageService.getCheques();
  const localUsers = StorageService.getUsers();
  const isConnected = dbStatus?.connected === true;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Database className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">สถานะการเชื่อมต่อฐานข้อมูล MySQL</h2>
              <p className="text-xs text-red-200 font-medium">เครื่องแม่ข่ายฐานข้อมูลส่วนกลาง: 10.1.0.201 (พอร์ต 3306)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Connection Status Card */}
          <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isConnected ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {isConnected ? <Wifi className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  <h3 className="font-black text-base">
                    {isConnected ? 'เชื่อมต่อฐานข้อมูล MySQL สำเร็จสมบูรณ์ 100%' : 'กำลังทำงานในโหมดสำรองข้อมูล (Offline / Memory DB)'}
                  </h3>
                </div>
                <p className="text-xs mt-1 text-slate-600">
                  {isConnected
                    ? `เซิร์ฟเวอร์ MySQL ที่ ${dbStatus?.host}:${dbStatus?.port} (${dbStatus?.database}) พร้อมให้บริการเต็มรูปแบบ`
                    : 'ไม่สามารถติดต่อ 10.1.0.201 ได้ในขณะนี้ ระบบเปิดระบบสำรองข้อมูลอัตโนมัติ ข้อมูลจะไม่สูญหาย'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-2 self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              ทดสอบเชื่อมต่อ (Ping)
            </button>
          </div>

          {/* Test connection alert message */}
          {testResult && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Database Details & Data Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Box 1: MySQL Central DB Status */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-red-700" />
                  ฐานข้อมูลกลาง MySQL (10.1.0.201)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>โฮสต์ (Host): <strong className="text-slate-900">{dbStatus?.host || '10.1.0.201'}</strong></div>
                <div>พอร์ต (Port): <strong className="text-slate-900">{dbStatus?.port || 3306}</strong></div>
                <div>ฐานข้อมูล: <strong className="text-slate-900">{dbStatus?.database || 'cheque_system'}</strong></div>
                <div>ผู้ใช้ DB: <strong className="text-slate-900">{dbStatus?.user || 'root'}</strong></div>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>เช็คในฐานข้อมูล MySQL:</span>
                  <span className="font-black text-red-700">{dbStatus?.counts.cheques ?? '-'} ฉบับ</span>
                </div>
                <div className="flex justify-between">
                  <span>สมาชิกผู้ใช้ใน MySQL:</span>
                  <span className="font-black text-slate-900">{dbStatus?.counts.users ?? '-'} คน</span>
                </div>
                <div className="flex justify-between">
                  <span>ประวัติการพิมพ์ใน MySQL:</span>
                  <span className="font-black text-slate-900">{dbStatus?.counts.printLogs ?? '-'} รายการ</span>
                </div>
                <div className="flex justify-between">
                  <span>บันทึกกิจกรรม Audit Log:</span>
                  <span className="font-black text-slate-900">{dbStatus?.counts.auditLogs ?? '-'} รายการ</span>
                </div>
              </div>
            </div>

            {/* Box 2: Local Application State */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-700" />
                  ข้อมูลในเครื่องนี้ (Local Cache)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                  ACTIVE
                </span>
              </div>
              <div className="text-slate-600">
                API Base URL: <strong className="text-slate-900 break-all">{getApiBaseUrl()}</strong>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>เช็คที่แสดงผลบนหน้าจอ:</span>
                  <span className="font-black text-red-700">{localCheques.length} ฉบับ</span>
                </div>
                <div className="flex justify-between">
                  <span>สมาชิกผู้ใช้ในเครื่องนี้:</span>
                  <span className="font-black text-slate-900">{localUsers.length} คน</span>
                </div>
                <div className="flex justify-between">
                  <span>สถานะการล็อกอิน:</span>
                  <span className="font-bold text-emerald-700">@{currentUser.username} ({currentUser.role})</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(!isEditingUrl)}
                  className="text-[11px] text-blue-700 hover:underline font-bold"
                >
                  {isEditingUrl ? '✕ ปิดการแก้ไข API URL' : '⚙️ ปรับแต่ง API Base URL (สำหรับการติดตั้งพิเศษ)'}
                </button>
              </div>
            </div>

          </div>

          {/* API URL Editor if opened */}
          {isEditingUrl && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="text-xs font-bold text-blue-900">
                กำหนดที่อยู่ Backend API (เว้นว่างไว้เพื่อใช้ค่ามาตรฐานอัตโนมัติ):
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  placeholder="เช่น http://10.2.0.13:3003/api หรือ /api"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </div>
          )}

          {/* Action Synchronization Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            
            {/* Sync from MySQL Button */}
            <button
              type="button"
              onClick={handleSyncFromMysql}
              disabled={isSyncing}
              className="flex-1 w-full px-5 py-3.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูลจาก MySQL...' : '🔄 ซิงค์ข้อมูลล่าสุดจาก MySQL (10.1.0.201)'}</span>
            </button>

            {/* Push to MySQL Button */}
            <button
              type="button"
              onClick={handlePushToMysql}
              disabled={isPushing}
              className="flex-1 w-full px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
              <span>{isPushing ? 'กำลังส่งข้อมูลขึ้น MySQL...' : '📤 ส่งข้อมูลทั้งหมดขึ้น MySQL (10.1.0.201)'}</span>
            </button>

          </div>

          <div className="text-[11px] text-slate-500 text-center leading-relaxed">
            💡 <strong>เคล็ดลับ:</strong> เมื่อกด <strong>"ซิงค์ข้อมูลล่าสุดจาก MySQL"</strong> ระบบจะดึงเช็คและสมาชิกทั้งหมดจากฐานข้อมูลกลางเครื่อง 10.1.0.201 มาอัปเดตบนหน้าจอทันที ให้ข้อมูลทุกเครื่องในหน่วยงานตรงกัน 100%
          </div>

        </div>

      </div>
    </div>
  );
};
