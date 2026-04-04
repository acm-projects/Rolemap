'use client';
<<<<<<< HEAD
import { useState, useEffect } from "react";
=======
import { useEffect, useState } from "react";
>>>>>>> d7be10439bb332672b1fe410b20b7579dbf96af6
import { Navbar } from "../components/NavBar";
import Image, { type StaticImageData } from "next/image";
import pic3 from "../tasks/html.png";
import pic4 from "../tasks/css.png";
import pic5 from "../tasks/js.png";
import pic6 from "../tasks/target.png";
import { TaskBreakdownPanel } from "../components/TaskBreakdownTab";
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import quests from '../../icons/quests.png';
import star from '../../icons/star.png';
import { api, type Task, type Achievement } from "@/lib/api";

const TAG_ICONS: Record<string, StaticImageData> = {
  HTML: pic3,
  CSS: pic4,
  JS: pic5,
  Python: pic6,
};
const TAG_COLORS: Record<string, string> = {
  HTML: '#E8593C',
  CSS: '#3B8BD4',
  JS: '#F0C040',
  Python: '#4B8BBE',
};

export default function DailyPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
<<<<<<< HEAD
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    api.tasks()
      .then(d => {
        setTasks(d.tasks);
        setAchievements(d.achievements);
        setCompleted(d.tasks.filter(t => t.status === 'completed').map(t => t.id));
      })
      .catch(console.error);
  }, []);

  const activeTaskObj = tasks.find(t => t.id === activeTask);
  const activeModule = activeTaskObj
    ? {
        id: activeTaskObj.id,
        name: activeTaskObj.title,
        icon: TAG_ICONS[activeTaskObj.tag] ?? pic6,
        accentColor: TAG_COLORS[activeTaskObj.tag] ?? '#508484',
        tag: activeTaskObj.tag,
      }
    : null;
=======
  const [completed, setCompleted] = useState<string[]>(() => {
    const saved = localStorage.getItem('completedTasks');
    return saved ? JSON.parse(saved) : [];
  });
  const activeModule = modules.find((m) => m.id === activeTask);
>>>>>>> d7be10439bb332672b1fe410b20b7579dbf96af6

  useEffect(() => {
  localStorage.setItem('completedTasks', JSON.stringify(completed));
}, [completed]);

  function openTask(id: string) {
    setActiveTask(id);
    setAnimKey(k => k + 1);
    setDrawerOpen(true);
  }

  function handleMarkComplete() {
    if (activeTask) {
      setCompleted(prev => [...prev, activeTask]);
      api.updateTask(activeTask, 'completed').catch(console.error);
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
            <Image src={quests} alt="Quest Icon" className="h-10 w-10" />
            <p className="text-sm font-bold tracking-widest text-[#508484]/60 uppercase text-center justify-center">
              Daily Tasks
            </p>
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => openTask(task.id)}
              className={`
                relative overflow-hidden
                flex w-full h-[90px] rounded-2xl p-4 mt-4
                cursor-pointer bg-white
                border border-[#e8f0f0]
                hover:-translate-y-0.5 hover:shadow-md hover:border-[#c8dede]
                transition-all duration-200
                ${activeTask === task.id && drawerOpen ? 'border-[#508484] shadow-sm bg-[#f0f8f8]' : ''}
              `}
            >
              <div className="flex items-center gap-4 pl-3 w-full">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#f0f8f8] flex items-center justify-center">
                  <Image src={TAG_ICONS[task.tag] ?? pic6} alt={`${task.title} icon`} className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: TAG_COLORS[task.tag] ?? '#508484' }}>
                    {task.tag}
                  </span>
                  <h1 className="text-base text-[#2d5c5c] font-semibold leading-tight">{task.title}</h1>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 mr-2 ml-auto">
                  <input
                    type="checkbox"
                    checked={completed.includes(task.id)}
                    onChange={() => {
                      const isCompleted = completed.includes(task.id);
                      const newStatus = isCompleted ? 'not_started' : 'completed';
                      setCompleted(prev =>
                        isCompleted ? prev.filter(id => id !== task.id) : [...prev, task.id]
                      );
                      api.updateTask(task.id, newStatus).catch(console.error);
                    }}
                    className="h-6 w-6 border-[#508484]/30 text-[#508484] accent-[#508484] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Path Completion */}
          <div className="pt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#508484]/70">Path Completion</span>
              <span className="text-sm font-bold text-[#508484]">
                {tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#e4eeee] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#508484] rounded-full transition-all duration-700"
                style={{ width: tasks.length > 0 ? `${(completed.length / tasks.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* ── Right Panel (Badges) ── */}
        <div className="w-[350px] h-[calc(100vh-7rem)] rounded-3xl flex flex-col items-start justify-start p-8 bg-[#ffffff] border-2 border-transparent overflow-y-auto">
          <div className="flex flex-col w-full h-full gap-4">
            <div className="flex gap-4 items-center">
              <Image src={star} alt="Star Icon" className="h-10 w-10" />
              <p className="text-sm font-bold tracking-widest text-[#508484]/60 uppercase">
                Monthly Badges
              </p>
            </div>
            {achievements.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3 border border-[#e4eeee] hover:border-[#508484]/30 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#f0f8f8] border border-[#d0e8e8] flex items-center justify-center text-lg">
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#2d5c5c]">{badge.title}</span>
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
                <div className="absolute top-5 left-0 -ml-12 flex">
                  <button
                    onClick={closeDrawer}
                    className="rounded-full h-9 w-9 bg-white/90 flex items-center justify-center text-[#508484] hover:bg-white hover:text-[#1e4444] shadow-sm transition-all duration-150"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
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
