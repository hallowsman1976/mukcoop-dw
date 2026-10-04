/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, BankAccount, TransactionRecord, AdminUser } from './types';
import { StorageService } from './services/storageService';
import { ApiService } from './services/api';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LiffService, LiffStatus } from './services/liffService';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { AccountsTable } from './components/AccountsTable';
import { DepositForm } from './components/DepositForm';
import { WithdrawForm } from './components/WithdrawForm';
import { TransactionHistory } from './components/TransactionHistory';
import { FlexMessageModal } from './components/FlexMessageModal';
import { GasIntegrationModal } from './components/GasIntegrationModal';
import { LiffConfigModal } from './components/LiffConfigModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationSettings } from './components/NotificationSettings';
import { LoansView } from './components/LoansView';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  Smartphone,
  Cloud,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';

const SKIP_AUTO_LOGIN_KEY = 'coop_skip_auto_login_v1';

function readSkipAutoLogin(): boolean {
  try {
    return sessionStorage.getItem(SKIP_AUTO_LOGIN_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [viewMode, setViewMode] = useState<'member' | 'admin'>('member');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'deposit' | 'withdraw' | 'history' | 'loans' | 'notifications'>('dashboard');
  const [selectedAccountForAction, setSelectedAccountForAction] = useState<BankAccount | null>(null);

  // Modals
  const [flexModalTxn, setFlexModalTxn] = useState<TransactionRecord | null>(null);
  const [showGasModal, setShowGasModal] = useState<boolean>(false);
  const [showLiffModal, setShowLiffModal] = useState<boolean>(false);

  // LIFF Status
  const [liffStatus, setLiffStatus] = useState<LiffStatus>({
    isReady: false,
    isInClient: false,
    isLoggedIn: false,
    os: 'web',
    liffId: '',
    profile: null,
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  const [mustChangePassword, setMustChangePassword] = useState(false);
  // True until the first session restore / LINE auto sign-in attempt finishes (avoids flashing the login form).
  const [booting, setBooting] = useState(true);

  const [brand, setBrand] = useState({ logoUrl: '', coopName: '', lineOfficialId: '' });

  const syncFromCache = () => {
    setBrand({
      logoUrl: StorageService.getSystemSettings().logoUrl,
      coopName: StorageService.getSystemSettings().cooperativeName,
      lineOfficialId: StorageService.getSystemSettings().lineOfficialId,
    });
    setAccounts(StorageService.getAccounts());
    setTransactions(StorageService.getTransactions());
    setCurrentMember(StorageService.getCurrentUser());
    setCurrentAdmin(StorageService.getCurrentAdmin());
    setMembers(StorageService.getMembers());
  };

  // Re-fetch from the server for whichever session is active, then redraw.
  const refreshData = async () => {
    try {
      if (StorageService.getCurrentAdmin()) {
        const r = await StorageService.refreshAdmin();
        setMustChangePassword(r.mustChangePassword);
      } else if (StorageService.getCurrentUser()) {
        await StorageService.refreshMember();
      }
    } catch (e) {
      if (e instanceof Error && /หมดอายุ/.test(e.message)) {
        await StorageService.logoutMember();
        await StorageService.logoutAdmin();
        showNotification('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'info');
      } else {
        showNotification(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ', 'info');
      }
    }
    syncFromCache();
  };

  useEffect(() => {
    (async () => {
      await StorageService.loadPublicSettings();
      const status = await LiffService.init(StorageService.getLiffId());
      setLiffStatus(status);
      if (await StorageService.restoreMemberSession()) {
        setViewMode('member');
      } else if (await StorageService.restoreAdminSession(StorageService.getStoredAdminProfile())) {
        setViewMode('admin');
      } else if (!readSkipAutoLogin()) {
        // LINE account already linked to a member -> sign in without typing member / citizen ID.
        const idToken = LiffService.getIdToken();
        if (idToken) {
          try {
            const member = await StorageService.loginMemberByLine(idToken);
            setViewMode('member');
            showNotification(`ยินดีต้อนรับคุณ ${member.fullName} (รหัสสมาชิก ${member.memberId})`);
          } catch {
            // not linked yet (or LINE token rejected): fall back to the normal login form
          }
        }
      }
      syncFromCache();
      setBooting(false);
    })();
  }, []);

  const handleLoginSuccess = (member: Member) => {
    syncFromCache();
    setViewMode('member');
    setActiveTab('dashboard');
    showNotification(
      member.newlyLinked
        ? `ผูกบัญชี LINE สำเร็จ ครั้งต่อไปเข้าสู่ระบบอัตโนมัติ — ยินดีต้อนรับคุณ ${member.fullName}`
        : `ยินดีต้อนรับคุณ ${member.fullName} (รหัสสมาชิก ${member.memberId})`
    );
  };

  const handleLogout = async () => {
    // Explicit sign-out: do not silently sign the same LINE account back in on the next load.
    try {
      sessionStorage.setItem(SKIP_AUTO_LOGIN_KEY, '1');
    } catch {
      // storage unavailable
    }
    await StorageService.logoutMember();
    syncFromCache();
    setActiveTab('dashboard');
    showNotification('ออกจากระบบเรียบร้อยแล้ว');
  };

  const handleAdminLoginSuccess = (admin: AdminUser, mustChange: boolean) => {
    setMustChangePassword(mustChange);
    setViewMode('admin');
    syncFromCache();
    showNotification(`ยินดีต้อนรับเจ้าหน้าที่ ${admin.fullName} (${admin.role === 'superadmin' ? 'Super Admin' : 'Teller'})`);
  };

  const handleAdminLogout = async () => {
    await StorageService.logoutAdmin();
    syncFromCache();
    setViewMode('member');
    showNotification('ออกจากระบบเจ้าหน้าที่แล้ว');
  };

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSelectAccountAction = (account: BankAccount, action: 'deposit' | 'withdraw') => {
    setSelectedAccountForAction(account);
    setActiveTab(action);
  };

  const handleTransactionSuccess = (txn: TransactionRecord) => {
    syncFromCache();
    const label = txn.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน';

    if (txn.status === 'pending') {
      showNotification(`ส่งคำขอ${label}แล้ว รอเจ้าหน้าที่ตรวจสอบ/อนุมัติ (รหัสอ้างอิง ${txn.refCode})`, 'info');
      setActiveTab('history');
      return;
    }

    // The real LINE push is sent by the server according to the member's settings;
    // the modal here is just the on-screen receipt.
    setFlexModalTxn(txn);
    showNotification(
      `${label}สำเร็จ! (ยอดคงเหลือ ฿${txn.balanceAfter.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`
    );
  };

  const handleTestNotificationPush = () => {
    const sampleTxn: TransactionRecord = {
      id: `test-${Date.now()}`,
      refCode: `TEST-${Date.now().toString().slice(-6)}`,
      type: 'deposit',
      accountNo: accounts[0]?.accountNo || '11-00128-0',
      accountName: currentMember?.fullName || 'ทดสอบสมาชิก',
      accountType: 'ออมทรัพย์',
      memberId: currentMember?.memberId || '00128',
      citizenId: currentMember?.citizenId || '1100200345670',
      amount: 1000,
      balanceBefore: accounts[0]?.balance || 50000,
      balanceAfter: (accounts[0]?.balance || 50000) + 1000,
      dateTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'completed',
      note: 'ทดสอบส่งการแจ้งเตือนผ่าน LINE Messaging API Push',
      createdAt: new Date().toISOString(),
    };
    setFlexModalTxn(sampleTxn);
    showNotification('ส่งตัวอย่างข้อความแจ้งเตือนเข้า LINE สำเร็จ 🔔');
  };

  const apiConnected = ApiService.isConfigured();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Prompt',sans-serif] text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-[70] animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header and Nav */}
      <Header
        currentMember={currentMember}
        currentAdmin={currentAdmin}
        accounts={accounts}
        activeTab={activeTab}
        viewMode={viewMode}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        onOpenLiffConfig={() => setShowLiffModal(true)}
        onOpenGasModal={() => setShowGasModal(true)}
        onToggleViewMode={(mode) => setViewMode(mode)}
        liffConnected={liffStatus.isInClient || !!liffStatus.liffId}
        gasConnected={apiConnected}
        logoUrl={brand.logoUrl}
        coopName={brand.coopName}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 md:pb-6">
        {viewMode === 'admin' ? (
          // Admin View: Admin Dashboard or Admin Login
          currentAdmin ? (
            <div className="animate-in fade-in duration-150">
              <AdminDashboard
                currentAdmin={currentAdmin}
                accounts={accounts}
                transactions={transactions}
                members={members}
                onRefreshData={refreshData}
                onLogoutAdmin={handleAdminLogout}
                onSwitchToMemberView={() => setViewMode('member')}
                onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                onOpenGasModal={() => setShowGasModal(true)}
              />
            </div>
          ) : (
            <div className="animate-in fade-in duration-150">
              <AdminLogin
                onLoginSuccess={handleAdminLoginSuccess}
                onBackToMemberLogin={() => setViewMode('member')}
              />
            </div>
          )
        ) : (
          // Member View: Member Login or Member Dashboard / Features
          !currentMember && booting ? (
            <div className="flex items-center justify-center py-24">
              <span className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></span>
            </div>
          ) : !currentMember ? (
            // Login / Identity Verification View
            <div className="space-y-6">
              <LoginForm
                onLoginSuccess={handleLoginSuccess}
                liffProfile={liffStatus.profile}
                liffStatus={liffStatus}
                logoUrl={brand.logoUrl}
                coopName={brand.coopName}
                onOpenLiffConfig={() => setShowLiffModal(true)}
              />

              {/* Quick switch to Admin portal */}
              <div className="max-w-md mx-auto text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('admin')}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>เจ้าหน้าที่สหกรณ์? เข้าสู่ระบบ Admin Dashboard ที่นี่ →</span>
                </button>
              </div>

            </div>
          ) : (
            // Logged-in Portal Views
            <div>
              {activeTab === 'dashboard' && (
                <div className="animate-in fade-in duration-150">
                  <Dashboard
                    currentMember={currentMember}
                    liffProfile={liffStatus.profile}
                    accounts={accounts}
                    transactions={transactions}
                    onNavigateTab={setActiveTab}
                    onQuickAction={handleSelectAccountAction}
                  />
                </div>
              )}

              {activeTab === 'accounts' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <AccountsTable
                    accounts={accounts}
                    currentMember={currentMember}
                    onSelectAction={handleSelectAccountAction}
                  />
                </div>
              )}

              {activeTab === 'deposit' && (
                <div className="animate-in fade-in duration-150">
                  <DepositForm
                    currentMember={currentMember}
                    accounts={accounts}
                    initialAccount={selectedAccountForAction}
                    onSuccess={handleTransactionSuccess}
                    onCancel={() => setActiveTab('dashboard')}
                  />
                </div>
              )}

              {activeTab === 'withdraw' && (
                <div className="animate-in fade-in duration-150">
                  <WithdrawForm
                    currentMember={currentMember}
                    accounts={accounts}
                    initialAccount={selectedAccountForAction}
                    onSuccess={handleTransactionSuccess}
                    onCancel={() => setActiveTab('dashboard')}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="animate-in fade-in duration-150">
                  <TransactionHistory
                    transactions={transactions}
                    onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                  />
                </div>
              )}

              {activeTab === 'loans' && (
                <div className="animate-in fade-in duration-150">
                  <LoansView
                    currentMember={currentMember}
                    accounts={accounts}
                    transactions={transactions}
                    onRefreshData={refreshData}
                    onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                  />
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="animate-in fade-in duration-150">
                  <NotificationSettings
                    currentMember={currentMember}
                    liffProfile={liffStatus.profile}
                    onUpdateMember={() => {
                      refreshData();
                    }}
                    onTestPush={handleTestNotificationPush}
                  />
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Modals */}
      {flexModalTxn && (
        <FlexMessageModal
          transaction={flexModalTxn}
          onClose={() => setFlexModalTxn(null)}
        />
      )}

      {mustChangePassword && currentAdmin && (
        <ChangePasswordModal
          onDone={() => {
            setMustChangePassword(false);
            showNotification('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
          }}
        />
      )}

      {showGasModal && (
        <GasIntegrationModal onClose={() => setShowGasModal(false)} />
      )}

      {showLiffModal && (
        <LiffConfigModal
          status={liffStatus}
          onClose={() => setShowLiffModal(false)}
          onRefresh={() => {
            LiffService.init().then((st) => setLiffStatus(st));
          }}
        />
      )}
    </div>
  );
}
