'use client';
import { useEffect, useState } from "react";
import { Navbar } from "../components/NavBar";
import Image from "next/image";
import pic3 from "../tasks/html.png";
import pic4 from "../tasks/css.png";
import pic5 from "../tasks/js.png";
import pic6 from "../tasks/target.png";
import { TaskBreakdownPanel } from "../components/TaskBreakdownTab";
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import quests from '../../icons/quests.png';
import star from '../../icons/star.png';

const modules = [
  { id: 'html', name: 'HTML Elements', icon: pic3, accentColor: '#E8593C', tag: 'HTML' },
  { id: 'css', name: 'CSS Styling', icon: pic4, accentColor: '#3B8BD4', tag: 'CSS' },
  { id: 'js', name: 'Javascript Components', icon: pic5, accentColor: '#F0C040', tag: 'JS' },
  { id: 'python', name: 'Python Fundamentals', icon: pic6, accentColor: '#4B8BBE', tag: 'Python' }
];

export default function DailyPage() {
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [completed, setCompleted] = useState<string[]>(() => {
    const saved = localStorage.getItem('completedTasks');
    return saved ? JSON.parse(saved) : [];
  });
  const activeModule = modules.find((m) => m.id === activeTask);

  useEffect(() => {
  localStorage.setItem('completedTasks', JSON.stringify(completed));
}, [completed]);

  function openTask(id: string) {
    setActiveTask(id);
    setAnimKey((k) => k + 1);
    setDrawerOpen(true);
  }

  function handleMarkComplete() {
    if (activeTask) {
      setCompleted((prev) => [...prev, activeTask]);
      closeDrawer();
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setActiveTask(null);
  }

  return (
    <div className="p-8 bg-[#f4f7f7] min-h-screen">
      <Navbar />

      <div className="flex justify-center gap-8 mt-20">

        {/* ── Left Panel (Daily Tasks) ── */}
        <div className="flex flex-col bg-white w-[400px] h-[calc(100vh-7rem)] rounded-3xl shadow-sm border border-[#e4eeee] p-6">
          <div className="flex items-center gap-4">
            <Image src={quests} alt="Quest Icon" className="h-10 w-10"/>
            <p className="text-sm font-bold tracking-widest text-[#508484]/60 uppercase text-center justify-center">
              Daily Tasks
            </p>
          </div>
          {modules.map((mod) => (
            <div
              key={mod.id}
              onClick={() => openTask(mod.id)}
              className={`
                relative overflow-hidden
                flex w-full h-[90px] rounded-2xl p-4 mt-4
                cursor-pointer bg-white
                border border-[#e8f0f0]
                hover:-translate-y-0.5 hover:shadow-md hover:border-[#c8dede]
                transition-all duration-200
                ${activeTask === mod.id && drawerOpen ? 'border-[#508484] shadow-sm bg-[#f0f8f8]' : ''}
              `}
            >
              <div className="flex items-center gap-4 pl-3 w-full">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#f0f8f8] flex items-center justify-center">
                  <Image src={mod.icon} alt={`${mod.name} icon`} className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: mod.accentColor }}>
                    {mod.tag}
                  </span>
                  <h1 className="text-base text-[#2d5c5c] font-semibold leading-tight">{mod.name}</h1>
                </div>
                <div
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 mr-2 ml-auto"
                >
                 <input
                 type="checkbox"
                 checked={completed.includes(mod.id)}
                  onChange={() =>
                    setCompleted((prev) =>
                      prev.includes(mod.id) ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]
                    )
                  }
                 className="h-6 w-6 border-[#508484]/30 text-[#508484] accent-[#508484] cursor-pointer"></input> 
                </div> 
              </div>
            </div>
          ))}

          {/* Path Completion */}
          <div className="pt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#508484]/70">Path Completion</span>
              <span className="text-sm font-bold text-[#508484]">
                {Math.round((completed.length / modules.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#e4eeee] rounded-full overflow-hidden">
              <div 
              className="h-full bg-[#508484] rounded-full transition-all duration-700 w-0" 
              style={{ width: `${(completed.length / modules.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Right Panel (Badges) ── */}
        <div className="w-[350px] h-[calc(100vh-7rem)] rounded-3xl flex flex-col items-start justify-start p-8 bg-[#ffffff] border-2 border-transparent overflow-y-auto">
          <div className="flex flex-col w-full h-full gap-4">
            <div className="flex gap-4 items-center">
              <Image src={star} alt="Star Icon" className="h-10 w-10"/>
              <p className="text-sm font-bold tracking-widest text-[#508484]/60 uppercase">
                Monthly Badges
              </p>
            </div>
            {[
              { name: "Zari's Movie Binge"},
              { name: "Eddy's Wood Carving Craft"},
              { name: "Duo's Chess Match"},
            ].map((badge) => (
              <div
                key={badge.name}
                className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3 border border-[#e4eeee] hover:border-[#508484]/30 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#f0f8f8] border border-[#d0e8e8] flex items-center justify-center text-lg">
                 
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#2d5c5c]">{badge.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Slide-over Drawer ── */}
      <Dialog open={drawerOpen} onClose={closeDrawer} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-[#1e4444]/30 backdrop-blur-sm transition-opacity duration-300 ease-in-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <DialogPanel
                transition
                className="pointer-events-auto relative w-[#500px] max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full"
              >
                {/* Close button */}
                <div className="absolute top-5 left-0 -ml-12 flex">
                  <button
                    onClick={closeDrawer}
                    className="rounded-full h-9 w-9 bg-white/90 flex items-center justify-center text-[#508484] hover:bg-white hover:text-[#1e4444] shadow-sm transition-all duration-150"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Drawer content */}
                <div className="flex w-[#500px] h-full flex-col overflow-y-auto bg-white shadow-2xl">
                  <div className="flex-1 px-10 py-10">
                    {activeModule && (
                      <TaskBreakdownPanel
                        animKey={animKey}
                        activeModule={activeModule}
                        onMarkComplete={handleMarkComplete}
                      />
                    )}
                  </div>
                </div>

              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

    </div>
  );
}