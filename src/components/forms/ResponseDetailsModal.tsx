import React from 'react';
import { motion } from 'framer-motion';
import { Eye, X, Paperclip, CheckCircle, XCircle } from 'lucide-react';
import { Form, UserProfile, Department } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ResponseDetailsModalProps {
  form: Form;
  response: any;
  profile: UserProfile;
  departments: Department[];
  onClose: () => void;
  onApprove?: (formId: string, responseId: string) => void;
  onReject?: (formId: string, responseId: string) => void;
}

export function ResponseDetailsModal({ form, response, profile, departments, onClose, onApprove, onReject }: ResponseDetailsModalProps) {
  const currentStep = response.workflow?.[response.currentWorkflowStepIndex || 0];
  const isApprover = !!(currentStep && (
    (currentStep.approverType === 'super_admin' && profile.role === 'super_admin') ||
    (currentStep.approverType === 'dept_manager' && profile.role === 'admin' && profile.departmentId === response.responderDepartmentId) ||
    (currentStep.approverType === 'user' && profile.uid === currentStep.approverId)
  ));

  const isPending = response.status === 'pending';
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Eye size={20} className="text-blue-600" /> 填寫資料詳情
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">回傳者</p>
                <p className="text-sm font-bold">{response.responderName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">單位</p>
                <p className="text-sm font-bold">{departments.find(d => d.id === response.responderDepartmentId)?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">回傳時間</p>
                <p className="text-sm font-bold">{new Date(response.respondedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">狀態</p>
                <StatusBadge status={response.status} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 border-l-4 border-blue-500 pl-3">回傳內容</h4>
              <div className="grid grid-cols-1 gap-4">
                {form.fields.map(field => {
                  const answer = response.answers[field.id];
                  if (answer === undefined || answer === '') return null;
                  return (
                    <div key={field.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <label className="block text-xs font-bold text-gray-500 mb-2">{field.label}</label>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {field.type === 'file' && typeof answer === 'object' && answer.url ? (
                          <a href={answer.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                            <Paperclip size={14} />
                            <span className="font-bold">{answer.name}</span>
                          </a>
                        ) : Array.isArray(answer) ? (
                          <div className="flex flex-wrap gap-2">
                            {answer.map(a => (
                              <span key={a} className="px-2 py-1 bg-gray-100 rounded-lg text-xs">{a}</span>
                            ))}
                          </div>
                        ) : String(answer)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPending && isApprover && onApprove && onReject && (
              <>
                <button
                  onClick={() => {
                    onApprove(form.id!, response.id);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/10 flex items-center gap-2"
                >
                  <CheckCircle size={18} /> 核准
                </button>
                <button
                  onClick={() => {
                    onReject(form.id!, response.id);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-2"
                >
                  <XCircle size={18} /> 駁回
                </button>
              </>
            )}
          </div>
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
