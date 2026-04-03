import React from 'react';

export function StatCard({ label, value, icon }: { label: string, value: number, icon: any }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E5E5E5] flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
