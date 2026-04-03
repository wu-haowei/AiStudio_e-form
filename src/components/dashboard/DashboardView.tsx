import React from 'react';
import { Form, UserProfile, FormResponse } from '../../types';
import { DEPARTMENTS } from '../../constants/departments';
import { getSubDepartmentIds } from '../../utils/departmentUtils';
import { StatCard } from '../common/StatCard';
import { 
  FileText, 
  LayoutDashboard, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  ClipboardList, 
  Building2, 
  Paperclip, 
  Shield, 
  Eye 
} from 'lucide-react';

export function DashboardView({ 
  forms, 
  profile, 
  showToast, 
  setViewingResponses, 
  setActiveTab,
  setManageViewMode
}: { 
  forms: Form[], 
  profile: UserProfile, 
  showToast: (msg: string, type?: 'success' | 'error') => void, 
  setViewingResponses: (f: Form | null) => void, 
  setActiveTab: (tab: any) => void,
  setManageViewMode: (v: 'forms' | 'responses') => void
}) {
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
    
    // If I am a reviewer (admin/super_admin/custom_approver) and it's pending in my scope, DON'T show on dashboard (it's in Manage)
    if (f.status === 'pending') {
      let isCurrentApprover = false;
      if (f.approvalStep === ('custom' as any)) {
        const currentStep = f.workflow?.[f.currentWorkflowStepIndex || 0];
        isCurrentApprover = !!(currentStep && (
          (currentStep.approverType === 'super_admin' && profile.role === 'super_admin') ||
          (currentStep.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === f.departmentId) ||
          (currentStep.approverType === 'user' && profile.uid === currentStep.approverId)
        ));
      } else {
        if (f.approvalStep === 'dept_manager' && profile.role === 'admin' && profile.departmentId === f.departmentId) isCurrentApprover = true;
        if (f.approvalStep === 'target_managers' && profile.role === 'admin' && f.targetDepartmentIds?.includes(profile.departmentId)) isCurrentApprover = true;
        if (f.approvalStep === 'super_admin' && profile.role === 'super_admin') isCurrentApprover = true;
      }

      if (profile.role === 'super_admin' || 
          (profile.role === 'admin' && subDeptIds.includes(f.departmentId)) ||
          isCurrentApprover) {
        return false;
      }
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

  const pendingFormApprovals = forms.filter(f => {
    if (f.status !== 'pending') return false;
    if (f.approvalStep === ('custom' as any)) {
      const currentStep = f.workflow?.[f.currentWorkflowStepIndex || 0];
      if (!currentStep) return false;
      if (currentStep.approverType === 'super_admin' && profile.role === 'super_admin') return true;
      if (currentStep.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === f.departmentId) return true;
      if (currentStep.approverType === 'user' && profile.uid === currentStep.approverId) return true;
    } else {
      if (f.approvalStep === 'dept_manager' && profile.role === 'admin' && profile.departmentId === f.departmentId) return true;
      if (f.approvalStep === 'target_managers' && profile.role === 'admin' && f.targetDepartmentIds?.includes(profile.departmentId)) return true;
      if (f.approvalStep === 'super_admin' && profile.role === 'super_admin') return true;
    }
    return false;
  });

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

      {pendingFormApprovals.length > 0 && (
        <div className="bg-blue-50 rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="p-6 border-b border-blue-100 flex justify-between items-center bg-blue-100/50">
            <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
              <ShieldAlert className="text-blue-600" /> 待處理的表單發佈審核
            </h3>
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingFormApprovals.length}
            </span>
          </div>
          <div className="divide-y divide-blue-100">
            {pendingFormApprovals.map(form => (
              <div key={form.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-100/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900">{form.title}</h4>
                    <p className="text-xs text-blue-700">
                      建立者: {form.authorName} • 單位: {DEPARTMENTS.find(d => d.id === form.departmentId)?.name} • {new Date(form.createdAt).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-blue-600 mt-1">
                      當前步驟: {form.workflow?.[form.currentWorkflowStepIndex || 0].label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setActiveTab('manage');
                      setManageViewMode('forms');
                    }}
                    className="px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    前往審核
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    onClick={() => {
                      setActiveTab('manage');
                      setManageViewMode('responses');
                    }}
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
