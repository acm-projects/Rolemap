"use client";
import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";

type Item = { id: string; name: string; file: string; cost: number; unlocked: boolean; };
type Category = "skin" | "eyes" | "clothes" | "hair" | "accessories";
type Tab = "gender" | Category;

const SHOP_ITEMS: Record<Category, Item[]> = {
  skin: [
    { id: "char1", name: "Skin 1", file: "char1.png", cost: 0, unlocked: true },
    { id: "char2", name: "Skin 2", file: "char2.png", cost: 0, unlocked: true },
    { id: "char3", name: "Skin 3", file: "char3.png", cost: 0, unlocked: true },
    { id: "char4", name: "Skin 4", file: "char4.png", cost: 0, unlocked: true },
    { id: "char5", name: "Skin 5", file: "char5.png", cost: 0, unlocked: true },
    { id: "char6", name: "Skin 6", file: "char6.png", cost: 0, unlocked: true },
    { id: "char7", name: "Skin 7", file: "char7.png", cost: 0, unlocked: true },
    { id: "char8", name: "Skin 8", file: "char8.png", cost: 0, unlocked: true },
  ],
  eyes: [
    { id: "eyes_default",  name: "Eyes",     file: "eyes.png",     cost: 0,   unlocked: true  },
    { id: "eyes_blush",    name: "Blush",    file: "blush_all.png", cost: 0,   unlocked: true  },
    { id: "eyes_lipstick", name: "Lipstick", file: "lipstick.png",  cost: 100, unlocked: false },
  ],
  clothes: [
    { id: "suit",       name: "Suit",       file: "suit.png",       cost: 0,   unlocked: true  },
    { id: "basic",      name: "Casual",     file: "basic.png",      cost: 150, unlocked: false },
    { id: "sporty",     name: "Sporty",     file: "sporty.png",     cost: 200, unlocked: false },
    { id: "sailor",     name: "Sailor",     file: "sailor.png",     cost: 250, unlocked: false },
    { id: "dress",      name: "Dress",      file: "dress.png",      cost: 300, unlocked: false },
    { id: "floral",     name: "Floral",     file: "floral.png",     cost: 300, unlocked: false },
    { id: "overalls",   name: "Overalls",   file: "overalls.png",   cost: 200, unlocked: false },
    { id: "stripe",     name: "Stripe",     file: "stripe.png",     cost: 250, unlocked: false },
  ],
  hair: [
    { id: "buzzcut",   name: "Buzzcut",   file: "buzzcut.png",   cost: 0,   unlocked: true  },
    { id: "bob",       name: "Bob",       file: "bob.png",       cost: 100, unlocked: false },
    { id: "gentleman", name: "Gentleman", file: "gentleman.png", cost: 100, unlocked: false },
    { id: "ponytail",  name: "Ponytail",  file: "ponytail.png",  cost: 150, unlocked: false },
    { id: "curly",     name: "Curly",     file: "curly.png",     cost: 200, unlocked: false },
    { id: "braids",    name: "Braids",    file: "braids.png",    cost: 200, unlocked: false },
    { id: "emo",       name: "Emo",       file: "emo.png",       cost: 250, unlocked: false },
  ],
  accessories: [
    { id: "none",       name: "None",      file: "",                    cost: 0,   unlocked: true  },
    { id: "glasses",    name: "Glasses",   file: "glasses.png",            cost: 100, unlocked: false },
    { id: "sunglasses", name: "Sunglass",  file: "glasses_sun.png",        cost: 150, unlocked: false },
    { id: "hat_lucky",  name: "Lucky Hat", file: "hat_lucky.png",          cost: 200, unlocked: false },
    { id: "hat_cowboy", name: "Cowboy",    file: "hat_cowboy.png",         cost: 200, unlocked: false },
    { id: "earring",    name: "Earrings",  file: "earring_emerald.png",    cost: 100, unlocked: false },
    { id: "beard",      name: "Beard",     file: "beard.png",              cost: 150, unlocked: false },
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  skin: "SKIN", eyes: "FACE", clothes: "CLOTHES", hair: "HAIR", accessories: "ACCS",
};

// Sampled dominant colors per variant column (256px each) from the sprite sheets
const SPRITE_COLORS: Record<string, string[]> = {
  // clothes
  "suit.png":       ["#8F3E35","#445161","#B07D4D","#753642","#A16958","#8A5B3E","#B35D5D","#4E445E","#693038","#3C455C"],
  "basic.png":      ["#332E32","#4B6275","#6283A4","#654530","#406158","#7D945F","#C8616B","#745C96","#B35249","#C5B6A0"],
  "sporty.png":     ["#C5B6A0","#4B6275","#6283A4","#654530","#406158","#7D945F","#C8616B","#745C96","#B35249","#C5B6A0"],
  "dress.png":      ["#413B40","#4B6275","#6283A4","#654530","#406158","#7D945F","#C8616B","#745C96","#B35249","#B3A28D"],
  "spaghetti.png":  ["#413B40","#4B6275","#6283A4","#654530","#406158","#7D945F","#C8616B","#745C96","#B35249","#C5B6A0"],
  "stripe.png":     ["#FCF7BE","#4B6275","#6283A4","#654530","#406158","#7D945F","#C8616B","#745C96","#B35249","#B35249"],
  "skull.png":      ["#FCF7BE","#4B6275","#6283A4","#654530","#406158","#7D945F","#C8616B","#745C96","#B35249","#FCF7BE"],
  "sailor.png":     ["#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20"],
  "sailor_bow.png": ["#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20","#D78B20"],
  "floral.png":     ["#C78548","#C78548","#C78548","#C78548","#C78548","#C78548","#C78548","#C78548","#C78548","#C78548"],
  // hair
  "buzzcut.png":    ["#503E39","#C49362","#715148","#9E675D","#B37355","#306E55","#558A4D","#736A67","#7E638F","#535782","#D97981","#564778","#A3524D","#518587"],
  "bob.png":        ["#5E4C41","#D4A66A","#82604F","#B57869","#C9855D","#306E55","#669C56","#A4968E","#7E638F","#626C9E","#FF858B","#564778","#B56355","#599997"],
  "curly.png":      ["#5E4C41","#C49362","#82604F","#B57869","#C9855D","#306E55","#669C56","#A4968E","#7E638F","#626C9E","#FF858B","#564778","#B56355","#599997"],
  "ponytail.png":   ["#5E4C41","#C49362","#82604F","#B57869","#C9855D","#306E55","#669C56","#A4968E","#7E638F","#626C9E","#FF858B","#564778","#B56355","#599997"],
  "wavy.png":       ["#5E4C41","#D4A66A","#82604F","#B57869","#C9855D","#306E55","#669C56","#A4968E","#7E638F","#626C9E","#FF858B","#564778","#B56355","#599997"],
  "emo.png":        ["#5E4C41","#D4A66A","#82604F","#B57869","#C9855D","#306E55","#669C56","#A4968E","#7E638F","#626C9E","#FF858B","#564778","#B56355","#599997"],
  "gentleman.png":  ["#5E4C41","#D4A66A","#82604F","#B57869","#C9855D","#306E55","#669C56","#A4968E","#7E638F","#626C9E","#FF858B","#564778","#B56355","#599997"],
  "beard.png":      ["#493736","#A37758","#614440","#825952","#99624E","#2D5E52","#45734A","#757464","#786187","#53496E","#BA6877","#4B4B7A","#914747","#4D757A"],
  // eyes/face
  "eyes.png":       ["#362F2D","#354652","#546E8A","#4D3530","#2E2723","#754B44","#475C4E","#24382D","#637D64","#544B4E","#6E656A","#B04F63","#C26576","#A64444"],
  "blush_all.png":  ["#D9776A","#FA7069","#FA8C73","#C25151","#873D3C"],
  "lipstick.png":   ["#CC6464","#AD4C44","#BD5C57","#963B3B","#6E2721"],
  // accessories
  "glasses_sun.png":["#221F20","#323942","#48556B","#443424","#333E42","#495C44","#8C4D61","#423E57","#783A3D","#4A4543"],
  "clown.png":      ["#E8A738","#E8A738"],
  "pumpkin.png":    ["#CE60D6","#7D7411"],
};

const MOCK_XP = 200000;

function CharacterPreview({ skin, eyes, clothes, hair, accessory, size = 96, variants = {} }: {
  skin: string; eyes: string; clothes: string; hair: string; accessory: string; size?: number;
  variants?: Partial<Record<Category, number>>;
}) {
  const bgH = Math.round(size / 28 * 1568);
  const scale = size / 28;
  const layers: [string, Category][] = [
    [skin, "skin"], [eyes, "eyes"], [clothes, "clothes"], [hair, "hair"], [accessory, "accessories"],
  ];
  return (
    <div style={{ position: "relative", width: size, height: size, overflow: "hidden" }}>
      {layers.filter(([f]) => f).map(([f, cat], i) => {
        const v = variants[cat] ?? 0;
        return (
          <div key={i} style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            backgroundImage: `url(/characters/${f})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: `${-(v * 256 * scale) - (32 * scale - size) / 2}px 0`,
            backgroundSize: `auto ${bgH}px`,
            imageRendering: "pixelated",
          }} />
        );
      })}
    </div>
  );
}

type Equipped = { skin: string; eyes: string; clothes: string; hair: string; accessories: string };

export default function ShopPage() {
  const [xp, setXp] = useState(MOCK_XP);
  const [activeTab, setActiveTab] = useState<Tab>("gender");
  const [gender, setGender] = useState<"boy" | "girl">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("character_saved");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hair === "wavy.png") return "girl";
      }
    }
    return "boy";
  });
  const [items, setItems] = useState(SHOP_ITEMS);
  const [equipped, setEquipped] = useState<Equipped>(() => {
    const defaults: Equipped = { skin: "char1.png", eyes: "eyes.png", clothes: "suit.png", hair: "buzzcut.png", accessories: "" };
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("character_saved");
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    }
    return defaults;
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ item: Item; category: Category } | null>(null);
  const [colorVariants, setColorVariants] = useState<Partial<Record<string, number>>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("character_saved_variants");
      if (saved) return JSON.parse(saved);
    }
    return {};
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleBuy = (category: Category, item: Item) => {
    if (item.unlocked) return;
    if (xp < item.cost) { showNotification("NOT ENOUGH XP!"); return; }
    setXp(prev => prev - item.cost);
    setItems(prev => ({
      ...prev,
      [category]: prev[category].map(i => i.id === item.id ? { ...i, unlocked: true } : i),
    }));
    showNotification(`${item.name.toUpperCase()} UNLOCKED!`);
  };

  const handleEquip = (category: Category, item: Item) => {
    setEquipped(prev => ({ ...prev, [category]: item.file }));
    showNotification("EQUIPPED!");
    setPreviewItem(null);
  };

  const previewWith = (category: Category, file: string) => ({
    ...equipped, [category]: file,
  });

  // Build variants map keyed by equipped file for CharacterPreview
  const equippedVariants: Partial<Record<Category, number>> = {
    skin:        colorVariants[equipped.skin]        ?? 0,
    eyes:        colorVariants[equipped.eyes]        ?? 0,
    clothes:     colorVariants[equipped.clothes]     ?? 0,
    hair:        colorVariants[equipped.hair]        ?? 0,
    accessories: colorVariants[equipped.accessories] ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#f0f8f8]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .px-box  { border:4px solid #2d5050; box-shadow:4px 4px 0 0 rgba(0,0,0,.25); image-rendering:pixelated; }
        .px-btn  { border:4px solid #2d5050; box-shadow:0 4px 0 0 rgba(0,0,0,.3),inset 0 -2px 0 0 rgba(0,0,0,.2); cursor:pointer; }
        .px-btn:active { transform:translateY(2px); box-shadow:0 2px 0 0 rgba(0,0,0,.3); }
        .px-btn:disabled { opacity:.5; cursor:not-allowed; }
        .px-tab  { border:4px solid #2d5050; cursor:pointer; }
        .px-tab.active { background:#2d5050; color:#f0f8f8; }
        .px-card { border:4px solid #2d5050; box-shadow:3px 3px 0 0 rgba(0,0,0,.2); cursor:pointer; image-rendering:pixelated; transition:transform .05s; }
        .px-card:hover { transform:translate(-2px,-2px); box-shadow:5px 5px 0 0 rgba(0,0,0,.2); }
        .px-card.on    { border-color:#7ab3b3; background:#c8e6e6; }
        .px-card.locked{ opacity:.65; }
        .notif { position:fixed; top:2rem; left:50%; transform:translateX(-50%); z-index:200; border:4px solid #2d5050; box-shadow:4px 4px 0 0 rgba(0,0,0,.3); animation:ni .15s ease; }
        @keyframes ni { from{transform:translateX(-50%) translateY(-20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        .modal-bg  { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:150; display:flex; align-items:center; justify-content:center; }
        .modal-box { border:4px solid #2d5050; box-shadow:8px 8px 0 0 rgba(0,0,0,.4); }
      `}</style>

      <Navbar />

      {/* Notification */}
      {notification && (
        <div className="notif bg-[#2d5050] text-[#f0f8f8] px-6 py-3 text-[8px]">▶ {notification}</div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="modal-bg" onClick={() => setPreviewItem(null)}>
          <div className="modal-box bg-[#f0f8f8] p-6 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <p className="text-[7px] text-[#2d5050]">PREVIEW — {previewItem.item.name.toUpperCase()}</p>
            {(() => {
              const pw = previewWith(previewItem.category, previewItem.item.file);
              const modalVariants: Partial<Record<Category, number>> = {
                skin:        colorVariants[pw.skin]        ?? 0,
                eyes:        colorVariants[pw.eyes]        ?? 0,
                clothes:     colorVariants[pw.clothes]     ?? 0,
                hair:        colorVariants[pw.hair]        ?? 0,
                accessories: colorVariants[pw.accessories] ?? 0,
              };
              return (
                <CharacterPreview
                  size={160}
                  skin={pw.skin} eyes={pw.eyes} clothes={pw.clothes} hair={pw.hair} accessory={pw.accessories}
                  variants={modalVariants}
                />
              );
            })()}
            <p className="text-[6px] text-[#4e8888]">
              {previewItem.item.cost === 0 ? "FREE" : `⭐ ${previewItem.item.cost} XP`}
            </p>
            <div className="flex gap-3">
              <button className="px-btn bg-[#f0f8f8] text-[#2d5050] px-3 py-2 text-[6px]" onClick={() => setPreviewItem(null)}>CLOSE</button>
              {previewItem.item.unlocked ? (
                <button className="px-btn bg-[#4e8888] text-[#f0f8f8] px-3 py-2 text-[6px]" onClick={() => handleEquip(previewItem.category, previewItem.item)}>EQUIP</button>
              ) : (
                <button className="px-btn bg-[#2d5050] text-[#f0f8f8] px-3 py-2 text-[6px]" disabled={xp < previewItem.item.cost} onClick={() => handleBuy(previewItem.category, previewItem.item)}>
                  {xp >= previewItem.item.cost ? `BUY ${previewItem.item.cost}XP` : "NEED MORE XP"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto pt-24 px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[14px] text-[#2d5050]">CHARACTER SHOP</h1>
          <div className="px-box bg-[#2d5050] text-[#f0f8f8] px-4 py-2 flex items-center gap-2">
            <span className="text-[7px]">⭐ XP:</span>
            <span className="text-[10px] text-[#7ab3b3]">{xp}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* LEFT — Preview */}
          <div className="col-span-1 flex flex-col gap-4">
            <div className="px-box bg-[#e8f5f5] p-4 flex flex-col items-center gap-4">
              <p className="text-[7px] text-[#2d5050]">YOUR CHARACTER</p>
              <CharacterPreview
                size={160}
                skin={equipped.skin}
                eyes={equipped.eyes}
                clothes={equipped.clothes}
                hair={equipped.hair}
                accessory={equipped.accessories}
                variants={equippedVariants}
              />
              <div className="w-full flex flex-col gap-1.5 mt-1">
                {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
                  const item = items[cat].find(i => i.file === equipped[cat] || (i.file === "" && equipped[cat] === ""));
                  return (
                    <div key={cat} className="flex justify-between">
                      <span className="text-[5px] text-[#4e8888]">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-[5px] text-[#2d5050]">{item?.name.toUpperCase() ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Color swatch panel — shows swatches for the active tab's equipped item */}
            {(() => {
              if (activeTab === "gender") return null;
              const cat = activeTab as Category;
              const activeFile = equipped[cat];
              const colors = activeFile ? SPRITE_COLORS[activeFile] : undefined;
              if (!colors || new Set(colors).size <= 1) return null;
              const currentV = colorVariants[activeFile] ?? 0;
              return (
                <div className="px-box bg-[#e8f5f5] p-3 flex flex-col gap-2">
                  <p className="text-[5px] text-[#4e8888]">{CATEGORY_LABELS[cat]} COLOR</p>
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((hex, idx) => (
                      <button
                        key={idx}
                        title={`Color ${idx + 1}`}
                        onClick={() => setColorVariants(prev => ({ ...prev, [activeFile]: idx }))}
                        style={{
                          width: 18, height: 18,
                          background: hex,
                          border: currentV === idx ? "3px solid #2d5050" : "2px solid #4e8888",
                          cursor: "pointer",
                          imageRendering: "pixelated",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="px-box bg-[#2d5050] text-[#7ab3b3] p-3">
              <p className="text-[6px] leading-relaxed">CLICK ANY ITEM TO PREVIEW IT ON YOUR CHARACTER.</p>
            </div>
            <button
              className="px-btn bg-[#4e8888] text-[#f0f8f8] w-full py-2 text-[7px]"
              onClick={() => {
                localStorage.setItem("character_saved", JSON.stringify(equipped));
                localStorage.setItem("character_saved_variants", JSON.stringify(colorVariants));
                showNotification("CHARACTER SAVED!");
              }}
            >
              💾 SAVE CHARACTER
            </button>
          </div>

          {/* RIGHT — Shop */}
          <div className="col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-4">
              {(["gender", ...Object.keys(SHOP_ITEMS)] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-tab px-2 py-2 text-[6px] text-[#2d5050] flex-1 ${activeTab === tab ? "active" : "bg-[#f0f8f8]"}`}
                >
                  {tab === "gender" ? "GENDER" : CATEGORY_LABELS[tab as Category]}
                </button>
              ))}
            </div>

            {/* Gender Picker */}
            {activeTab === "gender" ? (
              <div className="flex gap-8 justify-center mt-6">
                {([{ label: "BOY", hair: "buzzcut.png" }, { label: "GIRL", hair: "wavy.png" }] as const).map(({ label, hair }) => (
                  <div
                    key={label}
                    onClick={() => {
                      setGender(label.toLowerCase() as "boy" | "girl");
                      setEquipped(prev => ({ ...prev, hair }));
                      showNotification(`${label} SELECTED!`);
                    }}
                    className={`px-card bg-[#e8f5f5] p-4 flex flex-col items-center gap-3 ${gender === label.toLowerCase() ? "on" : ""}`}
                  >
                    <CharacterPreview size={128} skin={equipped.skin} eyes={equipped.eyes} clothes={equipped.clothes} hair={hair} accessory={equipped.accessories} variants={{ ...equippedVariants, hair: colorVariants[hair] ?? 0 }} />
                    <p className="text-[7px] text-[#2d5050]">{label}</p>
                    {gender === label.toLowerCase() && (
                      <div className="px-box bg-[#7ab3b3] text-[#f0f8f8] px-3 py-1 text-[5px]">✓ SELECTED</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
            /* Grid */
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
              {items[activeTab as Category].map(item => {
                const isEquipped = equipped[activeTab as Category] === item.file;
                const isLocked = !item.unlocked;
                const canAfford = xp >= item.cost;
                const pw = previewWith(activeTab as Category, item.file);
                // Per-file variants: each file keeps its own selected color, no cross-contamination
                const pwVariants: Partial<Record<Category, number>> = {
                  skin:        colorVariants[pw.skin]        ?? 0,
                  eyes:        colorVariants[pw.eyes]        ?? 0,
                  clothes:     colorVariants[pw.clothes]     ?? 0,
                  hair:        colorVariants[pw.hair]        ?? 0,
                  accessories: colorVariants[pw.accessories] ?? 0,
                };

                return (
                  <div
                    key={item.id}
                    onClick={() => setPreviewItem({ item, category: activeTab as Category })}
                    className={`px-card bg-[#e8f5f5] p-2 flex flex-col items-center gap-1.5 ${isEquipped ? "on" : ""} ${isLocked ? "locked" : ""}`}
                  >
                    {/* Thumbnail — full character with this item */}
                    <div style={{ position: "relative", width: 120, height: 120, filter: isLocked ? "grayscale(1)" : undefined }}>
                      <CharacterPreview
                        size={120}
                        skin={pw.skin} eyes={pw.eyes} clothes={pw.clothes} hair={pw.hair} accessory={pw.accessories}
                        variants={pwVariants}
                      />
                      {isLocked && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 18 }}>🔒</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[5px] text-[#2d5050] text-center">{item.name.toUpperCase()}</p>
                    {item.cost > 0
                      ? <p className="text-[5px] text-[#7ab3b3]">⭐{item.cost}</p>
                      : <p className="text-[5px] text-[#4e8888]">FREE</p>
                    }

                    {isEquipped ? (
                      <div className="px-box bg-[#7ab3b3] text-[#f0f8f8] px-2 py-0.5 text-[5px] w-full text-center">✓ ON</div>
                    ) : isLocked ? (
                      <button
                        className="px-btn bg-[#2d5050] text-[#f0f8f8] px-2 py-0.5 text-[5px] w-full"
                        disabled={!canAfford}
                        onClick={e => { e.stopPropagation(); handleBuy(activeTab as Category, item); }}
                      >
                        {canAfford ? `BUY` : "💸"}
                      </button>
                    ) : (
                      <button
                        className="px-btn bg-[#4e8888] text-[#f0f8f8] px-2 py-0.5 text-[5px] w-full"
                        onClick={e => { e.stopPropagation(); handleEquip(activeTab as Category, item); }}
                      >
                        EQUIP
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}