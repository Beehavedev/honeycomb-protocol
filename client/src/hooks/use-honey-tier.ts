import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

interface TierData {
  tier: string;
  stakedAmount: string;
  feeDiscount: number;
  pointsMultiplier: number;
  tierInfo?: {
    benefits: string[];
    badgeColor: string;
    displayName: string;
  };
}

export function useHoneyTier() {
  const { address, isConnected } = useAccount();

  const { data, isLoading } = useQuery<TierData>({
    queryKey: ["/api/honey/tier", address],
    queryFn: async () => {
      const res = await fetch(`/api/honey/tier/${address}`);
      if (!res.ok) throw new Error("Failed to fetch tier");
      return res.json();
    },
    enabled: isConnected && !!address,
  });

  const tierData = data || {
    tier: "none",
    stakedAmount: "0",
    feeDiscount: 0,
    pointsMultiplier: 1,
  };

  const badgeColor = tierData.tierInfo?.badgeColor || "#6B7280";
  const benefits = tierData.tierInfo?.benefits || [];

  return {
    tier: tierData.tier,
    feeDiscount: tierData.feeDiscount,
    pointsMultiplier: tierData.pointsMultiplier,
    badgeColor,
    benefits,
    stakedAmount: tierData.stakedAmount,
    isLoading,
    hasTier: tierData.tier !== "none",
  };
}
