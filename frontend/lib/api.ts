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

export interface DashboardRoadmap {
  id: string;
  title: string;
  progress_percentage: number;
  status: string;
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
  tag: string;
  status: string;
  description: string;
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
};
