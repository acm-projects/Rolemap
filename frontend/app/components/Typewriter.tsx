import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
  delay?: number; // initial delay before starting
  className?: string;
  onComplete?: () => void;
  skipOnClick?: boolean;
}

export default function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = "",
  onComplete,
  skipOnClick = true,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    if (isSkipped) {
      setDisplayedText(text);
      setIsComplete(true);
      if (onComplete) onComplete();
      return;
    }

    if (currentIndex === 0 && delay > 0) {
      const delayTimer = setTimeout(() => {
        setCurrentIndex(1);
      }, delay);
      return () => clearTimeout(delayTimer);
    }

    if (currentIndex > 0 && currentIndex <= text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    }

    if (currentIndex > text.length && !isComplete) {
      setIsComplete(true);
      if (onComplete) onComplete();
    }
  }, [currentIndex, text, speed, delay, isComplete, onComplete, isSkipped]);

  const handleClick = () => {
    if (skipOnClick && !isComplete) {
      setIsSkipped(true);
    }
  };

  return (
    <span
      className={className}
      onClick={handleClick}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        cursor: skipOnClick && !isComplete ? "pointer" : "default",
      }}
    >
      {displayedText}
      {!isComplete && (
        <span className="animate-pulse inline-block w-[2px] h-[1em] bg-current ml-1" />
      )}
    </span>
  );
}
