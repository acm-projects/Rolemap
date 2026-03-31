"use client"

import { HelpCircle, LogOut, Settings, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { handleSignOut } from "@/app/actions"

interface ProfileDropdownProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const userInitials = user?.name
    ?.split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="ml-2 p-1 rounded-full bg-white hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#508484]"
          aria-label="Profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 text-foreground bg-white border border-gray-200 shadow-lg">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-bold text-sm leading-none text-gray-900">{user?.name || "User"}</p>
            <p className="text-gray-600 text-xs leading-none">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-gray-900 font-semibold bg-muted hover:bg-gray-300 cursor-pointer transition-colors">
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="text-gray-900 font-semibold bg-muted hover:bg-gray-300 cursor-pointer transition-colors">
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="text-gray-900 font-semibold bg-muted hover:bg-gray-300 cursor-pointer transition-colors">
          <HelpCircle />
          Help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={handleSignOut}>
          <button
            type="submit"
            className="w-full text-white font-bold bg-red-600 hover:bg-red-700 px-2 py-1.5 text-sm rounded-md flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
