import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
});

export const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = emailSchema.parse({ email });
      
      // TODO: Store in database when backend is ready
      console.log("Waitlist signup:", validated.email);
      
      toast({
        title: "Welcome to the Lattice Network!",
        description: "You're on the waitlist for Q1 2026 mainnet launch.",
      });
      
      setEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid email",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <span className="text-sm font-bold text-primary border-2 border-primary/40 px-4 py-2 rounded-full glow-border">
              Mainnet Launch Q1 2026
            </span>
          </div>
          
          <h2 className="mb-6 glow-text text-foreground">Join the Waitlist</h2>
          <p className="text-xl text-foreground/90 mb-12 font-medium">
            Be the first to access the quantum-secure future of blockchain. Get early access, testnet invites, and exclusive updates.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-card/60 border-2 border-primary/30 focus:border-primary/60 text-foreground placeholder:text-foreground/50 font-medium"
              disabled={loading}
              required
            />
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 glow-border"
              disabled={loading}
            >
              {loading ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border-2 border-primary/20">
              <div className="text-3xl font-black text-primary mb-2 glow-text">12K+</div>
              <div className="text-sm text-foreground/80 font-bold">Early Adopters</div>
            </div>
            <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border-2 border-primary/20">
              <div className="text-3xl font-black text-primary mb-2 glow-text">Q1 2026</div>
              <div className="text-sm text-foreground/80 font-bold">Mainnet Launch</div>
            </div>
            <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border-2 border-primary/20">
              <div className="text-3xl font-black text-primary mb-2 glow-text">100%</div>
              <div className="text-sm text-foreground/80 font-bold">Quantum-Secure</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
