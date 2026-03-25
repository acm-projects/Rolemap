"use client";
import React from "react";
import { signIn } from "@/auth";
import { useRouter } from "next/navigation";

const Landing: React.FC = () => {
  const router = useRouter();
  return (
    <div
      className="
      min-h-[100vh] font-[Inter] bg-[#F0F9FF]
      bg-[linear-gradient(to_right,#c1b0b050_1px,transparent_1px),linear-gradient(to_bottom,#c1b0b074_1px,transparent_1px)]
      bg-[size:40px_40px]
      "
    >
      {/* Header with Sign In and Sign Up Buttons */}
      <div className="absolute top-0 right-0 p-6 flex gap-4">
        <button
          onClick={() => router.push("/auth/signin")}
          className="px-6 py-2 rounded-lg border-2 border-[#0EA5E9] text-[#0EA5E9] font-semibold hover:bg-[#0EA5E9] hover:text-white transition-all duration-200"
        >
            Sign In
          </button>
        <button
          onClick={() => router.push("/OnBoarding/Major")}
          className="px-6 py-2 rounded-lg bg-[#0EA5E9] text-white font-semibold hover:bg-[#53D8F0] transition-all duration-200"
        >
            Sign Up
          </button>
      </div>
      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-screen gap-0 pb-20">

        <h1 className="text-[80px] font-bold text-[#53D8F0] leading-none">
          Rolemap
        </h1>

        <p className="text-[70px] font-semibold text-[#0EA5E9] leading-[1.1]">
          Master Any Tech Role
        </p>

        <span className="text-[65px] font-semibold text-[#143251] leading-[1.1]">
          With AI Guidance
        </span>

        <p className="text-[30px] text-[#C1B0B0] font-semibold max-w-[1000px] text-center mt-6">
          Get a personalized learning roadmap tailored to your background and
          goals. Track progress, complete daily challenges, and level up your
          career.
        </p>

        {/* Features */}
        <div className="flex justify-center gap-16 p-8 mt-10">

          <div className="bg-white flex flex-col justify-center text-[#114277] rounded-xl p-8 w-[300px] h-[250px] text-center shadow-md text-lg">
            <h3 className="font-semibold text-xl mb-2">Personalized Roadmaps</h3>
            <p>
              AI analyzes your resume and GitHub to create a custom learning
              path
            </p>
          </div>

          <div className="bg-white flex flex-col justify-center text-[#114277] rounded-xl p-8 w-[300px] h-[250px] text-center shadow-md text-lg">
            <h3 className="font-semibold text-xl mb-2">Daily Challenges</h3>
            <p>
              Bite-sized tasks that build real skills through consistent
              practice
            </p>
          </div>

          <div className="bg-white flex flex-col justify-center text-[#114277] rounded-xl p-8 w-[300px] h-[250px] text-center shadow-md text-lg">
            <h3 className="font-semibold text-xl mb-2">Gamified Progress</h3>
            <p>
              Earn XP, maintain streaks, and compete on global leaderboards
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Landing;