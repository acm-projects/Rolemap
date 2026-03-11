export function MapLegend() {
  return (
    <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Map Legend</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {/* Teal circle = completed, matches active edge color */}
          <div className="w-3 h-3 rounded-full border-2 border-[#4a7c7c]" />
          <span className="text-xs text-slate-500">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filled teal = active node */}
          <div className="w-3 h-3 rounded-full bg-[#4a7c7c]" />
          <span className="text-xs text-slate-500">Active Node</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Light grey dashed = locked, matches locked edge color */}
          <div className="w-3 h-3 rounded-full border-2 border-dashed border-[#c8d0dc]" />
          <span className="text-xs text-slate-500">Locked Stage</span>
        </div>
      </div>
    </div>
  );
}