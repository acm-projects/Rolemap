"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { api } from "@/lib/api";
import { ArrowLeft, ArrowRight, Upload, CheckCircle } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

export default function ResumeUpload() {
  const router = useRouter();
  const { data: session } = useSession();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Skip typing animation if page was already visited (e.g. returning from GitHub OAuth)
  const [animationDone] = useState(() => sessionStorage.getItem('resume_visited') === '1');
  useEffect(() => {
    sessionStorage.setItem('resume_visited', '1');
    // Restore uploaded resume name after OAuth redirect
    const saved = sessionStorage.getItem('resume_uploaded');
    if (saved) setFileName(saved);
  }, []);

  // GitHub is verified if the session was created via GitHub OAuth
  const githubVerified = !!(session?.user as { provider?: string } | undefined)?.provider?.includes?.('github')
    || !!(session?.user as { githubUsername?: string } | undefined)?.githubUsername;

  const canContinue = !!fileName || githubVerified;

  // Upload immediately when a file is selected so it survives OAuth redirects
  const uploadFile = async (file: File) => {
    setFileName(file.name);
    setUploading(true);
    try {
      await api.uploadResume(file);
      sessionStorage.setItem('resume_uploaded', file.name);
    } catch {
      // Still show the file name even if upload fails
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) uploadFile(droppedFile);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadFile(e.target.files[0]);
  };

  const handleContinue = () => {
    router.push("/OnBoarding/Generate");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canContinue && !uploading) handleContinue();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canContinue, uploading]);

  return (
    <div className="relative h-screen overflow-hidden w-full bg-linear-to-b from-[#7EC8E3] to-[#E1FAFF] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col justify-between flex-1">
        <div className="mb-1">
          <PixelProgress value={80} showLabel={true} step={4} totalSteps={5} />
          <div className="min-h-[5rem]">
            <TypewriterText
              text="Let's see where you're at"
              speed={20}
              delay={400}
              startComplete={animationDone}
              className="text-5xl text-[#334155] leading-relaxed block"
            />
          </div>
          <div className="min-h-[7rem]">
            <TypewriterText
              text="Connect your accounts so we can skip what you already know and personalize your roadmap."
              speed={10}
              delay={animationDone ? 0 : 800}
              startComplete={animationDone}
              className="text-2xl text-[#78ADCF] leading-relaxed max-w-2xl block mb-4"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mb-2">
          {/* Resume Upload */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`
              pixel-border cursor-pointer flex flex-col items-center justify-center gap-3 p-6 transition-all duration-100
              ${dragging
                ? "border-[#04A0FF] bg-[#E1FAFF]"
                : fileName
                  ? "border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#BEF8FF]"
                  : "border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-white hover:bg-[#E1FAFF]"
              }
            `}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFile} />
            <div
              className={`w-14 h-14 flex items-center justify-center pixel-border ${
                fileName
                  ? "border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#BEF8FF] text-[#334155]"
                  : "border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-white text-[#78ADCF]"
              }`}
            >
              {fileName ? (
                <span className="text-2xl font-jersey text-[#04A0FF]">✓</span>
              ) : (
                <Upload size={22} className="text-[#4e8888]" />
              )}
            </div>
            {fileName ? (
              <>
                <span className="text-base text-[#334155] font-jersey text-center">{fileName}</span>
                <span className="text-xs text-[#78ADCF] font-jersey">{uploading ? 'Uploading...' : 'Click to replace'}</span>
              </>
            ) : (
              <>
                <span className="text-xl text-[#334155] font-jersey text-center">Upload Resume / CV</span>
                <span className="text-md text-[#78ADCF] font-jersey">PDF or DOCX · up to 5MB</span>
              </>
            )}
          </div>

          {/* GitHub Connect */}
          {githubVerified ? (
            <div className="pixel-border flex flex-col items-center justify-center gap-3 p-6 border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#BEF8FF]">
              <div className="w-14 h-14 flex items-center justify-center pixel-border border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#334155]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <span className="text-xl text-[#334155] font-jersey text-center">GitHub Connected</span>
              <div className="flex items-center gap-2 text-[#78ADCF]">
                <CheckCircle size={16} />
                <span className="text-sm font-jersey">
                  {(session?.user as { githubUsername?: string } | undefined)?.githubUsername
                    ? `@${(session.user as { githubUsername?: string }).githubUsername}`
                    : 'Verified'}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn("github", { callbackUrl: "/OnBoarding/Resume" })}
              className="pixel-border cursor-pointer flex flex-col items-center justify-center gap-3 p-6 transition-all duration-100 border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-white hover:bg-[#E1FAFF]"
              disabled={uploading}
            >
              <div className="w-14 h-14 flex items-center justify-center pixel-border border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-[#334155]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <span className="text-xl text-[#334155] font-jersey text-center">Connect GitHub</span>
              <span className="text-md text-[#78ADCF] font-jersey text-center">Import your commit history and repos</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <PixelButton variant="ghost" onClick={() => router.push("/OnBoarding/Preferences")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton variant="secondary" onClick={() => router.push("/OnBoarding/Generate")} size="md">
              Skip for now
            </PixelButton>
            <PixelButton
              variant="primary"
              onClick={handleContinue}
              size="md"
              disabled={!canContinue || uploading}
            >
              <div className="flex items-center gap-2 text-xl">
                <span>{uploading ? "Uploading..." : "Continue"}</span>
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
