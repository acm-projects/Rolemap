interface PixelInputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export default function PixelInput({
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
}: PixelInputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-[#78ADCF]">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full
          ${icon ? "pl-10 pr-4" : "px-4"}
          py-3
          bg-white
          text-[#334155]
          text- xl
          font-jersey
          placeholder:text-[#78ADCF]
          border-4
          border-t-[#8ED4FF] border-l-[#8ED4FF]
          border-r-[#DEF2FF] border-b-[#DEF2FF]
          focus:outline-none
          focus:border-t-[#04A0FF] focus:border-l-[#04A0FF]
          focus:border-r-[#8ED4FF] focus:border-b-[#8ED4FF]
          transition-all duration-100
        `}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}