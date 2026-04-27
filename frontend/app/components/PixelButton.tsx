interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function PixelButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
}: PixelButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-[#04A0FF] hover:bg-[#1aadff] active:bg-[#0080cc] text-white border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#0060aa] border-b-[#0060aa]";
      case "secondary":
        return "bg-[#BEF8FF] hover:bg-[#d4fbff] active:bg-[#a0f0ff] text-[#334155] border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#78ADCF] border-b-[#78ADCF]";
      case "ghost":
        return "bg-transparent hover:bg-[#BEF8FF] active:bg-[#8ED4FF] text-[#04A0FF] border-transparent";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-4 py-2 text-xs";
      case "md":
        return "px-6 py-3 text-sm";
      case "lg":
        return "px-8 py-4 text-base";
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        pixel-border
        ${getVariantClasses()}
        ${getSizeClasses()}
        transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed
        active:translate-y-[2px]
        image-rendering-pixelated
      `}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
      }}
    >
      {children}
    </button>
  );
}