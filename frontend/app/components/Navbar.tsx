"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileDropdown } from "./ProfileDropdown";

//Nav Bar component with links to different sections of the app. 
export function Navbar({ user }: { user?: { name?: string | null; email?: string | null; image?: string | null } }) {
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
        <div className="ml-2">
          <ProfileDropdown user={user} />
        </div>
      </div>
    </nav>
  );
}