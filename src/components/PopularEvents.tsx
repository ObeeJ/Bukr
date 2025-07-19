import React from "react";

const PopularEvents = () => {
  const events = [
    { id: 1, title: "Summer Music Festival", image: "🎵", date: "Jul 15" },
    { id: 2, title: "Tech Conference 2025", image: "💻", date: "Aug 20" },
    { id: 3, title: "Art Exhibition", image: "🎨", date: "Sep 10" },
    { id: 4, title: "Food Festival", image: "🍕", date: "Oct 5" },
    { id: 5, title: "Sports Championship", image: "🏆", date: "Nov 12" },
    { id: 6, title: "Comedy Night", image: "😂", date: "Dec 3" }
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-glow watermark">
          Popular Events
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="glass-card p-6 transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] hover:scale-[1.03]"
            >
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-6xl">{event.image}</span>
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">{event.title}</h3>
              <p className="text-muted-foreground font-montserrat">{event.date}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularEvents;