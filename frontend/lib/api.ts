const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Character {
  skin: string;
  eyes: string;
  clothes: string;
  pants: string;
  shoes: string;
  hair: string;
  accessories: string;
  color_variants: Record<string, number>;
}

export const DEFAULT_CHARACTER: Character = {
  skin: "char1.png",
  eyes: "eyes.png",
  clothes: "suit.png",
  pants: "pants.png",
  shoes: "shoes.png",
  hair: "buzzcut.png",
  accessories: "",
  color_variants: {},
};

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

  getCharacter: () =>
    apiFetch<Character>("/api/v1/users/me/character"),

  saveCharacter: (character: Partial<Character>) =>
    apiFetch<Character>("/api/v1/users/me/character", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(character),
    }),

  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ success: boolean; filename: string }>(
      "/api/v1/onboarding/resume",
      { method: "POST", body: fd }
    );
  },
};
