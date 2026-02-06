import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

interface HiveLaunchBannerProps {
  eventEndDate?: Date;
  onDismiss?: () => void;
}

export function HiveLaunchBanner({ onDismiss }: HiveLaunchBannerProps) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const storedDismiss = localStorage.getItem("hiveLaunchDismissed");
    if (storedDismiss) {
      const dismissedAt = new Date(storedDismiss);
      const hoursSinceDismiss = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 72) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("hiveLaunchDismissed", new Date().toISOString());
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            Early Adopter Program is live &mdash; earn bonus rewards for joining now
          </span>
          <Link href="/rewards">
            <Button 
              size="sm" 
              className="bg-white/20 text-white gap-1 border-white/30"
              variant="outline"
              data-testid="button-hive-launch-cta"
            >
              Learn more
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80 shrink-0"
            onClick={handleDismiss}
            data-testid="button-dismiss-banner"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
