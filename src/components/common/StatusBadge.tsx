import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '審核中' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: '已核准' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已駁回' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已完成' },
    voided: { bg: 'bg-gray-100', text: 'text-gray-700', label: '已作廢' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
