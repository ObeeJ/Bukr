import { useEffect, useRef } from "react";

const PopularEvents = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = [
    { id: 1, title: "Summer Music Festival", image: "🎵", date: "Jul 15" },
    { id: 2, title: "Tech Conference 2025", image: "💻", date: "Aug 20" },
    { id: 3, title: "Art Exhibition", image: "🎨", date: "Sep 10" },
    { id: 4, title: "Food Festival", image: "🍕", date: "Oct 5" },
    { id: 5, title: "Sports Championship", image: "🏆", date: "Nov 12" },
    { id: 6, title: "Comedy Night", image: "😂", date: "Dec 3" }
  ];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scroll = () => {
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft = 0;
      } else {
        scrollContainer.scrollLeft += 1;
      }
    };

    const interval = setInterval(scroll, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-glow">
          Popular Events
        </h2>
        
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-hidden"
          style={{ scrollBehavior: 'auto' }}
        >
          {/* Duplicate events for seamless loop */}
          {[...events, ...events].map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              className="flex-shrink-0 w-80 glass-card p-6 hover-glow"
            >
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-6xl">{event.image}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{event.title}</h3>
              <p className="text-muted-foreground">{event.date}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularEvents;