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
        return "bg-[#334155] hover:bg-[#3d4f66] active:bg-[#253041] text-white border-t-[#4e6a85] border-l-[#4e6a85] border-r-[#1e2d3d] border-b-[#1e2d3d]";
      case "secondary":
        return "bg-[#d4e8e8] hover:bg-[#c0dede] active:bg-[#b0d0d0] text-[#2d5050] border-t-[#e8f4f4] border-l-[#e8f4f4] border-r-[#9fc9c9] border-b-[#9fc9c9]";
      case "ghost":
        return "bg-transparent hover:bg-[#e8f0f8] active:bg-[#d4e0ee] text-[#334155] border-transparent";
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