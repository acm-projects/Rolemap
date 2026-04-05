interface PixelProgressProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  step?: number;
  totalSteps?: number;
}

export default function PixelProgress({
  value,
  max = 100,
  showLabel = true,
  step,
  totalSteps,
}: PixelProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const segments = 20;
  const filledSegments = Math.floor((percentage / 100) * segments);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl text-[#4e8888] font-jersey">
            PROGRESS
          </span>
          <div className="flex items-center gap-4">
            {step !== undefined && totalSteps !== undefined && (
              <span className="text-xl text-[#4e8888] font-jersey">
                Step {step} of {totalSteps}
              </span>
            )}
            <span className="text-xl text-[#4e8888] font-jersey">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
      )}
      <div
        className="
          h-6
          border-4
          border-t-[#7ab3b3] border-l-[#7ab3b3]
          border-r-[#d4e8e8] border-b-[#d4e8e8]
          bg-[#f0f8f8]
          p-1
        "
      >
        <div className="flex gap-[2px] h-full">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={`
                flex-1
                transition-all duration-150
                ${
                  i < filledSegments
                    ? "bg-[#4e8888] border-t-[1px] border-t-[#7ab3b3] border-b-[1px] border-b-[#3a6666]"
                    : "bg-[#d4e8e8]"
                }
              `}
              style={{ imageRendering: "pixelated" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}