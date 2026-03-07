import { signOut, auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {/* Navbar */}
      <div className="flex justify-between items-center p-[30px] px-[50px] bg-white shadow-sm">
        <h2 className="text-2xl font-bold text-[#143251]">Rolemap Dashboard</h2>
        <div className="flex gap-4">
          <span className="text-[#143251]">Welcome, {session?.user?.name || "User"}</span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-[#143251] font-semibold text-lg mb-2">Current Streak</h3>
            <p className="text-4xl font-bold text-[#53D8F0]">7 days</p>
            <p className="text-[#C1B0B0] text-sm mt-2">Keep going!</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-[#143251] font-semibold text-lg mb-2">Total XP</h3>
            <p className="text-4xl font-bold text-[#0EA5E9]">2,450</p>
            <p className="text-[#C1B0B0] text-sm mt-2">Level 5</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-[#143251] font-semibold text-lg mb-2">Challenges</h3>
            <p className="text-4xl font-bold text-[#143251]">12/30</p>
            <p className="text-[#C1B0B0] text-sm mt-2">40% Complete</p>
          </div>
        </div>

        {/* Current Roadmap */}
        <div className="bg-white rounded-xl p-8 shadow-md mb-8">
          <h2 className="text-2xl font-bold text-[#143251] mb-4">Your Learning Roadmap</h2>
          <p className="text-[#C1B0B0] mb-6">Next.js Full Stack Development</p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-4 h-4 rounded-full bg-[#0EA5E9]"></div>
              <div className="flex-1">
                <p className="font-semibold text-[#143251]">Frontend Basics</p>
                <p className="text-sm text-[#C1B0B0]">React & TypeScript</p>
              </div>
              <span className="text-[#0EA5E9] font-bold">In Progress</span>
            </div>

            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <div className="flex-1">
                <p className="font-semibold text-[#143251]">Backend Development</p>
                <p className="text-sm text-[#C1B0B0]">API Design & Node.js</p>
              </div>
              <span className="text-gray-400">Locked</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <div className="flex-1">
                <p className="font-semibold text-[#143251]">Database Design</p>
                <p className="text-sm text-[#C1B0B0]">PostgreSQL & Prisma</p>
              </div>
              <span className="text-gray-400">Locked</span>
            </div>
          </div>
        </div>

        {/* Today's Challenge */}
        <div className="bg-gradient-to-r from-[#53D8F0] to-[#0EA5E9] rounded-xl p-8 shadow-md text-white">
          <h3 className="text-2xl font-bold mb-2">Today's Challenge</h3>
          <p className="text-lg mb-4">Build a useState counter component</p>
          <button className="bg-white text-[#0EA5E9] font-bold px-6 py-3 rounded-lg hover:bg-gray-100">
            Start Challenge →
          </button>
        </div>
      </div>
    </div>
  )
}