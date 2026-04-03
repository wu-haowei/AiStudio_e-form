import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { FormField, FieldType, FormFieldRule } from '../../types';

interface FormFieldManagerProps {
  fields: FormField[];
  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
}

export function FormFieldManager({ fields, setFields }: FormFieldManagerProps) {
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
              <div className="sm:col-span-2 relative">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="請輸入題目名稱 (例如: 您的聯絡電話)"
                  className="w-full p-3 pr-10 rounded-xl border border-gray-200 focus:border-black outline-none text-sm"
                />
                {field.label && (
                  <button
                    type="button"
                    onClick={() => updateField(field.id, { label: '' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                )}
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
                  <option value="file">檔案上傳</option>
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
                        // Default operator based on field type
                        const targetField = fields.find(f => f.id === e.target.value);
                        if (targetField?.type === 'file') {
                          newRules[ruleIdx].conditionOperator = 'exists';
                        } else {
                          newRules[ruleIdx].conditionOperator = '==';
                        }
                        updateField(field.id, { rules: newRules });
                      }}
                      className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                    >
                      <option value="">選擇題目</option>
                      {fields.slice(0, index).map(f => (
                        <option key={f.id} value={f.id}>{f.label || `題目 ${fields.indexOf(f) + 1}`}</option>
                      ))}
                    </select>
                    <select
                      value={rule.conditionOperator || '=='}
                      onChange={(e) => {
                        const newRules = [...(field.rules || [])];
                        newRules[ruleIdx].conditionOperator = e.target.value as any;
                        updateField(field.id, { rules: newRules });
                      }}
                      className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                    >
                      <option value="==">等於</option>
                      <option value="!=">不等於</option>
                      <option value=">">大於</option>
                      <option value="<">小於</option>
                      <option value=">=">大於等於</option>
                      <option value="<=">小於等於</option>
                      <option value="contains">包含</option>
                      <option value="exists">已上傳檔案</option>
                      <option value="not_exists">未上傳檔案</option>
                    </select>
                    {(!rule.conditionOperator || (rule.conditionOperator !== 'exists' && rule.conditionOperator !== 'not_exists')) && (
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={rule.compareWithField}
                          onChange={(e) => {
                            const newRules = [...(field.rules || [])];
                            newRules[ruleIdx].compareWithField = e.target.checked;
                            newRules[ruleIdx].conditionValue = '';
                            updateField(field.id, { rules: newRules });
                          }}
                          className="w-3 h-3"
                          title="與另一個欄位比較"
                        />
                        {rule.compareWithField ? (
                          <select
                            value={rule.conditionValue}
                            onChange={(e) => {
                              const newRules = [...(field.rules || [])];
                              newRules[ruleIdx].conditionValue = e.target.value;
                              updateField(field.id, { rules: newRules });
                            }}
                            className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                          >
                            <option value="">選擇比較欄位</option>
                            {fields.filter(f => f.id !== field.id).map(f => (
                              <option key={f.id} value={f.id}>{f.label || `題目 ${fields.indexOf(f) + 1}`}</option>
                            ))}
                          </select>
                        ) : (
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
                        )}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400">則</span>
                    <select
                      value={rule.effect}
                      onChange={(e) => {
                        const newRules = [...(field.rules || [])];
                        newRules[ruleIdx].effect = e.target.value as any;
                        if (e.target.value === 'error' && !newRules[ruleIdx].errorMessage) {
                          newRules[ruleIdx].errorMessage = '欄位驗證失敗';
                        }
                        updateField(field.id, { rules: newRules });
                      }}
                      className="p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                    >
                      <option value="show">顯示</option>
                      <option value="hide">隱藏</option>
                      <option value="require">必填</option>
                      <option value="optional">選填</option>
                      <option value="error">顯示錯誤</option>
                    </select>
                    {rule.effect === 'error' && (
                      <input
                        type="text"
                        value={rule.errorMessage || ''}
                        onChange={(e) => {
                          const newRules = [...(field.rules || [])];
                          newRules[ruleIdx].errorMessage = e.target.value;
                          updateField(field.id, { rules: newRules });
                        }}
                        placeholder="錯誤訊息"
                        className="w-32 p-1.5 rounded border border-gray-200 text-[10px] outline-none"
                      />
                    )}
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
