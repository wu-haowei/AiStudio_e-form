import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, CheckCircle, XCircle, Trash2, Edit, History, 
  ChevronRight, ChevronLeft, Upload, Plus, X, Eye
} from 'lucide-react';
import { Form, UserProfile, FormField, WorkflowStep, FieldType, FormFieldRule } from '../../types';
import { localDb } from '../../lib/localDb';
import { DEPARTMENTS } from '../../constants/departments';
import { StatusBadge } from '../common/StatusBadge';
import { EditFormModal } from './EditFormModal';
import { LogsModal } from './LogsModal';

interface ManageFormsViewProps {
  forms: Form[];
  profile: UserProfile;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setViewingResponses: (form: Form | null) => void;
  setViewingResponsesHistory: (form: Form | null) => void;
  setViewingResponseDetails: (details: { form: Form, response: any } | null) => void;
  viewMode: 'forms' | 'responses';
  setViewMode: (mode: 'forms' | 'responses') => void;
}

export function ManageFormsView({ 
  forms: initialForms, 
  profile, 
  showToast, 
  setViewingResponses, 
  setViewingResponsesHistory, 
  setViewingResponseDetails,
  viewMode, 
  setViewMode 
}: ManageFormsViewProps) {
  const [forms, setForms] = useState<Form[]>(initialForms);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [viewingLogs, setViewingLogs] = useState<Form | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setForms(initialForms);
  }, [initialForms]);

  const handleDelete = async (id: string) => {
    try {
      await localDb.deleteForm(id, profile);
      setForms(forms.filter(f => f.id !== id));
      showToast('表單已刪除');
      setConfirmDeleteId(null);
    } catch (error: any) {
      showToast(error.message || '刪除失敗', 'error');
    }
  };

  const handleApproval = async (form: Form, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await localDb.approveForm(form.id!, profile);
      } else {
        const reason = prompt('請輸入駁回原因:');
        if (reason === null) return;
        await localDb.rejectForm(form.id!, profile, reason || '無原因');
      }
      showToast(action === 'approve' ? '已核准' : '已駁回');
    } catch (error: any) {
      showToast(error.message || '操作失敗', 'error');
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         form.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    
    // Permission check: admin sees all, others see their own or those they need to approve
    const isAuthor = form.authorUid === profile.uid;
    const isApprover = form.workflow?.some(step => 
      (step.approverType === 'super_admin' && profile.role === 'super_admin') ||
      (step.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === form.departmentId) ||
      (step.approverType === 'user' && step.approverId === profile.uid)
    );
    const isAdmin = profile.role === 'super_admin' || profile.role === 'admin';

    return matchesSearch && matchesStatus && (isAdmin || isAuthor || isApprover);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">表單與回傳管理</h2>
          <p className="text-gray-500">管理系統中的所有表單申請與資料回傳</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('forms')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'forms' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            表單申請
          </button>
          <button
            onClick={() => setViewMode('responses')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'responses' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            資料回傳
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋表單標題或申請人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white rounded-2xl border border-gray-200 focus:border-black outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm font-bold outline-none"
          >
            <option value="all">全部狀態</option>
            <option value="pending">待審核</option>
            <option value="approved">已核准</option>
            <option value="rejected">已駁回</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">表單資訊</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">申請人</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredForms.map((form) => (
                <React.Fragment key={form.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{form.title}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{new Date(form.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                          {form.authorName[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{form.authorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={form.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {viewMode === 'forms' && form.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproval(form, 'approve')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all"
                              title="核准"
                            >
                              <CheckCircle size={20} />
                            </button>
                            <button
                              onClick={() => handleApproval(form, 'reject')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="駁回"
                            >
                              <XCircle size={20} />
                            </button>
                          </>
                        )}
                        {viewMode === 'forms' && (
                          <>
                            <button
                              onClick={() => setViewingLogs(form)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="查看紀錄"
                            >
                              <History size={20} />
                            </button>
                            <button
                              onClick={() => setEditingForm(form)}
                              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                              title="編輯"
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(form.id!)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="刪除"
                            >
                              <Trash2 size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {viewMode === 'responses' && form.responses && form.responses.length > 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-0">
                        <div className="bg-gray-50/50 rounded-2xl mb-4 p-4 border border-gray-100">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <Upload size={12} /> 回傳資料列表 ({form.responses.length})
                          </h4>
                          <div className="space-y-2">
                            {form.responses.map((resp) => (
                              <div key={resp.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">{resp.responderName}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(resp.respondedAt).toLocaleString()}</span>
                                  </div>
                                  <StatusBadge status={resp.status} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setViewingResponseDetails({ form, response: resp })}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1"
                                  >
                                    <Eye size={12} /> 檢視資料
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredForms.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    未找到符合條件的表單
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {editingForm && (
        <EditFormModal 
          form={editingForm} 
          profile={profile} 
          onClose={() => setEditingForm(null)} 
          showToast={showToast}
        />
      )}

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

