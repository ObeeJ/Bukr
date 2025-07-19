import { useEffect, useRef } from "react";

const BrandMarquee = () => {
  const marqueeRef = useRef<HTMLDivElement>(null);

  const brands = [
    { name: "LiveNation", logo: "🎤" },
    { name: "Eventbrite", logo: "🎟️" },
    { name: "Coachella", logo: "🎪" },
    { name: "TED", logo: "💡" },
    { name: "SXSW", logo: "🎸" },
    { name: "Comic-Con", logo: "🦸‍♂️" },
    { name: "Spotify", logo: "🎧" },
    { name: "Netflix", logo: "📺" }
  ];

  return (
    <section className="py-8 overflow-hidden">
      <div className="relative">
        <div 
          ref={marqueeRef}
          className="flex animate-marquee gap-12 items-center"
        >
          {/* Duplicate brands for seamless loop */}
          {[...brands, ...brands].map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="flex-shrink-0 flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-2xl">{brand.logo}</span>
              <span className="font-medium whitespace-nowrap">{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandMarquee;