import React, { useState, useRef } from 'react';
import { UserProfile, Role } from '../../types';
import { localDb } from '../../lib/localDb';
import { DEPARTMENTS } from '../../constants/departments';
import { Upload, Download, Edit, X, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function UserManagementView({ users, showToast }: { users: UserProfile[], showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    const user = users.find(u => u.uid === uid);
    if (user) {
      try {
        await localDb.saveUser({ ...user, ...updates });
        showToast('使用者資料已更新');
        setEditingUser(null);
      } catch (e: any) {
        showToast(e.message || '更新失敗', 'error');
      }
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

        if (!Array.isArray(importedUsers)) {
          throw new Error('無效的檔案格式 (應為陣列)');
        }

        let successCount = 0;
        for (const u of importedUsers) {
          if (u.uid && u.email && u.role) {
            await localDb.saveUser(u);
            successCount++;
          }
        }

        showToast(`成功匯入 ${successCount} 筆帳號資料`);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
          <h2 className="text-3xl font-bold tracking-tight">帳號管理</h2>
          <p className="text-gray-500 text-sm">管理系統內所有使用者的權限與單位</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportUsers}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
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
      </header>

      <div className="bg-white rounded-3xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E5E5E5]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">使用者</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">單位</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">權限</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">註冊時間</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {users.map(u => (
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
                    <span className="text-sm">
                      {DEPARTMENTS.find(d => d.id === u.departmentId)?.name || '未知單位'}
                    </span>
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
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden divide-y divide-gray-100">
          {users.map(u => (
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
                <button 
                  onClick={() => setEditingUser(u)}
                  className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-all"
                >
                  <Edit size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">單位</p>
                  <p className="text-xs font-medium text-gray-700">
                    {DEPARTMENTS.find(d => d.id === u.departmentId)?.name || '未知單位'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">註冊時間</p>
                  <p className="text-xs font-medium text-gray-700">
                    {new Date(u.createdAt).toLocaleDateString()}
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">編輯使用者權限</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">單位</label>
                  <select 
                    value={editingUser.departmentId}
                    onChange={(e) => setEditingUser({ ...editingUser, departmentId: e.target.value })}
                    className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">權限角色</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(['user', 'admin', 'super_admin'] as Role[]).map(role => (
                      <button
                        key={role}
                        onClick={() => setEditingUser({ ...editingUser, role })}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          editingUser.role === role ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-sm">
                            {role === 'super_admin' ? '超級管理員' : role === 'admin' ? '單位管理者' : '一般使用者'}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {role === 'super_admin' ? '最高權限，可管理所有表單與帳號' : 
                             role === 'admin' ? '可審核所屬單位及其下屬單位表單' : 
                             '僅能提交表單與查看回傳記錄'}
                          </div>
                        </div>
                        {editingUser.role === role && <CheckCircle size={20} className="text-black" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleUpdateUser(editingUser.uid, { role: editingUser.role, departmentId: editingUser.departmentId })}
                    className="flex-1 py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
                  >
                    儲存變更
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
