import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  twinkleSpeed: number;
  layer: number;
  color: string;
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

    // Create multi-layered stars with premium colors
    const stars: Star[] = [];
    const starCount = 500;

    // Layer 1: Distant stars (small, dim, cyan-white)
    for (let i = 0; i < starCount * 0.6; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1 + 0.3,
        speed: Math.random() * 0.15 + 0.05,
        opacity: Math.random() * 0.4 + 0.2,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        layer: 1,
        color: `193, 100%, ${85 + Math.random() * 10}%`,
      });
    }

    // Layer 2: Mid-range stars (medium, brighter cyan)
    for (let i = 0; i < starCount * 0.3; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.25 + 0.1,
        opacity: Math.random() * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        layer: 2,
        color: `193, 100%, ${70 + Math.random() * 15}%`,
      });
    }

    // Layer 3: Close premium stars (large, glowing, brilliant cyan)
    for (let i = 0; i < starCount * 0.1; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1.5,
        speed: Math.random() * 0.35 + 0.15,
        opacity: Math.random() * 0.8 + 0.4,
        twinkleSpeed: Math.random() * 0.025 + 0.015,
        layer: 3,
        color: `193, 100%, ${60 + Math.random() * 20}%`,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      // Draw stars by layer for proper depth
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 10) * 0.35 + 0.65;
        const finalOpacity = star.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        // Premium glow effects based on layer
        if (star.layer === 3) {
          // Close stars - dramatic glow
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 6
          );
          gradient.addColorStop(0, `hsla(${star.color}, ${finalOpacity})`);
          gradient.addColorStop(0.3, `hsla(${star.color}, ${finalOpacity * 0.6})`);
          gradient.addColorStop(0.6, `hsla(193, 100%, 50%, ${finalOpacity * 0.25})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Core bright spot
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(193, 100%, 95%, ${finalOpacity * 0.9})`;
          ctx.fill();
        } else if (star.layer === 2) {
          // Mid stars - medium glow
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 4
          );
          gradient.addColorStop(0, `hsla(${star.color}, ${finalOpacity})`);
          gradient.addColorStop(0.5, `hsla(${star.color}, ${finalOpacity * 0.4})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fill();
        } else {
          // Distant stars - subtle
          ctx.fillStyle = `hsla(${star.color}, ${finalOpacity})`;
          ctx.fill();
        }

        // Parallax drift based on layer
        star.y += star.speed * 0.08 * star.layer;
        if (star.y > canvas.height) {
          star.y = -10;
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
      {/* Deep space base with vignette */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(225,71%,5%)] via-space-deep to-[hsl(225,71%,6%)]" />
        
        {/* Dramatic vignette */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />
        
        {/* Premium nebula clouds - ultra dramatic */}
        <div className="absolute -top-[20%] -left-[10%] w-[1200px] h-[1200px] opacity-40">
          <div className="w-full h-full bg-gradient-radial from-primary/50 via-primary/20 via-30% to-transparent blur-[100px] animate-float" />
        </div>
        
        <div className="absolute top-[20%] -right-[10%] w-[1000px] h-[1000px] opacity-35">
          <div className="w-full h-full bg-gradient-radial from-accent/60 via-accent/25 via-30% to-transparent blur-[100px] animate-float" 
               style={{ animationDelay: "-4s", animationDuration: "10s" }} />
        </div>
        
        <div className="absolute top-[60%] left-[10%] w-[900px] h-[900px] opacity-30">
          <div className="w-full h-full bg-gradient-radial from-primary/45 via-primary/20 via-30% to-transparent blur-[100px] animate-float"
               style={{ animationDelay: "-7s", animationDuration: "12s" }} />
        </div>
        
        <div className="absolute bottom-[10%] right-[20%] w-[800px] h-[800px] opacity-25">
          <div className="w-full h-full bg-gradient-radial from-accent/50 via-accent/18 via-35% to-transparent blur-[100px] animate-float"
               style={{ animationDelay: "-2s", animationDuration: "14s" }} />
        </div>

        {/* Cosmic dust layers */}
        <div className="absolute inset-0 opacity-20"
             style={{
               backgroundImage: "radial-gradient(circle at 20% 30%, hsl(193 100% 50% / 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, hsl(193 100% 60% / 0.1) 0%, transparent 50%)",
             }} />

        {/* Premium scan lines */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(193 100% 50%) 2px, hsl(193 100% 50%) 3px)",
             }} />
        
        {/* Subtle grid overlay for tech premium feel */}
        <div className="absolute inset-0 opacity-[0.02]"
             style={{
               backgroundImage: `
                 linear-gradient(90deg, hsl(193 100% 50%) 1px, transparent 1px),
                 linear-gradient(0deg, hsl(193 100% 50%) 1px, transparent 1px)
               `,
               backgroundSize: "100px 100px",
             }} />

        {/* Atmospheric glow at edges */}
        <div className="absolute top-0 inset-x-0 h-[300px] bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-[300px] bg-gradient-to-t from-primary/10 to-transparent" />
      </div>

      {/* Premium star field canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 pointer-events-none opacity-90"
        style={{ zIndex: 1 }}
      />
    </>
  );
};
