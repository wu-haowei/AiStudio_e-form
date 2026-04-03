import React, { useState } from 'react';
import { 
  ClipboardList, X, FileUp, AlertCircle, Send, Paperclip, CheckCircle 
} from 'lucide-react';
import { Form, UserProfile, FormField } from '../../types';
import { localDb } from '../../lib/localDb';

interface ResponseUploadProps {
  form: Form;
  profile: UserProfile;
  showHistory?: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onlyShowOwn?: boolean;
  onComplete?: () => void;
}

export function ResponseUpload({ form, profile, showHistory = true, showToast, onlyShowOwn = false, onComplete }: ResponseUploadProps) {
  const [answers, setAnswers] = useState<{ [fieldId: string]: any }>({});
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    // Validation
    const errors: string[] = [];
    
    form.fields?.forEach(field => {
      const { visible, required, error } = getFieldState(field);
      if (!visible) return;
      
      if (required && !answers[field.id]) {
        errors.push(`${field.label} 為必填欄位`);
      }
      
      if (error) {
        errors.push(`${field.label}: ${error}`);
      }
      
      if (field.type === 'checkbox' && field.maxSelections && Array.isArray(answers[field.id]) && answers[field.id].length > field.maxSelections) {
        errors.push(`${field.label} 複選題項數超過限制 (${field.maxSelections})`);
      }
    });

    if (errors.length > 0) {
      showToast(errors[0], 'error');
      return;
    }

    setUploading(true);
    try {
      const finalAnswers = { ...answers };
      
      // Upload files for dynamic fields
      for (const field of form.fields || []) {
        if (field.type === 'file' && answers[field.id] instanceof File) {
          const res = await localDb.uploadFile(answers[field.id]);
          finalAnswers[field.id] = { url: res.url, name: res.name };
        }
      }
      
      await localDb.addResponse(form.id!, {
        responseUrl: '',
        responseName: '',
        responderUid: profile.uid,
        responderName: profile.displayName,
        answers: finalAnswers,
      }, { uid: profile.uid, displayName: profile.displayName, departmentId: profile.departmentId });
      
      showToast('回傳成功');
      setAnswers({});
      if (onComplete) onComplete();
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
    let error = '';

    if (!field.rules || field.rules.length === 0) return { visible, required, error };

    field.rules.forEach(rule => {
      const condVal = answers[rule.conditionFieldId];
      const targetVal = rule.compareWithField ? answers[rule.conditionValue] : rule.conditionValue;
      let met = false;
      
      const op = rule.conditionOperator || '==';
      
      const compare = (a: any, b: any, operator: string) => {
        if (operator === 'exists') return !!a;
        if (operator === 'not_exists') return !a;
        if (a === undefined || a === null || b === undefined || b === null) return false;
        
        // Try to compare as numbers if possible
        const na = Number(a);
        const nb = Number(b);
        if (!isNaN(na) && !isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') {
          if (operator === '>') return na > nb;
          if (operator === '<') return na < nb;
          if (operator === '>=') return na >= nb;
          if (operator === '<=') return na <= nb;
        }
        
        // Otherwise compare as strings (works for ISO dates/times)
        const sa = String(a);
        const sb = String(b);
        if (operator === '>') return sa > sb;
        if (operator === '<') return sa < sb;
        if (operator === '>=') return sa >= sb;
        if (operator === '<=') return sa <= sb;
        if (operator === '==') return sa === sb;
        if (operator === '!=') return sa !== sb;
        if (operator === 'contains') return sa.includes(sb);
        return false;
      };

      met = compare(condVal, targetVal, op);

      if (met) {
        if (rule.effect === 'show') visible = true;
        if (rule.effect === 'hide') visible = false;
        if (rule.effect === 'require') required = true;
        if (rule.effect === 'optional') required = false;
        if (rule.effect === 'error') error = rule.errorMessage || '驗證失敗';
      } else {
        // If it's a 'show' rule and not met, default to hidden unless another rule shows it
        if (rule.effect === 'show') visible = false;
      }
    });

    return { visible, required, error };
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
              const { visible, required, error } = getFieldState(field);
              if (!visible) return null;

              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">
                      {field.label} {required && <span className="text-red-500">*</span>}
                    </label>
                    {answers[field.id] !== undefined && answers[field.id] !== '' && (!Array.isArray(answers[field.id]) || answers[field.id].length > 0) && (
                      <button 
                        type="button"
                        onClick={() => setAnswers({ ...answers, [field.id]: field.type === 'checkbox' ? [] : undefined })}
                        className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors"
                        title="清除此欄位"
                      >
                        <X size={10} /> 清除
                      </button>
                    )}
                  </div>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-black outline-none text-sm`}
                      placeholder="請輸入內容..."
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-black outline-none text-sm resize-none`}
                      rows={4}
                      placeholder="請輸入內容..."
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-black outline-none text-sm`}
                      placeholder="請輸入數字..."
                    />
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-black outline-none text-sm`}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-black outline-none text-sm bg-white`}
                    >
                      <option value="">請選擇...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'radio' && (
                    <div className={`flex flex-wrap gap-3 p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-transparent'}`}>
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
                    <div className={`space-y-2 p-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-transparent'}`}>
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

                  {field.type === 'file' && (
                    <div className={`p-4 border-2 border-dashed ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl`}>
                      <input
                        type="file"
                        id={`file-${field.id}`}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAnswers({ ...answers, [field.id]: file });
                        }}
                      />
                      <label htmlFor={`file-${field.id}`} className="flex flex-col items-center gap-2 cursor-pointer">
                        <FileUp className={error ? 'text-red-400' : 'text-gray-400'} size={24} />
                        <span className="text-xs text-gray-500">
                          {answers[field.id] ? (answers[field.id] as File).name : '點擊或拖曳上傳附件'}
                        </span>
                      </label>
                    </div>
                  )}

                  {error && (
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">您的填寫資料</h5>
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
