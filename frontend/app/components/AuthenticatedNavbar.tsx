import Link from "next/link"
import { auth } from "@/auth"
import { ProfileDropdown } from "./ProfileDropdown"

export async function AuthenticatedNavbar() {
  const session = await auth()

  return (
    <nav className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-5xl">
      <div className="bg-[#dcf2ff]/80 backdrop-blur-md border border-white/40 h-12 rounded-xl flex items-center justify-between px-8 shadow-sm">
        <div className="flex gap-6">
          {['Dashboard', 'Map', 'Social', 'Daily'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className="text-[#0a1f27] font-bold text-sm hover:opacity-70 transition-opacity cursor-pointer"
            >
              {item}
            </Link>
          ))}
        </div>
        <ProfileDropdown user={session?.user} />
      </div>
    </nav>
  )
}
