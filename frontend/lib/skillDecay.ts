import { sm2card } from "./sm2";   


export type DecayLevel = "fresh" | "review_soon"| "decaying" | "forgotten";

export function getDecayLevel(card: sm2card): DecayLevel {
    const now = new Date();
    const nextReview = new Date(card.next_review);
    const lastReview = new Date(card.last_reviewed_at);

    const daysUntilReview = (nextReview.getTime() - now.getTime()) / (1000 * 3600 * 24);
    const daysSinceLastReview = (now.getTime() - lastReview.getTime()) / (1000 * 3600 * 24);

    if(daysSinceLastReview >3) return "fresh";
    if(daysSinceLastReview >0) return "review_soon";
    if(daysSinceLastReview < card.sm2_interval *2) return "decaying";
    return "forgotten";
}


export function calculateHealth(card: sm2card): number {
    const now = new Date();
    const nextReview = new Date(card.next_review);
    const daysOverdue = Math.max(0, (now.getTime() - nextReview.getTime()) / (1000 * 3600 * 24));

    //health drops from 100 to 0 showing overdue status
    return Math.max(0, Math.round(100 - (daysOverdue / (card.sm2_interval)) * 100));
}

export const decayStyles: Record<DecayLevel, {
    color: string;
    label: string;
    pulse: boolean;

}> = {
    fresh:       { color: "#508484", label: "Up to date",    pulse: false },
  review_soon: { color: "#f59e0b", label: "Review soon",   pulse: false },
  decaying:    { color: "#f97316", label: "Needs review",  pulse: true  },
  forgotten:   { color: "#ef4444", label: "Skill decayed", pulse: true  },
};