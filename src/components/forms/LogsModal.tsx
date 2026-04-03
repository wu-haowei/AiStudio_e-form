import React from 'react';
import { motion } from 'framer-motion';
import { History, X, Plus, Edit, Trash2, Upload, CheckCircle } from 'lucide-react';
import { Form } from '../../types';

interface LogsModalProps {
  form: Form;
  onClose: () => void;
}

export function LogsModal({ form, onClose }: LogsModalProps) {
  const actionLabels: Record<string, string> = {
    create: '建立表單',
    edit: '編輯內容',
    delete: '刪除表單',
    approve: '核准表單',
    reject: '駁回表單',
    respond: '回傳資料'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <History size={20} /> 操作紀錄
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {form.logs?.slice().reverse().map((log) => (
              <div key={log.id} className="relative pl-10">
                <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center z-10 ${
                  log.action === 'delete' ? 'bg-red-100 text-red-600' :
                  log.action === 'approve' ? 'bg-green-100 text-green-600' :
                  log.action === 'reject' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {log.action === 'create' ? <Plus size={14} /> : 
                   log.action === 'edit' ? <Edit size={14} /> :
                   log.action === 'delete' ? <Trash2 size={14} /> :
                   log.action === 'respond' ? <Upload size={14} /> :
                   <CheckCircle size={14} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{actionLabels[log.action] || log.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    執行者: {log.userName} • {new Date(log.timestamp).toLocaleString()}
                  </p>
                  {log.details && <p className="text-xs text-gray-400 mt-1 italic">{log.details}</p>}
                </div>
              </div>
            ))}
            {(!form.logs || form.logs.length === 0) && (
              <div className="text-center py-8 text-gray-400">尚無紀錄</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
