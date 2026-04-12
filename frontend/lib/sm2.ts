//quality parameter is a 0-5 rating of the user's performance:
//   0 = complete blackout, didn't remember at all
//   1 = incorrect but remembered after seeing answer
//   2 = incorrect but answer felt familiar
//   3 = correct but required significant effort
//   4 = correct with minor hesitation
//   5 = perfect recall, no hesitation

import next from "next";


export type sm2card = {
    sm2_interval: number;
    sm2_easiness: number;
    sm2_repetitions: number;
    next_review: string;
    last_reviewed_at: string;
    health: number;
    times_reviewed: number;
};


export function sm2(card: sm2card, quality: number): sm2card {
    let {sm2_interval, sm2_easiness, sm2_repetitions, times_reviewed} = card;
    if (quality >= 3) {
        if(sm2_repetitions === 0) {
            sm2_interval = 1;
        }
        else if(sm2_repetitions === 1) {
            sm2_interval = 6;
        }
        else{
            sm2_interval = Math.round(sm2_interval * sm2_easiness);
        }
        sm2_repetitions += 1;
    } else {
        sm2_repetitions = 0;
        sm2_interval = 1;
    }


    //update easiness factor

    sm2_easiness = Math.max(1.3, sm2_easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));


    const next_review = new Date();
    next_review.setDate(next_review.getDate() + sm2_interval);
    

    return {
        sm2_interval,
        sm2_easiness,
        sm2_repetitions,
        next_review: next_review.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        health:100,
        times_reviewed: times_reviewed + 1
    };
}
//calculatye current helaeth on overdueness 
    export function calculateHealth(card: sm2card): number {
  const now = new Date();
  const nextReview = new Date(card.next_review);
  const daysOverdue = Math.max(
    0,
    (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, Math.round(100 - (daysOverdue / card.sm2_interval) * 100));
}