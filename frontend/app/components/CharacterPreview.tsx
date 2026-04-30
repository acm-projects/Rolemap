'use client';

const FULL_BODY_PANTS = new Set<string>([]);

export type Category = 'skin' | 'eyes' | 'clothes' | 'pants' | 'shoes' | 'hair' | 'accessories';

const JUMP_NAME_MAP: Record<string, string> = {
  'suit.png':      'suit_jump.png',
  'pants.png':     'pants_jump.png',
  'overalls.png':  'overall_jump.png',
  'blush_all.png': 'blush_jump.png',
};

// Walk sprites: same format as jump (32px/frame wide, 128px tall = 4 rows × 8 frames)

function getWalkPath(cat: Category, file: string): string | null {
  if (!file) return null;
  const base = file.replace('.png', '_walk.png');
  switch (cat) {
    case 'skin':        return `walk/${base}`;
    case 'eyes':        return `walk/eyes/${file === 'blush_all.png' ? 'blush_walk.png' : base}`;
    case 'clothes':     return `walk/clothes/${base}`;
    case 'pants':       return `walk/clothes/${base}`;
    case 'shoes':       return `walk/clothes/${base}`;
    case 'hair':        return `walk/hair/${base}`;
    case 'accessories': return `walk/acc/${base}`;
    default:            return null;
  }
}

const WALK_DURATION = 0.8;
const WALK_FRAMES = 8;

export function CharacterPreview({
  skin, eyes, clothes, pants = '', shoes = '', hair, accessory,
  size = 96, showLegs = false, variants = {}, jump = false, walk = false,
}: {
  skin: string; eyes: string; clothes: string; pants?: string; shoes?: string;
  hair: string; accessory: string;
  size?: number; showLegs?: boolean;
  variants?: Partial<Record<Category, number>>;
  jump?: boolean;
  walk?: boolean;
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

  // Walk section — same sprite format as jump: 32px/frame, 128px tall, 4 rows × 8 frames
  // backgroundSize: auto ${4*size}px → each cell scales to size×size. Row 0 = walk.
  if (walk) {
    const frameH = 4 * size;
    const layerData = layers
      .filter(([f]) => f)
      .map(([f, cat]) => {
        const path = getWalkPath(cat, f);
        if (!path) return null;
        const v = variants[cat] ?? 0;
        return { path, v };
      })
      .filter(Boolean) as { path: string; v: number }[];

    const uniqueVariants = [...new Set(layerData.map(d => d.v))];
    const kfName = (v: number) => `cw${v}s${size}`;
    const makeKf = (v: number) => {
      const x0 = -v * WALK_FRAMES * size;
      const stops = Array.from({ length: WALK_FRAMES }, (_, f) =>
        `${(f / WALK_FRAMES * 100).toFixed(2)}%{background-position:${x0 - f * size}px 0px;}`
      ).join('');
      return `@keyframes ${kfName(v)}{${stops}100%{background-position:${x0}px 0px;}}`;
    };

    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <style>{uniqueVariants.map(makeKf).join('')}</style>
        {layerData.map(({ path, v }, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `url(/characters/${path})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `auto ${frameH}px`,
            animation: `${kfName(v)} ${WALK_DURATION}s steps(1) infinite`,
            imageRendering: 'pixelated',
          }} />
        ))}
      </div>
    );
  }

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
            animation: 'jump-frames 0.3s steps(1) infinite',
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