import { NextResponse } from "next/server";
import pool from "@/lib/db";

function getDecayLevel(next_review: string, sm2_interval: number) {
  const now = new Date();
  const nextReview = new Date(next_review);
  const daysUntil = Math.ceil(
    (nextReview.getTime() - now.getTime()) / (1000 * 3600 * 24)
  );

  if (daysUntil > 3) return "fresh";
  if (daysUntil > 0) return "review_soon";
  if (daysUntil > -sm2_interval) return "decaying";
  return "forgotten";
}

export async function GET() {
  const { rows } = await pool.query(`
    SELECT 
      rc.id,
      s.name as skill_name,
      rc.health,
      rc.times_practiced,
      rc.sm2_interval,
      rc.sm2_easiness,
      rc.sm2_repetitions,
      rc.next_review,
      rc.last_reviewed_at
    FROM roadmap_checkpoints rc
    JOIN skills s ON s.id = rc.skill_id
    ORDER BY rc.health ASC
  `);

  const result = rows.map((row) => {
    const now = new Date();
    const nextReview = new Date(row.next_review);
    const days_until_review = Math.ceil(
      (nextReview.getTime() - now.getTime()) / (1000 * 3600 * 24)
    );

    return {
      id: row.id,
      skill: row.skill_name,
      health: row.health,
      times_practiced: row.times_practiced,
      sm2_interval: row.sm2_interval,
      sm2_easiness: Number(row.sm2_easiness).toFixed(2),
      sm2_repetitions: row.sm2_repetitions,
      days_until_review,
      next_review: row.next_review,
      last_reviewed_at: row.last_reviewed_at,
      decay_level: getDecayLevel(row.next_review, row.sm2_interval),
    };
  });

  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: Request) {
  const { id, quality } = await req.json();

  const { rows } = await pool.query(
    `SELECT * FROM roadmap_checkpoints WHERE id = $1`, [id]
  );

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let { sm2_interval, sm2_easiness, sm2_repetitions, times_practiced } = rows[0];

  // SM-2 formula
  if (quality >= 3) {
    if (sm2_repetitions === 0) sm2_interval = 1;
    else if (sm2_repetitions === 1) sm2_interval = 6;
    else sm2_interval = Math.round(sm2_interval * sm2_easiness);
    sm2_repetitions += 1;
  } else {
    sm2_repetitions = 0;
    sm2_interval = 1;
  }

  sm2_easiness = Math.max(
    1.3,
    sm2_easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const next_review = new Date();
  next_review.setDate(next_review.getDate() + sm2_interval);

  await pool.query(
    `UPDATE roadmap_checkpoints
     SET sm2_interval = $1,
         sm2_easiness = $2,
         sm2_repetitions = $3,
         next_review = $4,
         last_reviewed_at = NOW(),
         health = 100,
         times_practiced = $5,
         updated_at = NOW()
     WHERE id = $6`,
    [sm2_interval, sm2_easiness, sm2_repetitions, next_review.toISOString(), times_practiced + 1, id]
  );

  return NextResponse.json({ success: true, new_interval: sm2_interval, next_review });
}
