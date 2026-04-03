import React, { useState } from 'react';
import { Shield, Users, Lock, Trash2, X } from 'lucide-react';
import { localDb } from '../../lib/localDb';

export function LoginView({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username) {
      onLogin(username);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <div className="w-20 h-20 bg-[#141414] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">電子表單系統</h1>
        <p className="text-gray-500 text-center mb-8">模擬登入模式 (輸入任何帳號密碼即可登入)</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
                required
              />
              {username && (
                <button
                  type="button"
                  onClick={() => setUsername('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#141414] outline-none transition-all"
                required
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setPassword('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-3"
          >
            登入系統
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase tracking-wider">
              <Shield size={14} /> 系統管理員專區
            </h4>
            <p className="text-[10px] text-red-400 mb-3">
              若儲存空間已滿或需要重新開始，請使用此功能。這將清除所有帳號、表單與附件。
            </p>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Trash2 size={16} /> 重設系統資料 (清除所有儲存空間)
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await localDb.clearAllData();
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full py-3 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Trash2 size={16} /> 確定重設 (此動作無法復原)
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-2 text-[10px] text-gray-400 hover:text-gray-600 transition-all"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
