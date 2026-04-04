'use client';

import React, { useSyncExternalStore } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export default function QuizConfetti() {
  const { width, height } = useWindowSize();

  // This is a more modern way to check for client-side rendering
  // that avoids the "setState in useEffect" warning
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isClient) return null;

  return (
    <Confetti
      width={width}
      height={height}
      recycle={false}
      numberOfPieces={400}
      gravity={0.15}
      colors={['#4a7c7c', '#23C552', '#e7a350', '#ffffff']}
    />
  );
}