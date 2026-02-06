import { Badge } from "@/components/ui/badge";
import { Hexagon, Zap, Shield, Crown, Star } from "lucide-react";

const TIER_ICONS: Record<string, any> = {
  drone: Hexagon,
  worker: Zap,
  guardian: Shield,
  queen: Crown,
};

interface TierBadgeProps {
  tier: string;
  badgeColor?: string;
  showLabel?: boolean;
  size?: "sm" | "default";
}

export function TierBadge({ tier, badgeColor, showLabel = true, size = "default" }: TierBadgeProps) {
  if (!tier || tier === "none") return null;

  const TierIcon = TIER_ICONS[tier] || Star;
  const color = badgeColor || "#F59E0B";
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <Badge
      className={`gap-1 ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
      style={{ backgroundColor: color, color: "#fff" }}
      data-testid={`badge-tier-${tier}`}
    >
      <TierIcon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {showLabel && <span>{label}</span>}
    </Badge>
  );
}

interface FeeDiscountBadgeProps {
  feeDiscount: number;
  originalFee?: string;
}

export function FeeDiscountBadge({ feeDiscount, originalFee }: FeeDiscountBadgeProps) {
  if (!feeDiscount || feeDiscount <= 0) return null;

  return (
    <Badge variant="outline" className="gap-1 text-xs border-green-500/50 text-green-600 dark:text-green-400" data-testid="badge-fee-discount">
      <Zap className="h-3 w-3" />
      {feeDiscount}% fee discount
      {originalFee && <span className="text-muted-foreground line-through ml-1">{originalFee}</span>}
    </Badge>
  );
}
