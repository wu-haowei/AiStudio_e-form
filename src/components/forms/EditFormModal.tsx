import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Form, UserProfile, FormField, WorkflowStep } from '../../types';
import { localDb } from '../../lib/localDb';
import { DEPARTMENTS } from '../../constants/departments';
import { FormFieldManager } from './FormFieldManager';
import { WorkflowManager } from './WorkflowManager';

interface EditFormModalProps {
  form: Form;
  profile: UserProfile;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function EditFormModal({ form, profile, onClose, showToast }: EditFormModalProps) {
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-700">發佈開始時間</label>
                  {publishStartTime && (
                    <button 
                      type="button"
                      onClick={() => setPublishStartTime('')}
                      className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5"
                    >
                      <X size={10} /> 清除
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={publishStartTime}
                  onChange={(e) => setPublishStartTime(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-200 focus:border-black outline-none transition-all text-xs"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-700">發佈結束時間</label>
                  {publishEndTime && (
                    <button 
                      type="button"
                      onClick={() => setPublishEndTime('')}
                      className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5"
                    >
                      <X size={10} /> 清除
                    </button>
                  )}
                </div>
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
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">{field.label}</label>
                        {initialAnswers[field.id] !== undefined && initialAnswers[field.id] !== '' && (!Array.isArray(initialAnswers[field.id]) || initialAnswers[field.id].length > 0) && (
                          <button 
                            type="button"
                            onClick={() => setInitialAnswers({ ...initialAnswers, [field.id]: field.type === 'checkbox' ? [] : undefined })}
                            className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors"
                          >
                            <X size={10} /> 清除
                          </button>
                        )}
                      </div>
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
                      {field.type === 'file' && (
                        <div className="p-2 bg-gray-100 rounded-lg border border-dashed border-gray-300 text-center text-[10px] text-gray-500">
                          檔案上傳欄位不支援預設值
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
