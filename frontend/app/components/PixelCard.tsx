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
        border-t-[#d4e8e8] border-l-[#d4e8e8]
        border-r-[#7ab3b3] border-b-[#7ab3b3]
        transition-all duration-100
        ${onClick ? "cursor-pointer" : ""}
        ${hover && onClick ? "hover:bg-[#f0f8f8] hover:translate-y-[-2px]" : ""}
        ${selected ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]" : ""}
        active:translate-y-[1px]
      `}
    >
      {children}
    </div>
  );
}