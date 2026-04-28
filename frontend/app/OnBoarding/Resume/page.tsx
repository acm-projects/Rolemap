"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { ArrowLeft, ArrowRight, Upload, CheckCircle, ExternalLink } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

export default function ResumeUpload() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Skip typing animation if page was already visited
  const [animationDone, setAnimationDone] = useState(false);
  useEffect(() => {
    // If this page loaded inside a popup to complete OAuth, close immediately
    if (searchParams.get("popup_close") === "1" && window.opener) {
      window.close();
      return;
    }
    if (sessionStorage.getItem("resume_visited") === "1") setAnimationDone(true);
    sessionStorage.setItem("resume_visited", "1");
    const saved = sessionStorage.getItem("resume_uploaded");
    if (saved) setFileName(saved);
  }, []);

  // Cleanup popup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const githubUsername = (session?.user as { githubUsername?: string } | undefined)?.githubUsername;
  const githubVerified = !!(session?.user as { provider?: string } | undefined)?.provider?.includes?.("github") || !!githubUsername;

  const canContinue = !!fileName || githubVerified;

  const handleGithubAuth = () => {
    if (githubVerified || githubLoading) return;
    setGithubLoading(true);
    const callbackUrl = encodeURIComponent(
      `${window.location.origin}/OnBoarding/Resume?popup_close=1`
    );
    const url = `/api/auth/signin/github?callbackUrl=${callbackUrl}`;
    const popup = window.open(url, "github-auth", "width=620,height=720,left=200,top=100");
    popupRef.current = popup;

    pollRef.current = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        popupRef.current = null;
        await updateSession();
        setGithubLoading(false);
      }
    }, 500);
  };

  const uploadFile = async (file: File) => {
    setFileName(file.name);
    setUploading(true);
    try {
      await api.uploadResume(file);
      sessionStorage.setItem("resume_uploaded", file.name);
    } catch {
      // Show filename even if upload fails
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

  const avatarUrl = githubUsername
    ? `https://avatars.githubusercontent.com/${githubUsername}`
    : null;

  return (
    <div className="relative h-screen overflow-hidden w-full bg-linear-to-b from-[#334155] to-[#E1FAFF] p-3 flex flex-col">
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
          {/* GitHub Connect — LEFT */}
          {githubVerified ? (
            <div className="pixel-border flex flex-col items-center justify-center gap-4 p-6 border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#BEF8FF]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={githubUsername ?? "GitHub avatar"}
                  className="w-20 h-20 pixel-border border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF]"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="w-20 h-20 flex items-center justify-center pixel-border border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#334155]">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl text-[#334155] font-jersey text-center">
                  {githubUsername ? `@${githubUsername}` : "GitHub Connected"}
                </span>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-[#04A0FF]" />
                  <span className="text-base text-[#78ADCF] font-jersey">Verified</span>
                </div>
                {githubUsername && (
                  <a
                    href={`https://github.com/${githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-[#04A0FF] font-jersey hover:underline mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>View profile</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={handleGithubAuth}
              disabled={githubLoading}
              className="pixel-border cursor-pointer flex flex-col items-center justify-center gap-3 p-6 transition-all duration-100 border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-white hover:bg-[#E1FAFF] disabled:opacity-70 disabled:cursor-wait"
            >
              <div className="w-14 h-14 flex items-center justify-center pixel-border border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-[#334155]">
                {githubLoading ? (
                  <span className="text-white font-jersey text-xs">...</span>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
              </div>
              <span className="text-xl text-[#334155] font-jersey text-center">
                {githubLoading ? "Waiting for auth..." : "Connect GitHub"}
              </span>
              <span className="text-md text-[#78ADCF] font-jersey text-center">Import your commit history and repos</span>
            </button>
          )}

          {/* Resume Upload — RIGHT */}
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
                <span className="text-xs text-[#78ADCF] font-jersey">{uploading ? "Uploading..." : "Click to replace"}</span>
              </>
            ) : (
              <>
                <span className="text-xl text-[#334155] font-jersey text-center">Upload Resume / CV</span>
                <span className="text-md text-[#78ADCF] font-jersey">PDF or DOCX · up to 5MB</span>
              </>
            )}
          </div>
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
