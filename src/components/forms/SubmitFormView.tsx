import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UserProfile, FormField, WorkflowStep } from '../../types';
import { localDb } from '../../lib/localDb';
import { DEPARTMENTS } from '../../constants/departments';
import { FormFieldManager } from './FormFieldManager';
import { WorkflowManager } from './WorkflowManager';

interface SubmitFormViewProps {
  profile: UserProfile;
  onComplete: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function SubmitFormView({ profile, onComplete, showToast }: SubmitFormViewProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
      await localDb.addForm({
        title,
        content,
        authorUid: profile.uid,
        authorName: profile.displayName,
        departmentId: profile.departmentId,
        status: 'pending',
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">發佈開始時間 (選填)</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={publishStartTime}
                onChange={(e) => setPublishStartTime(e.target.value)}
                className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all min-h-[56px]"
              />
              {publishStartTime && (
                <button
                  type="button"
                  onClick={() => setPublishStartTime('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">發佈結束時間 (選填)</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={publishEndTime}
                onChange={(e) => setPublishEndTime(e.target.value)}
                className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all min-h-[56px]"
              />
              {publishEndTime && (
                <button
                  type="button"
                  onClick={() => setPublishEndTime('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">表單標題</label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 採購申請、請假單..."
              className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
              required
            />
            {title && (
              <button
                type="button"
                onClick={() => setTitle('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">詳細內容</label>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="請描述表單的具體內容與事由..."
              className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all resize-none"
              required
            />
            {content && (
              <button
                type="button"
                onClick={() => setContent('')}
                className="absolute right-4 top-6 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            )}
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
            <h4 className="text-sm font-bold text-gray-700">表單畫面模擬</h4>
            <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              {fields.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">{field.label}</label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={initialAnswers[field.id] || ''}
                      disabled
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 outline-none text-sm cursor-not-allowed"
                      placeholder="請輸入內容..."
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      value={initialAnswers[field.id] || ''}
                      disabled
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 outline-none text-sm resize-none cursor-not-allowed"
                      rows={3}
                      placeholder="請輸入內容..."
                    />
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={initialAnswers[field.id] || ''}
                      disabled
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 outline-none text-sm cursor-not-allowed"
                      placeholder="請輸入數字..."
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      value={initialAnswers[field.id] || ''}
                      disabled
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 outline-none text-sm cursor-not-allowed"
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
                        <label key={opt} className="flex items-center gap-2 cursor-not-allowed opacity-60">
                          <input
                            type={field.type === 'radio' ? 'radio' : 'checkbox'}
                            name={`initial-${field.id}`}
                            value={opt}
                            checked={field.type === 'radio' ? initialAnswers[field.id] === opt : (initialAnswers[field.id] || []).includes(opt)}
                            disabled
                            className="w-4 h-4 accent-black cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-600">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === 'file' && (
                    <div className="p-3 bg-gray-100 rounded-xl border border-dashed border-gray-300 text-center text-xs text-gray-500">
                      檔案上傳欄位不支援預設值
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-5 bg-[#141414] text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : '提交申請'}
        </button>
      </form>
    </div>
  );
}
