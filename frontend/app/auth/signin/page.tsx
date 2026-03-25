"use client";
import React from "react";
import { signIn } from "next-auth/react";

const SignInPage: React.FC = () => {
  return (
    <div
      className="
        min-h-[100vh] font-[Inter] bg-[#E4E4E4]
        flex items-center justify-center
      "
    >
      <div className="bg-white rounded-2xl shadow-sm border border-[#d4d4d4] p-16 flex flex-col items-center text-center gap-6 max-w-[480px] w-full">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#508484] flex items-center justify-center text-white text-xs font-bold">
            RM
          </div>
          <span className="font-bold text-[#1B1B1B] text-base">RoleMap</span>
        </div>

        <div>
          <h1 className="text-[22px] font-extrabold text-[#1B1B1B]">Welcome back</h1>
          <p className="text-sm text-[#555555] mt-1">Sign in to continue to your dashboard</p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border-2 border-[#d4d4d4] hover:border-[#508484] bg-white text-[#1B1B1B] font-semibold text-sm transition-all duration-200 hover:shadow-md"
        >
          <span className="text-lg">G</span>
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default SignInPage;