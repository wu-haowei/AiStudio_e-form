import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, X, Download, Paperclip, Check, Trash2 } from 'lucide-react';
import { Form, UserProfile } from '../../types';
import { DEPARTMENTS } from '../../constants/departments';
import { localDb } from '../../lib/localDb';

interface ResponseHistoryModalProps {
  form: Form;
  profile: UserProfile;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function ResponseHistoryModal({ form, profile, onClose, showToast }: ResponseHistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList size={20} className="text-green-600" /> {form.title} - 填寫資料
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
                {form.responses?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">尚無填寫資料</td>
                  </tr>
                ) : (
                  form.responses?.map(resp => {
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
                                {form.fields?.map(field => {
                                  const answer = resp.answers?.[field.id];
                                  if (!answer) return null;
                                  return (
                                    <div key={field.id} className="text-[10px]">
                                      <span className="font-bold text-gray-500">{field.label}: </span>
                                      <span className="text-gray-700 whitespace-pre-wrap">
                                        {field.type === 'file' && typeof answer === 'object' && answer.url ? (
                                          <a href={answer.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            <Paperclip size={10} /> {answer.name}
                                          </a>
                                        ) : Array.isArray(answer) ? answer.join(', ') : String(answer)}
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
                                  onClick={() => localDb.approveResponse(form.id!, resp.id, profile!)}
                                  className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                  title="核准"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('請輸入駁回原因:');
                                    if (reason) localDb.rejectResponse(form.id!, resp.id, profile!, reason);
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
                                onClick={() => localDb.voidResponse(form.id!, resp.id, profile!)}
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
            onClick={onClose} 
            className="px-8 py-2.5 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg"
          >
            關閉
          </button>
        </div>
      </motion.div>
    </div>
  );
}
