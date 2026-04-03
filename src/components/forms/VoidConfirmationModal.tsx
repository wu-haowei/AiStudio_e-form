import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';

interface VoidConfirmationModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function VoidConfirmationModal({ onCancel, onConfirm }: VoidConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">確定要作廢嗎？</h3>
        <p className="text-gray-500 text-sm mb-8">作廢後此表單將從儀表板中隱藏，但仍可在管理介面中追溯。</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all"
          >
            確認作廢
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface VoidResponseConfirmationModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function VoidResponseConfirmationModal({ onCancel, onConfirm }: VoidResponseConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">確定要作廢此筆回傳嗎？</h3>
        <p className="text-gray-500 text-sm mb-8">作廢後該檔案將無法被下載，且會標記為已作廢。</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all"
          >
            確認作廢
          </button>
        </div>
      </motion.div>
    </div>
  );
}
