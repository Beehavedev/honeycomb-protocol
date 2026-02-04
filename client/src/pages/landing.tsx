import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Hexagon, Zap, Brain, Shield, Coins, ArrowRight, Bot } from "lucide-react";

function AnimatedBee({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <div 
      className="absolute pointer-events-none opacity-80"
      style={{
        ...style,
        animation: `floatBee ${8 + delay}s ease-in-out infinite ${delay}s`,
      }}
    >
      <div className="relative">
        <div 
          className="w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50"
          style={{ animation: `pulse ${1 + delay * 0.1}s ease-in-out infinite` }}
        />
        <div className="absolute -right-1 top-0.5 w-2 h-1.5 bg-amber-200/60 rounded-full blur-[1px]" 
          style={{ animation: `wingFlap 0.1s linear infinite` }} 
        />
        <div className="absolute -right-1 top-1 w-2 h-1.5 bg-amber-200/60 rounded-full blur-[1px]"
          style={{ animation: `wingFlap 0.1s linear infinite 0.05s` }}
        />
      </div>
    </div>
  );
}

function HexagonCell({ x, y, delay, size = 60 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: `hexPulse ${4 + delay}s ease-in-out infinite ${delay}s`,
      }}
    >
      <Hexagon 
        className="text-amber-500/20 stroke-amber-500/30" 
        style={{ 
          width: size, 
          height: size,
          filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.2))',
        }} 
      />
    </div>
  );
}

export default function Landing() {
  const bees = [
    { style: { left: '10%', top: '20%' }, delay: 0 },
    { style: { left: '80%', top: '15%' }, delay: 2 },
    { style: { left: '60%', top: '70%' }, delay: 1 },
    { style: { left: '25%', top: '60%' }, delay: 3 },
    { style: { left: '85%', top: '50%' }, delay: 1.5 },
    { style: { left: '15%', top: '80%' }, delay: 2.5 },
    { style: { left: '70%', top: '30%' }, delay: 0.5 },
    { style: { left: '40%', top: '10%' }, delay: 3.5 },
    { style: { left: '50%', top: '85%' }, delay: 4 },
    { style: { left: '90%', top: '75%' }, delay: 1.8 },
  ];

  const hexagons = [
    { x: 5, y: 10, delay: 0, size: 80 },
    { x: 85, y: 5, delay: 1, size: 60 },
    { x: 75, y: 60, delay: 2, size: 70 },
    { x: 10, y: 70, delay: 1.5, size: 50 },
    { x: 50, y: 20, delay: 0.5, size: 40 },
    { x: 30, y: 85, delay: 2.5, size: 55 },
    { x: 90, y: 35, delay: 3, size: 45 },
    { x: 20, y: 40, delay: 1.2, size: 35 },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-amber-950/10">
      <style>{`
        @keyframes floatBee {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -20px) rotate(5deg); }
          50% { transform: translate(60px, 10px) rotate(-3deg); }
          75% { transform: translate(20px, 30px) rotate(8deg); }
        }
        @keyframes wingFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.5); }
        }
        @keyframes hexPulse {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: scale(1.05) rotate(3deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.1); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.5), 0 0 80px rgba(245, 158, 11, 0.2); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
        .animate-slide-up-delay-1 { animation: slideUp 0.8s ease-out 0.2s forwards; opacity: 0; }
        .animate-slide-up-delay-2 { animation: slideUp 0.8s ease-out 0.4s forwards; opacity: 0; }
        .animate-slide-up-delay-3 { animation: slideUp 0.8s ease-out 0.6s forwards; opacity: 0; }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
      `}</style>

      {hexagons.map((hex, i) => (
        <HexagonCell key={i} {...hex} />
      ))}

      {bees.map((bee, i) => (
        <AnimatedBee key={i} {...bee} />
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div 
            className="inline-flex items-center justify-center w-24 h-24 mb-8 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 animate-slide-up"
            style={{ animation: 'glowPulse 3s ease-in-out infinite, slideUp 0.8s ease-out forwards' }}
          >
            <div className="relative">
              <Hexagon className="w-12 h-12 text-amber-500 fill-amber-500/30" />
              <Bot className="w-6 h-6 text-amber-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up-delay-1">
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              The AI Hive
            </span>
            <br />
            <span className="text-foreground/90 text-3xl md:text-4xl font-medium">
              Awakens
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-slide-up-delay-2 max-w-2xl mx-auto">
            Where autonomous AI agents become tradeable assets.
            <span className="text-amber-500"> Mint. Trade. Evolve.</span>
          </p>

          <p className="text-sm text-muted-foreground/70 mb-8 animate-slide-up-delay-2">
            Built on BNB Chain • Powered by BAP-578 & ERC-8004 Standards
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-delay-3">
            <Link href="/nfa">
              <Button size="lg" className="group gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25" data-testid="button-explore-hive">
                Enter the Hive
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/nfa/mint">
              <Button size="lg" variant="outline" className="gap-2 border-amber-500/50 hover:bg-amber-500/10" data-testid="button-mint-agent">
                <Bot className="w-4 h-4" />
                Mint Your Agent
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '1s', opacity: 0, animationFillMode: 'forwards' }}>
          <FeatureCard 
            icon={<Brain className="w-6 h-6" />}
            title="Learning Agents"
            description="AI that evolves with Merkle-verified learning"
          />
          <FeatureCard 
            icon={<Shield className="w-6 h-6" />}
            title="Proof of Prompt"
            description="Cryptographic verification on-chain"
          />
          <FeatureCard 
            icon={<Coins className="w-6 h-6" />}
            title="Trade NFAs"
            description="Buy, sell, and monetize AI agents"
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6" />}
            title="Memory Vault"
            description="Persistent on-chain agent memory"
          />
        </div>

        <div className="mt-20 text-center animate-fade-in" style={{ animationDelay: '1.5s', opacity: 0, animationFillMode: 'forwards' }}>
          <p className="text-xs text-muted-foreground/50 tracking-widest uppercase mb-2">
            The Future is Autonomous
          </p>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-amber-500/60"
                style={{ animation: `pulse 1.5s ease-in-out infinite ${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group p-4 rounded-xl bg-card/50 border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300">
      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
