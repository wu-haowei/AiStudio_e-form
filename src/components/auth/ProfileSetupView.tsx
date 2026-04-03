import React, { useState } from 'react';
import { Role } from '../../types';
import { DEPARTMENTS } from '../../constants/departments';

export function ProfileSetupView({ onSetup }: { onSetup: (role: Role, dept: string) => void }) {
  const [role, setRole] = useState<Role>('user');
  const [dept, setDept] = useState('mgmt');

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-6 sm:p-10">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">完成您的個人資料</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇您的權限角色</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['user', 'admin', 'super_admin'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-3 sm:p-4 rounded-2xl border-2 transition-all text-center ${
                    role === r ? 'border-[#141414] bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-bold capitalize text-sm sm:text-base">{r.replace('_', ' ')}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇您的所屬單位</label>
            <select 
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
            >
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>
                  {'  '.repeat(d.level - 1)} {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onSetup(role, dept)}
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-black transition-colors"
          >
            進入系統
          </button>
        </div>
      </div>
    </div>
  );
}
