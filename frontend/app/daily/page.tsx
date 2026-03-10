import { Navbar } from "../components/NavBar";

export default function DailyPage() {
  return (
    <div className="p-8">
      <Navbar />
      <h1 className="text-2xl font-bold">Daily</h1>
      <p>This is the daily tasks route.</p>
    </div>
  );
}