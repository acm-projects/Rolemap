'use client';

import React, { useSyncExternalStore, useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useReactFlow } from '@xyflow/react';

interface QuizConfettiProps {
  x?: number;
  y?: number;
}

export default function QuizConfetti({ x = 0, y = 0 }: QuizConfettiProps) {
  const { flowToScreenPosition } = useReactFlow();
  const [screenPos, setScreenPos] = useState({ x: 0, y: 0 });

  // This is a more modern way to check for client-side rendering
  // that avoids "setState in useEffect" warning
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Continuously update screen position so panning/zooming keeps confetti anchored
  useEffect(() => {
    let animFrameId: number;

    const update = () => {
      const pos = flowToScreenPosition({ x: x + 128, y: y + 35 });
      setScreenPos(pos);
      animFrameId = requestAnimationFrame(update);
    };

    animFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrameId);
  }, [x, y, flowToScreenPosition]);

  if (!isClient) return null;

  return (
    <Confetti
      confettiSource={{
        x: screenPos.x,
        y: screenPos.y,
        w: 0,
        h: 0,
      }}
      recycle={false}
      numberOfPieces={400}
      gravity={0.15}
      initialVelocityX={8}
      initialVelocityY={12}
      colors={['#4a7c7c', '#23C552', '#e7a350', '#ffffff']}
      // Use full window size so particles can travel anywhere
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
}