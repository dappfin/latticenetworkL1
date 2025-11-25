import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  twinkleSpeed: number;
}

export const DeepSpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Create stars with different layers
    const stars: Star[] = [];
    const starCount = 300;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      // Draw stars with twinkling effect
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 10) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        // Create glow effect for larger stars
        if (star.size > 1.5) {
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 3
          );
          gradient.addColorStop(0, `hsla(193, 100%, 70%, ${star.opacity * twinkle})`);
          gradient.addColorStop(0.5, `hsla(193, 100%, 60%, ${star.opacity * twinkle * 0.3})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = `hsla(193, 100%, 85%, ${star.opacity * twinkle})`;
        }
        
        ctx.fill();

        // Slow drift
        star.y += star.speed * 0.1;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {/* Nebula gradient layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-space-deep via-space-mid to-space-deep" />
        
        {/* Nebula clouds */}
        <div className="absolute top-0 left-0 w-[800px] h-[800px] opacity-30">
          <div className="w-full h-full bg-gradient-radial from-primary/30 via-primary/10 to-transparent blur-3xl animate-float" />
        </div>
        
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] opacity-20">
          <div className="w-full h-full bg-gradient-radial from-accent/40 via-accent/15 to-transparent blur-3xl animate-float" 
               style={{ animationDelay: "-3s", animationDuration: "8s" }} />
        </div>
        
        <div className="absolute bottom-0 left-1/4 w-[700px] h-[700px] opacity-25">
          <div className="w-full h-full bg-gradient-radial from-primary/25 via-primary/10 to-transparent blur-3xl animate-float"
               style={{ animationDelay: "-5s", animationDuration: "10s" }} />
        </div>

        {/* Subtle scan lines for premium tech feel */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{
               backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(193 100% 50%) 2px, hsl(193 100% 50%) 4px)",
             }} />
      </div>

      {/* Star field canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
    </>
  );
};
