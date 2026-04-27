interface PixelCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  hover?: boolean;
}

export default function PixelCard({
  children,
  onClick,
  selected = false,
  hover = true,
}: PixelCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        pixel-border
        bg-white
        border-t-[#DEF2FF] border-l-[#DEF2FF]
        border-r-[#334155] border-b-[#334155]
        transition-all duration-100
        ${onClick ? "cursor-pointer" : ""}
        ${hover && onClick ? "hover:bg-[#E1FAFF] hover:translate-y-[-2px]" : ""}
        ${selected ? "border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#334155] border-b-[#334155] bg-[#BEF8FF]" : ""}
        active:translate-y-[1px]
      `}
    >
      {children}
    </div>
  );
}