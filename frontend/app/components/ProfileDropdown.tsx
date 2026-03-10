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
        <Button className="relative h-10 w-10 rounded-full" variant="ghost">
          <Avatar>
            {user?.image && <AvatarImage alt={user?.name || "User"} src={user.image} />}
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
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
