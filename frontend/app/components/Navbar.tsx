"use client"

import { handleGoogleSignIn } from "../actions"

export function Navbar() {
  return (
    <div className="flex justify-end p-[30px] px-[50px] gap-6">
      <form action={handleGoogleSignIn}>
        <button
          type="submit"
          className="bg-[#143251] text-[#F0F9FF] rounded-xl px-8 py-4 text-[20px]"
        >
          Login
        </button>
      </form>
      <button className="px-12 py-4 text-[1.1rem] rounded-xl bg-[#0EA5E9] text-white font-semibold cursor-pointer">
        Sign Up
      </button>
    </div>
  )
}
