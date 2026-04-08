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
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-[#4e8888]">
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
          text-[#2d5050]
          text- xl
          font-jersey
          placeholder:text-[#7ab3b3]
          border-4
          border-t-[#7ab3b3] border-l-[#7ab3b3]
          border-r-[#d4e8e8] border-b-[#d4e8e8]
          focus:outline-none
          focus:border-t-[#4e8888] focus:border-l-[#4e8888]
          focus:border-r-[#7ab3b3] focus:border-b-[#7ab3b3]
          transition-all duration-100
        `}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}