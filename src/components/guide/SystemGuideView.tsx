import React, { useState } from 'react';
import { Info, History, Shield, LayoutDashboard, AlertCircle, Plus, FileText, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SystemGuideView() {
  const [activeCategory, setActiveCategory] = useState<'overview' | 'workflow' | 'roles' | 'features'>('overview');

  const categories = [
    { id: 'overview', label: '系統概覽', icon: <Info size={18} /> },
    { id: 'workflow', label: '流程說明', icon: <History size={18} /> },
    { id: 'roles', label: '權限說明', icon: <Shield size={18} /> },
    { id: 'features', label: '功能介紹', icon: <LayoutDashboard size={18} /> },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">系統介紹與操作指南</h2>
        <p className="text-gray-500">了解系統的運作流程、權限劃分與各項功能細節</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Category Navigation */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-[#E5E5E5] p-2 sticky top-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-[#141414] text-white shadow-lg' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl border border-[#E5E5E5] p-8 shadow-sm"
            >
              {activeCategory === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">系統概覽</h3>
                  <p className="text-gray-600 leading-relaxed">
                    本系統為一套全方位的「表單管理與審核平台」，旨在簡化企業內部的表單發佈、資料蒐集與多層級審核流程。
                    透過直觀的介面與靈活的工作流設定，確保每一份表單都能精準傳達至目標單位，並在嚴謹的審核機制下完成資料彙整。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                      <h4 className="font-bold text-blue-900 mb-2">核心價值</h4>
                      <ul className="text-sm text-blue-700 space-y-2">
                        <li>• 數位化表單，告別紙本作業</li>
                        <li>• 自動化審核流，提升行政效率</li>
                        <li>• 即時進度追蹤，掌握任務動態</li>
                        <li>• 權限嚴格控管，確保資料安全</li>
                      </ul>
                    </div>
                    <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100">
                      <h4 className="font-bold text-purple-900 mb-2">適用場景</h4>
                      <ul className="text-sm text-purple-700 space-y-2">
                        <li>• 跨部門資料調查與彙整</li>
                        <li>• 內部行政申請與核准</li>
                        <li>• 定期業務回報與追蹤</li>
                        <li>• 專案進度回報與審核</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'workflow' && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-gray-900">流程說明</h3>
                  
                  <div className="space-y-6">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-blue-600">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs">1</div>
                      表單發佈流程
                    </h4>
                    <div className="relative pl-8 border-l-2 border-dashed border-blue-200 ml-4 space-y-8">
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm" />
                        <p className="font-bold text-gray-900">建立表單</p>
                        <p className="text-sm text-gray-500">設計表單欄位、設定目標單位與審核工作流。</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm" />
                        <p className="font-bold text-gray-900">送交審核</p>
                        <p className="text-sm text-gray-500">表單建立後需經過單位主管、跨部門主管或總管理者核准。</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm" />
                        <p className="font-bold text-gray-900">正式發佈</p>
                        <p className="text-sm text-gray-500">審核通過後，目標單位的成員即可在「提交表單」頁面看到該表單。</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-green-600">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs">2</div>
                      資料回傳與審核流程
                    </h4>
                    <div className="relative pl-8 border-l-2 border-dashed border-green-200 ml-4 space-y-8">
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                        <p className="font-bold text-gray-900">填寫並提交</p>
                        <p className="text-sm text-gray-500">使用者填寫表單內容並上傳附件，提交後進入回傳審核流。</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                        <p className="font-bold text-gray-900">回傳審核</p>
                        <p className="text-sm text-gray-500">管理者在「表單管理」中審核回傳資料，可核准或駁回。</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[41px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                        <p className="font-bold text-gray-900">完成歸檔</p>
                        <p className="text-sm text-gray-500">核准後資料正式歸檔，建立者可於「檢視表單填寫資料」中查看。</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-4">
                    <h4 className="font-bold text-amber-900 flex items-center gap-2">
                      <AlertCircle size={20} /> 審核流程條件細節
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <p className="font-bold text-amber-800">1. 角色層級限制</p>
                        <p className="text-amber-700 leading-relaxed">
                          • <strong>單位主管：</strong>僅能審核所屬單位及下轄單位的申請。<br />
                          • <strong>跨部門主管：</strong>若表單涉及多個單位，需各單位主管皆核准後，方可進入下一階段。<br />
                          • <strong>總管理者：</strong>擁有最終裁決權，可跳過中間層級直接核准或駁回。
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-amber-800">2. 自動流轉條件</p>
                        <p className="text-amber-700 leading-relaxed">
                          • <strong>駁回機制：</strong>任何一層級駁回，流程即刻終止並通知提交者。<br />
                          • <strong>修改權限：</strong>審核中資料不可修改，若需更正必須由審核人駁回後重新提交。<br />
                          • <strong>逾期提醒：</strong>(開發中) 超過 3 天未審核將自動發送通知。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'roles' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">權限說明</h3>
                  <div className="space-y-4">
                    <div className="p-6 border border-red-100 bg-red-50/30 rounded-3xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-xl"><Shield size={20} /></div>
                        <h4 className="font-bold text-red-900 text-lg">總管理者 (Super Admin)</h4>
                      </div>
                      <p className="text-sm text-red-700 leading-relaxed">
                        擁有系統最高權限。可管理所有帳號、查看與審核全系統表單、作廢任何資料、管理組織架構。
                      </p>
                    </div>
                    <div className="p-6 border border-blue-100 bg-blue-50/30 rounded-3xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Shield size={20} /></div>
                        <h4 className="font-bold text-blue-900 text-lg">單位管理者 (Admin)</h4>
                      </div>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        負責管理所屬單位及下轄單位的表單。可審核該範圍內的表單發佈與回傳資料，並建立新表單。
                      </p>
                    </div>
                    <div className="p-6 border border-gray-100 bg-gray-50/30 rounded-3xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gray-200 text-gray-600 rounded-xl"><Users size={20} /></div>
                        <h4 className="font-bold text-gray-900 text-lg">一般使用者 (User)</h4>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        主要負責填寫表單。可查看被指派的表單、提交回傳資料，並追蹤自己提交資料的審核進度。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'features' && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-gray-900">功能介紹</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><LayoutDashboard size={20} /></div>
                        <h4 className="font-bold text-gray-900">儀表板 (Dashboard)</h4>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>• <strong>待辦事項：</strong>即時顯示需要您審核的表單或回傳資料。</li>
                        <li>• <strong>數據統計：</strong>個人提交與審核狀態的視覺化統計。</li>
                        <li>• <strong>最近參與：</strong>快速查看最近填寫或建立的表單進度。</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-xl"><Plus size={20} /></div>
                        <h4 className="font-bold text-gray-900">提交表單 (Submit)</h4>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>• <strong>表單列表：</strong>根據您的單位權限，顯示可填寫的表單。</li>
                        <li>• <strong>動態欄位：</strong>支援文字、數字、日期、附件等多樣化欄位。</li>
                        <li>• <strong>附件上傳：</strong>可直接於表單內選擇並上傳相關證明文件。</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><FileText size={20} /></div>
                        <h4 className="font-bold text-gray-900">表單管理與設定 (Manage)</h4>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>• <strong>欄位限制：</strong>每個表單最多支援 20 個自定義欄位。</li>
                        <li>• <strong>必填設定：</strong>可逐一設定欄位是否為必填，未填寫將無法提交。</li>
                        <li>• <strong>附件限制：</strong>單一附件大小上限為 10MB，僅支援常見文件與圖片格式。</li>
                        <li>• <strong>目標單位：</strong>可指定特定單位填寫，或設定為「公開」供全體人員填寫。</li>
                        <li>• <strong>審核流設定：</strong>可選擇「僅單位主管」或「需總管理者」等多種審核路徑。</li>
                        <li>• <strong>邏輯跳題：</strong>支援根據前題答案（如：是否上傳檔案）動態顯示/隱藏後續題目或變更必填屬性。</li>
                        <li>• <strong>欄位驗證：</strong>支援跨欄位比較（如：結束時間 B 必須大於等於開始時間 A），並可自定義錯誤提示訊息。</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><Users size={20} /></div>
                        <h4 className="font-bold text-gray-900">帳號管理 (Users)</h4>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>• <strong>帳號匯入/匯出：</strong>支援 JSON 格式批次管理帳號資料。</li>
                        <li>• <strong>權限變更：</strong>管理者可隨時調整使用者的角色與所屬單位。</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
