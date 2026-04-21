'use client';

const FULL_BODY_PANTS = new Set<string>([]);

export type Category = 'skin' | 'eyes' | 'clothes' | 'pants' | 'shoes' | 'hair' | 'accessories';

const JUMP_NAME_MAP: Record<string, string> = {
  'suit.png':      'suit_jump.png',
  'pants.png':     'pants_jump.png',
  'overalls.png':  'overall_jump.png',
  'blush_all.png': 'blush_jump.png',
};

export function CharacterPreview({
  skin, eyes, clothes, pants = '', shoes = '', hair, accessory,
  size = 96, showLegs = false, variants = {}, jump = false,
}: {
  skin: string; eyes: string; clothes: string; pants?: string; shoes?: string;
  hair: string; accessory: string;
  size?: number; showLegs?: boolean;
  variants?: Partial<Record<Category, number>>;
  jump?: boolean;
}) {
  // Inside the function so it has access to the jump prop
  const j = (file: string) => {
    if (!jump || !file) return file;
    return JUMP_NAME_MAP[file] ?? file.replace('.png', '_jump.png');
  };

  const showClothes = !FULL_BODY_PANTS.has(pants);
  const layers: [string, Category][] = [
    [skin, 'skin'], [pants, 'pants'], [shoes, 'shoes'],
    [showClothes ? clothes : '', 'clothes'],
    [eyes, 'eyes'], [hair, 'hair'], [accessory, 'accessories'],
  ];

  // Jump section
  if (jump) {
    const frameSize = Math.round(size / 32 * 128);
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <style>{`
          @keyframes jump-frames {
            0%   { background-position-x: 0px; }
            20%  { background-position-x: ${-size * 1}px; }
            40%  { background-position-x: ${-size * 2}px; }
            60%  { background-position-x: ${-size * 3}px; }
            80%  { background-position-x: ${-size * 4}px; }
            100% { background-position-x: 0px; }
          }
        `}</style>
        {layers.filter(([f]) => f).map(([f, _cat], i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `url(/characters/${j(f)})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `auto ${frameSize}px`,
            backgroundPositionY: '0px',
            animation: 'jump-frames 0.6s steps(1) infinite',
            imageRendering: 'pixelated',
          }} />
        ))}
      </div>
    );
  }

  // Render character
  const bgH = Math.round(size / 28 * 1568);
  const scale = size / 28;
  const containerH = showLegs ? Math.round(size * 32 / 28) : size;

  return (
    <div style={{ position: 'relative', width: size, height: containerH, overflow: 'hidden' }}>
      {layers.filter(([f]) => f).map(([f, cat], i) => {
        const v = variants[cat] ?? 0;
        return (
          <div key={i} style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `url(/characters/${f})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `${-(v * 256 * scale) - (32 * scale - size) / 2}px 0`,
            backgroundSize: `auto ${bgH}px`,
            imageRendering: 'pixelated',
          }} />
        );
      })}
    </div>
  );
}