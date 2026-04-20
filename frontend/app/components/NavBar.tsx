"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

// Renders the user's custom character from shop localStorage data
const DEFAULT_EQUIPPED = { skin: "char1.png", eyes: "eyes.png", clothes: "suit.png", hair: "buzzcut.png", accessories: "" };

function ShopCharacter({ size }: { size: number }) {
  const [equipped, setEquipped] = useState<Record<string, string>>(DEFAULT_EQUIPPED);
  const [colorVariants, setColorVariants] = useState<Record<string, number>>({});

  useEffect(() => {
    // Only load if the user explicitly saved via the shop's SAVE button
    const eq = localStorage.getItem("character_saved");
    const cv = localStorage.getItem("character_saved_variants");
    if (eq) setEquipped(JSON.parse(eq));
    if (cv) setColorVariants(JSON.parse(cv));
  }, []);

  const bgH = Math.round(size / 28 * 1568);
  const scale = size / 28;

  const layers: [string, string][] = [
    [equipped.skin, "skin"],
    [equipped.eyes, "eyes"],
    [equipped.clothes, "clothes"],
    [equipped.hair, "hair"],
    [equipped.accessories, "accessories"],
  ];

  return (
    <div style={{ position: "relative", width: size, height: size, overflow: "hidden", imageRendering: "pixelated" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translateX(-9px) scale(1.4)", transformOrigin: "50% 100%" }}>
        {layers.filter(([f]) => f).map(([f], i) => {
          const v = colorVariants[f] ?? 0;
          return (
            <div key={i} style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              backgroundImage: `url(/characters/${f})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: `${-(v * 256 * scale)}px 0`,
              backgroundSize: `auto ${bgH}px`,
              imageRendering: "pixelated",
            }} />
          );
        })}
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const navItems = ['Dashboard', 'Map', 'Tasks', 'Shop'];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .pixel-nav {
          font-family: 'Press Start 2P', monospace;
          image-rendering: pixelated;
        }

        .pixel-nav-bar {
          border-width: 4px;
          border-style: solid;
          border-color: #2d5050;
          box-shadow:
            0 4px 0 0 rgba(0,0,0,0.3),
            inset 0 -2px 0 0 rgba(0,0,0,0.2);
        }

        .pixel-nav-link {
          position: relative;
          transition: color 0.1s;
        }

        .pixel-nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 4px;
          background: #7ab3b3;
          display: none;
          image-rendering: pixelated;
        }

        .pixel-nav-link.active::after {
          display: block;
        }

        .pixel-dropdown {
          border-width: 4px;
          border-style: solid;
          border-color: #2d5050;
          box-shadow: 4px 4px 0 0 rgba(0,0,0,0.3);
          image-rendering: pixelated;
        }

        .pixel-dropdown-item:hover {
          background: #c8e6c9;
        }

        .pixel-signout {
          border-width: 4px;
          border-style: solid;
          border-color: #7f0000;
          box-shadow:
            0 4px 0 0 rgba(0,0,0,0.3),
            inset 0 -2px 0 0 rgba(0,0,0,0.2);
          image-rendering: pixelated;
        }

        .pixel-signout:active {
          box-shadow:
            0 2px 0 0 rgba(0,0,0,0.3),
            inset 0 2px 0 0 rgba(0,0,0,0.2);
          transform: translateY(2px);
        }

        .pixel-avatar {
          border-width: 4px;
          border-style: solid;
          border-color: #2d5050;
          box-shadow: 2px 2px 0 0 rgba(0,0,0,0.3);
          image-rendering: pixelated;
          cursor: pointer;
        }

        .pixel-avatar:hover {
          border-color: #7ab3b3;
          box-shadow: 3px 3px 0 0 rgba(0,0,0,0.3);
        }
      `}</style>

      <nav className="pixel-nav absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[95%] max-w-6xl">
        <div className="pixel-nav-bar bg-[#f0f8f8] h-16 flex items-center px-5 gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 mr-4 shrink-0">
            <div
              className="w-10 h-10 flex items-center justify-center overflow-hidden"
              style={{
                borderWidth: 4,
                borderStyle: 'solid',
                borderColor: '#7ab3b3',
                boxShadow: '2px 2px 0 0 rgba(0,0,0,0.4)',
                imageRendering: 'pixelated',
                backgroundColor: '#2d5050',
              }}
            >
              <img
                src="/pixel-map.png"
                alt="Rolemap logo"
                style={{
                  imageRendering: 'pixelated',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <span
              className="text-[#2d5050] text-[10px] leading-tight"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              ROLE<br />MAP
            </span>
          </div>

          {/* Pixel separator */}
          <div className="w-1 h-8 bg-[#2d5050] shrink-0" />

          {/* Nav links */}
          <div className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === `/${item.toLowerCase()}`;
              return (
                <Link
                  key={item}
                  href={`/${item.toLowerCase()}`}
                  className={`pixel-nav-link text-[8px] pb-1 ${isActive ? 'active text-[#2d5050]' : 'text-[#4e8888] hover:text-[#2d5050]'}`}
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  {item.toUpperCase()}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4 shrink-0">

            {/* Pixel separator */}
            <div className="w-1 h-8 bg-[#2d5050] shrink-0" />

            {/* Avatar + Dropdown */}
            <div ref={dropdownRef} className="relative">

              {/* Avatar Button — uses Google profile image if available */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="pixel-avatar w-10 h-10 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: '#c8e6c9' }}
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="avatar"
                    style={{
                      imageRendering: 'pixelated',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <ShopCharacter size={40} />
                )}
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  className="pixel-dropdown absolute z-50 overflow-hidden"
                  style={{
                    right: '-1.4rem',
                    top: '3.5rem',
                    width: '220px',
                    backgroundColor: '#f0f8f8',
                  }}
                >
                  {/* User info */}
                  <div
                    className="px-3 py-2 flex items-start gap-2"
                    style={{ borderBottom: '4px solid #2d5050' }}
                  >
                    {/* Avatar in dropdown */}
                    <div
                      className="w-8 h-8 shrink-0 overflow-hidden"
                      style={{
                        borderWidth: 3,
                        borderStyle: 'solid',
                        borderColor: '#2d5050',
                        imageRendering: 'pixelated',
                        backgroundColor: '#c8e6c9',
                      }}
                    >
                      {session?.user?.image ? (
                        <img
                          src={session.user.image}
                          alt="avatar"
                          style={{
                            imageRendering: 'pixelated',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <ShopCharacter size={32} />
                      )}
                    </div>

                    {/* Name and email */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[#2d5050] break-words"
                        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', lineHeight: '1.2', wordBreak: 'break-word' }}
                      >
                        {session?.user?.name ?? "GUEST"}
                      </p>
                      <p
                        className="text-[#4e8888] break-words"
                        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '5px', lineHeight: '1.2', wordBreak: 'break-word' }}
                      >
                        {session?.user?.email ?? ""}
                      </p>
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { label: "PROFILE",  href: "/profile"  },
                    { label: "SETTINGS", href: "/settings" },
                    { label: "HELP",     href: "/help"     },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setDropdownOpen(false)}
                      className="pixel-dropdown-item flex items-center px-3 py-2 text-[#2d5050] transition-colors"
                      style={{
                        borderBottom: '2px solid #c8e6c9',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '7px',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}

                  {/* Sign out */}
                  <div className="p-2">
                    <button
                      onClick={async () => {
                        const response = await fetch("/api/auth/signout", { method: "POST" });
                        if (response.ok) {
                          window.location.href = "/";
                        }
                      }}
                      className="pixel-signout w-full flex items-center justify-center gap-2 px-2 py-2 text-white bg-red-700"
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '7px',
                      }}
                    >
                      <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" style={{ imageRendering: "pixelated" }}>
                        <rect x="2" y="1" width="8" height="14" fill="#7f0000" />
                        <rect x="9" y="7" width="5" height="2" fill="white" />
                        <rect x="11" y="5" width="2" height="2" fill="white" />
                        <rect x="11" y="9" width="2" height="2" fill="white" />
                        <rect x="7" y="7" width="2" height="2" fill="#ffcc80" />
                      </svg>
                      SIGN OUT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
