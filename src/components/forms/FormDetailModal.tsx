import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Upload, History, X, XCircle, Eye, Paperclip } from 'lucide-react';
import { Form, UserProfile } from '../../types';
import { DEPARTMENTS } from '../../constants/departments';
import { StatusBadge } from '../common/StatusBadge';
import { ResponseUpload } from './ResponseUpload';

interface FormDetailModalProps {
  form: Form;
  profile: UserProfile;
  onClose: () => void;
  onVoid: (id: string) => void;
  onVoidResponse: (formId: string, responseId: string) => void;
  onViewResponseDetails: (form: Form, response: any) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function FormDetailModal({ 
  form, 
  profile, 
  onClose, 
  onVoid, 
  onVoidResponse, 
  onViewResponseDetails,
  showToast 
}: FormDetailModalProps) {
  return (
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
              <StatusBadge status={form.status} />
              <h3 className="text-xl font-bold truncate">{form.title}</h3>
            </div>
            <p className="text-xs text-gray-500">
              由 {form.authorName} ({DEPARTMENTS.find(d => d.id === form.departmentId)?.name}) 於 {new Date(form.createdAt).toLocaleDateString()} 提交
            </p>
          </div>
          <div className="flex items-center gap-2">
            {form.authorUid === profile?.uid && !form.isVoided && (
              <button
                onClick={() => onVoid(form.id!)}
                className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-colors flex items-center gap-1"
              >
                <XCircle size={14} /> 作廢表單
              </button>
            )}
            <button 
              onClick={onClose}
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
              {form.content}
            </div>
            {form.attachmentUrl && (
              <div className="mt-4">
                <a 
                  href={form.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  <Download size={14} /> 下載原始附件: {form.attachmentName}
                </a>
              </div>
            )}
          </section>

          {/* Upload Section */}
          {!form.isVoided && form.status === 'approved' && (
            <section className="pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Upload size={16} className="text-green-500" /> 回傳附件
              </h4>
              <div className="bg-green-50/30 rounded-2xl p-5 border border-green-100/50">
                <ResponseUpload 
                  form={form} 
                  profile={profile!} 
                  showHistory={false} 
                  showToast={showToast} 
                  onlyShowOwn={true} 
                  onComplete={onClose}
                />
              </div>
            </section>
          )}

          {/* History Section */}
          <section className="pt-6 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <History size={16} className="text-purple-500" /> 檢視表單填寫資料
            </h4>
            <div className="space-y-3">
              {form.responses?.filter(r => r.responderUid === profile?.uid).length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs">
                  尚無您的填寫資料
                </div>
              ) : (
                form.responses?.filter(r => r.responderUid === profile?.uid).map(resp => (
                  <div key={resp.id} className={`flex items-center justify-between p-4 rounded-2xl border ${resp.isVoided ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-blue-200 transition-colors'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${resp.isVoided ? 'text-gray-400' : 'text-gray-900'}`}>
                          {resp.responseName || '表單回傳資料'}
                        </span>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewResponseDetails(form, resp)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                      >
                        <Eye size={14} /> 檢視
                      </button>
                      {!resp.isVoided && (
                        <button
                          onClick={() => onVoidResponse(form.id!, resp.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                          title="作廢此筆回傳"
                        >
                          <XCircle size={14} /> 作廢
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
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
