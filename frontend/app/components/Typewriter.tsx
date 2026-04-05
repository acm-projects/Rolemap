import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  skipOnClick?: boolean;
  startComplete?: boolean;
}

export default function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = "",
  onComplete,
  skipOnClick = true,
  startComplete = false,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState(startComplete ? text : "");
  const [currentIndex, setCurrentIndex] = useState(startComplete ? text.length + 1 : 0);
  const [isComplete, setIsComplete] = useState(startComplete);
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    if (startComplete) return;

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
  }, [currentIndex, text, speed, delay, isComplete, onComplete, isSkipped, startComplete]);

  const handleClick = () => {
    if (skipOnClick && !isComplete) {
      setIsSkipped(true);
    }
  };

  return (
    <span
      className={`font-jersey ${className}`}
      onClick={handleClick}
      style={{
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
