import React from 'react';
import { Department } from '../../types';
import { getDeptPath } from '../../utils/departmentUtils';

interface HierarchySelectProps {
  departments: Department[];
  value: string | null;
  onChange: (value: string | null) => void;
  excludeId?: string;
  placeholder?: string;
}

export function HierarchySelect({ departments, value, onChange, excludeId, placeholder = "請選擇單位" }: HierarchySelectProps) {
  const path = getDeptPath(value, departments);

  const handleSelect = (index: number, id: string | null) => {
    if (!id) {
      // If "None" is selected at any level, the value becomes the parent of this level
      const newValue = index > 0 ? path[index - 1] : null;
      onChange(newValue);
      return;
    }
    onChange(id);
  };

  const levels: Department[][] = [];
  
  // Level 1: Root departments
  const rootDepts = departments.filter(d => !d.parentId && !d.isDeleted && d.id !== excludeId);
  levels.push(rootDepts);

  // Subsequent levels based on path
  path.forEach((id) => {
    const children = departments.filter(d => d.parentId === id && !d.isDeleted && d.id !== excludeId);
    if (children.length > 0) {
      levels.push(children);
    }
  });

  return (
    <div className="space-y-3">
      {levels.map((options, index) => {
        const currentValue = path[index] || "";
        // Only show the next level if the current level has a value
        if (index > 0 && !path[index - 1]) return null;
        
        return (
          <select
            key={index}
            value={currentValue}
            onChange={(e) => handleSelect(index, e.target.value || null)}
            className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all"
          >
            <option value="">{index === 0 ? placeholder : "請選擇子單位"}</option>
            {options.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        );
      })}
    </div>
  );
}
