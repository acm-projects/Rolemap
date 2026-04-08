'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PixelProgress from './PixelProgress';
import PixelButton from './PixelButton';

export type NodePanelData = {
  label: string;
  progress: number;
  description: string;
  learningGoals: string[];
  subtopicCompletion: boolean[];
  locked: boolean;
  kind?: string;
};

const CloseIcon = () => (
  <svg id="times-circle-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
    <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-8,7v-1h-1v-1h-2v1h-1v1h-1v1h-1v-1h-1v-1h1v-1h1v-1h1v-2h-1v-1h-1v-1h-1v-1h1v-1h1v1h1v1h1v1h2v-1h1v-1h1v-1h1v1h1v1h-1v1h-1v1h-1v2h1v1h1v1h1v1h-1v1h-1v-1h-1Z"/>
  </svg>
);

const CheckCircleOutline = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <polygon points="19 9 19 10 18 10 18 11 17 11 17 12 16 12 16 13 15 13 15 14 14 14 14 15 13 15 13 16 12 16 12 17 10 17 10 16 9 16 9 15 8 15 8 14 7 14 7 13 6 13 6 12 7 12 7 11 8 11 8 12 9 12 9 13 10 13 10 14 12 14 12 13 13 13 13 12 14 12 14 11 15 11 15 10 16 10 16 9 17 9 17 8 18 8 18 9 19 9"/>
    <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-2,6v2h-1v2h-2v1h-2v1h-6v-1h-2v-1h-2v-2h-1v-2h-1v-6h1v-2h1v-2h2v-1h2v-1h6v1h2v1h2v2h1v2h1v6h-1Z"/>
  </svg>
);

const CheckCircleSolid = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-4,3h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1v-2h1v-1h2v1h1v1h2v-1h1v-1h1v-1h1v-1h1v-1h2v1h1v2h-1v1Z"/>
  </svg>
);

const AngleRightIcon = () => (
  <svg id="angle-right-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <polygon points="7 19 7 17 8 17 8 16 9 16 9 15 10 15 10 14 11 14 11 13 12 13 12 11 11 11 11 10 10 10 10 9 9 9 9 8 8 8 8 7 7 7 7 5 8 5 8 4 10 4 10 5 11 5 11 6 12 6 12 7 13 7 13 8 14 8 14 9 15 9 15 10 16 10 16 11 17 11 17 13 16 13 16 14 15 14 15 15 14 15 14 16 13 16 13 17 12 17 12 18 11 18 11 19 10 19 10 20 8 20 8 19 7 19"/>
  </svg>
);

export function NodePanel({ data, onClose }: { data: NodePanelData; onClose: () => void }) {
  const router = useRouter();
  const statusText = data.progress === 100 ? "Completed" : data.progress > 0 ? "In Progress" : "Not Started";
  const href = data.kind === 'quiz' ? `/quiz?label=${encodeURIComponent(data.label)}` : '/tasks';
  const buttonLabel = data.kind === 'quiz' ? 'Take Quiz' : data.progress > 0 ? 'Continue Learning' : 'Start Module';

  return (
    <div className="fixed top-0 right-0 h-full w-[500px] z-50 flex flex-col animate-slide-in pointer-events-none">
      <div className="mt-20 mb-6 mr-6 bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden flex-1 pointer-events-auto">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-4xl text-slate-700 leading-tight">{data.label}</h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-1"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-4">
            Progress: {data.progress}% — <span className="text-[#4a7c7c]">{statusText}</span>
          </p>
          <PixelProgress value={data.progress} showLabel={false} />
        </div>

        {/* Content: Added custom-scrollbar class */}
        <div className="px-6 py-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
          <section>
            <h3 className="text-lg text-slate-400 uppercase tracking-[0.15em] mb-3">
              About this Module
            </h3>
            <p className="text-lg text-slate-600 leading-relaxed">
              {data.description}
            </p>
          </section>

          <section>
            <h3 className="text-lg text-slate-400 uppercase tracking-[0.15em] mb-4">
              Subtopics
            </h3>
            <ul className="space-y-4">
              {data.learningGoals?.map((goal, idx) => {
                const done = data.subtopicCompletion?.[idx] ?? false;
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-0.5 ${done ? 'text-[#4a7c7c]' : 'text-slate-300'}`}>
                      {done ? <CheckCircleSolid /> : <CheckCircleOutline />}
                    </div>
                    <span className={`text-lg leading-tight ${done ? 'text-slate-600' : 'text-slate-400'}`}>
                      {goal}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-50 flex">
          <PixelButton variant="primary" size="md" onClick={() => router.push(href)}>
            <div className="flex items-center gap-2 text-xl">
              <span>{buttonLabel}</span>
              <AngleRightIcon />
            </div>
          </PixelButton>
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