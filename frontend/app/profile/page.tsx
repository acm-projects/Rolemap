"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredXP } from "@/lib/xp";
import ResumeDocument, {
  AddedSkill,
  AddedProject,
} from "../components/ResumeDocument";

// ─── Types ────────────────────────────────────────────────────────────────────

type Equipped = {
  skin: string;
  eyes: string;
  clothes: string;
  pants: string;
  shoes: string;
  hair: string;
  accessories: string;
};

const DEFAULTS: Equipped = {
  skin: "char1.png",
  eyes: "eyes.png",
  clothes: "suit.png",
  pants: "pants.png",
  shoes: "shoes.png",
  hair: "buzzcut.png",
  accessories: "",
};

type SkillCategory =
  | "Languages"
  | "Frameworks"
  | "Developer Tools"
  | "Libraries";

type PickableProject = {
  id: string;
  name: string;
  tech: string;
  period: string;
  bullets: string[];
  source: "resume" | "roadmap";
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const API = `${API_BASE}/api/v1`;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}

// ─── CharacterPreview ─────────────────────────────────────────────────────────

function CharacterPreview({
  skin,
  eyes,
  clothes,
  pants = "",
  shoes = "",
  hair,
  accessory,
  size = 180,
  variants = {},
}: {
  skin: string;
  eyes: string;
  clothes: string;
  pants?: string;
  shoes?: string;
  hair: string;
  accessory: string;
  size?: number;
  variants?: Record<string, number>;
}) {
  const scale = size / 28;
  const bgH = Math.round(scale * 1568);
  const layers: [string, string][] = [
    [skin, "skin"],
    [pants, "pants"],
    [shoes, "shoes"],
    [clothes, "clothes"],
    [eyes, "eyes"],
    [hair, "hair"],
    [accessory, "accessories"],
  ];
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: size, height: size * 1.2 }}
    >
      {layers
        .filter(([f]) => f)
        .map(([f, cat], i) => {
          const v = variants[cat] ?? 0;
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(/characters/${f})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: `${-(v * 256 * scale) - (32 * scale - size) / 2}px 0`,
                backgroundSize: `auto ${bgH}px`,
                imageRendering: "pixelated",
              }}
            />
          );
        })}
    </div>
  );
}

// ─── Project Picker Modal ─────────────────────────────────────────────────────

function ProjectPickerModal({
  resumeProjects,
  roadmapProjects,
  addedProjects,
  onAdd,
  onClose,
}: {
  resumeProjects: PickableProject[];
  roadmapProjects: PickableProject[];
  addedProjects: AddedProject[];
  onAdd: (p: PickableProject) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"resume" | "roadmap">("resume");
  const addedIds = new Set(addedProjects.map((p) => p.name.toLowerCase()));

  const items = tab === "resume" ? resumeProjects : roadmapProjects;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#334155]/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border-4 border-[#334155] bg-[#f6feff] shadow-[10px_10px_0_0_#bfdfe4]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-[#334155] bg-[#dff7fb] p-4">
          <h3 className="pixel-font text-sm text-[#0f766e]">ADD_PROJECT</h3>
          <button
            onClick={onClose}
            className="px-2 text-3xl text-[#334155] hover:text-[#0f766e]"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-4 border-[#334155]">
          {(["resume", "roadmap"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 pixel-font py-3 text-sm transition-all
                ${
                  tab === t
                    ? "bg-[#7dd3e3] text-[#334155]"
                    : "bg-white text-[#64748b] hover:bg-[#edfafd]"
                }`}
            >
              {t === "resume" ? "FROM RESUME" : "COMPLETED NODES"}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-80 divide-y-2 divide-[#d8eef2] overflow-y-auto bg-white">
          {items.length === 0 && (
            <p className="pixel-font py-8 text-center text-sm text-[#64748b]">
              {tab === "resume"
                ? "NO RESUME PROJECTS FOUND"
                : "NO COMPLETED NODES YET"}
            </p>
          )}
          {items.map((proj) => {
            const already = addedIds.has(proj.name.toLowerCase());
            return (
              <div
                key={proj.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-base font-bold text-[#334155]">
                    {proj.name}
                  </p>
                  {proj.tech && (
                    <p className="text-sm text-[#0f766e]">{proj.tech}</p>
                  )}
                  {proj.period && (
                    <p className="text-sm text-[#64748b]">{proj.period}</p>
                  )}
                </div>
                <button
                  onClick={() => !already && onAdd(proj)}
                  disabled={already}
                  className={`ml-4 pixel-font flex-shrink-0 border-b-4 px-4 py-2 text-sm transition-all
                    ${
                      already
                        ? "cursor-default border-[#94a3b8] bg-[#e2e8f0] text-[#64748b]"
                        : "border-[#334155] bg-[#7dd3e3] text-[#334155] hover:bg-[#6bc5d7] active:translate-y-0.5 active:border-b-0"
                    }`}
                >
                  {already ? "ADDED" : "+ ADD"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── AddToResume Panel ────────────────────────────────────────────────────────

const SKILL_OPTIONS: Record<SkillCategory, string[]> = {
  Languages: ["JavaScript", "TypeScript", "Python", "Java", "C++"],
  Frameworks: ["React", "Next.js", "Node.js", "Express"],
  "Developer Tools": ["Git", "Docker", "VS Code", "Postman"],
  Libraries: ["TensorFlow", "Pandas", "NumPy", "Three.js"],
};

function AddToResumePanel({
  addedSkills,
  addedProjects,
  resumeProjects,
  roadmapProjects,
  onAddSkill,
  onAddProject,
  onRemoveSkill,
  onRemoveProject,
}: {
  addedSkills: AddedSkill[];
  addedProjects: AddedProject[];
  resumeProjects: PickableProject[];
  roadmapProjects: PickableProject[];
  onAddSkill: (s: AddedSkill) => void;
  onAddProject: (p: AddedProject) => void;
  onRemoveSkill: (name: string) => void;
  onRemoveProject: (id: string) => void;
}) {
  const [tab, setTab] = useState<"skill" | "project">("skill");
  const [skillCategory, setSkillCategory] =
    useState<SkillCategory>("Languages");
  const [skillName, setSkillName] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const inputCls =
    "w-full border-2 border-[#bfdfe4] bg-white px-3 py-3 text-base text-[#334155] focus:border-[#0f766e] focus:outline-none";
  const labelCls = "mb-2 block text-sm pixel-font text-[#64748b]";

  const handleAddSkill = () => {
    if (!skillName) return;
    onAddSkill({ category: skillCategory, name: skillName });
    setSkillName("");
  };

  return (
    <>
      {showPicker && (
        <ProjectPickerModal
          resumeProjects={resumeProjects}
          roadmapProjects={roadmapProjects}
          addedProjects={addedProjects}
          onAdd={(p) => {
            onAddProject({
              id: p.id,
              name: p.name,
              tech: p.tech,
              period: p.period,
              bullets: p.bullets,
            });
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="border-4 border-[#334155] bg-white shadow-[8px_8px_0_0_#bfdfe4]">
        {/* Header */}
        <div className="border-b-4 border-[#334155] bg-[#dff7fb] p-4">
          <h3 className="pixel-font text-sm text-[#334155]">ADD_TO_RESUME</h3>
        </div>

        {/* Tabs */}
        <div className="flex border-b-4 border-[#334155]">
          {(["skill", "project"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 pixel-font border-b-4 py-3 text-sm transition-all
                ${
                  tab === t
                    ? "border-[#334155] bg-[#7dd3e3] text-[#334155]"
                    : "border-[#bfdfe4] bg-[#f8fdff] text-[#64748b] hover:bg-[#edfafd]"
                }`}
            >
              {t === "skill" ? "SKILL" : "PROJECT"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-4 bg-[#f6feff] p-5">
          {tab === "skill" ? (
            <>
              <div>
                <label className={labelCls}>CATEGORY</label>
                <select
                  value={skillCategory}
                  onChange={(e) =>
                    setSkillCategory(e.target.value as SkillCategory)
                  }
                  className={inputCls}
                >
                  <option>Languages</option>
                  <option>Frameworks</option>
                  <option>Developer Tools</option>
                  <option>Libraries</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>SKILL</label>
                <select
                  className={inputCls}
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                >
                  <option value="">Select skill</option>
                  {SKILL_OPTIONS[skillCategory].map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddSkill}
                className="pixel-font w-full border-b-4 border-[#334155] bg-[#7dd3e3] py-3 text-sm text-[#334155] transition-all hover:bg-[#6bc5d7] active:translate-y-1 active:border-b-0"
              >
                + ADD SKILL
              </button>
            </>
          ) : (
            <>
              <p className="pixel-font text-sm leading-relaxed text-[#64748b]">
                ADD FROM YOUR RESUME OR COMPLETED ROADMAP NODES
              </p>
              <button
                onClick={() => setShowPicker(true)}
                className="pixel-font w-full border-b-4 border-[#334155] bg-[#7dd3e3] py-3 text-sm text-[#334155] transition-all hover:bg-[#6bc5d7] active:translate-y-1 active:border-b-0"
              >
                BROWSE PROJECTS
              </button>
            </>
          )}
        </div>

        {/* Added items */}
        {(addedSkills.length > 0 || addedProjects.length > 0) && (
          <div className="max-h-52 divide-y-2 divide-[#d8eef2] overflow-y-auto bg-white">
            {addedSkills.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-base font-bold text-[#334155]">{s.name}</p>
                  <p className="text-sm text-[#0f766e]">{s.category}</p>
                </div>
                <button
                  onClick={() => onRemoveSkill(s.name)}
                  className="px-2 text-2xl text-[#b91c1c] hover:text-[#991b1b]"
                >
                  x
                </button>
              </div>
            ))}
            {addedProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-base font-bold text-[#334155]">{p.name}</p>
                  <p className="text-sm text-[#0f766e]">
                    {p.tech || "Roadmap project"}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveProject(p.id)}
                  className="px-2 text-2xl text-[#b91c1c] hover:text-[#991b1b]"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [xp, setXp] = useState(0);
  const [equipped] = useState<Equipped>(() => {
  try {
    const raw = localStorage.getItem("character_saved");
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
  });
  const [colorVariants] = useState<Record<string, number>>(() => {
  try {
    const raw = localStorage.getItem("character_saved_variants");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
  });
  const [downloading, setDownloading] = useState(false);
  const [resumeScale, setResumeScale] = useState(0.83);

  // Resume state — hydrated from API on mount
  const [addedSkills, setAddedSkills] = useState<AddedSkill[]>([]);
  const [addedProjects, setAddedProjects] = useState<AddedProject[]>([]);

  // Pickable projects from resume + roadmap
  const [resumeProjects, setResumeProjects] = useState<PickableProject[]>([]);
  const [roadmapProjects, setRoadmapProjects] = useState<PickableProject[]>([]);

  // Profile info from parsed resume
  const [profileInfo, setProfileInfo] = useState<{
    name?: string;
    email?: string;
    url?: string;
  }>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch everything on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [profile, resumeProj, roadmapProj, activeResume] =
          await Promise.all([
            apiFetch("/profile"),
            apiFetch("/profile/resume-projects"),
            apiFetch("/profile/roadmap-projects"),
            apiFetch("/profile/resume/active"),
          ]);

        setProfileInfo(profile.profile ?? {});
        setResumeProjects(resumeProj);
        setRoadmapProjects(roadmapProj);
        setAddedSkills(activeResume.added_skills ?? []);
        setAddedProjects(activeResume.added_projects ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const setScale = () => {
      const wrapper = document.getElementById("resume-scale-wrapper");
      if (!wrapper) return;
      const container = wrapper.parentElement;
      if (!container) return;

      const scale = container.offsetWidth / 816;
      setResumeScale(scale);
    };

    setScale();
    window.addEventListener("resize", setScale);
    const timeoutId = window.setTimeout(setScale, 100);

    return () => {
      window.removeEventListener("resize", setScale);
      window.clearTimeout(timeoutId);
    };
  }, []);
  
  //fetch xp
  useEffect(() => {
  setXp(getStoredXP());
  const handler = (e: Event) => setXp((e as CustomEvent).detail);
  window.addEventListener("xp-updated", handler);
  return () => window.removeEventListener("xp-updated", handler);
  }, []);
  // ── Skill handlers (optimistic + API sync) ─────────────────────────────────
  const handleAddSkill = async (skill: AddedSkill) => {
    setAddedSkills((prev) => [...prev, skill]);
    try {
      await apiFetch("/profile/resume/add-skill", {
        method: "POST",
        body: JSON.stringify(skill),
      });
    } catch {
      // rollback on conflict
      setAddedSkills((prev) => prev.filter((s) => s.name !== skill.name));
    }
  };

  const handleRemoveSkill = async (name: string) => {
    setAddedSkills((prev) => prev.filter((s) => s.name !== name));
    try {
      await apiFetch(
        `/profile/resume/remove-skill/${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
    } catch {
      // best-effort; state already updated
    }
  };

  // ── Project handlers ───────────────────────────────────────────────────────
  const handleAddProject = async (proj: AddedProject) => {
    setAddedProjects((prev) => [...prev, proj]);
    try {
      const saved = await apiFetch("/profile/resume/add-project", {
        method: "POST",
        body: JSON.stringify({
          name: proj.name,
          tech: proj.tech,
          period: proj.period,
          bullets: proj.bullets,
        }),
      });
      // Replace optimistic id with server-generated uuid
      setAddedProjects((prev) =>
        prev.map((p) =>
          p.id === proj.id ? { ...p, id: saved.project.id } : p,
        ),
      );
    } catch {
      setAddedProjects((prev) => prev.filter((p) => p.id !== proj.id));
    }
  };

  const handleRemoveProject = async (id: string) => {
    setAddedProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await apiFetch(`/profile/resume/remove-project/${id}`, {
        method: "DELETE",
      });
    } catch {
      // best-effort
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const resumeEl = document.getElementById("resume-document");
      if (!resumeEl) return;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`<!DOCTYPE html>
<html><head>
  <title>Resume</title>
  <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Calibri, sans-serif; font-size: 10pt; } @page { margin:0; size:letter; } ul { list-style-type:disc; }</style>
</head><body>${resumeEl.outerHTML}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const variants: Record<string, number> = {
  skin:        colorVariants[equipped.skin]        ?? 0,
  eyes:        colorVariants[equipped.eyes]        ?? 0,
  clothes:     colorVariants[equipped.clothes]     ?? 0,
  pants:       colorVariants[equipped.pants]       ?? 0,
  shoes:       colorVariants[equipped.shoes]       ?? 0,
  hair:        colorVariants[equipped.hair]        ?? 0,
  accessories: colorVariants[equipped.accessories] ?? 0,
  };

  const stats = [
    { label: "LEVEL", val: "42" },
    { label: "XP", val: xp.toLocaleString()},
    { label: "STREAK", val: "7" },
    { label: "ROADMAPS", val: "3" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#E1FCFF] font-mono text-[#334155]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");
        .pixel-font {
          font-family: "Press Start 2P", cursive;
        }
        .px-box {
          border: 4px solid #334155;
          box-shadow: 8px 8px 0 0 #bfdfe4;
          image-rendering: pixelated;
        }
      `}</style>

      {/* ══════════ HEADER ══════════ */}
      <section
        className="flex border-b-4 border-[#334155] bg-[#f6feff]"
        style={{ minHeight: "380px" }}
      >
        {/* Avatar sidebar */}
        <div className="flex w-[320px] flex-shrink-0 items-start justify-center border-r-4 border-[#334155] bg-[#d2f6fb] p-6">
          <div className="px-box flex w-full flex-col items-center gap-4 bg-[#e8f5f5] p-4">
            <button
              onClick={() => router.back()}
              className="pixel-font w-full self-stretch border-b-4 border-[#334155] bg-white px-3 py-3 text-xs text-[#334155] transition-all hover:bg-[#edfafd] active:translate-y-1 active:border-b-0"
            >
              BACK
            </button>
            <div className="flex min-h-[280px] w-full items-center justify-center">
              <CharacterPreview
                size={210}
                skin={equipped.skin}
                eyes={equipped.eyes}
                clothes={equipped.clothes}
                pants={equipped.pants}
                shoes={equipped.shoes}
                hair={equipped.hair}
                accessory={equipped.accessories}
                variants={variants}
              />
            </div>
            <button
              onClick={() => router.push("/shop")}
              className="pixel-font w-full self-stretch border-b-4 border-[#334155] bg-[#7dd3e3] p-4 text-sm text-[#334155] transition-all hover:bg-[#6bc5d7] active:translate-y-1 active:border-b-0"
            >
              EDIT CHARACTER
            </button>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid flex-1 grid-cols-2 gap-5 overflow-hidden p-8">
          <div className="flex flex-col justify-center space-y-3 border-4 border-[#334155] bg-white p-7 shadow-[8px_8px_0_0_#bfdfe4]">
            <h1 className="pixel-font text-3xl leading-relaxed text-[#334155]">
              {loading
                ? "LOADING..."
                : (profileInfo.name?.toUpperCase() ?? "PLAYER_ONE")}
            </h1>
            <p className="pixel-font text-base uppercase text-[#334155]/50">
              Software Engineer
            </p>
          </div>

          <div className="flex flex-col justify-center space-y-5 border-4 border-[#334155] bg-white p-7 text-lg shadow-[8px_8px_0_0_#bfdfe4]">
            <div className="flex items-center text-xl text-[#334155]">
              <span className="mr-4 text-[#0f766e]">✉</span>
              {loading ? "..." : (profileInfo.email ?? "playerone@gmail.com")}
            </div>
            <div className="flex items-center text-xl text-[#334155]">
              <span className="mr-4 font-bold text-[#0f766e]">{"{}"}</span>
              {loading ? "..." : (profileInfo.url ?? "github.com/playerone")}
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="border-4 border-[#334155] bg-[#dff7fb] p-6 shadow-[6px_6px_0_0_#bfdfe4] flex flex-col text-center gap-10"
              >
                <p className="mb-3 pixel-font text-xs text-[#64748b]">
                  {s.label}
                </p>
                <p className=" flex flex-col items-center justify-center text-center pixel-font text-2xl text-[#334155]">
                  {s.val}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ MAIN ══════════ */}
      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-8 p-8">
        {/* Resume viewer */}
        <div className="col-span-8 space-y-4">
          <h2 className="pixel-font text-sm tracking-widest text-[#64748b]">
            RESUME.PDF
          </h2>

          {error && (
            <div className="pixel-font border-2 border-red-500 bg-red-100 px-4 py-3 text-sm text-red-700">
              API ERROR: {error} — showing cached/default state
            </div>
          )}

          <div className="overflow-hidden rounded-lg border-4 border-[#334155] bg-white shadow-[10px_10px_0_0_#bfdfe4]">
            <div className="flex items-center justify-between border-b-4 border-[#334155] bg-[#dff7fb] p-4">
              <div className="rounded bg-white px-4 py-2 text-xs text-[#334155] pixel-font">
                resume_final.pdf
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="pixel-font border-b-4 border-[#334155] bg-[#7dd3e3] px-4 py-3 text-sm text-[#334155] transition-colors hover:bg-[#6bc5d7] disabled:opacity-60"
              >
                {downloading ? "SAVING..." : "SAVE PDF"}
              </button>
            </div>

            <div
              className="flex items-start justify-center bg-[#cdeff5]"
              style={{ padding: "16px" }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  aspectRatio: "8.5 / 11",
                  background: "#fff",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "816px",
                    transformOrigin: "top left",
                    transform: `scale(${resumeScale})`,
                    fontFamily: "Calibri, sans-serif",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    textRendering: "geometricPrecision",
                  }}
                  id="resume-scale-wrapper"
                >
                  <ResumeDocument
                    addedSkills={addedSkills}
                    addedProjects={addedProjects}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="col-span-4 space-y-6">
          <AddToResumePanel
            addedSkills={addedSkills}
            addedProjects={addedProjects}
            resumeProjects={resumeProjects}
            roadmapProjects={roadmapProjects}
            onAddSkill={handleAddSkill}
            onAddProject={handleAddProject}
            onRemoveSkill={handleRemoveSkill}
            onRemoveProject={handleRemoveProject}
          />

          {/* Summary */}
          <div className="border-4 border-[#334155] bg-white p-6 text-[#334155] shadow-[8px_8px_0_0_#bfdfe4]">
            <h3 className="pixel-font mb-6 text-sm text-[#334155]">
              RESUME_SUMMARY
            </h3>
            <div className="space-y-4 text-lg">
              <div className="flex justify-between">
                <span className="text-[#64748b]">BASE EXPERIENCE</span>
                <span>3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">PROJECTS</span>
                <span>{2 + addedProjects.length}</span>
              </div>
              <div className="flex justify-between text-[#334155]">
                <span>ADDED SKILLS</span>
                <span>+{addedSkills.length}</span>
              </div>
              <hr className="border-[#bfdfe4]" />
              <div className="flex justify-between text-2xl font-bold">
                <span>SECTIONS</span>
                <span>4</span>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="pixel-font mt-6 w-full border-b-4 border-[#334155] bg-[#7dd3e3] p-4 text-sm text-[#334155] transition-all hover:bg-[#6bc5d7] disabled:opacity-60 active:translate-y-1 active:border-b-0"
            >
              {downloading ? "GENERATING..." : "DOWNLOAD PDF"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
