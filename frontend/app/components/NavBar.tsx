"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// SVG Profile Icon Component

//Nav Bar component with links to different sections of the app. 
export function Navbar() {
  const pathname = usePathname();

  const navItems = ['Dashboard', 'Map', 'Daily', 'Social'];

  return (
    //Floating container for the navbar, centered at the top of the screen with some padding and a semi-transparent background
    <nav className="absolute top-5 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-5xl">
      {/*Glassmorphic styled navbar with rounded corners, border, and shadow. Contains navigation links.*/}
      <div className="bg-[#508484]/90 backdrop-blur-md border border-white/40 h-12 rounded-2xl flex items-center justify-start px-6 shadow-sm gap-4">
        
        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === `/${item.toLowerCase()}`;
            return (
              <Link 
                key={item} 
                href={`/${item.toLowerCase()}`} 
                className={`relative font-bold text-sm transition-opacity cursor-pointer group
                  ${isActive 
                    ? 'text-[white] opacity-100' 
                    : 'text-[white] hover:opacity-70'
                  }
                `}
              >
                {item}
                {/* Active page underline indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[white] rounded-full transition-all duration-300"></span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div className="ml-auto h-6 w-px bg-white/30"></div>

        {/* Profile Icon */}
        <button 
          className="ml-2 p-1 rounded-full bg-white hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#508484]"
          aria-label="Profile"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
        </button>
      </div>
    </nav>
  );
}