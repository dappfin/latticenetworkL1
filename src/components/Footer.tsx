import { Github, Twitter, MessageCircle } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t-2 border-primary/20 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/30 flex items-center justify-center border-2 border-primary/50">
              <span className="text-primary font-black">L</span>
            </div>
            <span className="font-bold text-lg text-foreground">Lattice Network</span>
          </div>

          <div className="flex gap-6">
            <a 
              href="#" 
              className="text-foreground/70 hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a 
              href="#" 
              className="text-foreground/70 hover:text-primary transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a 
              href="#" 
              className="text-foreground/70 hover:text-primary transition-colors"
              aria-label="Discord"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>

          <div className="text-sm text-foreground/70 font-medium">
            © 2025 Lattice Network. Quantum-secured.
          </div>
        </div>
      </div>
    </footer>
  );
};
