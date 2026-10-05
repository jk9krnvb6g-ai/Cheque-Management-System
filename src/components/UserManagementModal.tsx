import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { StorageService } from '../utils/storage';
import { formatThaiDate } from '../utils/dateUtils';
import {
  Users,
  UserPlus,
  UserCheck,
  ShieldAlert,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  Lock,
  ArrowRightLeft,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit3,
  KeyRound,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserChanged: (user: User) => void;
  onRefreshData?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onRefreshData,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');

  // Register Form Drawer
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPosition, setRegPosition] = useState('นักวิชาการเงินและบัญชี');
  const [regRole, setRegRole] = useState<UserRole>('USER');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [autoSwitchAfterReg, setAutoSwitchAfterReg] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-app confirmation for delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Edit User State & Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editStatus, setEditStatus] = useState<UserStatus>('ACTIVE');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadUsers = () => {
    setUsers(StorageService.getUsers());
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.position && u.position.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const totalMembers = users.length;
  const activeMembers = users.filter((u) => u.status === 'ACTIVE').length;
  const adminMembers = users.filter((u) => u.role === 'ADMIN').length;

  // Handle Register New User
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = regUsername.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('ชื่อผู้ใช้งาน (Username) ต้องมีอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setErrorMsg('ชื่อผู้ใช้งานต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) เท่านั้น');
      return;
    }
    if (!StorageService.isUsernameAvailable(cleanUsername)) {
      setErrorMsg(`ชื่อผู้ใช้งาน "${cleanUsername}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
      return;
    }
    if (!regFullName.trim()) {
      setErrorMsg('กรุณาระบุชื่อ-นามสกุลจริงของผู้ใช้งาน');
      return;
    }
    if (regPassword.length < 4) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await StorageService.registerUser(
        {
          username: cleanUsername,
          fullName: regFullName.trim(),
          passwordPlain: regPassword,
          position: regPosition.trim() || 'เจ้าหน้าที่การเงินและบัญชี',
          role: regRole,
        },
        {
          autoLogin: autoSwitchAfterReg,
          operator: currentUser,
        }
      );

      if (!result.success || !result.user) {
        setErrorMsg(result.error || 'การสมัครสมาชิกล้มเหลว');
      } else {
        setSuccessMsg(`เพิ่มสมาชิกใหม่ "${result.user.fullName}" เข้าสู่ระบบเรียบร้อยแล้ว`);
        loadUsers();
        if (onRefreshData) onRefreshData();

        // Reset form
        setRegUsername('');
        setRegFullName('');
        setRegPassword('');
        setRegConfirmPassword('');
        setIsRegisterOpen(false);

        if (autoSwitchAfterReg) {
          onUserChanged(result.user);
        }
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการลงทะเบียนสมาชิก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch Active User directly
  const handleSwitchUser = (targetUser: User) => {
    if (targetUser.status !== 'ACTIVE') {
      setErrorMsg(`บัญชี ${targetUser.fullName} ถูกระงับการใช้งาน ไม่สามารถสลับใช้งานได้`);
      return;
    }
    StorageService.setCurrentUser(targetUser);
    onUserChanged(targetUser);
    setSuccessMsg(`สลับการปฏิบัติงานเป็น: ${targetUser.fullName} (${targetUser.role}) เรียบร้อยแล้ว`);
    if (onRefreshData) onRefreshData();
  };

  // Toggle user status
  const handleToggleStatus = (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      setErrorMsg('ไม่สามารถระงับการใช้งานบัญชีของตนเองที่กำลังเข้าสู่ระบบอยู่ได้');
      return;
    }
    StorageService.toggleUserStatus(targetUser.id, currentUser);
    loadUsers();
    setSuccessMsg(`เปลี่ยนสถานะบัญชี ${targetUser.fullName} สำเร็จ`);
  };

  // Change user role
  const handleChangeRole = (targetUser: User, newRole: UserRole) => {
    StorageService.updateUserRole(targetUser.id, newRole, currentUser);
    loadUsers();
    setSuccessMsg(`ปรับสิทธิ์ ${targetUser.fullName} เป็น ${newRole} สำเร็จ`);
  };

  // Confirm delete user
  const executeDeleteUser = (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      setErrorMsg('ไม่สามารถลบบัญชีของตนเองที่กำลังเข้าสู่ระบบอยู่ได้');
      setDeleteTarget(null);
      return;
    }
    if (targetUser.username === 'admin') {
      setErrorMsg('ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (admin) ได้');
      setDeleteTarget(null);
      return;
    }
    StorageService.deleteUser(targetUser.id, currentUser);
    loadUsers();
    setDeleteTarget(null);
    setSuccessMsg(`ลบบัญชีผู้ใช้ ${targetUser.fullName} เรียบร้อยแล้ว`);
  };

  // Open Edit User Modal
  const handleOpenEditModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditFullName(targetUser.fullName);
    setEditPosition(targetUser.position || '');
    setEditRole(targetUser.role);
    setEditStatus(targetUser.status);
    setEditNewPassword('');
    setShowEditPassword(false);
    setErrorMsg(null);
  };

  // Save Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFullName.trim()) {
      setErrorMsg('กรุณาระบุชื่อ-นามสกุลจริง');
      return;
    }
    if (editNewPassword && editNewPassword.length < 4) {
      setErrorMsg('หากต้องการตั้งรหัสผ่านใหม่ รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await StorageService.updateUserProfile(
        editingUser.id,
        {
          fullName: editFullName.trim(),
          position: editPosition.trim(),
          role: editRole,
          status: editStatus,
          passwordPlain: editNewPassword.trim() || undefined,
        },
        currentUser
      );

      if (!res.success) {
        setErrorMsg(res.error || 'การแก้ไขข้อมูลล้มเหลว');
      } else {
        setSuccessMsg(`บันทึกการแก้ไขข้อมูลผู้ใช้งาน "${editFullName}" เรียบร้อยแล้ว`);
        setEditingUser(null);
        loadUsers();
        if (onRefreshData) onRefreshData();
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้งาน');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-red-800 to-red-900 text-white flex items-center justify-between border-b border-red-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                ระบบจัดการและเพิ่มสมาชิกผู้ใช้งาน
              </h2>
              <p className="text-xs text-red-100 font-medium">
                ลงทะเบียนเพื่อนร่วมงาน ตรวจสอบสิทธิ์ และสลับบัญชีผู้ปฏิบัติงานในระบบ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-200 text-red-900 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800 text-xs">
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 text-xs">
                ✕
              </button>
            </div>
          )}

          {/* Stats Bar & Add Member Button */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-500 block mb-0.5">สมาชิกทั้งหมด</span>
              <span className="text-xl font-black text-slate-900">{totalMembers} คน</span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">สถานะเปิดใช้งาน</span>
              <span className="text-xl font-black text-emerald-900">{activeMembers} คน</span>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-700 block mb-0.5">ผู้ดูแลระบบ (Admin)</span>
              <span className="text-xl font-black text-amber-900">{adminMembers} คน</span>
            </div>

            <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-red-700 block mb-0.5">ผู้ใช้งานปัจจุบัน</span>
              <span className="text-xs font-extrabold text-red-950 truncate flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
                {currentUser.fullName}
              </span>
            </div>
          </div>

          {/* Toggle Register Form Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(!isRegisterOpen)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isRegisterOpen
                  ? 'bg-slate-800 text-white'
                  : 'bg-red-700 hover:bg-red-800 text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isRegisterOpen ? 'ซ่อนฟอร์มลงทะเบียน' : '➕ ลงทะเบียน / เพิ่มสมาชิกใหม่'}</span>
              {isRegisterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              สามารถลงทะเบียนเพื่อนร่วมงานเพื่อใช้งานร่วมกันในองค์กรได้ทันที
            </span>
          </div>

          {/* Collapsible Register New Member Form */}
          {isRegisterOpen && (
            <form
              onSubmit={handleRegisterSubmit}
              className="p-5 bg-gradient-to-b from-red-50/70 to-slate-50 border-2 border-red-200 rounded-2xl space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-red-200/80">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-700" />
                  <h3 className="text-sm font-black text-red-950">
                    แบบฟอร์มลงทะเบียนสมาชิกใหม่ (เพื่อนร่วมงาน / ผู้ปฏิบัติงาน)
                  </h3>
                </div>
                <span className="text-[11px] text-red-700 font-bold bg-white px-2 py-0.5 rounded-md border border-red-200">
                  เพิ่มโดย {currentUser.fullName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อผู้ใช้งาน (Username) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="เช่น worachai, siriporn"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ภาษาอังกฤษ ตัวเลข ขีดล่าง อย่างน้อย 3 ตัวอักษร
                  </span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อ-นามสกุลจริง (Full Name) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="เช่น นายวรชัย สุขสำราญ"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ตำแหน่ง / ฝ่ายงาน
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regPosition}
                      onChange={(e) => setRegPosition(e.target.value)}
                      placeholder="เช่น นักวิชาการเงิน, เจ้าหน้าที่พัสดุ"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระดับสิทธิ์การใช้งาน
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                  >
                    <option value="USER">เจ้าหน้าที่การเงินทั่วไป (USER)</option>
                    <option value="ADMIN">หัวหน้างาน / ผู้ดูแลระบบ (ADMIN)</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสผ่านเข้าใช้งาน <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ยืนยันรหัสผ่านอีกครั้ง <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Auto Switch Option */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={autoSwitchAfterReg}
                    onChange={(e) => setAutoSwitchAfterReg(e.target.checked)}
                    className="w-4 h-4 rounded text-red-700 border-slate-300 focus:ring-red-600"
                  />
                  <span>สลับเข้าใช้งานด้วยบัญชีใหม่นี้ทันทีหลังลงทะเบียน</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันลงทะเบียนสมาชิกใหม่'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Search & Filter Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ-นามสกุล, ชื่อผู้ใช้, ตำแหน่ง..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">สิทธิ์:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="ADMIN">ADMIN</option>
                <option value="USER">USER</option>
              </select>

              <span className="text-slate-500 font-bold ml-2">สถานะ:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="ACTIVE">เปิดใช้งาน (ACTIVE)</option>
                <option value="INACTIVE">ระงับ (INACTIVE)</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ผู้ใช้งาน</th>
                    <th className="py-3 px-3">ตำแหน่ง / ฝ่าย</th>
                    <th className="py-3 px-3">ระดับสิทธิ์</th>
                    <th className="py-3 px-3">สถานะ</th>
                    <th className="py-3 px-3">วันที่เข้าร่วม</th>
                    <th className="py-3 px-4 text-center">จัดการบัญชี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูลสมาชิกตามเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isCurrent = user.id === currentUser.id;
                      const isActive = user.status === 'ACTIVE';

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isCurrent ? 'bg-red-50/40' : ''
                          }`}
                        >
                          {/* User Name & Avatar */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                  user.role === 'ADMIN'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-red-100 text-red-900 border border-red-200'
                                }`}
                              >
                                {user.fullName.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{user.fullName}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-red-700 text-white rounded font-bold">
                                      คุณ (ปัจจุบัน)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  @{user.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Position */}
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            {user.position || 'เจ้าหน้าที่การเงิน'}
                          </td>

                          {/* Role */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <select
                              value={user.role}
                              disabled={isCurrent && user.role === 'ADMIN'}
                              onChange={(e) => handleChangeRole(user, e.target.value as UserRole)}
                              className={`text-[11px] font-extrabold px-2 py-1 rounded-lg border cursor-pointer ${
                                user.role === 'ADMIN'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-slate-50 text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="USER">USER (การเงิน)</option>
                              <option value="ADMIN">ADMIN (หัวหน้า/แอดมิน)</option>
                            </select>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={isCurrent}
                              title={isCurrent ? 'บัญชีปัจจุบันไม่สามารถปิดได้' : 'คลิกเพื่อเปลี่ยนสถานะ'}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                              } ${isCurrent ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                              />
                              {isActive ? 'ใช้งาน' : 'ระงับ'}
                            </button>
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                            {user.createdAt ? formatThaiDate(user.createdAt.slice(0, 10)) : '-'}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit User Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(user)}
                                title="แก้ไขข้อมูลผู้ใช้ (ชื่อ-สกุล, ตำแหน่ง, สิทธิ์, สถานะ, รหัสผ่าน)"
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Edit3 className="w-3 h-3 text-amber-700" />
                                <span>แก้ไข</span>
                              </button>

                              {!isCurrent ? (
                                <button
                                  type="button"
                                  onClick={() => handleSwitchUser(user)}
                                  title="สลับเข้าใช้งานด้วยบัญชีนี้ทันที"
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-800 border border-slate-200 hover:border-red-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3 h-3 text-red-600" />
                                  <span>สลับใช้งาน</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium px-1">กำลังใช้งาน</span>
                              )}

                              {!isCurrent && user.username !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(user)}
                                  title="ลบบัญชีสมาชิก"
                                  className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-700 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>ทุกการสมัครสมาชิกและการสลับบัญชีจะบันทึกใน Audit Trail อัตโนมัติ</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Delete User Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-300 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-center text-slate-900 mb-1">
              ยืนยันการลบบัญชีผู้ใช้งาน?
            </h3>
            <p className="text-xs text-center text-slate-600 mb-5">
              คุณกำลังจะลบบัญชี <span className="font-bold text-slate-900">"{deleteTarget.fullName}"</span> (@{deleteTarget.username}) การกระทำนี้ไม่สามารถยกเลิกได้
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => executeDeleteUser(deleteTarget)}
                className="py-2.5 px-3 bg-red-700 hover:bg-red-800 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                ยืนยันลบผู้ใช้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal Dialog (เฉพาะ Admin) */}
      {editingUser && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-red-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-red-800 to-red-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight">
                    แก้ไขข้อมูลและระดับสิทธิ์ผู้ใช้งาน
                  </h3>
                  <span className="text-xs text-red-200 font-mono">
                    @{editingUser.username}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEditUser} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุลจริง <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ตำแหน่ง / ฝ่ายงาน
                </label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {['นักวิชาการเงินและบัญชี', 'เจ้าหน้าที่การเงินและบัญชี', 'เจ้าหน้าที่พัสดุ', 'หัวหน้ากลุ่มงานการเงิน'].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setEditPosition(pos)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        editPosition === pos
                          ? 'bg-red-50 text-red-800 border-red-300 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ระดับสิทธิ์การใช้งาน (User Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('USER')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      editRole === 'USER'
                        ? 'bg-red-50 border-red-400 text-red-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      <span>USER (ผู้ใช้ทั่วไป)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      เขียนเช็คและสั่งพิมพ์เช็ค ดูประวัติ (ไม่เห็นแดชบอร์ด/แม่แบบ/จัดการผู้ใช้)
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={editingUser.username === 'admin'}
                    onClick={() => setEditRole('ADMIN')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      editRole === 'ADMIN'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    } ${editingUser.username === 'admin' ? 'opacity-80' : ''}`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      <span>ADMIN (ผู้ดูแลระบบ)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      สิทธิ์เต็ม: แดชบอร์ดผู้บริหาร, ตั้งค่าแม่แบบพิมพ์, จัดการผู้ใช้ทั้งหมด
                    </div>
                  </button>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สถานะการใช้งานบัญชี (Status)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('ACTIVE')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      editStatus === 'ACTIVE'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🟢 เปิดใช้งานปกติ (ACTIVE)
                  </button>

                  <button
                    type="button"
                    disabled={editingUser.id === currentUser.id}
                    onClick={() => setEditStatus('INACTIVE')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      editStatus === 'INACTIVE'
                        ? 'bg-red-50 border-red-400 text-red-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    } ${editingUser.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    🔴 ระงับการใช้งาน (INACTIVE)
                  </button>
                </div>
                {editingUser.id === currentUser.id && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    * ไม่สามารถระงับบัญชีที่กำลังเข้าสู่ระบบอยู่ได้
                  </p>
                )}
              </div>

              {/* Reset Password */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>รีเซ็ตรหัสผ่านใหม่ (หากต้องการเปลี่ยน)</span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  {editNewPassword && (
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-amber-700">
                  หากกรอกรหัสผ่านใหม่ ผู้ใช้จะสามารถใช้รหัสผ่านใหม่นี้เข้าสู่ระบบได้ทันที
                </p>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-black text-xs rounded-xl cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
