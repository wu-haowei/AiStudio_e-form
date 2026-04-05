import React, { useState, useEffect } from 'react';
import { UserProfile, Form, Role, FormResponse, Department } from './types';
import { localDb } from './lib/localDb';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Shield,
  Menu,
  X,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import { LoginView } from './components/auth/LoginView';
import { ProfileSetupView } from './components/auth/ProfileSetupView';
import { SystemGuideView } from './components/guide/SystemGuideView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/admin/SettingsView';
import { SubmitFormView } from './components/forms/SubmitFormView';
import { ManageFormsView } from './components/forms/ManageFormsView';
import { SidebarItem } from './components/layout/SidebarItem';
import { FormDetailModal } from './components/forms/FormDetailModal';
import { ResponseHistoryModal } from './components/forms/ResponseHistoryModal';
import { ResponseDetailsModal } from './components/forms/ResponseDetailsModal';
import { VoidConfirmationModal, VoidResponseConfirmationModal } from './components/forms/VoidConfirmationModal';

// Constants & Utils

// Mock User Type
interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

export default function App() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Form[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'submit' | 'manage' | 'settings' | 'guide'>('dashboard');
  const [manageViewMode, setManageViewMode] = useState<'forms' | 'responses'>('forms');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal States
  const [viewingResponses, setViewingResponses] = useState<Form | null>(null);
  const [viewingResponsesHistory, setViewingResponsesHistory] = useState<Form | null>(null);
  const [viewingResponseDetails, setViewingResponseDetails] = useState<{ form: Form, response: FormResponse } | null>(null);
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null);
  const [confirmVoidResponse, setConfirmVoidResponse] = useState<{ formId: string, responseId: string } | null>(null);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleVoid = async (id: string) => {
    if (!profile) return;
    try {
      await localDb.voidForm(id, { uid: profile.uid, displayName: profile.displayName });
      showToast('表單已作廢');
      setConfirmVoidId(null);
      setViewingResponses(null);
    } catch (e: any) {
      showToast(e.message || '作廢失敗', 'error');
    }
  };

  const handleVoidResponse = async (formId: string, responseId: string) => {
    if (!profile) return;
    try {
      await localDb.voidResponse(formId, responseId, { uid: profile.uid, displayName: profile.displayName });
      showToast('回傳檔案已作廢');
      setConfirmVoidResponse(null);
      if (viewingResponses && viewingResponses.id === formId) {
        const updatedResponses = viewingResponses.responses?.map(r => 
          r.id === responseId ? { ...r, isVoided: true, voidedAt: new Date().toISOString() } : r
        );
        setViewingResponses({ ...viewingResponses, responses: updatedResponses });
      }
    } catch (e: any) {
      showToast(e.message || '作廢失敗', 'error');
    }
  };

  // Responsive Listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth Listener (Local)
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = await localDb.getMockUser();
      if (savedUser) {
        setUser(savedUser);
        fetchProfile(savedUser.uid);
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const fetchProfile = async (uid: string) => {
    const userProfile = await localDb.getUser(uid);
    if (userProfile) {
      setProfile(userProfile);
      setShowProfileSetup(false);
    } else {
      setShowProfileSetup(true);
    }
    setLoading(false);
  };

  // Forms Listener (Local)
  useEffect(() => {
    if (!user || !profile) return;

    const updateForms = async () => {
      const allForms = await localDb.getForms();
      const allUsers = await localDb.getUsers();
      const allDepts = await localDb.getDepartments(true);
      setUsers(allUsers);
      setDepartments(allDepts);

      const sortedForms = allForms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      let visibleForms = sortedForms;
      if (profile.role === 'user') {
        visibleForms = sortedForms.filter(f => 
          f.isPublic || 
          f.departmentId === profile.departmentId || 
          f.authorUid === user.uid ||
          (f.targetDepartmentIds && f.targetDepartmentIds.includes(profile.departmentId))
        );
      }

      setForms(visibleForms);
    };

    updateForms();
    window.addEventListener('local-db-update', updateForms);
    return () => window.removeEventListener('local-db-update', updateForms);
  }, [user, profile]);

  useEffect(() => {
    if (viewingResponses) {
      const updated = forms.find(f => f.id === viewingResponses.id);
      if (updated) setViewingResponses(updated);
    }
  }, [forms, viewingResponses?.id]);

  useEffect(() => {
    if (viewingResponsesHistory) {
      const updated = forms.find(f => f.id === viewingResponsesHistory.id);
      if (updated) setViewingResponsesHistory(updated);
    }
  }, [forms, viewingResponsesHistory?.id]);

  const handleLogin = async (username: string) => {
    const mockUid = `mock_${username.toLowerCase()}`;
    const u: MockUser = {
      uid: mockUid,
      email: `${username}@demo.com`,
      displayName: username,
    };
    
    setLoading(true);
    await localDb.setMockUser(u);
    setUser(u);
    fetchProfile(mockUid);
  };

  const handleLogout = async () => {
    await localDb.clearMockUser();
    setUser(null);
    setProfile(null);
    setActiveTab('dashboard');
  };

  const handleSetupProfile = async (role: Role, departmentId: string) => {
    if (!user) return;
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Anonymous',
      role,
      departmentId,
      createdAt: new Date().toISOString(),
    };
    await localDb.saveUser(newProfile);
    setProfile(newProfile);
    setShowProfileSetup(false);
  };

  if (loading || (user && !profile && !showProfileSetup)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F4]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#141414]"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (showProfileSetup) {
    return <ProfileSetupView onSetup={handleSetupProfile} />;
  }

  return (
    <div className="h-screen bg-[#F5F5F4] flex flex-col md:flex-row relative overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <header className="bg-white border-b border-[#E5E5E5] p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-40 h-16 shadow-sm">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5" />
            電子表單系統
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>
      )}

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-64
        bg-white border-r border-[#E5E5E5] flex flex-col transition-all duration-300 ease-in-out
        ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Shield className="w-6 h-6 shrink-0" />
            電子表單系統
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <SidebarItem 
            icon={<BookOpen size={20} />} 
            label="系統介紹" 
            active={activeTab === 'guide'} 
            onClick={() => {
              setActiveTab('guide');
              if (isMobile) setIsSidebarOpen(false);
            }} 
          />
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="儀表板" 
            active={activeTab === 'dashboard'} 
            onClick={() => {
              setActiveTab('dashboard');
              if (isMobile) setIsSidebarOpen(false);
            }} 
          />
          <SidebarItem 
            icon={<Plus size={20} />} 
            label="提交表單" 
            active={activeTab === 'submit'} 
            onClick={() => {
              setActiveTab('submit');
              if (isMobile) setIsSidebarOpen(false);
            }} 
          />
          <SidebarItem 
            icon={<FileText size={20} />} 
            label="表單管理" 
            active={activeTab === 'manage'} 
            onClick={() => {
              setActiveTab('manage');
              if (isMobile) setIsSidebarOpen(false);
            }} 
          />
          {profile?.role === 'super_admin' && (
            <SidebarItem 
              icon={<Users size={20} />} 
              label="系統設定" 
              active={activeTab === 'settings'} 
              onClick={() => {
                setActiveTab('settings');
                if (isMobile) setIsSidebarOpen(false);
              }} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-[#E5E5E5]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#141414] flex items-center justify-center text-white font-bold">
              {profile?.displayName?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold truncate">{profile?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{departments.find(d => d.id === profile?.departmentId)?.name}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>登出</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${isMobile ? 'pt-20' : ''}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SystemGuideView />
            </motion.div>
          )}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DashboardView 
                forms={forms} 
                profile={profile!} 
                departments={departments}
                showToast={showToast} 
                setViewingResponses={setViewingResponses}
                setActiveTab={setActiveTab}
                setManageViewMode={setManageViewMode}
              />
            </motion.div>
          )}
          {activeTab === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SubmitFormView 
                profile={profile!} 
                departments={departments}
                onComplete={() => setActiveTab('dashboard')} 
                showToast={showToast} 
              />
            </motion.div>
          )}
          {activeTab === 'manage' && (
            <motion.div
              key="manage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ManageFormsView 
                forms={forms} 
                profile={profile!} 
                departments={departments}
                showToast={showToast} 
                setViewingResponses={setViewingResponses}
                setViewingResponsesHistory={setViewingResponsesHistory}
                setViewingResponseDetails={setViewingResponseDetails}
                viewMode={manageViewMode}
                setViewMode={setManageViewMode}
              />
            </motion.div>
          )}
          {activeTab === 'settings' && profile?.role === 'super_admin' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingsView users={users} departments={departments} showToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-white border-green-100 text-green-600' : 'bg-white border-red-100 text-red-600'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Modals */}
      <AnimatePresence>
        {viewingResponses && (
          <FormDetailModal 
            form={viewingResponses}
            profile={profile!}
            departments={departments}
            onClose={() => setViewingResponses(null)}
            onVoid={setConfirmVoidId}
            onVoidResponse={(formId, responseId) => setConfirmVoidResponse({ formId, responseId })}
            onViewResponseDetails={(form, response) => setViewingResponseDetails({ form, response })}
            showToast={showToast}
          />
        )}

        {confirmVoidId && (
          <VoidConfirmationModal 
            onCancel={() => setConfirmVoidId(null)}
            onConfirm={() => handleVoid(confirmVoidId)}
          />
        )}

        {confirmVoidResponse && (
          <VoidResponseConfirmationModal 
            onCancel={() => setConfirmVoidResponse(null)}
            onConfirm={() => handleVoidResponse(confirmVoidResponse.formId, confirmVoidResponse.responseId)}
          />
        )}

        {viewingResponsesHistory && (
          <ResponseHistoryModal 
            form={viewingResponsesHistory}
            profile={profile!}
            departments={departments}
            onClose={() => setViewingResponsesHistory(null)}
            showToast={showToast}
          />
        )}

        {viewingResponseDetails && (
          <ResponseDetailsModal 
            form={viewingResponseDetails.form}
            response={viewingResponseDetails.response}
            profile={profile!}
            departments={departments}
            onClose={() => setViewingResponseDetails(null)}
            onApprove={async (formId, responseId) => {
              try {
                await localDb.approveResponse(formId, responseId, profile!);
                showToast('回傳資料已核准');
              } catch (e: any) {
                showToast(e.message || '核准失敗', 'error');
              }
            }}
            onReject={async (formId, responseId) => {
              try {
                const reason = prompt('請輸入駁回原因:');
                if (reason === null) return;
                await localDb.rejectResponse(formId, responseId, profile!, reason || '無原因');
                showToast('回傳資料已駁回');
              } catch (e: any) {
                showToast(e.message || '駁回失敗', 'error');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
