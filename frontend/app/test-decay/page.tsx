"use client";
import { useEffect, useState } from "react";

type Entry = {
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
};

const DECAY_COLORS: Record<string, string> = {
  fresh:       "#508484",
  review_soon: "#f59e0b",
  decaying:    "#f97316",
  forgotten:   "#ef4444",
};

export default function TestDecayPage() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    const res = await fetch("/api/test-decay");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleReview = async (id: string, quality: number) => {
    setUpdating(id);
    await fetch("/api/test-decay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quality }),
    });
    await fetchData();
    setUpdating(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#E4E4E4] flex items-center justify-center">
      <p className="font-bold text-[#508484]">Loading SM-2 data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#E4E4E4] p-8 font-[Inter]">
      <h1 className="text-2xl font-extrabold text-[#1B1B1B] mb-1">
        SM-2 Skill Decay — Live Test
      </h1>
      <p className="text-sm text-[#555555] mb-8">
        Click a review button to run the SM-2 algorithm and watch the numbers update in real time.
      </p>

      <div className="flex flex-col gap-4">
        {data.map((entry) => {
          const color = DECAY_COLORS[entry.decay_level] ?? "#508484";
          const isUpdating = updating === entry.id;

          return (
            <div
              key={entry.id}
              className="bg-white rounded-xl border-2 p-5"
              style={{ borderColor: color }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-extrabold text-[#1B1B1B] text-base">
                    {entry.skill}
                  </h2>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wide"
                    style={{ backgroundColor: color }}
                  >
                    {entry.decay_level.replace("_", " ")}
                  </span>
                </div>
                <span className="text-xs text-[#a0b8b8] font-mono">
                  {entry.id.slice(0, 8)}...
                </span>
              </div>

              {/* Health Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[#a0b8b8] font-bold uppercase tracking-widest">
                    Health
                  </span>
                  <span className="text-[11px] font-bold" style={{ color }}>
                    {entry.health}%
                  </span>
                </div>
                <div className="h-2.5 bg-[#E4E4E4] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${entry.health}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4 bg-[#f5f5f5] rounded-xl p-4 font-mono text-xs">
                <div>
                  <p className="text-[#a0b8b8] mb-0.5">Next Review</p>
                  <p className={`font-bold ${entry.days_until_review < 0 ? "text-red-500" : "text-[#1B1B1B]"}`}>
                    {entry.days_until_review < 0
                      ? `${Math.abs(entry.days_until_review)}d overdue`
                      : entry.days_until_review === 0
                        ? "Today"
                        : `In ${entry.days_until_review}d`}
                  </p>
                </div>
                <div>
                  <p className="text-[#a0b8b8] mb-0.5">Interval</p>
                  <p className="font-bold text-[#1B1B1B]">Every {entry.sm2_interval}d</p>
                </div>
                <div>
                  <p className="text-[#a0b8b8] mb-0.5">Practiced</p>
                  <p className="font-bold text-[#1B1B1B]">{entry.times_practiced}x</p>
                </div>
                <div>
                  <p className="text-[#a0b8b8] mb-0.5">Easiness</p>
                  <p className="font-bold text-[#1B1B1B]">{entry.sm2_easiness}</p>
                </div>
                <div>
                  <p className="text-[#a0b8b8] mb-0.5">Streak</p>
                  <p className="font-bold text-[#1B1B1B]">{entry.sm2_repetitions} correct</p>
                </div>
                <div>
                  <p className="text-[#a0b8b8] mb-0.5">Last Reviewed</p>
                  <p className="font-bold text-[#1B1B1B]">
                    {new Date(entry.last_reviewed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Review Buttons */}
              <div>
                <p className="text-[11px] text-[#a0b8b8] font-bold uppercase tracking-widest mb-2">
                  Simulate review
                </p>
                <div className="flex gap-2">
                  {[
                    { quality: 0, label: "Forgot",  color: "#ef4444" },
                    { quality: 2, label: "Hard",    color: "#f97316" },
                    { quality: 3, label: "Okay",    color: "#f59e0b" },
                    { quality: 4, label: "Good",    color: "#508484" },
                    { quality: 5, label: "Perfect", color: "#22c55e" },
                  ].map((btn) => (
                    <button
                      key={btn.quality}
                      onClick={() => handleReview(entry.id, btn.quality)}
                      disabled={isUpdating}
                      className="flex-1 py-2 rounded-lg text-white text-xs font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
                      style={{ backgroundColor: btn.color }}
                    >
                      {isUpdating ? "..." : btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}