"use client";
import Link from "next/link";
<<<<<<< HEAD
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCharacter } from "../context/CharacterContext";

// Renders the user's custom character from shop localStorage data
const DEFAULT_EQUIPPED = { skin: "char1.png", eyes: "eyes.png", clothes: "suit.png", pants: "pants.png", shoes: "shoes.png", hair: "buzzcut.png", accessories: "" };

function ShopCharacter({ size, zoom = 1 }: { size: number; zoom?: number }) {
  const [equipped, setEquipped] = useState<Record<string, string>>(DEFAULT_EQUIPPED);
  const [colorVariants, setColorVariants] = useState<Record<string, number>>({});

  useEffect(() => {
    const eq = localStorage.getItem("character_saved");
    const cv = localStorage.getItem("character_saved_variants");
    if (eq) setEquipped(prev => ({ ...prev, ...JSON.parse(eq) }));
    if (cv) setColorVariants(JSON.parse(cv));
  }, []);

  // Render at zoom*size so each pixel is bigger; crop center-horizontally, top-aligned
  const renderSize = Math.round(size * zoom);
  const bgH = Math.round(renderSize / 28 * 1568);
  const scale = renderSize / 28;
  const xOffset = (32 * scale - renderSize) / 2;
  const clipLeft = (renderSize - size) / 2 + 4;
  // Idle frame starts at sprite row 12 — shift background up so head aligns to top
  const yOffset = Math.round(12 * scale);

  const layers: [string, string][] = [
    [equipped.skin, "skin"],
    [equipped.pants, "pants"],
    [equipped.shoes, "shoes"],
    [equipped.clothes, "clothes"],
    [equipped.eyes, "eyes"],
    [equipped.hair, "hair"],
    [equipped.accessories, "accessories"],
  ];

  return (
    <div style={{ position: "relative", width: size, height: size, overflow: "hidden", imageRendering: "pixelated" }}>
      {layers.filter(([f]) => f).map(([f], i) => {
        const v = colorVariants[f] ?? 0;
        return (
          <div key={i} style={{
            position: "absolute", top: 0, left: -clipLeft, width: renderSize, height: renderSize,
            backgroundImage: `url(/characters/${f})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: `${-(v * 256 * scale) - xOffset}px ${-yOffset}px`,
            backgroundSize: `auto ${bgH}px`,
            imageRendering: "pixelated",
          }} />
        );
      })}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const navItems = ['Dashboard', 'Map', 'Tasks', 'Shop'];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { triggerTransition } = useCharacter();

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
              const href = `/${item.toLowerCase()}`;
              const isActive = pathname === href;
              return (
                <button
                  key={item}
                  onClick={() => {
                    // Walking character on non-map pages: getBoundingClientRect captures mid-animation X
                    const walker = document.querySelector('[data-global-char]');
                    if (walker) {
                      const r = walker.getBoundingClientRect();
                      triggerTransition(href, r.left + r.width / 2, r.bottom, r.width);
                      return;
                    }
                    // Shop character preview
                    const shopChar = document.querySelector('[data-shop-char]');
                    if (shopChar) {
                      const r = shopChar.getBoundingClientRect();
                      triggerTransition(href, r.left + r.width / 2, r.bottom, r.width);
                      return;
                    }
                    // Sleeping character on tasks page
                    const dieChar = document.querySelector('[data-die-char]');
                    if (dieChar) {
                      const r = dieChar.getBoundingClientRect();
                      triggerTransition(href, r.left + r.width / 2, r.bottom, r.width);
                      return;
                    }
                    // Dashboard leaderboard character
                    const dashChar = document.querySelector('[data-dashboard-char]');
                    if (dashChar) {
                      const r = dashChar.getBoundingClientRect();
                      triggerTransition(href, r.left + r.width / 2, r.bottom, r.width);
                      return;
                    }
                    // Map page: use on-node mascot position (includes ReactFlow zoom)
                    const mascot = document.querySelector('[data-char-mascot]');
                    if (mascot) {
                      const r = mascot.getBoundingClientRect();
                      triggerTransition(href, r.left + r.width / 2, r.bottom, r.width);
                      return;
                    }
                    triggerTransition(href);
                  }}
                  className={`pixel-nav-link text-[11px] pb-1 ${isActive ? 'active text-[#2d5050]' : 'text-[#4e8888] hover:text-[#2d5050]'}`}
                  style={{ fontFamily: "'Press Start 2P', monospace", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {item.toUpperCase()}
                </button>
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
                <ShopCharacter size={40} zoom={1.5} />
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
                    {/* Name and email */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[#2d5050] break-words"
                        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', lineHeight: '1.2', wordBreak: 'break-word' }}
                      >
                        {session?.user?.name ?? "GUEST"}
                      </p>
                      <p
                        className="text-[#4e8888] break-words"
                        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', lineHeight: '1.2', wordBreak: 'break-word' }}
                      >
                        {session?.user?.email ?? ""}
                      </p>
                    </div>
                  </div>

                  {/* Menu items — no icons */}
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
=======
import Image from "next/image";
import { usePathname } from "next/navigation";
import gear from "../../icons/settings.png";

export function Navbar() {
  const pathname = usePathname();
  const navItems = ['Dashboard', 'Map', 'Tasks'];


  return (
    <nav className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[95%] max-w-6xl">
      <div className="bg-white border border-slate-200 h-16 rounded-xl flex items-center px-5 shadow-sm gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-[#3D7A7A] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lm font-bold text-slate-800">Rolemap</span>
            {/*<span className="text-[10px] text-slate-400 uppercase tracking-wide">Front End Developer</span>*/}
          </div>
        </div>


        {/* Separator */}
        <div className="h-7 w-px bg-slate-200 shrink-0" />


        {/* Nav links */}
        <div className="flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = pathname === `/${item.toLowerCase()}`;
            return (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className={`relative text-sm font-medium transition-colors pb-1
                  ${isActive
                    ? 'text-[#3D7A7A] font-semibold'
                    : 'text-slate-500 hover:text-slate-700'}
                `}
              >
                {item}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3D7A7A] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>


        {/* Right side */}
        <div className="ml-auto flex items-center gap-3 shrink-0">




          {/* CTA button           <button className="flex items-center gap-2 bg-[#3D7A7A] hover:bg-[#2E6666] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Continue Learning
          </button>*/}

          {/* Separator */}
          <div className="h-7 w-px bg-slate-200" />
            
          <Image src={gear} alt={"Settings Icon"} className="h-15 w-15"/>
            
          {/* Profile */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col leading-tight text-right">
              {/*<span className="text-sm font-semibold text-slate-700">Alex Morgan</span>*/}
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#94A3B8" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </nav>
>>>>>>> 0f62b321a83728b06b8499cfcf6886f94ee0a2c8
  );
}