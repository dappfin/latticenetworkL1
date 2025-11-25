export const Stats = () => {
  const stats = [
    { value: "1M+", label: "Transactions Per Second" },
    { value: "99.99%", label: "Uptime Guarantee" },
    { value: "256-bit", label: "Quantum Security" },
    { value: "<1s", label: "Finality Time" },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-xl bg-card/40 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40 transition-colors"
            >
              <div className="text-4xl md:text-5xl font-black text-primary mb-2 glow-text">
                {stat.value}
              </div>
              <div className="text-sm text-foreground/80 font-bold">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
