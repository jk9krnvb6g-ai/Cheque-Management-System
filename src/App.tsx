import React, { useState, useEffect } from 'react';
import { BankType, Cheque, User } from './types';
import { StorageService } from './utils/storage';
import { Navbar, AppTab } from './components/Navbar';
import { EasyChequeWriter } from './components/EasyChequeWriter';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { ChequeHistoryView } from './components/ChequeHistoryView';
import { SettingsView } from './components/SettingsView';
import { ChequePrintModal } from './components/ChequePrintModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { DbStatusModal } from './components/DbStatusModal';
import { apiClient } from './services/api';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return StorageService.getCurrentUser() || null;
  });
  const [currentTab, setCurrentTab] = useState<AppTab>('write');
  const [cheques, setCheques] = useState<Cheque[]>(() => StorageService.getCheques());
  const [usersCount, setUsersCount] = useState<number>(() => StorageService.getUsers().length);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [isDbStatusOpen, setIsDbStatusOpen] = useState(false);

  // Navigation props between tabs
  const [selectedBankForTemplates, setSelectedBankForTemplates] = useState<BankType>('KTB');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PENDING' | 'ISSUED' | 'VOID'>('ALL');
  const [initialDraftCheque, setInitialDraftCheque] = useState<Cheque | null>(null);

  const handleDuplicateAsNewCheque = (sourceCheque: Cheque) => {
    setInitialDraftCheque(sourceCheque);
    setCurrentTab('write');
    showToast(`ดึงข้อมูล "${sourceCheque.chequePayeeName}" มาออกเป็นเช็คฉบับใหม่แล้ว`);
  };

  // Print Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingCheque, setPrintingCheque] = useState<Cheque | null>(null);

  // User Management Modal state
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshData = () => {
    setCheques(StorageService.getCheques());
    setUsersCount(StorageService.getUsers().length);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    refreshData();
    showToast(`ยินดีต้อนรับ ${user.fullName} เข้าสู่ระบบ`);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentTab('write');
  };

  const handleUserChanged = (user: User) => {
    setCurrentUser(user);
    refreshData();
    showToast(`สลับบัญชีผู้ใช้งานเป็น ${user.fullName} (${user.role}) เรียบร้อยแล้ว`);
  };

  const handleOpenPrintModal = (cheque: Cheque) => {
    setPrintingCheque(cheque);
    setIsPrintModalOpen(true);
  };

  const handlePrintSuccess = (chequeId: string) => {
    refreshData();
    const updated = StorageService.getChequeById(chequeId);
    showToast(`บันทึกการพิมพ์เช็คฎีกา ${updated?.dikaNumber || ''} เรียบร้อยแล้ว`);
  };

  const handleNavigateToTemplates = (bank: BankType) => {
    setSelectedBankForTemplates(bank);
    setCurrentTab('templates');
  };

  const handleNavigateToHistory = (filter: 'ALL' | 'PENDING' | 'ISSUED' | 'VOID' = 'ALL') => {
    setHistoryFilter(filter);
    setCurrentTab('history');
  };

  // Pending cheques count
  const pendingCount = cheques.filter((c) => c.status !== 'VOID' && c.printCount === 0).length;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Guard unauthorized tabs for regular users
  useEffect(() => {
    if (!isAdmin && (currentTab === 'executive' || currentTab === 'templates')) {
      setCurrentTab('write');
    }
  }, [isAdmin, currentTab]);

  // Initial MySQL sync and periodic database connection health check
  useEffect(() => {
    // 1. Initial background sync with MySQL 10.1.0.201
    StorageService.syncWithBackend().then(res => {
      if (res.success) {
        setDbConnected(true);
        refreshData();
      }
    }).catch(() => {
      setDbConnected(false);
    });

    // 2. Health check function
    const checkDbHealth = async () => {
      try {
        const status = await apiClient.getDbStatus();
        setDbConnected(status?.connected ?? false);
      } catch {
        setDbConnected(false);
      }
    };

    checkDbHealth();
    const interval = setInterval(checkDbHealth, 30000); // Check every 30s

    // 3. Listen to external or cross-tab sync events
    const handleDbSynced = () => {
      refreshData();
    };
    window.addEventListener('cheque_db_synced', handleDbSynced);

    return () => {
      clearInterval(interval);
      window.removeEventListener('cheque_db_synced', handleDbSynced);
    };
  }, []);

  // Keyboard Shortcuts: F2 to write new cheque, Escape to close modals
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('write');
        return;
      }
      if (e.key === 'Escape') {
        if (isPrintModalOpen) setIsPrintModalOpen(false);
        if (isUserManagementOpen) setIsUserManagementOpen(false);
        if (isDbStatusOpen) setIsDbStatusOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isPrintModalOpen, isUserManagementOpen, isDbStatusOpen]);

  // If not logged in, show login page
  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 text-slate-900 flex flex-col font-sans">
      {/* Top Red & White Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (!isAdmin && (tab === 'executive' || tab === 'templates')) {
            setCurrentTab('write');
            return;
          }
          if (tab === 'history') setHistoryFilter('ALL');
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        pendingCount={pendingCount}
        onOpenUserManagement={() => {
          if (isAdmin) setIsUserManagementOpen(true);
        }}
        userCount={usersCount}
        dbConnected={dbConnected}
        onOpenDbStatus={() => setIsDbStatusOpen(true)}
      />

      {/* Main Full-Width Content Viewport (ไม่บีบแคบ ไม่เหลือข้างๆ เยอะ) */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 p-4 bg-slate-900 text-white text-sm font-bold rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: เขียนและสั่งพิมพ์เช็คด่วน (Fast Cheque Writer) */}
        {currentTab === 'write' && (
          <EasyChequeWriter
            currentUser={currentUser}
            cheques={cheques}
            onPrintCheque={handleOpenPrintModal}
            onRefreshData={refreshData}
            onNavigateToTemplates={isAdmin ? handleNavigateToTemplates : undefined}
            onNavigateToHistory={() => handleNavigateToHistory('PENDING')}
            initialDraftCheque={initialDraftCheque}
            onClearInitialDraft={() => setInitialDraftCheque(null)}
          />
        )}

        {/* Tab 2: แดชบอร์ดผู้บริหาร (Executive Dashboard - เฉพาะ Admin) */}
        {isAdmin && currentTab === 'executive' && (
          <ExecutiveSummaryView
            cheques={cheques}
            onOpenPrintModal={handleOpenPrintModal}
            onNavigateToHistory={() => handleNavigateToHistory('ALL')}
          />
        )}

        {/* Tab 3: ประวัติเช็คทั้งหมด (Cheque History Register) */}
        {currentTab === 'history' && (
          <ChequeHistoryView
            currentUser={currentUser}
            cheques={cheques}
            onOpenPrintModal={handleOpenPrintModal}
            onRefreshData={refreshData}
            initialFilter={historyFilter}
            onDuplicateAsNewCheque={handleDuplicateAsNewCheque}
          />
        )}

        {/* Tab 4: ตั้งค่าตำแหน่งพิมพ์เช็ค (Templates Calibration - เฉพาะ Admin) */}
        {isAdmin && currentTab === 'templates' && (
          <SettingsView
            currentUser={currentUser}
            onRefreshData={refreshData}
            initialBank={selectedBankForTemplates}
            onNavigateToWrite={() => setCurrentTab('write')}
            onOpenUserManagement={() => {
              if (isAdmin) setIsUserManagementOpen(true);
            }}
          />
        )}
      </main>

      {/* Cheque Print Modal */}
      {printingCheque && (
        <ChequePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintingCheque(null);
          }}
          cheque={printingCheque}
          currentUser={currentUser}
          onPrintSuccess={handlePrintSuccess}
          onOpenHistory={() => {
            setIsPrintModalOpen(false);
            setPrintingCheque(null);
            setCurrentTab('history');
          }}
        />
      )}

      {/* System-Wide User & Member Management Modal (Admin Only) */}
      {isAdmin && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUser={currentUser}
          onUserChanged={handleUserChanged}
          onRefreshData={refreshData}
        />
      )}

      {/* MySQL 10.1.0.201 Database Status & Synchronization Modal */}
      <DbStatusModal
        isOpen={isDbStatusOpen}
        onClose={() => setIsDbStatusOpen(false)}
        onDataSynced={refreshData}
      />

      {/* Clean Red & White Footer */}
      <footer className="no-print border-t border-red-100 bg-white py-3.5 text-center text-xs text-slate-500 font-medium w-full">
        ระบบจัดทำและพิมพ์เช็ค (Cheque Management System) · รองรับแม่แบบ KTB (241×90mm), BAAC (235×90mm), GSB (239×90mm)
      </footer>
    </div>
  );
}
