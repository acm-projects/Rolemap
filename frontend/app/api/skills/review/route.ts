import { NextResponse } from "next/server";
import { sm2, calculateHealth, sm2card } from "@/lib/sm2";
import pool from "@/lib/db";
import { auth } from "@/auth";

// POST /api/tasks/review
// Called when a user completes or reviews a task
// Body: { taskId: string, quality: number (0-5) }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, quality } = await req.json();

  // Fetch current task progress for this user
  const { rows } = await pool.query(
    `SELECT utp.*, rc.sm2_interval, rc.sm2_easiness, rc.sm2_repetitions,
            rc.next_review, rc.last_reviewed_at, rc.health, rc.times_reviewed
     FROM user_task_progress utp
     JOIN tasks t ON t.id = utp.task_id
     JOIN roadmap_checkpoints rc ON rc.id = t.checkpoint_id
     WHERE utp.task_id = $1 AND utp.user_id = (
       SELECT id FROM users WHERE email = $2
     )`,
    [taskId, session.user.email]
  );

  // Build SM2Card from current values or use defaults for first review
  const current = rows[0];
  const currentCard: sm2card = current ? {
    sm2_interval: current.sm2_interval,
    sm2_easiness: current.sm2_easiness,
    sm2_repetitions: current.sm2_repetitions,
    next_review: current.next_review,
    last_reviewed_at: current.last_reviewed_at,
    health: current.health,
    times_reviewed: current.times_reviewed,
  } : {
    sm2_interval: 1,
    sm2_easiness: 2.5,
    sm2_repetitions: 0,
    next_review: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    health: 100,
    times_reviewed: 0,
  };

  // Run SM-2 to get updated values
  const updated = sm2(currentCard, quality);
  const health = calculateHealth(updated);

  // Update the checkpoint's SM-2 data
  await pool.query(
    `UPDATE roadmap_checkpoints
     SET sm2_interval = $1,
         sm2_easiness = $2,
         sm2_repetitions = $3,
         next_review = $4,
         last_reviewed_at = $5,
         health = $6,
         times_reviewed = $7,
         updated_at = NOW()
     WHERE id = (
       SELECT checkpoint_id FROM tasks WHERE id = $8
     )`,
    [
      updated.sm2_interval,
      updated.sm2_easiness,
      updated.sm2_repetitions,
      updated.next_review,
      updated.last_reviewed_at,
      health,
      updated.times_reviewed,
      taskId,
    ]
  );

  return NextResponse.json({
    success: true,
    decay: {
      sm2_interval: updated.sm2_interval,
      next_review: updated.next_review,
      last_reviewed_at: updated.last_reviewed_at,
      health,
      times_reviewed: updated.times_reviewed,
    }
  });
}

// GET /api/tasks/review?taskId=xxx
// Fetch current decay stats for a specific task
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  const { rows } = await pool.query(
    `SELECT rc.sm2_interval, rc.sm2_easiness, rc.sm2_repetitions,
            rc.next_review, rc.last_reviewed_at, rc.health, rc.times_reviewed
     FROM tasks t
     JOIN roadmap_checkpoints rc ON rc.id = t.checkpoint_id
     WHERE t.id = $1`,
    [taskId]
  );

  if (!rows[0]) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const data = rows[0];
  const now = new Date();
  const nextReview = new Date(data.next_review);
  const daysUntil = Math.ceil(
    (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return NextResponse.json({
    sm2_interval: data.sm2_interval,
    next_review: data.next_review,
    last_reviewed_at: data.last_reviewed_at,
    health: data.health,
    times_reviewed: data.times_reviewed,
    days_until_review: daysUntil,        // Positive = not due yet, negative = overdue
    is_overdue: daysUntil < 0,
  });
}