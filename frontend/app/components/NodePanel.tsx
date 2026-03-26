'use client';

import React from 'react';
import Link from 'next/link';

export type NodePanelData = { 
  label: string; 
  progress: number; 
  description: string; 
  learningGoals: string[]; 
  locked: boolean; 
};

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
  </svg>
);

export function NodePanel({ data, onClose }: { data: NodePanelData; onClose: () => void }) {
  const statusText = data.progress === 100 ? "Completed" : data.progress > 0 ? "In Progress" : "Not Started";

  return (
    <div className="fixed top-0 right-0 h-full w-[500px] z-50 flex flex-col animate-slide-in pointer-events-none">
      <div className="mt-20 mb-6 mr-6 bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden flex-1 pointer-events-auto">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-700 leading-tight">{data.label}</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Progress: {data.progress}% — <span className="text-[#4a7c7c]">{statusText}</span>
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4a7c7c] transition-all duration-700" 
              style={{ width: `${data.progress}%` }} 
            />
          </div>
        </div>

        {/* Content: Added custom-scrollbar class */}
        <div className="px-6 py-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
          <section>
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">
              About this Module
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {data.description}
            </p>
          </section>

          <section>
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">
              Key Learning Goals
            </h3>
            <ul className="space-y-4">
              {data.learningGoals?.map((goal, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#4a7c7c] flex-shrink-0 flex items-center justify-center mt-0.5">
                    <CheckIcon />
                  </div>
                  <span className="text-sm text-slate-600 font-medium leading-tight">
                    {goal}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-50">
          <Link 
            href="/daily" 
            className="block w-full bg-[#4a7c7c] hover:bg-[#3d6e6e] text-white font-bold text-sm py-4 rounded-2xl text-center shadow-lg shadow-[#4a7c7c]/10 transition-all active:scale-[0.98]"
          >
            {data.progress > 0 ? 'Continue Learning' : 'Start Module'} →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in { 
          from { transform: translateX(100%); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        .animate-slide-in { 
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        
        /* Custom Clean Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}