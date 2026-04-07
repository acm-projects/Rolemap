'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, ArrowRight } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelCard from "../../components/PixelCard";
import PixelInput from "../../components/PixelInput";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

interface Company {
  id: string;
  name: string;
  logo: string;
}

const companies: Company[] = [
  { id: "1", name: "Google", logo: "G" },
  { id: "2", name: "Microsoft", logo: "M" },
  { id: "3", name: "Meta", logo: "∞" },
  { id: "4", name: "Amazon", logo: "a" },
  { id: "5", name: "Apple", logo: "A" },
  { id: "6", name: "Netflix", logo: "N" },
  { id: "7", name: "Airbnb", logo: "A" },
  { id: "8", name: "Nvidia", logo: "NV" },
];

export default function CompanySelection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#f0f8f8] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <TypewriterText
              text="ONBOARDING"
              speed={30}
              delay={100}
              className="text-xs text-[#7ab3b3] mb-2 tracking-wider block"
            />
            <TypewriterText
              text="Where do you want to work?"
              speed={40}
              delay={400}
              className="text-2xl text-[#2d5050] mb-4 leading-relaxed block"
            />
            <TypewriterText
              text="Select your target companies. We'll use this to customize your personalized learning path and interview preparation roadmap."
              speed={20}
              delay={1800}
              className="text-xs text-[#4e8888] leading-relaxed max-w-2xl block"
            />
          </div>

          {/* Progress */}
          <div className="mb-6">
            <PixelProgress value={40} showLabel={true} />
            <TypewriterText
              text="Step 2 of 5"
              speed={30}
              delay={3500}
              className="text-xs text-[#4e8888] mt-2 block text-right"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <PixelInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a company..."
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {filteredCompanies.map((company) => (
            <PixelCard
              key={company.id}
              onClick={() => toggleCompany(company.id)}
              selected={selectedCompanies.includes(company.id)}
            >
              <div className="p-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                <div
                  className="w-12 h-12 flex items-center justify-center text-2xl"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    imageRendering: "pixelated",
                  }}
                >
                  {company.logo}
                </div>
                <span
                  className="text-xs text-center text-[#2d5050]"
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  {company.name}
                </span>
              </div>
            </PixelCard>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <PixelButton
            variant="ghost"
            onClick={() => router.push("/OnBoarding/Major")}
            size="md"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>

          <div className="flex items-center gap-4">
            <PixelButton
              variant="secondary"
              onClick={() => router.push("/OnBoarding/Preferences")}
              size="md"
            >
              Skip for now
            </PixelButton>
            <PixelButton
              variant="primary"
              onClick={() => router.push("/OnBoarding/Preferences")}
              size="md"
              disabled={selectedCompanies.length === 0}
            >
              <div className="flex items-center gap-2">
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </PixelButton>
          </div>
        </div>
      </div>

      {/* Pixel Border Global Style */}
      <style>{`
        .pixel-border {
          border-width: 4px;
          border-style: solid;
          box-shadow: 
            0 4px 0 0 rgba(0, 0, 0, 0.3),
            inset 0 -2px 0 0 rgba(0, 0, 0, 0.2);
          image-rendering: pixelated;
        }

        .pixel-border:active {
          box-shadow: 
            0 2px 0 0 rgba(0, 0, 0, 0.3),
            inset 0 2px 0 0 rgba(0, 0, 0, 0.2);
          }

        .image-rendering-pixelated {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }

        * {
          image-rendering: pixelated;
          -webkit-font-smoothing: none;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}