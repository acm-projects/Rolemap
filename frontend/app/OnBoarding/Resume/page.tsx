"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

export default function ResumeUpload() {
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
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col justify-between flex-1">
        {/* Header */}
        <div className="mb-1">
          <PixelProgress value={80} showLabel={true} />
          <TypewriterText
            text="Let's see where you're at"
            speed={40}
            delay={400}
            className="text-5xl text-[#2d5050] leading-relaxed block"
          />
          <TypewriterText
            text="Connect your accounts so we can skip what you already know and personalize your roadmap."
            speed={20}
            delay={1600}
            className="text-2xl text-[#4e8888] leading-relaxed max-w-2xl block mb-4"
          />
        </div>

        {/* Upload area + GitHub side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mb-2">
          {/* Drop Zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`
              pixel-border cursor-pointer flex flex-col items-center justify-center gap-3 p-6 transition-all duration-100
              ${dragging
                ? "border-[#4e8888] bg-[#e8f4f4]"
                : file
                  ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]"
                  : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white hover:bg-[#f0f8f8]"
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
            <div className={`w-14 h-14 flex items-center justify-center pixel-border ${file ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4] text-[#2d5050]" : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white text-[#4e8888]"}`}>
              {file
                ? <span className="text-2xl font-jersey text-[#4e8888]">✓</span>
                : <Upload size={22} className="text-[#4e8888]" />
              }
            </div>
            {file ? (
              <>
                <span className="text-base text-[#2d5050] font-jersey text-center">{file.name}</span>
                <span className="text-xs text-[#4e8888] font-jersey">Click to replace</span>
              </>
            ) : (
              <>
                <span className="text-xl text-[#2d5050] font-jersey text-center">Upload Resume / CV</span>
                <span className="text-md text-[#4e8888] font-jersey">PDF or DOCX · up to 5MB</span>
              </>
            )}
          </div>

          {/* GitHub Connect */}
          <div
            onClick={() => signIn("github", { callbackUrl: "/OnBoarding/Generate" })}
            className={`
              pixel-border cursor-pointer flex flex-col items-center justify-center gap-3 p-6 transition-all duration-100
              ${githubConnected
                ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]"
                : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white hover:bg-[#f0f8f8]"
              }
            `}
          >
            <div className={`w-14 h-14 flex items-center justify-center pixel-border ${githubConnected ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#2d5050]" : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-[#2d5050]"}`}>
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <span className="text-xl text-[#2d5050] font-jersey text-center">
              {githubConnected ? "GitHub Connected ✓" : "Connect GitHub"}
            </span>
            <span className="text-md text-[#4e8888] font-jersey text-center">
              Import your commit history and repos
            </span>
            {githubConnected && (
              <span className="text-xs text-[#4e8888] font-jersey">Connected ✓</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3">
          <PixelButton variant="ghost" onClick={() => router.push("../OnBoarding/Preferences")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton variant="secondary" onClick={() => router.push("../OnBoarding/Generate")} size="md">
              Skip for now
            </PixelButton>
            <PixelButton
              variant="primary"
              onClick={() => router.push("../OnBoarding/Generate")}
              size="md"
              disabled={!canContinue}
            >
              <div className="flex items-center gap-2 text-xl">
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </PixelButton>
          </div>
        </div>
      </div>

      <style>{`
        .pixel-border {
          border-width: 4px;
          border-style: solid;
          box-shadow: 0 4px 0 0 rgba(0,0,0,0.3), inset 0 -2px 0 0 rgba(0,0,0,0.2);
          image-rendering: pixelated;
        }
        .pixel-border:active {
          box-shadow: 0 2px 0 0 rgba(0,0,0,0.3), inset 0 2px 0 0 rgba(0,0,0,0.2);
        }
        * { image-rendering: pixelated; -webkit-font-smoothing: none; }
      `}</style>
    </div>
  );
}