import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, X, Server, Key, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../services/api';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced?: () => void;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({ isOpen, onClose, onDataSynced }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [formData, setFormData] = useState({
    host: '10.1.0.201',
    port: 3306,
    user: 'root',
    password: '',
    database: 'cheque_system',
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setSaveSuccessMsg(null);
    try {
      const res = await apiClient.getDbStatus();
      setStatus(res);
      if (res?.host) {
        setFormData(prev => ({
          ...prev,
          host: res.host || prev.host,
          port: res.port || prev.port,
          user: res.user || prev.user,
          database: res.database || prev.database,
        }));
      }
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccessMsg(null);
    try {
      const res = await apiClient.updateDbConfig(formData);
      if (res.connected) {
        setSaveSuccessMsg('เชื่อมต่อฐานข้อมูล MySQL สำเร็จเรียบร้อยแล้ว!');
        setShowConfigForm(false);
      } else {
        setSaveSuccessMsg(res.error ? `บันทึกแล้ว แต่ MySQL แจ้ง: ${res.error}` : 'บันทึกแล้ว แต่ยังเชื่อมต่อไม่ได้');
      }
      await checkStatus();
    } catch (err: any) {
      setSaveSuccessMsg(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = status?.connected === true;
  const targetHost = status?.host || formData.host;
  const targetPort = status?.port || formData.port;
  const targetDatabase = status?.database || formData.database;
  const targetUser = status?.user || formData.user;
  const errorText = status?.error || '';
  const isAccessDenied = errorText.toLowerCase().includes('access denied');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">สถานะการเชื่อมต่อฐานข้อมูล MySQL</h2>
              <p className="text-xs text-slate-400">กำหนดค่าผ่านไฟล์ .env หรือแก้ไขรหัสผ่านได้ที่นี่</p>
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
              <div className="flex items-start gap-2.5 text-rose-950">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-black">ยังไม่ได้เชื่อมต่อฐานข้อมูล MySQL (ออฟไลน์)</div>
                  <div className="text-xs font-mono text-rose-900 bg-rose-100/80 p-2 rounded-lg border border-rose-200 break-all">
                    {errorText || `ไม่สามารถเชื่อมต่อไปยังเครื่อง ${targetHost}:${targetPort} ได้`}
                  </div>
                  {isAccessDenied && (
                    <div className="text-xs text-rose-800 pt-1 leading-relaxed">
                      💡 <strong>วิเคราะห์ข้อผิดพลาด:</strong> เครื่องต่อถึง MySQL {targetHost} ได้แล้ว แต่ MySQL ไม่อนุญาตเนื่องจากรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ใส่รหัสผ่าน หรือ user 'root' ยังไม่ได้เปิดสิทธิ์ให้ IP เครื่องนี้
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white/90 border border-rose-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-rose-900">💡 โหมดสำรองพร้อมทำงาน:</span> คุณยังสามารถเข้าใช้งาน จัดทำเช็ค และพิมพ์เช็คได้ตามปกติ ข้อมูลจะถูกบันทึกสำรองไว้ในเครื่อง และระบบจะตรวจจับพร้อมส่งขึ้น MySQL ให้อัตโนมัติเมื่อฐานข้อมูลเปิดใช้งาน
              </div>
            </div>
          )}

          {/* Alert about .env restart */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <span>⚠️ แก้ไขไฟล์ .env แล้วทำไมยังไม่เปลี่ยน?</span>
            </div>
            <div className="text-[11px] leading-relaxed text-amber-800">
              เมื่อแก้ไขไฟล์ <code>.env</code> คุณจำเป็นต้อง <strong>ปิดหน้าต่าง CMD ดำๆ ของ Node.js แล้วเปิดใหม่ (Restart)</strong> เซิร์ฟเวอร์จึงจะอ่านค่าใหม่จากไฟล์ <code>.env</code> ครับ
            </div>
          </div>

          {/* Toggle Button for Config Form */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowConfigForm(!showConfigForm)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-500" />
                <span>{showConfigForm ? 'ซ่อนฟอร์มแก้ไขรหัสผ่าน MySQL' : '✏️ แก้ไขรหัสผ่าน / ค่าเชื่อมต่อ MySQL ทันที (ไม่ต้องรีสตาร์ท)'}</span>
              </span>
              {showConfigForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Inline Edit Config Form */}
          {showConfigForm && (
            <form onSubmit={handleSaveConfig} className="p-4 bg-slate-50 border-2 border-indigo-200 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>ระบุค่าเชื่อมต่อ MySQL:</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">DB_HOST</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="10.1.0.201 หรือ localhost"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">DB_PORT</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="3306"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">DB_USER</label>
                  <input
                    type="text"
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="root"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">DB_PASSWORD (รหัสผ่าน)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="ใส่รหัสผ่าน (หากมี)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">DB_NAME (ชื่อฐานข้อมูล)</label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="cheque_system"
                  required
                />
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium">
                  {saveSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>บันทึกและทดสอบเชื่อมต่อทันที</span>
              </button>
            </form>
          )}

          {/* Config Summary from current status */}
          {!showConfigForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-slate-600" />
                <span>ค่าคอนฟิกฐานข้อมูลปัจจุบันที่เซิร์ฟเวอร์ใช้งานอยู่:</span>
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
          )}
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
