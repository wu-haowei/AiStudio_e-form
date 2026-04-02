import React, { useState, useEffect } from 'react';
import { UserProfile, Department, Form, Role, FormField, FieldType, FormFieldRule, WorkflowStep } from './types';
import { localDb } from './localDb';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Shield,
  ShieldAlert,
  Building2,
  Send,
  Paperclip,
  Download,
  Upload,
  Lock,
  Menu,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  HelpCircle,
  Info,
  Edit,
  Trash2,
  Search,
  Filter,
  History,
  ClipboardList,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEPARTMENTS: Department[] = [
  { id: 'mgmt', name: '管理部', parentId: null, level: 1 },
  { id: 'project', name: '專案組', parentId: 'mgmt', level: 2 },
  { id: 'sales', name: '業務部', parentId: 'mgmt', level: 2 },
  { id: 'rd', name: '研發部', parentId: 'mgmt', level: 2 },
  { id: 'group-a', name: 'A組', parentId: 'project', level: 3 },
  { id: 'group-b', name: 'B組', parentId: 'project', level: 3 },
];

const getSubDepartmentIds = (deptId: string): string[] => {
  const subDepts = DEPARTMENTS.filter(d => d.parentId === deptId);
  let ids = [deptId];
  subDepts.forEach(sd => {
    ids = [...ids, ...getSubDepartmentIds(sd.id)];
  });
  return ids;
};

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'submit' | 'manage' | 'users'>('dashboard');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [viewingResponses, setViewingResponses] = useState<Form | null>(null);
  const [viewingResponsesHistory, setViewingResponsesHistory] = useState<Form | null>(null);
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null);
  const [confirmVoidResponse, setConfirmVoidResponse] = useState<{ formId: string, responseId: string } | null>(null);

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

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      setUsers(allUsers);

      const sortedForms = allForms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Visibility Logic:
      // 1. super_admin sees everything
      // 2. admin sees everything
      // 3. user sees: public OR same department OR targeted department OR own forms
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
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col md:flex-row relative overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <header className="bg-white border-b border-[#E5E5E5] p-4 flex items-center justify-between sticky top-0 z-40">
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
        fixed md:relative inset-y-0 left-0 z-50
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-white border-r border-[#E5E5E5] flex flex-col transition-all duration-300 ease-in-out
        ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <div className={`p-6 border-b border-[#E5E5E5] flex items-center justify-between ${!isSidebarOpen && 'justify-center'}`}>
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <Shield className="w-6 h-6 shrink-0" />
              電子表單系統
            </h1>
          ) : (
            <Shield className="w-6 h-6" />
          )}
          
          {!isMobile && (
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute -right-3 top-20 bg-white border border-[#E5E5E5] rounded-full p-1 hover:bg-gray-50 shadow-sm z-50"
            >
              {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="儀表板" 
            active={activeTab === 'dashboard'} 
            collapsed={!isSidebarOpen}
            onClick={() => {
              setActiveTab('dashboard');
              if (isMobile) setIsSidebarOpen(false);
            }} 
          />
          <SidebarItem 
            icon={<Plus size={20} />} 
            label="提交表單" 
            active={activeTab === 'submit'} 
            collapsed={!isSidebarOpen}
            onClick={() => {
              setActiveTab('submit');
              if (isMobile) setIsSidebarOpen(false);
            }} 
          />
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <SidebarItem 
              icon={<FileText size={20} />} 
              label="表單管理" 
              active={activeTab === 'manage'} 
              collapsed={!isSidebarOpen}
              onClick={() => {
                setActiveTab('manage');
                if (isMobile) setIsSidebarOpen(false);
              }} 
            />
          )}
          {profile?.role === 'super_admin' && (
            <SidebarItem 
              icon={<Users size={20} />} 
              label="帳號管理" 
              active={activeTab === 'users'} 
              collapsed={!isSidebarOpen}
              onClick={() => {
                setActiveTab('users');
                if (isMobile) setIsSidebarOpen(false);
              }} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-[#E5E5E5]">
          <div className={`flex items-center gap-3 mb-4 px-2 ${!isSidebarOpen && 'justify-center px-0'}`}>
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#141414] flex items-center justify-center text-white font-bold">
              {profile?.displayName?.[0] || '?'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold truncate">{profile?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{DEPARTMENTS.find(d => d.id === profile?.departmentId)?.name}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={18} />
            {isSidebarOpen && <span>登出</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
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
                showToast={showToast} 
                setViewingResponses={setViewingResponses}
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
              <SubmitFormView profile={profile!} onComplete={() => setActiveTab('dashboard')} showToast={showToast} />
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
                showToast={showToast} 
                setViewingResponses={setViewingResponses}
                setViewingResponsesHistory={setViewingResponsesHistory}
              />
            </motion.div>
          )}
          {activeTab === 'users' && profile?.role === 'super_admin' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <UserManagementView users={users} showToast={showToast} />
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={viewingResponses.status} />
                    <h3 className="text-xl font-bold truncate">{viewingResponses.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    由 {viewingResponses.authorName} ({DEPARTMENTS.find(d => d.id === viewingResponses.departmentId)?.name}) 於 {new Date(viewingResponses.createdAt).toLocaleDateString()} 提交
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {viewingResponses.authorUid === profile?.uid && !viewingResponses.isVoided && (
                    <button
                      onClick={() => setConfirmVoidId(viewingResponses.id!)}
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-colors flex items-center gap-1"
                    >
                      <XCircle size={14} /> 作廢表單
                    </button>
                  )}
                  <button 
                    onClick={() => setViewingResponses(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Content Section */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" /> 表單內文
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap border border-gray-100">
                    {viewingResponses.content}
                  </div>
                  {viewingResponses.attachmentUrl && (
                    <div className="mt-4">
                      <a 
                        href={viewingResponses.attachmentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Download size={14} /> 下載原始附件: {viewingResponses.attachmentName}
                      </a>
                    </div>
                  )}
                </section>

                {/* Upload Section */}
                {!viewingResponses.isVoided && viewingResponses.status === 'approved' && (
                  <section className="pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Upload size={16} className="text-green-500" /> 回傳附件
                    </h4>
                    <div className="bg-green-50/30 rounded-2xl p-5 border border-green-100/50">
                      <ResponseUpload 
                        form={viewingResponses} 
                        profile={profile!} 
                        showHistory={false} 
                        showToast={showToast} 
                        onlyShowOwn={true} 
                      />
                    </div>
                  </section>
                )}

                {/* History Section */}
                <section className="pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <History size={16} className="text-purple-500" /> 回傳紀錄
                  </h4>
                  <div className="space-y-3">
                    {viewingResponses.responses?.filter(r => r.responderUid === profile?.uid).length === 0 ? (
                      <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs">
                        尚無您的回傳紀錄
                      </div>
                    ) : (
                      viewingResponses.responses?.filter(r => r.responderUid === profile?.uid).map(resp => (
                        <div key={resp.id} className={`flex items-center justify-between p-4 rounded-2xl border ${resp.isVoided ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-blue-200 transition-colors'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <a 
                                href={resp.responseUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`text-sm font-bold flex items-center gap-1 truncate ${resp.isVoided ? 'text-gray-400' : 'text-blue-600 hover:underline'}`}
                              >
                                <Paperclip size={14} /> {resp.responseName}
                              </a>
                              {resp.isVoided && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">已作廢</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1"><History size={10} /> {new Date(resp.respondedAt).toLocaleString()}</span>
                              {resp.isVoided && resp.voidedAt && (
                                <span className="text-orange-500 font-medium">作廢於: {new Date(resp.voidedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          {!resp.isVoided && (
                            <button
                              onClick={() => setConfirmVoidResponse({ formId: viewingResponses.id!, responseId: resp.id })}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="作廢此筆回傳"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewingResponses(null)}
                  className="px-8 py-2.5 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmVoidId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">確定要作廢嗎？</h3>
              <p className="text-gray-500 text-sm mb-8">作廢後此表單將從儀表板中隱藏，但仍可在管理介面中追溯。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmVoidId(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => handleVoid(confirmVoidId)}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all"
                >
                  確認作廢
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmVoidResponse && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">確定要作廢此筆回傳嗎？</h3>
              <p className="text-gray-500 text-sm mb-8">作廢後該檔案將無法被下載，且會標記為已作廢。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmVoidResponse(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => handleVoidResponse(confirmVoidResponse.formId, confirmVoidResponse.responseId)}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all"
                >
                  確認作廢
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingResponsesHistory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList size={20} className="text-green-600" /> {viewingResponsesHistory.title} - 回傳紀錄
                </h3>
                <button onClick={() => setViewingResponsesHistory(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <th className="p-4 whitespace-nowrap">檔案</th>
                        <th className="p-4 whitespace-nowrap">回傳內容</th>
                        <th className="p-4 whitespace-nowrap">回傳者</th>
                        <th className="p-4 whitespace-nowrap">單位</th>
                        <th className="p-4 whitespace-nowrap">時間</th>
                        <th className="p-4 whitespace-nowrap">狀態</th>
                        <th className="p-4 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {viewingResponsesHistory.responses?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 italic">尚無回傳紀錄</td>
                        </tr>
                      ) : (
                        viewingResponsesHistory.responses?.map(resp => {
                          const canApprove = resp.status === 'pending' && (() => {
                            const currentStep = resp.workflow?.[resp.currentWorkflowStepIndex || 0];
                            if (!currentStep) return false;
                            if (currentStep.approverType === 'super_admin' && profile?.role === 'super_admin') return true;
                            if (currentStep.approverType === 'dept_manager' && profile?.role === 'admin' && profile?.departmentId === resp.responderDepartmentId) return true;
                            if (currentStep.approverType === 'user' && profile?.uid === currentStep.approverId) return true;
                            return false;
                          })();

                          return (
                            <tr key={resp.id} className={resp.isVoided ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50/50 transition-colors'}>
                              <td className="p-4">
                                <a 
                                  href={resp.responseUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`w-8 h-8 rounded-lg inline-flex items-center justify-center ${resp.isVoided ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                >
                                  <Download size={16} />
                                </a>
                              </td>
                              <td className="p-4 font-medium">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {resp.responseName || '無附件'}
                                    {resp.isVoided && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">已作廢</span>}
                                  </div>
                                  {resp.answers && Object.keys(resp.answers).length > 0 && (
                                    <div className="bg-gray-50 p-2 rounded-lg space-y-1">
                                      {viewingResponsesHistory.fields?.map(field => {
                                        const answer = resp.answers?.[field.id];
                                        if (!answer) return null;
                                        return (
                                          <div key={field.id} className="text-[10px]">
                                            <span className="font-bold text-gray-500">{field.label}: </span>
                                            <span className="text-gray-700 whitespace-pre-wrap">
                                              {Array.isArray(answer) ? answer.join(', ') : answer}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">{resp.responderName}</td>
                              <td className="p-4 text-gray-500">{DEPARTMENTS.find(d => d.id === resp.responderDepartmentId)?.name || resp.responderDepartmentId}</td>
                              <td className="p-4 text-gray-400 text-xs">{new Date(resp.respondedAt).toLocaleString()}</td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold text-center ${
                                    resp.status === 'approved' ? 'bg-green-100 text-green-600' :
                                    resp.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                    'bg-blue-100 text-blue-600'
                                  }`}>
                                    {resp.status === 'approved' ? '已核准' :
                                     resp.status === 'rejected' ? '已駁回' :
                                     '審核中'}
                                  </span>
                                  {resp.status === 'pending' && resp.workflow && resp.workflow.length > 0 && (
                                    <span className="text-[9px] text-gray-400 text-center">
                                      步驟 { (resp.currentWorkflowStepIndex || 0) + 1 }: {resp.workflow[resp.currentWorkflowStepIndex || 0].label}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {canApprove && (
                                    <>
                                      <button
                                        onClick={() => localDb.approveResponse(viewingResponsesHistory.id!, resp.id, profile!)}
                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                        title="核准"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const reason = prompt('請輸入駁回原因:');
                                          if (reason) localDb.rejectResponse(viewingResponsesHistory.id!, resp.id, profile!, reason);
                                        }}
                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        title="駁回"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  )}
                                  {!resp.isVoided && (profile?.role === 'super_admin' || profile?.uid === resp.responderUid) && (
                                    <button 
                                      onClick={() => localDb.voidResponse(viewingResponsesHistory.id!, resp.id, profile!)}
                                      className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                                      title="作廢"
                                    >
                                      <Trash2 size={14} />
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
              <div className="p-6 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setViewingResponsesHistory(null)} 
                  className="px-8 py-2.5 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserManagementView({ users, showToast }: { users: UserProfile[], showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    const user = users.find(u => u.uid === uid);
    if (user) {
      try {
        await localDb.saveUser({ ...user, ...updates });
        showToast('使用者資料已更新');
        setEditingUser(null);
      } catch (e: any) {
        showToast(e.message || '更新失敗', 'error');
      }
    }
  };

  const handleExportUsers = () => {
    try {
      const dataStr = JSON.stringify(users, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `users_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast('帳號資料匯出成功');
    } catch (error) {
      showToast('匯出失敗', 'error');
    }
  };

  const handleImportUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importedUsers = JSON.parse(content);

        if (!Array.isArray(importedUsers)) {
          throw new Error('無效的檔案格式 (應為陣列)');
        }

        let successCount = 0;
        for (const u of importedUsers) {
          if (u.uid && u.email && u.role) {
            await localDb.saveUser(u);
            successCount++;
          }
        }

        showToast(`成功匯入 ${successCount} 筆帳號資料`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error: any) {
        showToast(`匯入失敗: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">帳號管理</h2>
          <p className="text-gray-500 text-sm">管理系統內所有使用者的權限與單位</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportUsers}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Upload size={16} className="text-blue-600" /> 匯入帳號
          </button>
          <button
            onClick={handleExportUsers}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={16} className="text-green-600" /> 匯出帳號
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E5E5E5]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">使用者</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">單位</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">權限</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">註冊時間</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {u.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{u.displayName}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">
                      {DEPARTMENTS.find(d => d.id === u.departmentId)?.name || '未知單位'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role === 'super_admin' ? '超級管理員' : u.role === 'admin' ? '單位管理者' : '一般使用者'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">編輯使用者權限</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">單位</label>
                  <select 
                    value={editingUser.departmentId}
                    onChange={(e) => setEditingUser({ ...editingUser, departmentId: e.target.value })}
                    className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">權限角色</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(['user', 'admin', 'super_admin'] as Role[]).map(role => (
                      <button
                        key={role}
                        onClick={() => setEditingUser({ ...editingUser, role })}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          editingUser.role === role ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-sm">
                            {role === 'super_admin' ? '超級管理員' : role === 'admin' ? '單位管理者' : '一般使用者'}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {role === 'super_admin' ? '最高權限，可管理所有表單與帳號' : 
                             role === 'admin' ? '可審核所屬單位及其下屬單位表單' : 
                             '僅能提交表單與查看回傳記錄'}
                          </div>
                        </div>
                        {editingUser.role === role && <CheckCircle size={20} className="text-black" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleUpdateUser(editingUser.uid, { role: editingUser.role, departmentId: editingUser.departmentId })}
                    className="flex-1 py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
                  >
                    儲存變更
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, collapsed, onClick }: { icon: any, label: string, active: boolean, collapsed?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-[#141414] text-white shadow-lg' 
          : 'text-gray-600 hover:bg-gray-100'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="font-medium overflow-hidden whitespace-nowrap">{label}</span>}
    </button>
  );
}

function LoginView({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username) {
      onLogin(username);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <div className="w-20 h-20 bg-[#141414] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">電子表單系統</h1>
        <p className="text-gray-500 text-center mb-8">模擬登入模式 (輸入任何帳號密碼即可登入)</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-3"
          >
            登入系統
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase tracking-wider">
              <Shield size={14} /> 系統管理員專區
            </h4>
            <p className="text-[10px] text-red-400 mb-3">
              若儲存空間已滿或需要重新開始，請使用此功能。這將清除所有帳號、表單與附件。
            </p>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Trash2 size={16} /> 重設系統資料 (清除所有儲存空間)
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await localDb.clearAllData();
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full py-3 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Trash2 size={16} /> 確定重設 (此動作無法復原)
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-2 text-[10px] text-gray-400 hover:text-gray-600 transition-all"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSetupView({ onSetup }: { onSetup: (role: Role, dept: string) => void }) {
  const [role, setRole] = useState<Role>('user');
  const [dept, setDept] = useState('mgmt');

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-6 sm:p-10">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">完成您的個人資料</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇您的權限角色</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['user', 'admin', 'super_admin'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-3 sm:p-4 rounded-2xl border-2 transition-all text-center ${
                    role === r ? 'border-[#141414] bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-bold capitalize text-sm sm:text-base">{r.replace('_', ' ')}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇您的所屬單位</label>
            <select 
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
            >
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>
                  {'  '.repeat(d.level - 1)} {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onSetup(role, dept)}
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-black transition-colors"
          >
            開始使用
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ forms, profile, showToast, setViewingResponses }: { forms: Form[], profile: UserProfile, showToast: (msg: string, type?: 'success' | 'error') => void, setViewingResponses: (f: Form | null) => void }) {
  const subDeptIds = getSubDepartmentIds(profile.departmentId);

  // Filter for Dashboard: 
  // 1. "為審核者不能出現在儀表板上"
  // 2. "刪除時在儀表板看不到"
  // 3. "作廢時在儀表板僅本人可見"
  const dashboardForms = forms.filter(f => {
    if (f.isDeleted) return false;
    if (f.isVoided && f.authorUid !== profile.uid) return false;

    // If I am the author, always show (unless deleted)
    if (f.authorUid === profile.uid) return true;
    
    // If I am a reviewer (admin/super_admin) and it's pending in my scope, DON'T show on dashboard (it's in Manage)
    if (f.status === 'pending') {
      if (profile.role === 'super_admin') return false;
      if (profile.role === 'admin' && subDeptIds.includes(f.departmentId)) return false;
    }

    // Otherwise show if it's my department, public, or targeted to me
    return f.departmentId === profile.departmentId || 
           f.isPublic || 
           (f.targetDepartmentIds && f.targetDepartmentIds.includes(profile.departmentId));
  });

  // Filter for the "Recent Forms" list specifically
  const recentApprovedForms = dashboardForms.filter(f => {
    // Only show approved forms in the list (per user request)
    if (f.status !== 'approved') return false;

    // Time-based filtering
    const now = new Date();
    if (f.publishStartTime && new Date(f.publishStartTime) > now) return false;
    if (f.publishEndTime && new Date(f.publishEndTime) < now) return false;

    return true;
  });

  const pendingResponseApprovals = forms.flatMap(f => 
    (f.responses || []).filter(r => {
      if (r.status !== 'pending') return false;
      const currentStep = r.workflow?.[r.currentWorkflowStepIndex || 0];
      if (!currentStep) return false;
      if (currentStep.approverType === 'super_admin' && profile.role === 'super_admin') return true;
      if (currentStep.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === r.responderDepartmentId) return true;
      if (currentStep.approverType === 'user' && profile.uid === currentStep.approverId) return true;
      return false;
    }).map(r => ({ form: f, response: r }))
  );

  const stats = {
    total: dashboardForms.length,
    pending: dashboardForms.filter(f => f.status === 'pending').length,
    approved: dashboardForms.filter(f => f.status === 'approved').length,
    rejected: dashboardForms.filter(f => f.status === 'rejected').length,
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">歡迎回來, {profile.displayName}</h2>
        <p className="text-gray-500">這是您的表單概覽與最新動態</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="總表單數" value={stats.total} icon={<FileText className="text-blue-500" />} />
        <StatCard label="待審核" value={stats.pending} icon={<LayoutDashboard className="text-yellow-500" />} />
        <StatCard label="已核准" value={stats.approved} icon={<CheckCircle className="text-green-500" />} />
        <StatCard label="已駁回" value={stats.rejected} icon={<XCircle className="text-red-500" />} />
      </div>

      {pendingResponseApprovals.length > 0 && (
        <div className="bg-orange-50 rounded-3xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="p-6 border-b border-orange-100 flex justify-between items-center bg-orange-100/50">
            <h3 className="font-bold text-lg text-orange-900 flex items-center gap-2">
              <ShieldAlert className="text-orange-600" /> 待處理的回傳審核
            </h3>
            <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingResponseApprovals.length}
            </span>
          </div>
          <div className="divide-y divide-orange-100">
            {pendingResponseApprovals.map(({ form, response }) => (
              <div key={response.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-orange-100/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-orange-900">{form.title} - 回傳資料</h4>
                    <p className="text-xs text-orange-700">
                      回傳者: {response.responderName} • 單位: {DEPARTMENTS.find(d => d.id === response.responderDepartmentId)?.name} • {new Date(response.respondedAt).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-orange-600 mt-1">
                      當前步驟: {response.workflow?.[response.currentWorkflowStepIndex || 0].label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewingResponses(form)}
                    className="px-4 py-2 bg-white text-orange-700 border border-orange-200 rounded-xl text-xs font-bold hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                  >
                    前往審核
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5E5] overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-center">
          <h3 className="font-bold text-lg">最近的表單</h3>
          <Building2 className="text-gray-400" />
        </div>
        <div className="divide-y divide-[#E5E5E5]">
          {recentApprovedForms.length === 0 ? (
            <div className="p-12 text-center text-gray-400">尚無核准表單記錄</div>
          ) : (
            recentApprovedForms.map(form => (
              <div key={form.id} className={`p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-gray-50 transition-colors ${form.isVoided ? 'opacity-60 bg-gray-50/50' : ''}`}>
                <div className="flex items-start sm:items-center gap-4 w-full lg:flex-1 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center ${
                    form.isVoided ? 'bg-gray-200 text-gray-500' :
                    form.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    form.status === 'approved' ? 'bg-green-100 text-green-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <FileText size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold truncate">{form.title}</h4>
                      {form.isPublic && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                          公開
                        </span>
                      )}
                      {!form.isPublic && form.targetDepartmentIds && form.targetDepartmentIds.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                          指定單位
                        </span>
                      )}
                      {form.isVoided && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">
                          已作廢
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      單位: {DEPARTMENTS.find(d => d.id === form.departmentId)?.name} • 由 {form.authorName} 提交 • {new Date(form.createdAt).toLocaleDateString()}
                    </p>
                    {form.attachmentUrl && (
                      <a 
                        href={form.attachmentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 sm:mt-2 inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:underline max-w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Paperclip size={10} className="sm:w-3 sm:h-3" />
                        <span className="truncate">下載附件: {form.attachmentName}</span>
                      </a>
                    )}

                    {/* Approval Progress for Dashboard */}
                    {form.status === 'pending' && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-[8px] sm:text-[10px]">
                        <p className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                          <Shield size={10} /> 審核進度: {
                            form.approvalStep === 'dept_manager' ? '單位主管審核中' :
                            form.approvalStep === 'target_managers' ? '跨部門主管審核中' :
                            form.approvalStep === 'super_admin' ? '總管理者審核中' : '已完成'
                          }
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          <div className="flex items-center gap-1">
                            {form.deptManagerApproved ? <CheckCircle size={8} className="text-green-500" /> : <div className="w-2 h-2 rounded-full border border-gray-300" />}
                            <span className={form.deptManagerApproved ? 'text-green-700' : 'text-gray-500'}>原單位主管</span>
                          </div>
                          {form.targetDepartmentIds && form.targetDepartmentIds.length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {form.targetDepartmentIds.map(tid => {
                                const isApproved = form.approvals?.[tid];
                                return (
                                  <div key={tid} className="flex items-center gap-1">
                                    {isApproved ? <CheckCircle size={8} className="text-green-500" /> : <div className="w-2 h-2 rounded-full border border-gray-300" />}
                                    <span className={isApproved ? 'text-green-700' : 'text-gray-500'}>{DEPARTMENTS.find(d => d.id === tid)?.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {(form.isPublic || form.approvalStep === 'super_admin' || form.superAdminApproved) && (
                            <div className="flex items-center gap-1">
                              {form.superAdminApproved ? <CheckCircle size={8} className="text-green-500" /> : <div className="w-2 h-2 rounded-full border border-gray-300" />}
                              <span className={form.superAdminApproved ? 'text-green-700' : 'text-gray-500'}>總管理者</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button 
                    onClick={() => setViewingResponses(form)}
                    className="px-6 py-2.5 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Eye size={16} /> 檢視與回傳
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: number, icon: any }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E5E5E5] shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 rounded-2xl">{icon}</div>
      </div>
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
  };
  const labels = {
    pending: '審核中',
    approved: '已核准',
    rejected: '已駁回',
    completed: '已完成',
  };
  return (
    <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function FormFieldManager({ fields, setFields }: { fields: FormField[], setFields: React.Dispatch<React.SetStateAction<FormField[]>> }) {
  const addField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'text',
      required: false,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">自定義題目</label>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
        >
          <Plus size={14} /> 新增題目
        </button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">題目 {index + 1}</span>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="請輸入題目名稱 (例如: 您的聯絡電話)"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                />
              </div>
              <div>
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType, options: (e.target.value === 'radio' || e.target.value === 'checkbox' || e.target.value === 'select') ? [''] : undefined })}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                >
                  <option value="text">文字輸入</option>
                  <option value="textarea">多行文字</option>
                  <option value="number">數字輸入</option>
                  <option value="date">日期選擇</option>
                  <option value="radio">單選題</option>
                  <option value="checkbox">複選題</option>
                  <option value="select">下拉選單</option>
                </select>
              </div>
              <div className="flex items-center gap-2 px-3">
                <input
                  type="checkbox"
                  id={`req-${field.id}`}
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  className="w-4 h-4 accent-black"
                />
                <label htmlFor={`req-${field.id}`} className="text-xs font-medium text-gray-600">必填</label>
              </div>
            </div>

            {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">選項設定</label>
                {field.options?.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(field.options || [])];
                        newOpts[optIdx] = e.target.value;
                        updateField(field.id, { options: newOpts });
                      }}
                      placeholder={`選項 ${optIdx + 1}`}
                      className="flex-1 p-2 rounded-lg border border-gray-200 focus:border-black outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = (field.options || []).filter((_, i) => i !== optIdx);
                        updateField(field.id, { options: newOpts });
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateField(field.id, { options: [...(field.options || []), ''] })}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  + 新增選項
                </button>
                {field.type === 'checkbox' && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">最多可選幾項 (留空不限)</label>
                    <input
                      type="number"
                      value={field.maxSelections || ''}
                      onChange={(e) => updateField(field.id, { maxSelections: parseInt(e.target.value) || undefined })}
                      className="w-24 p-2 rounded-lg border border-gray-200 focus:border-black outline-none text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">邏輯設定 (選填)</label>
              <div className="space-y-3">
                {field.rules?.map((rule, ruleIdx) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                    <select
                      value={rule.conditionFieldId}
                      onChange={(e) => {
                        const newRules = [...(field.rules || [])];
                        newRules[ruleIdx].conditionFieldId = e.target.value;
                        updateField(field.id, { rules: newRules });
                      }}
                      className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                    >
                      <option value="">選擇題目</option>
                      {fields.slice(0, index).map(f => (
                        <option key={f.id} value={f.id}>{f.label || `題目 ${fields.indexOf(f) + 1}`}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-400">當值為</span>
                    <input
                      type="text"
                      value={rule.conditionValue}
                      onChange={(e) => {
                        const newRules = [...(field.rules || [])];
                        newRules[ruleIdx].conditionValue = e.target.value;
                        updateField(field.id, { rules: newRules });
                      }}
                      placeholder="條件值"
                      className="w-20 p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                    />
                    <select
                      value={rule.effect}
                      onChange={(e) => {
                        const newRules = [...(field.rules || [])];
                        newRules[ruleIdx].effect = e.target.value as any;
                        updateField(field.id, { rules: newRules });
                      }}
                      className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                    >
                      <option value="show">顯示</option>
                      <option value="hide">隱藏</option>
                      <option value="require">必填</option>
                      <option value="optional">選填</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const newRules = (field.rules || []).filter((_, i) => i !== ruleIdx);
                        updateField(field.id, { rules: newRules });
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newRule: FormFieldRule = { id: Math.random().toString(36).substr(2, 9), conditionFieldId: '', conditionValue: '', effect: 'show' };
                    updateField(field.id, { rules: [...(field.rules || []), newRule] });
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  + 新增邏輯規則
                </button>
              </div>
              <p className="mt-1 text-[9px] text-gray-400">例如: 選項 1 或 3 則不用填，選 2 則為必填</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowManager({ workflow, setWorkflow, fields, title = "自定義審核流程" }: { workflow: WorkflowStep[], setWorkflow: React.Dispatch<React.SetStateAction<WorkflowStep[]>>, fields: FormField[], title?: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    localDb.getUsers().then(setUsers);
  }, []);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: Math.random().toString(36).substr(2, 9),
      label: `步驟 ${workflow.length + 1}`,
      approverType: 'dept_manager',
    };
    setWorkflow([...workflow, newStep]);
  };

  const removeStep = (id: string) => {
    setWorkflow(workflow.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setWorkflow(workflow.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newWorkflow = [...workflow];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newWorkflow.length) return;
    [newWorkflow[index], newWorkflow[targetIndex]] = [newWorkflow[targetIndex], newWorkflow[index]];
    setWorkflow(newWorkflow);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-lg transition-all"
        >
          <Plus size={14} /> 新增審核步驟
        </button>
      </div>

      <div className="space-y-3">
        {workflow.map((step, index) => (
          <div key={step.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{index + 1}</span>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(step.id, { label: e.target.value })}
                  className="font-bold text-sm outline-none bg-transparent border-b border-transparent focus:border-gray-200"
                />
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveStep(index, 'up')} className="p-1 text-gray-400 hover:text-gray-600"><ChevronLeft size={16} className="rotate-90" /></button>
                <button type="button" onClick={() => moveStep(index, 'down')} className="p-1 text-gray-400 hover:text-gray-600"><ChevronRight size={16} className="rotate-90" /></button>
                <button type="button" onClick={() => removeStep(step.id)} className="p-1 text-red-400 hover:text-red-600 ml-2"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">審核人類型</label>
                <select
                  value={step.approverType}
                  onChange={(e) => updateStep(step.id, { approverType: e.target.value as any, approverId: undefined })}
                  className="w-full p-2 rounded-lg border border-gray-200 text-xs outline-none"
                >
                  <option value="dept_manager">單位主管</option>
                  <option value="super_admin">總管理員</option>
                  <option value="user">指定人員</option>
                </select>
              </div>
              {step.approverType === 'user' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">選擇人員</label>
                  <select
                    value={step.approverId || ''}
                    onChange={(e) => updateStep(step.id, { approverId: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 text-xs outline-none"
                  >
                    <option value="">選擇人員...</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">條件審核 (選填)</label>
                <button
                  type="button"
                  onClick={() => updateStep(step.id, { condition: step.condition ? undefined : { fieldId: '', operator: '==', value: '' } })}
                  className="text-[9px] font-bold text-blue-600"
                >
                  {step.condition ? '移除條件' : '設定條件'}
                </button>
              </div>
              {step.condition && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={step.condition.fieldId}
                    onChange={(e) => updateStep(step.id, { condition: { ...step.condition!, fieldId: e.target.value } })}
                    className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                  >
                    <option value="">選擇題目</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.label || `題目 ${fields.indexOf(f) + 1}`}</option>
                    ))}
                  </select>
                  <select
                    value={step.condition.operator}
                    onChange={(e) => updateStep(step.id, { condition: { ...step.condition!, operator: e.target.value as any } })}
                    className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                  >
                    <option value="==">等於</option>
                    <option value=">">大於</option>
                    <option value="<">小於</option>
                    <option value="contains">包含</option>
                  </select>
                  <input
                    type="text"
                    value={step.condition.value}
                    onChange={(e) => updateStep(step.id, { condition: { ...step.condition!, value: e.target.value } })}
                    placeholder="條件值"
                    className="w-20 p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                  />
                  <span className="text-[9px] text-gray-400">時需審核</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {workflow.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-3xl">
            <p className="text-xs text-gray-400">尚無自定義審核流程，將使用預設流程</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitFormView({ profile, onComplete, showToast }: { profile: UserProfile, onComplete: () => void, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>([]);
  const [publishStartTime, setPublishStartTime] = useState('');
  const [publishEndTime, setPublishEndTime] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [initialAnswers, setInitialAnswers] = useState<{ [fieldId: string]: any }>({});
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);
  const [responseWorkflow, setResponseWorkflow] = useState<WorkflowStep[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleDepartment = (deptId: string) => {
    setTargetDepartmentIds(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId) 
        : [...prev, deptId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setSubmitting(true);
    try {
      let attachmentUrl = '';
      let attachmentName = '';

      if (file) {
        const result = await localDb.uploadFile(file);
        attachmentUrl = result.url;
        attachmentName = result.name;
      }

      await localDb.addForm({
        title,
        content,
        authorUid: profile.uid,
        authorName: profile.displayName,
        departmentId: profile.departmentId,
        status: 'pending',
        attachmentUrl,
        attachmentName,
        isPublic,
        targetDepartmentIds: isPublic ? [] : targetDepartmentIds,
        publishStartTime: publishStartTime || undefined,
        publishEndTime: publishEndTime || undefined,
        fields,
        initialAnswers,
        workflow,
        responseWorkflow,
        createdAt: new Date().toISOString(),
      }, profile);
      showToast('表單提交成功');
      onComplete();
    } catch (error: any) {
      console.error("Submission failed", error);
      showToast(error.message || '提交失敗', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">提交新表單</h2>
        <p className="text-gray-500">填寫下方資訊以發起新的表單申請</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-[#E5E5E5] shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <input 
              type="checkbox" 
              id="is-public" 
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 accent-[#141414]"
            />
            <label htmlFor="is-public" className="text-sm font-bold text-blue-900">
              全部公開
            </label>
          </div>

          {!isPublic && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-3">發佈給特定單位 (多選)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDepartment(dept.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      targetDepartmentIds.includes(dept.id)
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
              {targetDepartmentIds.length === 0 && (
                <p className="mt-2 text-[10px] text-gray-400 italic">未選擇單位時，僅限本單位及管理員可見</p>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">表單標題</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如: 採購申請、請假單..."
            className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">詳細內容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="請描述表單的具體內容與事由..."
            className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">附件上傳 (選填)</label>
          <div className="relative">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="flex items-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#141414] cursor-pointer transition-all"
            >
              <Paperclip className="text-gray-400" />
              <span className={file ? 'text-[#141414] font-medium' : 'text-gray-400'}>
                {file ? file.name : '點擊或拖曳檔案至此處上傳'}
              </span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <FormFieldManager fields={fields} setFields={setFields} />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <WorkflowManager workflow={workflow} setWorkflow={setWorkflow} fields={fields} title="表單發佈審核流程" />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <WorkflowManager workflow={responseWorkflow} setWorkflow={setResponseWorkflow} fields={fields} title="回傳資料審核流程" />
        </div>

        {fields.length > 0 && (
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h4 className="text-sm font-bold text-gray-700">填寫表單初始資料 (用於審核條件判斷)</h4>
            <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              {fields.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">{field.label}</label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={initialAnswers[field.id] || ''}
                      onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                      placeholder="請輸入內容..."
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      value={initialAnswers[field.id] || ''}
                      onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm resize-none"
                      rows={3}
                      placeholder="請輸入內容..."
                    />
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={initialAnswers[field.id] || ''}
                      onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                      placeholder="請輸入數字..."
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      value={initialAnswers[field.id] || ''}
                      onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm bg-white"
                    >
                      <option value="">請選擇...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {(field.type === 'radio' || field.type === 'checkbox') && (
                    <div className="flex flex-wrap gap-3">
                      {field.options?.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type={field.type === 'radio' ? 'radio' : 'checkbox'}
                            name={`initial-${field.id}`}
                            value={opt}
                            checked={field.type === 'radio' ? initialAnswers[field.id] === opt : (initialAnswers[field.id] || []).includes(opt)}
                            onChange={(e) => {
                              if (field.type === 'radio') {
                                setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value });
                              } else {
                                const current = initialAnswers[field.id] || [];
                                const next = e.target.checked ? [...current, opt] : current.filter((i: string) => i !== opt);
                                setInitialAnswers({ ...initialAnswers, [field.id]: next });
                              }
                            }}
                            className="w-4 h-4 accent-black"
                          />
                          <span className="text-sm text-gray-600">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">發佈開始時間 (選填)</label>
            <input
              type="datetime-local"
              value={publishStartTime}
              onChange={(e) => setPublishStartTime(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">發佈結束時間 (選填)</label>
            <input
              type="datetime-local"
              value={publishEndTime}
              onChange={(e) => setPublishEndTime(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? '提交中...' : (
              <>
                <Send size={20} />
                發送申請
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ManageFormsView({ forms, profile, showToast, setViewingResponses, setViewingResponsesHistory }: { forms: Form[], profile: UserProfile, showToast: (msg: string, type?: 'success' | 'error') => void, setViewingResponses: (f: Form | null) => void, setViewingResponsesHistory: (f: Form | null) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [viewingLogs, setViewingLogs] = useState<Form | null>(null);
  const [rejectingFormId, setRejectingFormId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const subDeptIds = getSubDepartmentIds(profile.departmentId);

  // Filter and Search Logic
  const filteredForms = forms.filter(f => {
    // Search by title or author
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         f.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    
    // Filter by deleted status (default hidden)
    const matchesDeleted = showDeleted ? true : !f.isDeleted;

    // Reviewable scope
    const isReviewable = profile.role === 'super_admin' || 
                        subDeptIds.includes(f.departmentId) ||
                        (profile.role === 'admin' && f.targetDepartmentIds?.includes(profile.departmentId));

    return matchesSearch && matchesStatus && matchesDeleted && isReviewable;
  });

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') {
        await localDb.approveForm(id, { 
          uid: profile.uid, 
          displayName: profile.displayName, 
          role: profile.role, 
          departmentId: profile.departmentId 
        });
        showToast(`表單已核准`);
      } else {
        setRejectingFormId(id);
        setRejectReason('');
      }
    } catch (e: any) {
      showToast(e.message || '更新失敗', 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingFormId) return;
    try {
      await localDb.rejectForm(rejectingFormId, { 
        uid: profile.uid, 
        displayName: profile.displayName, 
        role: profile.role 
      }, rejectReason || '無原因');
      showToast(`表單已駁回`);
      setRejectingFormId(null);
      setRejectReason('');
    } catch (e: any) {
      showToast(e.message || '駁回失敗', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await localDb.deleteForm(id, { uid: profile.uid, displayName: profile.displayName });
      showToast('表單已刪除');
      setConfirmDeleteId(null);
    } catch (e: any) {
      showToast(e.message || '刪除失敗', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">表單管理</h2>
          <p className="text-gray-500">管理、搜尋與審核所有權限內的表單</p>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E5E5E5] flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜尋標題或提交者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:w-40 p-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all text-sm bg-white"
          >
            <option value="all">所有狀態</option>
            <option value="pending">審核中</option>
            <option value="approved">已核准</option>
            <option value="rejected">已駁回</option>
            <option value="completed">已完成</option>
          </select>
        </div>
        <button 
          onClick={() => setShowDeleted(!showDeleted)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-bold ${
            showDeleted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          {showDeleted ? <Eye size={18} /> : <EyeOff size={18} />}
          {showDeleted ? '顯示已刪除' : '隱藏已刪除'}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5E5] overflow-hidden">
        <div className="divide-y divide-[#E5E5E5]">
          {filteredForms.length === 0 ? (
            <div className="p-12 text-center text-gray-400">查無符合條件的表單</div>
          ) : (
            filteredForms.map(form => (
              <div key={form.id} className={`p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${form.isDeleted ? 'bg-red-50/30 grayscale-[0.5]' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <StatusBadge status={form.status} />
                    {form.isDeleted && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">已刪除</span>
                    )}
                    {form.isVoided && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">已作廢</span>
                    )}
                    {form.isPublic && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">公開</span>
                    )}
                    {!form.isPublic && form.targetDepartmentIds && form.targetDepartmentIds.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full" title={form.targetDepartmentIds.map(id => DEPARTMENTS.find(d => d.id === id)?.name).join(', ')}>
                        指定單位 ({form.targetDepartmentIds.length})
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{new Date(form.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Approval Status */}
                  {form.status === 'pending' && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-[10px]">
                      <p className="font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <Shield size={12} /> 審核進度: {
                          form.approvalStep === ('custom' as any) ? `自定義流程 (${form.workflow?.[form.currentWorkflowStepIndex || 0]?.label})` :
                          form.approvalStep === 'dept_manager' ? '單位主管審核中' :
                          form.approvalStep === 'target_managers' ? '跨部門主管審核中' :
                          form.approvalStep === 'super_admin' ? '總管理者審核中' : '已完成'
                        }
                      </p>
                      {form.approvalStep === ('custom' as any) ? (
                        <div className="flex flex-wrap gap-2">
                          {form.workflow?.map((step, idx) => {
                            const isCurrent = idx === (form.currentWorkflowStepIndex || 0);
                            const isPast = idx < (form.currentWorkflowStepIndex || 0);
                            return (
                              <div key={step.id} className="flex items-center gap-1">
                                {isPast ? <CheckCircle size={10} className="text-green-500" /> : 
                                 isCurrent ? <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /> :
                                 <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                                <span className={isPast ? 'text-green-700' : isCurrent ? 'text-blue-700 font-bold' : 'text-gray-500'}>
                                  {step.label}
                                </span>
                                {idx < form.workflow!.length - 1 && <ChevronRight size={8} className="text-gray-300" />}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1">
                            {form.deptManagerApproved ? <CheckCircle size={10} className="text-green-500" /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                            <span className={form.deptManagerApproved ? 'text-green-700' : 'text-gray-500'}>原單位主管</span>
                          </div>
                          {form.targetDepartmentIds && form.targetDepartmentIds.length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {form.targetDepartmentIds.map(tid => {
                                const isApproved = form.approvals?.[tid];
                                return (
                                  <div key={tid} className="flex items-center gap-1">
                                    {isApproved ? <CheckCircle size={10} className="text-green-500" /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                                    <span className={isApproved ? 'text-green-700' : 'text-gray-500'}>{DEPARTMENTS.find(d => d.id === tid)?.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {(form.isPublic || form.approvalStep === 'super_admin' || form.superAdminApproved) && (
                            <div className="flex items-center gap-1">
                              {form.superAdminApproved ? <CheckCircle size={10} className="text-green-500" /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                              <span className={form.superAdminApproved ? 'text-green-700' : 'text-gray-500'}>總管理者</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <h4 className="text-xl font-bold mb-2 truncate flex items-center gap-2">
                    {form.title}
                    <button onClick={() => setViewingLogs(form)} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="查看紀錄">
                      <History size={16} />
                    </button>
                  </h4>
                  <p className="text-gray-600 mb-4 line-clamp-2">{form.content}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Users size={14} /> {form.authorName}</span>
                    <span className="flex items-center gap-1"><Building2 size={14} /> {DEPARTMENTS.find(d => d.id === form.departmentId)?.name}</span>
                    {form.attachmentUrl && (
                      <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <Paperclip size={14} /> {form.attachmentName}
                      </a>
                    )}
                  </div>

                  {/* Response Section for Reviewers removed as per request */}
                </div>

                  <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                    {form.status === 'pending' && !form.isDeleted && (
                      <>
                        {((form.approvalStep === ('custom' as any) && (() => {
                            const step = form.workflow?.[form.currentWorkflowStepIndex || 0];
                            if (!step) return false;
                            if (step.approverType === 'super_admin' && profile.role === 'super_admin') return true;
                            if (step.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === form.departmentId) return true;
                            if (step.approverType === 'user' && profile.uid === step.approverId) return true;
                            return false;
                          })()) ||
                          (form.approvalStep !== ('custom' as any) && (
                            (profile.role === 'super_admin' && !form.superAdminApproved) || 
                            (profile.role === 'admin' && (
                              (form.approvalStep === 'dept_manager' && form.departmentId === profile.departmentId && !form.deptManagerApproved) ||
                              (form.approvalStep === 'target_managers' && form.targetDepartmentIds?.includes(profile.departmentId) && !form.approvals?.[profile.departmentId])
                            ))
                          ))) && (
                          <button
                            onClick={() => handleUpdateStatus(form.id!, 'approved')}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={16} /> 核准
                          </button>
                        )}
                        {((form.approvalStep === ('custom' as any) && (() => {
                            const step = form.workflow?.[form.currentWorkflowStepIndex || 0];
                            if (!step) return false;
                            if (step.approverType === 'super_admin' && profile.role === 'super_admin') return true;
                            if (step.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === form.departmentId) return true;
                            if (step.approverType === 'user' && profile.uid === step.approverId) return true;
                            return false;
                          })()) ||
                          (form.approvalStep !== ('custom' as any) && (
                            (profile.role === 'super_admin' && !form.superAdminApproved) || 
                            (profile.role === 'admin' && (
                              (form.approvalStep === 'dept_manager' && form.departmentId === profile.departmentId && !form.deptManagerApproved) ||
                              (form.approvalStep === 'target_managers' && form.targetDepartmentIds?.includes(profile.departmentId) && !form.approvals?.[profile.departmentId])
                            ))
                          ))) && (
                          <button
                            onClick={() => handleUpdateStatus(form.id!, 'rejected')}
                            className="flex-1 px-4 py-2 border-2 border-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle size={16} /> 駁回
                          </button>
                        )}
                      </>
                    )}
                  {!form.isDeleted && (
                    <button
                      onClick={() => setViewingResponsesHistory(form)}
                      className="flex-1 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <ClipboardList size={16} /> 回傳紀錄
                    </button>
                  )}
                  {!form.isDeleted && (
                    <button
                      onClick={() => setViewingLogs(form)}
                      className="flex-1 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <History size={16} /> 審核歷程
                    </button>
                  )}
                  {!form.isDeleted && (
                    <button
                      onClick={() => setEditingForm(form)}
                      className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit size={16} /> 編輯
                    </button>
                  )}
                  {!form.isDeleted && (
                    <button
                      onClick={() => setConfirmDeleteId(form.id!)}
                      className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={16} /> 刪除
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingFormId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8"
          >
            <h3 className="text-xl font-bold mb-4">駁回表單</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="請輸入駁回原因..."
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all resize-none mb-6 h-32 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectingFormId(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all text-sm"
              >
                確認駁回
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editingForm && (
        <EditFormModal 
          form={editingForm} 
          profile={profile} 
          onClose={() => setEditingForm(null)} 
          showToast={showToast}
        />
      )}

      {/* Logs Modal */}
      {viewingLogs && (
        <LogsModal 
          form={viewingLogs} 
          onClose={() => setViewingLogs(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">確定要刪除嗎？</h3>
            <p className="text-gray-500 text-sm mb-8">刪除後此表單將從儀表板中隱藏，但仍可在管理介面中追溯。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                確認刪除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function EditFormModal({ form, profile, onClose, showToast }: { form: Form, profile: UserProfile, onClose: () => void, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [title, setTitle] = useState(form.title);
  const [content, setContent] = useState(form.content);
  const [isPublic, setIsPublic] = useState(form.isPublic || false);
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>(form.targetDepartmentIds || []);
  const [publishStartTime, setPublishStartTime] = useState(form.publishStartTime || '');
  const [publishEndTime, setPublishEndTime] = useState(form.publishEndTime || '');
  const [fields, setFields] = useState<FormField[]>(form.fields || []);
  const [initialAnswers, setInitialAnswers] = useState<{ [fieldId: string]: any }>(form.initialAnswers || {});
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(form.workflow || []);
  const [responseWorkflow, setResponseWorkflow] = useState<WorkflowStep[]>(form.responseWorkflow || []);
  const [submitting, setSubmitting] = useState(false);

  const toggleDepartment = (deptId: string) => {
    setTargetDepartmentIds(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId) 
        : [...prev, deptId]
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await localDb.updateForm(form.id!, { 
        title, 
        content, 
        isPublic, 
        targetDepartmentIds: isPublic ? [] : targetDepartmentIds,
        publishStartTime: publishStartTime || undefined,
        publishEndTime: publishEndTime || undefined,
        fields,
        initialAnswers,
        workflow,
        responseWorkflow
      }, profile);
      showToast('表單已更新');
      onClose();
    } catch (error: any) {
      showToast(error.message || '更新失敗', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold">編輯表單</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleUpdate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">標題</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">內容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all resize-none"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <input 
                type="checkbox" 
                id="edit-is-public" 
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-[#141414]"
              />
              <label htmlFor="edit-is-public" className="text-xs font-bold text-blue-900">
                全部公開
              </label>
            </div>

            {!isPublic && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-2">發佈給特定單位 (多選)</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENTS.map(dept => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => toggleDepartment(dept.id)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        targetDepartmentIds.includes(dept.id)
                          ? 'bg-[#141414] text-white border-[#141414]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1">發佈開始時間</label>
                <input
                  type="datetime-local"
                  value={publishStartTime}
                  onChange={(e) => setPublishStartTime(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none transition-all text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1">發佈結束時間</label>
                <input
                  type="datetime-local"
                  value={publishEndTime}
                  onChange={(e) => setPublishEndTime(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none transition-all text-xs"
                />
              </div>
            </div>

            <FormFieldManager fields={fields} setFields={setFields} />
            <WorkflowManager workflow={workflow} setWorkflow={setWorkflow} fields={fields} title="表單發佈審核流程" />
            <WorkflowManager workflow={responseWorkflow} setWorkflow={setResponseWorkflow} fields={fields} title="回傳資料審核流程" />

            {fields.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <h4 className="text-sm font-bold text-gray-700">編輯表單初始資料</h4>
                <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {fields.map(field => (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">{field.label}</label>
                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={initialAnswers[field.id] || ''}
                          onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                          className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none text-xs"
                        />
                      )}
                      {field.type === 'textarea' && (
                        <textarea
                          value={initialAnswers[field.id] || ''}
                          onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                          className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none text-xs resize-none"
                          rows={2}
                        />
                      )}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={initialAnswers[field.id] || ''}
                          onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                          className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none text-xs"
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          value={initialAnswers[field.id] || ''}
                          onChange={(e) => setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value })}
                          className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none text-xs bg-white"
                        >
                          <option value="">請選擇...</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {(field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="flex flex-wrap gap-2">
                          {field.options?.map(opt => (
                            <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type={field.type === 'radio' ? 'radio' : 'checkbox'}
                                name={`edit-initial-${field.id}`}
                                value={opt}
                                checked={field.type === 'radio' ? initialAnswers[field.id] === opt : (initialAnswers[field.id] || []).includes(opt)}
                                onChange={(e) => {
                                  if (field.type === 'radio') {
                                    setInitialAnswers({ ...initialAnswers, [field.id]: e.target.value });
                                  } else {
                                    const current = initialAnswers[field.id] || [];
                                    const next = e.target.checked ? [...current, opt] : current.filter((i: string) => i !== opt);
                                    setInitialAnswers({ ...initialAnswers, [field.id]: next });
                                  }
                                }}
                                className="w-3 h-3 accent-black"
                              />
                              <span className="text-[10px] text-gray-600">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {submitting ? '更新中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function LogsModal({ form, onClose }: { form: Form, onClose: () => void }) {
  const actionLabels: Record<string, string> = {
    create: '建立表單',
    edit: '編輯內容',
    delete: '刪除表單',
    approve: '核准表單',
    reject: '駁回表單',
    respond: '回傳資料'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <History size={20} /> 操作紀錄
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {form.logs?.slice().reverse().map((log) => (
              <div key={log.id} className="relative pl-10">
                <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center z-10 ${
                  log.action === 'delete' ? 'bg-red-100 text-red-600' :
                  log.action === 'approve' ? 'bg-green-100 text-green-600' :
                  log.action === 'reject' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {log.action === 'create' ? <Plus size={14} /> : 
                   log.action === 'edit' ? <Edit size={14} /> :
                   log.action === 'delete' ? <Trash2 size={14} /> :
                   log.action === 'respond' ? <Upload size={14} /> :
                   <CheckCircle size={14} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{actionLabels[log.action] || log.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    執行者: {log.userName} • {new Date(log.timestamp).toLocaleString()}
                  </p>
                  {log.details && <p className="text-xs text-gray-400 mt-1 italic">{log.details}</p>}
                </div>
              </div>
            ))}
            {(!form.logs || form.logs.length === 0) && (
              <div className="text-center py-8 text-gray-400">尚無紀錄</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ResponseUpload({ form, profile, showHistory = true, showToast, onlyShowOwn = false }: { form: Form, profile: UserProfile, showHistory?: boolean, showToast: (msg: string, type?: 'success' | 'error') => void, onlyShowOwn?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<{ [fieldId: string]: any }>({});
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    // Validation
    const missingRequired = form.fields?.filter(f => {
      // Check rules for visibility and requirement
      let visible = true;
      let required = f.required;

      f.rules?.forEach(rule => {
        const condVal = answers[rule.conditionFieldId];
        const met = String(condVal) === String(rule.conditionValue);
        if (met) {
          if (rule.effect === 'show') visible = true;
          if (rule.effect === 'hide') visible = false;
          if (rule.effect === 'require') required = true;
          if (rule.effect === 'optional') required = false;
        } else {
          if (rule.effect === 'show') visible = false;
        }
      });

      if (!visible) return false;
      return required && !answers[f.id];
    });

    if (missingRequired && missingRequired.length > 0) {
      showToast(`請填寫必填欄位: ${missingRequired.map(f => f.label).join(', ')}`, 'error');
      return;
    }

    // Check max selections
    const invalidMax = form.fields?.filter(f => 
      f.type === 'checkbox' && f.maxSelections && Array.isArray(answers[f.id]) && answers[f.id].length > f.maxSelections
    );
    if (invalidMax && invalidMax.length > 0) {
      showToast(`複選題項數超過限制: ${invalidMax.map(f => f.label).join(', ')}`, 'error');
      return;
    }

    setUploading(true);
    try {
      let result = { url: '', name: '' };
      if (file) {
        result = await localDb.uploadFile(file);
      }
      
      await localDb.addResponse(form.id!, {
        responseUrl: result.url,
        responseName: result.name,
        responderUid: profile.uid,
        responderName: profile.displayName,
        answers,
      }, { uid: profile.uid, displayName: profile.displayName, departmentId: profile.departmentId });
      
      showToast('回傳成功');
      setFile(null);
      setAnswers({});
    } catch (error: any) {
      console.error("Upload failed", error);
      showToast(error.message || '上傳失敗', 'error');
    } finally {
      setUploading(false);
    }
  };

  const getFieldState = (field: FormField) => {
    let visible = true;
    let required = field.required;

    if (!field.rules || field.rules.length === 0) return { visible, required };

    field.rules.forEach(rule => {
      const condVal = answers[rule.conditionFieldId];
      const met = String(condVal) === String(rule.conditionValue);
      if (met) {
        if (rule.effect === 'show') visible = true;
        if (rule.effect === 'hide') visible = false;
        if (rule.effect === 'require') required = true;
        if (rule.effect === 'optional') required = false;
      } else {
        // If it's a 'show' rule and not met, default to hidden unless another rule shows it
        if (rule.effect === 'show') visible = false;
      }
    });

    return { visible, required };
  };

  const displayResponses = onlyShowOwn 
    ? (form.responses || []).filter(r => r.responderUid === profile.uid)
    : (form.responses || []);

  return (
    <div className="w-full space-y-6">
      {form.fields && form.fields.length > 0 && (
        <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100">
          <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-500" /> 填寫表單內容
          </h5>
          <div className="space-y-4">
            {form.fields.map(field => {
              const { visible, required } = getFieldState(field);
              if (!visible) return null;

              return (
                <div key={field.id} className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    {field.label} {required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                      placeholder="請輸入內容..."
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm resize-none"
                      rows={4}
                      placeholder="請輸入內容..."
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                      placeholder="請輸入數字..."
                    />
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm bg-white"
                    >
                      <option value="">請選擇...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'radio' && (
                    <div className="flex flex-wrap gap-3">
                      {field.options?.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={field.id}
                            value={opt}
                            checked={answers[field.id] === opt}
                            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                            className="w-4 h-4 accent-black"
                          />
                          <span className="text-sm text-gray-600">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.type === 'checkbox' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-3">
                        {field.options?.map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              value={opt}
                              checked={(answers[field.id] || []).includes(opt)}
                              onChange={(e) => {
                                const current = answers[field.id] || [];
                                const next = e.target.checked 
                                  ? [...current, opt]
                                  : current.filter((i: string) => i !== opt);
                                setAnswers({ ...answers, [field.id]: next });
                              }}
                              className="w-4 h-4 accent-black"
                            />
                            <span className="text-sm text-gray-600">{opt}</span>
                          </label>
                        ))}
                      </div>
                      {field.maxSelections && (
                        <p className="text-[10px] text-gray-400 italic">最多可選 {field.maxSelections} 項</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Paperclip size={16} className="text-green-500" /> 附件上傳 (選填)
        </h5>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id={`response-upload-${form.id}`}
            />
            <label 
              htmlFor={`response-upload-${form.id}`}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-black transition-all"
            >
              <Paperclip size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500 truncate">
                {file ? file.name : '選擇回傳檔案...'}
              </span>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        <Send size={18} />
        {uploading ? '提交中...' : '確認回傳'}
      </button>

      {showHistory && displayResponses.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">您的回傳紀錄</h5>
          <div className="space-y-2">
            {displayResponses.map(resp => (
              <div key={resp.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                <div className="min-w-0">
                  {resp.responseUrl ? (
                    <a href={resp.responseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate font-medium">
                      <Paperclip size={12} /> {resp.responseName}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">無附件</span>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(resp.respondedAt).toLocaleString()}</p>
                </div>
                <CheckCircle size={14} className="text-green-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
