const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  xp_total: number;
  current_streak: number;
  longest_streak: number;
  onboarding_completed: boolean;
  onboarding_step: number;
}

export interface DashboardUser {
  name: string;
  xp_total: number;
  current_streak: number;
}

export interface MinimapData {
  nodes: { x: number; y: number }[];
  edges: { a: number; b: number; done: boolean }[];
  done_nodes: number[];
}

export interface DashboardRoadmap {
  id: string;
  title: string;
  progress_percentage: number;
  status: string;
  minimap?: MinimapData;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  subtitle: string;
  streak: number;
  is_you: boolean;
  avatar: string;
  avatar_bg: string;
}

export interface DashboardResponse {
  user: DashboardUser;
  active_roadmap: DashboardRoadmap;
  roadmaps: DashboardRoadmap[];
  gamification: { tasks_completed: number; leaderboard_rank: number };
  leaderboard: LeaderboardEntry[];
}

export interface Checkpoint {
  id: string;
  roadmap_id: string;
  label: string;
  kind: string;
  progress: number;
  locked: boolean;
  position: { x: number; y: number };
  description: string;
  learning_goals: string[];
  subtopic_completion: boolean[];
}

export interface RoadmapEdge {
  id: string;
  roadmap_id: string;
  source: string;
  target: string;
}

export interface MapResponse {
  checkpoints: Checkpoint[];
  edges: RoadmapEdge[];
}

export interface Task {
  id: string;
  checkpoint_id: string | null;
  user_id: string;
  title: string;
  tag: string;        // "Learning" | "Coding"
  status: string;
  description: string;
  url: string;
  type: string;       // "Learning" | "Coding"
  objectives: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  earned_at: string;
}

export interface TasksResponse {
  tasks: Task[];
  achievements: Achievement[];
  current_subtopic: string | null;
  current_checkpoint_label: string | null;
  subtopic_index: number;
  total_subtopics: number;
}

export interface TaskResource {
  title: string;
  description: string;
  url: string;
  type: string; // "Learning" | "Coding"
  curated_by: string;
}

export interface TaskResourcesResponse {
  metadata: Record<string, unknown>;
  learning_tasks: TaskResource[];
  coding_tasks: TaskResource[];
  total_resources_found: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizResponse {
  checkpoint_id: string;
  label: string;
  questions: QuizQuestion[];
}

export interface SkillDecayEntry {
  id: string;
  skill: string;
  health: number;
  times_practiced: number;
  sm2_interval: number;
  sm2_easiness: string;
  sm2_repetitions: number;
  days_until_review: number;
  next_review: string;
  last_reviewed_at: string;
  decay_level: string;
}

export interface ShopItem {
  id: string;
  name: string;
  file: string;
  cost: number;
  unlocked: boolean;
}

export interface ShopResponse {
  items: Record<string, ShopItem[]>;
  equipped: Record<string, string>;
  gender: string;
  color_variants: Record<string, number>;
  xp_total: number;
}

// ── API calls ────────────────────────────────────────────────────────────────

export const api = {
  currentUser: () =>
    apiFetch<User>("/api/v1/users/me"),

  dashboard: () =>
    apiFetch<DashboardResponse>("/api/v1/dashboard"),

  roadmapMap: (roadmapId: string) =>
    apiFetch<MapResponse>(`/api/v1/roadmaps/${roadmapId}/map`),

  tasks: () =>
    apiFetch<TasksResponse>("/api/v1/tasks"),

  updateTask: (taskId: string, status: string) =>
    apiFetch<{ task_id: string; status: string }>(`/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),

  advanceTasks: () =>
    apiFetch<{ ok: boolean }>("/api/v1/tasks/advance", { method: "POST" }),

  taskResources: (concept: string, subtopic: string, job?: string) =>
    apiFetch<TaskResourcesResponse>(
      `/api/v1/tasks/resources?concept=${encodeURIComponent(concept)}&subtopic=${encodeURIComponent(subtopic)}${job ? `&job=${encodeURIComponent(job)}` : ''}`
    ),

  submitQuiz: (checkpointId: string, score: number, total: number) =>
    apiFetch<{ passed: boolean; score: number; total: number }>(
      `/api/v1/quiz/${checkpointId}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, total }),
      }
    ),

  quiz: (checkpointId: string) =>
    apiFetch<QuizResponse>(`/api/v1/quiz/${checkpointId}`),

  completeOnboarding: (data: Record<string, unknown>) =>
    apiFetch<{ success: boolean }>("/api/v1/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  generateRoadmap: (data: { role: string; github_username: string }) =>
    apiFetch<{ success: boolean; roadmap_id: string; steps_count: number; role: string }>(
      "/api/v1/onboarding/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(300_000), // 5 min timeout
      }
    ),

  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ success: boolean; filename: string }>(
      "/api/v1/onboarding/resume",
      { method: "POST", body: fd }
    );
  },

  /** SM-2 decay rows for roadmap checkpoints (mock_db). Default roadmap: rm-generated, else first active. */
  skillDecay: (roadmapId?: string) =>
    apiFetch<SkillDecayEntry[]>(
      roadmapId
        ? `/api/v1/skills/decay?roadmap_id=${encodeURIComponent(roadmapId)}`
        : "/api/v1/skills/decay"
    ),

  reviewSkillDecay: (id: string, quality: number) =>
    apiFetch<{ success: boolean; new_interval: number; next_review: string }>(
      "/api/v1/skills/decay/review",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quality }),
      }
    ),

  shop: () => apiFetch<ShopResponse>("/api/v1/shop"),

  shopPurchase: (category: string, item_id: string) =>
    apiFetch<{ ok: boolean; xp_total: number; items: Record<string, ShopItem[]> }>(
      "/api/v1/shop/purchase",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, item_id }),
      }
    ),

  shopAppearance: (body: {
    equipped: Record<string, string>;
    gender?: string;
    color_variants?: Record<string, number>;
  }) =>
    apiFetch<{ ok: boolean; equipped: Record<string, string>; gender: string; color_variants: Record<string, number> }>(
      "/api/v1/shop/appearance",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    ),
};
