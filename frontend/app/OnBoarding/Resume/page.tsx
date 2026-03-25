"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;
const PROGRESS = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

const ResumeUpload: React.FC = () => {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canContinue = !!file || githubConnected;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  return (
    <div className="min-h-[100vh] font-[Inter] bg-[#E4E4E4] flex flex-col">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-[#d4d4d4] px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#508484] flex items-center justify-center text-white text-xs font-bold">
            RM
          </div>
          <span className="font-bold text-[#1B1B1B] text-base">RoleMap</span>
        </div>
        <button className="text-sm text-[#508484] font-semibold hover:text-[#6a9e9e] transition-colors duration-200">
          Save & Exit
        </button>
      </nav>

      {/* Main */}
      <main className="flex-1 max-w-[1040px] mx-auto w-full px-6 pt-12">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#508484] uppercase mb-1">
              Onboarding
            </p>
            <h1 className="text-[28px] font-extrabold text-[#1B1B1B]">
              Let's see where you're at
            </h1>
            <p className="text-sm text-[#555555] mt-1">
              Connect your accounts so we can skip what you already know.
            </p>
          </div>
          <div className="text-right shrink-0 ml-8">
            <p className="text-sm font-bold text-[#1B1B1B]">{PROGRESS}% Complete</p>
            <p className="text-xs text-[#a0b8b8] mt-0.5">Step {CURRENT_STEP} of {TOTAL_STEPS}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-[#d4d4d4] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-[#508484] rounded-full transition-all duration-500"
            style={{ width: `${PROGRESS}%` }}
          />
        </div>

        <div className="flex flex-col gap-4 max-w-full">
          {/* Drop Zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`
              bg-white rounded-xl p-14 cursor-pointer
              border-2 border-dashed transition-all duration-200
              flex flex-col items-center justify-center text-center gap-3
              ${dragging
                ? "border-[#508484] bg-[#d4d4d4]/40"
                : file
                  ? "border-[#508484] bg-[#E4E4E4]"
                  : "border-[#a0b8b8] hover:border-[#508484] hover:bg-[#E4E4E4]"
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFile}
            />
            <div className="w-12 h-12 rounded-full bg-[#d4d4d4] flex items-center justify-center text-[#508484] text-2xl">
              {file ? "✓" : "↑"}
            </div>
            {file ? (
              <>
                <p className="text-sm font-bold text-[#508484]">{file.name}</p>
                <p className="text-xs text-[#555555]">Click to replace</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#1B1B1B]">Upload Resume / CV</p>
                <p className="text-xs text-[#555555]">PDF or DOCX up to 5MB</p>
              </>
            )}
          </div>

          {/* GitHub Connect */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/OnBoarding/Generate" })}
            className="
              bg-white rounded-xl px-10 py-6 cursor-pointer
              border-2 border-transparent hover:border-[#a0b8b8]
              flex items-center gap-4 shadow-sm hover:shadow-md
              transition-all duration-200 text-left w-full
            "
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1B1B] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1B1B1B]">Connect GitHub</p>
              <p className="text-xs text-[#555555]">Import your commit history and repos</p>
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-[1040px] mx-auto w-full px-6 py-8">
        <div className="border-t border-[#d4d4d4] pt-6 flex justify-between items-center">
          <button
            onClick={() => router.push("/OnBoarding/Preferences")}
            className="flex items-center gap-2 text-sm text-[#555555] font-medium hover:text-[#1B1B1B] transition-colors duration-200"
          >
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/OnBoarding/Generate")}
              className="px-5 py-2 rounded-lg border-2 border-[#a0b8b8] text-[#508484] font-semibold text-sm hover:bg-[#d4d4d4] transition-all duration-200"
            >
              Skip for now
            </button>
            <button
              onClick={() => router.push("/OnBoarding/Generate")}
              disabled={!canContinue}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200
                ${canContinue ? "bg-[#508484] text-white hover:bg-[#6a9e9e]" : "bg-[#d4d4d4] text-[#a0b8b8] cursor-not-allowed"}`}
            >
              Continue →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResumeUpload;