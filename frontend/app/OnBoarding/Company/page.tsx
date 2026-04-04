"use client";
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
  const [selectedCompany, setSelectedCompany] = useState<string>(""); // single select

  const toggleCompany = (companyId: string) => {
    setSelectedCompany((prev) => (prev === companyId ? "" : companyId));
  };

  const canContinue = selectedCompany !== "";

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col justify-between flex-1">
        {/* Header */}
        <div className="mb-1">
          <div className="mb-1">
            <PixelProgress value={40} showLabel={true} step={2} totalSteps={5} />
            <TypewriterText
              text="Where do you want to work?"
              speed={60}
              delay={400}
              className="text-5xl text-[#2d5050] mt-7 block"
            />
            <TypewriterText
              text="Select your target companies. We'll use this to customize your personalized learning path and interview preparation roadmap."
              speed={20}
              delay={1800}
              className="text-2xl text-[#4e8888] mb-7 max-w-2xl block"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-3 text-xl">
          <PixelInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a company..."
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 flex-1">
          {filteredCompanies.map((company) => {
            const isSelected = selectedCompany === company.id;
            return (
              <PixelCard key={company.id} onClick={() => toggleCompany(company.id)} selected={isSelected}>
                <div
                  className={`p-3 flex flex-col items-center justify-center gap-2 transition-all duration-100 relative
                    ${isSelected ? "bg-[#3a6666] translate-y-[4px]" : "bg-transparent translate-y-0"}
                  `}
                >
                  <div
                    className={`w-8 h-4 flex items-center justify-center text-3xl font-jersey transition-colors duration-100
                      ${isSelected ? "text-white" : "text-[#4e8888]"}
                    `}
                  >
                    {company.logo}
                  </div>
                  <span
                    className={`text-2xl text-center font-jersey transition-colors duration-100
                      ${isSelected ? "text-white" : "text-[#2d5050]"}
                    `}
                  >
                    {company.name}
                  </span>
                </div>
              </PixelCard>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3">
          <PixelButton variant="ghost" onClick={() => router.push("../OnBoarding/Major")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>

          <div className="flex items-center gap-4 text-xl">
            <PixelButton
              variant="primary"
              onClick={() => router.push("../OnBoarding/Preferences")}
              size="md"
              disabled={!canContinue}
            >
              <div className="flex items-center gap-2 text-xl">
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </PixelButton>
          </div>
        </div>
      </div>

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

        * {
          image-rendering: pixelated;
          -webkit-font-smoothing: none;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}