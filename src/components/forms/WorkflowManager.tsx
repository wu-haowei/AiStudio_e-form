import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { WorkflowStep, FormField, UserProfile } from '../../types';
import { localDb } from '../../lib/localDb';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableStepProps {
  key?: string | number;
  step: WorkflowStep;
  index: number;
  users: UserProfile[];
  fields: FormField[];
  removeStep: (id: string) => void;
  updateStep: (id: string, updates: Partial<WorkflowStep>) => void;
}

function SortableStep({ step, index, users, fields, removeStep, updateStep }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3 relative"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <GripVertical size={16} />
          </div>
          <span className="w-6 h-6 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{index + 1}</span>
          <span className="font-bold text-sm text-gray-900">{step.label}</span>
        </div>
        <div className="flex items-center gap-1">
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
              <option value="!=">不等於</option>
              <option value=">">大於</option>
              <option value="<">小於</option>
              <option value="contains">包含</option>
              <option value="exists">已上傳檔案</option>
              <option value="not_exists">未上傳檔案</option>
            </select>
            {step.condition.operator !== 'exists' && step.condition.operator !== 'not_exists' && (
              <input
                type="text"
                value={step.condition.value}
                onChange={(e) => updateStep(step.id, { condition: { ...step.condition!, value: e.target.value } })}
                placeholder="條件值"
                className="w-20 p-1.5 rounded border border-gray-200 text-[10px] outline-none"
              />
            )}
            <span className="text-[9px] text-gray-400">時需審核</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkflowManagerProps {
  workflow: WorkflowStep[];
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowStep[]>>;
  fields: FormField[];
  title?: string;
  isPublic?: boolean;
  targetDepartmentIds?: string[];
  profile?: UserProfile;
}

export function WorkflowManager({ 
  workflow, 
  setWorkflow, 
  fields, 
  title = "自定義審核流程",
  isPublic = false,
  targetDepartmentIds = [],
  profile
}: WorkflowManagerProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const filtered = workflow.filter(s => s.id !== id);
    const updated = filtered.map((step, idx) => ({
      ...step,
      label: `步驟 ${idx + 1}`
    }));
    setWorkflow(updated);
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setWorkflow(workflow.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = workflow.findIndex((s) => s.id === active.id);
      const newIndex = workflow.findIndex((s) => s.id === over.id);
      const newWorkflow = arrayMove(workflow, oldIndex, newIndex);
      
      // Update labels to reflect new order
      const updatedWorkflow = newWorkflow.map((step, idx) => ({
        ...step,
        label: `步驟 ${idx + 1}`
      }));
      
      setWorkflow(updatedWorkflow);
    }
  };

  const getDefaultSteps = () => {
    if (!profile) return [];
    const steps: { label: string; type: string }[] = [];
    const isCrossDept = !isPublic && targetDepartmentIds.some(id => id !== profile.departmentId);

    if (profile.role === 'user') {
      steps.push({ label: '單位主管審核', type: '單位主管' });
      if (isPublic) {
        steps.push({ label: '總管理者審核', type: '總管理員' });
      } else if (isCrossDept) {
        steps.push({ label: '發佈單位主管審核', type: '目標單位主管' });
      }
    } else if (profile.role === 'admin') {
      if (isPublic) {
        steps.push({ label: '總管理者審核', type: '總管理員' });
      } else if (isCrossDept) {
        steps.push({ label: '發佈單位主管審核', type: '目標單位主管' });
      }
    }

    return steps;
  };

  const defaultSteps = getDefaultSteps();

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={workflow.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {workflow.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                index={index}
                users={users}
                fields={fields}
                removeStep={removeStep}
                updateStep={updateStep}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {workflow.length === 0 && (
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-6">
          <div className="text-center mb-4">
            <p className="text-xs font-bold text-gray-500">尚無自定義審核流程，將使用預設流程</p>
          </div>
          
          {defaultSteps.length > 0 ? (
            <div className="space-y-3">
              {defaultSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm opacity-60">
                  <span className="w-5 h-5 bg-gray-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-700">{step.label}</p>
                    <p className="text-[9px] text-gray-400">審核人: {step.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[10px] text-green-600 font-bold">✓ 此設定下將自動核准，無需審核</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
