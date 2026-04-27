interface PixelProgressProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  step?: number;
  totalSteps?: number;
  trackColor?: string; // background of empty segments (default: #8ED4FF)
  fillColor?: string;  // color of filled segments (default: #04A0FF)
}
export default function PixelProgress({
  value,
  max = 100,
  showLabel = true,
  step,
  totalSteps,
  trackColor = '#8ED4FF',
  fillColor = '#04A0FF',
}: PixelProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const segments = 20;
  const filledSegments = Math.floor((percentage / 100) * segments);
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl text-[#78ADCF] font-jersey">
            PROGRESS
          </span>
          <div className="flex items-center gap-4">
            {step !== undefined && totalSteps !== undefined && (
              <span className="text-xl text-[#78ADCF] font-jersey">
                Step {step} of {totalSteps}
              </span>
            )}
            <span className="text-xl text-[#78ADCF] font-jersey">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
      )}
      <div
        className="h-6 border-4 p-1"
        style={{
          borderTopColor: trackColor,
          borderLeftColor: trackColor,
          borderRightColor: '#8ED4FF',
          borderBottomColor: '#8ED4FF',
          backgroundColor: '#E1FAFF',
        }}
      >
        <div className="flex gap-[2px] h-full">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="flex-1 transition-all duration-150"
              style={{
                backgroundColor: i < filledSegments ? fillColor : trackColor,
                imageRendering: 'pixelated',
                ...(i < filledSegments ? {
                  borderTop: '1px solid rgba(255,255,255,0.3)',
                  borderBottom: '1px solid rgba(0,0,0,0.2)',
                } : {}),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}