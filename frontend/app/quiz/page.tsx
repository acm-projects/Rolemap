'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import QuizConfetti from '../../components/ui/quiz-confetti';
import { api, type QuizQuestion } from '@/lib/api';

const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Which property allows a nested grid to align its tracks exactly with those of its parent container?",
    options: ["display: contents;", "grid-template-columns: subgrid;", "grid-auto-flow: dense;", "align-content: stretch;"],
    correct: 1,
    explanation: "The grid-template-columns: subgrid; property allows a nested grid to align its tracks with its parent container.",
  },
  {
    id: 2,
    question: "Which CSS feature is best for changing a component's layout based on the width of its own parent container?",
    options: ["Media Queries", "Viewport Units (vw)", "Container Queries", "Flex-grow"],
    correct: 2,
    explanation: "Container Queries are used to change a component's layout based on the width of its own parent container.",
  },
  {
    id: 3,
    question: "If an element has width: 300px, padding: 20px, and box-sizing: border-box, what is its total rendered width?",
    options: ["300px", "340px", "360px", "400px"],
    correct: 0,
    explanation: "With box-sizing: border-box, the padding is included in the width, so the total rendered width remains 300px.",
  },
  {
    id: 4,
    question: "What is the most semantic HTML5 element for a group of introductory content or navigation links?",
    options: ["<section>", "<div>", "<header>", "<aside>"],
    correct: 2,
    explanation: "The <header> element is specifically designed for introductory content, logos, and navigational aids.",
  },
  {
    id: 5,
    question: "How can you manage style priority without relying on high-specificity selectors or !important?",
    options: ["Inline styling", "Cascade Layers (@layers)", "ID Selectors", "Chaining classes"],
    correct: 1,
    explanation: "Cascade Layers (@layers) allow you to manage style priority without relying on high-specificity selectors or !important.",
  },
];

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const label = searchParams.get('label') ?? 'Quiz';
  const checkpointId = searchParams.get('checkpoint');

  const [questions, setQuestions] = useState<QuizQuestion[]>(FALLBACK_QUESTIONS);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (checkpointId) {
      api.quiz(checkpointId)
        .then(d => setQuestions(d.questions))
        .catch(() => setQuestions(FALLBACK_QUESTIONS));
    }
  }, [checkpointId]);

  const q = questions[idx];
  const answered = selected !== null;

  function handleSelect(i: number) {
    if (answered) return;
    setSelected(i);
    if (i === q.correct) setScore(s => s + 1);
  }

  function handleNext() {
    if (idx + 1 >= questions.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setSelected(null);
    }
  }

  // Results screen 
  if (done) return (
    <div className="h-screen bg-[#eef1f7] flex items-center justify-center px-4 overflow-hidden relative">
      {/* 1. Trigger Confetti if passed */}
      {score >= 3 && <QuizConfetti />}

      {/* 2. Added z-10 to ensure card stays above confetti */}
      <div className="z-10 bg-white rounded-2xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center relative">
        <div className="text-4xl mb-4">{score >= 3 ? '🎉' : '📝'}</div>
        <h2 className="text-2xl font-bold text-slate-700 mb-1">{score >= 3 ? 'Passed!' : 'Keep Studying'}</h2>
        <p className="text-slate-400 text-sm mb-6">{label}</p>
        <p className="text-5xl font-black text-slate-600 mb-2">{score}/{questions.length}</p>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
          <div className={`h-full rounded-full ${score >= 3 ? 'bg-[#23C552]' : 'bg-[#F84F31]'}`} style={{ width: `${(score / questions.length) * 100}%` }} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">Back to Map</button>
          <button onClick={() => { setIdx(0); setSelected(null); setScore(0); setDone(false); }} className="flex-1 bg-[#4a7c7c] text-white font-semibold py-3 rounded-xl hover:bg-[#3d6e6e] transition-colors">Retake</button>
        </div>
      </div>
    </div>
  );

  // Quiz screen
  return (
    <div className="min-h-screen bg-[#eef1f7] flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm font-medium mb-4 flex items-center gap-1">← Back to Map</button>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h1 className="text-xl font-bold text-slate-700 mb-4">Knowledge Check</h1>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#4a7c7c] rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-400">{idx + 1}/{questions.length}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-3">
          <p className="text-xs font-bold text-[#4a7c7c] uppercase tracking-widest mb-2">Question {idx + 1}</p>
          <h2 className="text-base font-semibold text-slate-700 mb-4">{q.question}</h2>

          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                  ${!answered ? 'border-slate-200 bg-white hover:border-[#4a7c7c] cursor-pointer' :
                    i === q.correct ? 'border-green-400 bg-green-50 text-green-800' :
                    i === selected ? 'border-red-400 bg-red-50 text-red-800' :
                    'border-slate-200 bg-white opacity-50'}`}
              >
                {opt}
              </button>
            ))}
          </div>

          {answered && (
            <div className={`mt-4 p-3 rounded-xl text-sm font-medium border ${selected === q.correct ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              <p className="font-bold mb-1">{selected === q.correct ? '✓ Correct!' : '✗ Incorrect'}</p>
              <p>{q.explanation}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!answered}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${answered ? 'bg-[#4a7c7c] text-white hover:bg-[#3d6e6e]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
        >
          {idx + 1 === questions.length ? 'Finish Quiz' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
}