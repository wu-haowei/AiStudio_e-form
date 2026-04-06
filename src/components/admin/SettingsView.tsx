import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Role, Department } from '../../types';
import { localDb } from '../../lib/localDb';
import { getDeptBreadcrumb, getDeptPath } from '../../utils/departmentUtils';
import { HierarchySelect } from './HierarchySelect';
import { Upload, Download, Edit, X, CheckCircle, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsViewProps {
  users: UserProfile[];
  departments: Department[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function SettingsView({ users, departments, showToast }: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'departments'>('users');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ displayName: '', departmentId: '', role: 'user' });
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDept, setNewDept] = useState<Partial<Department>>({ name: '', parentId: null });
  const [reassigningDept, setReassigningDept] = useState<{ id: string, users: UserProfile[] } | null>(null);
  const [bulkTargetDeptId, setBulkTargetDeptId] = useState<string>('');
  
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const deptFileInputRef = useRef<HTMLInputElement>(null);

  // User Management Logic
  const handleSaveUser = async (userData: Partial<UserProfile>) => {
    if (!userData.displayName || !userData.departmentId) {
      showToast('人員名稱與單位為必填', 'error');
      return;
    }

    // Check for duplicate name
    const isDuplicate = users.some(u => 
      u.displayName === userData.displayName && u.uid !== userData.uid
    );
    if (isDuplicate) {
      showToast('人員名稱不得重複', 'error');
      return;
    }

    try {
      if (userData.uid) {
        // Update
        const existingUser = users.find(u => u.uid === userData.uid);
        if (existingUser) {
          await localDb.saveUser({ ...existingUser, ...userData });
          showToast('使用者資料已更新');
        }
      } else {
        // Create
        const createdUser: UserProfile = {
          uid: `user_${Date.now()}`,
          email: userData.email || `${Date.now()}@internal.com`,
          displayName: userData.displayName!,
          role: userData.role || 'user',
          departmentId: userData.departmentId!,
          createdAt: new Date().toISOString(),
        };
        await localDb.saveUser(createdUser);
        showToast('帳號已新增');
      }
      setEditingUser(null);
      setIsAddingUser(false);
      setNewUser({ displayName: '', departmentId: '', role: 'user' });
    } catch (e: any) {
      showToast(e.message || '儲存失敗', 'error');
    }
  };

  const handleUpdateUser = (uid: string, updates: Partial<UserProfile>) => {
    const user = users.find(u => u.uid === uid);
    if (user) {
      handleSaveUser({ ...user, ...updates });
    }
  };

  const handleExportUsers = () => {
    try {
      const dataStr = JSON.stringify(users, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `users_export_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast('帳號資料匯出成功');
    } catch (error) {
      showToast('匯出失敗', 'error');
    }
  };

  const handleImportUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importedUsers = JSON.parse(content);
        if (!Array.isArray(importedUsers)) throw new Error('無效的檔案格式 (應為陣列)');
        
        let successCount = 0;
        let errors: string[] = [];
        
        for (let i = 0; i < importedUsers.length; i++) {
          const u = importedUsers[i];
          const rowNum = i + 1;
          
          if (!u.uid || !u.email || !u.role) {
            errors.push(`第 ${rowNum} 筆: 格式不完整 (缺少 uid, email 或 role)`);
            continue;
          }
          
          if (u.departmentId && !departments.some(d => d.id === u.departmentId && !d.isDeleted)) {
            errors.push(`第 ${rowNum} 筆 (${u.displayName || u.email}): 找不到單位或單位已停用 (ID: "${u.departmentId}")`);
            continue;
          }

          if (u.displayName && users.some(existing => existing.displayName === u.displayName && existing.uid !== u.uid)) {
            errors.push(`第 ${rowNum} 筆 (${u.displayName}): 人員名稱已重複`);
            continue;
          }
          
          await localDb.saveUser(u);
          successCount++;
        }
        
        if (errors.length > 0) {
          const errorMsg = `匯入完成。成功: ${successCount}, 失敗: ${errors.length}。\n\n錯誤詳情:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`;
          alert(errorMsg);
          showToast(`成功匯入 ${successCount} 筆，失敗 ${errors.length} 筆`, 'error');
        } else {
          showToast(`成功匯入 ${successCount} 筆帳號資料`);
        }
        
        if (userFileInputRef.current) userFileInputRef.current.value = '';
      } catch (error: any) {
        showToast(`匯入失敗: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Department Management Logic
  const handleSaveDept = async (dept: Partial<Department>) => {
    if (!dept.name) {
      showToast('請輸入單位名稱', 'error');
      return;
    }

    // Check for duplicate name in the same hierarchy level
    const siblings = departments.filter(d => d.parentId === (dept.parentId || null) && d.id !== dept.id);
    const isDuplicate = siblings.some(s => s.name === dept.name);
    if (isDuplicate) {
      showToast('相同階層之單位名稱不得重複', 'error');
      return;
    }

    try {
      const id = dept.id || `dept_${Date.now()}`;
      const level = dept.parentId 
        ? (departments.find(d => d.id === dept.parentId)?.level || 0) + 1 
        : 1;
      
      await localDb.saveDepartment({
        ...dept,
        id,
        level,
        parentId: dept.parentId || null
      });
      showToast(dept.id ? '單位資料已更新' : '單位已新增');
      setEditingDept(null);
      setIsAddingDept(false);
      setNewDept({ name: '', parentId: null });
    } catch (e: any) {
      showToast(e.message || '儲存失敗', 'error');
    }
  };

  const handleDeleteDept = async (id: string) => {
    const usersInDept = users.filter(u => u.departmentId === id);
    if (usersInDept.length > 0) {
      setReassigningDept({ id, users: usersInDept });
      setBulkTargetDeptId('');
      return;
    }

    if (!confirm('確定要刪除此單位嗎？刪除後相關資訊仍會保留但無法再選擇。')) return;
    try {
      await localDb.deleteDepartment(id);
      showToast('單位已刪除');
    } catch (e: any) {
      showToast(e.message || '刪除失敗', 'error');
    }
  };

  const handleBulkReassign = async () => {
    if (!reassigningDept || !bulkTargetDeptId) {
      showToast('請選擇目標單位', 'error');
      return;
    }
    try {
      for (const user of reassigningDept.users) {
        await localDb.saveUser({ ...user, departmentId: bulkTargetDeptId });
      }
      const deptId = reassigningDept.id;
      setReassigningDept(null);
      await localDb.deleteDepartment(deptId);
      showToast('人員已轉移且單位已刪除');
    } catch (e: any) {
      showToast(e.message || '轉移失敗', 'error');
    }
  };

  const handleExportDepts = () => {
    try {
      const dataStr = JSON.stringify(departments, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `departments_export_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast('單位資料匯出成功');
    } catch (error) {
      showToast('匯出失敗', 'error');
    }
  };

  const handleImportDepts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importedDepts = JSON.parse(content);
        if (!Array.isArray(importedDepts)) throw new Error('無效的檔案格式 (應為陣列)');
        let successCount = 0;
        for (const d of importedDepts) {
          if (d.id && d.name) {
            // Check for duplicate name in the same hierarchy level
            const siblings = departments.filter(existing => existing.parentId === (d.parentId || null) && existing.id !== d.id);
            if (siblings.some(s => s.name === d.name)) {
              console.warn(`跳過重複單位: ${d.name} (ID: ${d.id})`);
              continue;
            }
            await localDb.saveDepartment(d);
            successCount++;
          }
        }
        showToast(`成功匯入 ${successCount} 筆單位資料`);
        if (deptFileInputRef.current) deptFileInputRef.current.value = '';
      } catch (error: any) {
        showToast(`匯入失敗: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">系統設定</h2>
          <p className="text-gray-500 text-sm">管理系統人員權限與組織架構</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === 'users' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            人員管理
          </button>
          <button
            onClick={() => setActiveSubTab('departments')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === 'departments' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            單位管理
          </button>
        </div>
      </header>

      {activeSubTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">帳號管理</h3>
              <button
                onClick={() => setIsAddingUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
              >
                <Plus size={16} /> 新增帳號
              </button>
            </div>
            <div className="flex gap-3">
              <input type="file" ref={userFileInputRef} onChange={handleImportUsers} accept=".json" className="hidden" />
              <button
                onClick={() => userFileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
              >
                <Upload size={16} className="text-blue-600" /> 匯入帳號
              </button>
              <button
                onClick={handleExportUsers}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
              >
                <Download size={16} className="text-green-600" /> 匯出帳號
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E5E5] shadow-sm overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#E5E5E5]">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">使用者</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">單位</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">權限</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">尚無帳號資料</td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                            {u.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{u.displayName}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {departments.find(d => d.id === u.departmentId)?.name || '未知單位'}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {getDeptBreadcrumb(u.departmentId, departments)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role === 'super_admin' ? '超級管理員' : u.role === 'admin' ? '單位管理者' : '一般使用者'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
                          <Edit size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View for Users */}
            <div className="sm:hidden divide-y divide-gray-100">
              {users.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">尚無帳號資料</div>
              ) : users.map(u => (
                <div key={u.uid} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {u.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{u.displayName}</div>
                        <div className="text-[10px] text-gray-500">{u.email}</div>
                      </div>
                    </div>
                    <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-all">
                      <Edit size={18} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">單位</p>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">
                        {departments.find(d => d.id === u.departmentId)?.name || '未知單位'}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {getDeptBreadcrumb(u.departmentId, departments)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">權限</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role === 'super_admin' ? '超級管理員' : u.role === 'admin' ? '單位管理者' : '一般使用者'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">單位管理</h3>
              <button
                onClick={() => setIsAddingDept(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
              >
                <Plus size={16} /> 新增單位
              </button>
            </div>
            <div className="flex gap-3">
              <input type="file" ref={deptFileInputRef} onChange={handleImportDepts} accept=".json" className="hidden" />
              <button
                onClick={() => deptFileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
              >
                <Upload size={16} className="text-blue-600" /> 匯入單位
              </button>
              <button
                onClick={handleExportDepts}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
              >
                <Download size={16} className="text-green-600" /> 匯出單位
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E5E5] shadow-sm overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#E5E5E5]">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">單位名稱</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">上級單位</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">層級</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {departments.filter(d => !d.isDeleted).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">尚無單位資料</td>
                    </tr>
                  ) : departments.filter(d => !d.isDeleted).map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-gray-900">{d.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{getDeptBreadcrumb(d.id, departments)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {departments.find(parent => parent.id === d.parentId)?.name || '無'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {d.level}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => setEditingDept(d)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteDept(d.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View for Departments */}
            <div className="sm:hidden divide-y divide-gray-100">
              {departments.filter(d => !d.isDeleted).length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">尚無單位資料</div>
              ) : departments.filter(d => !d.isDeleted).map(d => (
                <div key={d.id} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{d.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{getDeptBreadcrumb(d.id, departments)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingDept(d)} className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-all">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteDept(d.id)} className="p-2 text-gray-400 hover:text-red-600 bg-red-50 rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">上級單位</p>
                    <p className="text-xs font-medium text-gray-700">
                      {departments.find(parent => parent.id === d.parentId)?.name || '無'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">層級</p>
                    <span className="text-xs font-medium text-gray-700">{d.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {(editingUser || isAddingUser) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{isAddingUser ? '新增使用者' : '編輯使用者'}</h3>
                <button onClick={() => { setEditingUser(null); setIsAddingUser(false); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                {isAddingUser && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">人員名稱 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={newUser.displayName}
                      onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                      className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all"
                      placeholder="例如：王小明"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">單位 <span className="text-red-500">*</span></label>
                  <HierarchySelect
                    departments={departments}
                    value={isAddingUser ? (newUser.departmentId || null) : (editingUser?.departmentId || null)}
                    onChange={(val) => isAddingUser
                      ? setNewUser({ ...newUser, departmentId: val || '' })
                      : setEditingUser(editingUser ? { ...editingUser, departmentId: val || '' } : null)
                    }
                    placeholder="請選擇單位"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">權限角色</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(['user', 'admin', 'super_admin'] as Role[]).map(role => (
                      <button
                        key={role}
                        onClick={() => isAddingUser
                          ? setNewUser({ ...newUser, role })
                          : setEditingUser(editingUser ? { ...editingUser, role } : null)
                        }
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          (isAddingUser ? newUser.role === role : editingUser?.role === role) ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-sm">{role === 'super_admin' ? '超級管理員' : role === 'admin' ? '單位管理者' : '一般使用者'}</div>
                        </div>
                        {(isAddingUser ? newUser.role === role : editingUser?.role === role) && <CheckCircle size={20} className="text-black" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setEditingUser(null); setIsAddingUser(false); }} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all">取消</button>
                  <button 
                    onClick={() => isAddingUser ? handleSaveUser(newUser) : handleSaveUser(editingUser!)} 
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                  >
                    {isAddingUser ? '確認新增' : '儲存變更'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Dept Modal */}
      {(isAddingDept || editingDept) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingDept ? '編輯單位' : '新增單位'}</h3>
                <button onClick={() => { setIsAddingDept(false); setEditingDept(null); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">單位名稱 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editingDept ? editingDept.name : newDept.name}
                    onChange={(e) => editingDept ? setEditingDept({ ...editingDept, name: e.target.value }) : setNewDept({ ...newDept, name: e.target.value })}
                    className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all"
                    placeholder="例如：研發部"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">上級單位</label>
                  <HierarchySelect
                    departments={departments}
                    value={editingDept ? (editingDept.parentId || null) : (newDept.parentId || null)}
                    onChange={(val) => editingDept 
                      ? setEditingDept({ ...editingDept, parentId: val }) 
                      : setNewDept({ ...newDept, parentId: val })
                    }
                    excludeId={editingDept?.id}
                    placeholder="無 (第一層級)"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setIsAddingDept(false); setEditingDept(null); }} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all">取消</button>
                  <button onClick={() => handleSaveDept(editingDept || newDept)} className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">確認</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Reassign Users Modal */}
      {reassigningDept && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">轉移人員並刪除單位</h3>
                <button onClick={() => setReassigningDept(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <p className="text-sm text-amber-800 font-medium">
                    此單位目前有 {reassigningDept.users.length} 位人員，請先將其轉移至其他單位後再行刪除。
                  </p>
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-2 p-2 border-2 border-gray-50 rounded-2xl">
                  {reassigningDept.users.map(u => (
                    <div key={u.uid} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-xl">
                      <span className="font-bold">{u.displayName}</span>
                      <span className="text-gray-500 text-xs">{u.email}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">轉移至新單位 <span className="text-red-500">*</span></label>
                  <HierarchySelect
                    departments={departments}
                    value={bulkTargetDeptId || null}
                    onChange={(val) => setBulkTargetDeptId(val || '')}
                    excludeId={reassigningDept.id}
                    placeholder="請選擇目標單位"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setReassigningDept(null)} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all">取消</button>
                  <button 
                    onClick={handleBulkReassign} 
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                  >
                    確認轉移並刪除
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
