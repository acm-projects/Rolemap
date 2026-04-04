"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

import { usePathname } from "next/navigation";
import gear from "../../icons/settings.png";

export function Navbar() {
  const pathname = usePathname();
  const navItems = ['Dashboard', 'Map', 'Tasks'];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  //used to close dorwndown when mouse clicks outside of it
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
  );
}