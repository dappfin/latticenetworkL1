import { useEffect, useRef } from "react";
import mysticSpaceBg from "@/assets/mystic-space-bg.jpg";

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

    // Create multi-layered stars with premium colors - MORE VISIBLE
    const stars: Star[] = [];
    const starCount = 800;

    // Layer 1: Distant stars (small but visible, bright cyan-white)
    for (let i = 0; i < starCount * 0.5; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.15 + 0.05,
        opacity: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        layer: 1,
        color: `193, 100%, ${88 + Math.random() * 7}%`,
      });
    }

    // Layer 2: Mid-range stars (medium, very bright cyan)
    for (let i = 0; i < starCount * 0.35; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 1.2,
        speed: Math.random() * 0.25 + 0.1,
        opacity: Math.random() * 0.7 + 0.5,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        layer: 2,
        color: `193, 100%, ${75 + Math.random() * 15}%`,
      });
    }

    // Layer 3: Close premium stars (large, brilliant glowing cyan)
    for (let i = 0; i < starCount * 0.15; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 0.35 + 0.15,
        opacity: Math.random() * 0.9 + 0.5,
        twinkleSpeed: Math.random() * 0.025 + 0.015,
        layer: 3,
        color: `193, 100%, ${65 + Math.random() * 25}%`,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      // Draw stars by layer for proper depth - BRIGHTER & MORE VISIBLE
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 10) * 0.4 + 0.6;
        const finalOpacity = star.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        // Premium glow effects based on layer - ENHANCED VISIBILITY
        if (star.layer === 3) {
          // Close stars - ULTRA dramatic glow
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 8
          );
          gradient.addColorStop(0, `hsla(193, 100%, 95%, ${finalOpacity})`);
          gradient.addColorStop(0.2, `hsla(${star.color}, ${finalOpacity * 0.8})`);
          gradient.addColorStop(0.5, `hsla(193, 100%, 60%, ${finalOpacity * 0.4})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Bright core with cross flare
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(193, 100%, 98%, ${finalOpacity})`;
          ctx.fill();
        } else if (star.layer === 2) {
          // Mid stars - BRIGHT glow
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 5
          );
          gradient.addColorStop(0, `hsla(193, 100%, 90%, ${finalOpacity})`);
          gradient.addColorStop(0.4, `hsla(${star.color}, ${finalOpacity * 0.6})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Bright center
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(193, 100%, 95%, ${finalOpacity})`;
          ctx.fill();
        } else {
          // Distant stars - MORE VISIBLE
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 2.5
          );
          gradient.addColorStop(0, `hsla(${star.color}, ${finalOpacity})`);
          gradient.addColorStop(0.7, `hsla(${star.color}, ${finalOpacity * 0.3})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
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
      {/* Mystic space background image - MORE VISIBLE */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${mysticSpaceBg})`,
          opacity: 1
        }}
      />
      
      {/* Light overlay for subtle blending only */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(225,80%,4%)]/20 via-transparent to-[hsl(225,80%,4%)]/20" />
        
        {/* Subtle nebula accent - minimal */}
        <div className="absolute top-[20%] -left-[5%] w-[1000px] h-[1000px] opacity-15">
          <div className="w-full h-full bg-gradient-radial from-primary/40 via-primary/20 to-transparent blur-[100px] animate-float" />
        </div>

        {/* Minimal vignette - just edges */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent via-80% to-black/20" />
      </div>

      {/* Premium star field canvas - FULL OPACITY */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </>
  );
};
