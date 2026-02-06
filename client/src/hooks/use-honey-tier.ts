import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useStakingGetUserTier, useStakingGetFeeDiscount, useStakingGetStakeInfo, useHoneyTokenAddress } from "@/contracts/hooks";
import { formatEther } from "viem";

const TIER_NAMES = ["none", "drone", "worker", "guardian", "queen"];

const TIER_INFO: Record<string, { benefits: string[]; badgeColor: string; displayName: string; pointsMultiplier: number }> = {
  none: { benefits: [], badgeColor: "#6B7280", displayName: "None", pointsMultiplier: 1 },
  drone: { benefits: ["5% fee discount", "Basic agent features"], badgeColor: "#F59E0B", displayName: "Drone", pointsMultiplier: 1.1 },
  worker: { benefits: ["10% fee discount", "Priority support", "Advanced analytics"], badgeColor: "#D97706", displayName: "Worker", pointsMultiplier: 1.25 },
  guardian: { benefits: ["15% fee discount", "Governance voting", "Premium features"], badgeColor: "#8B5CF6", displayName: "Guardian", pointsMultiplier: 1.5 },
  queen: { benefits: ["20% fee discount", "All features", "Revenue sharing"], badgeColor: "#EC4899", displayName: "Queen", pointsMultiplier: 2 },
};

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
  const honeyTokenAddr = useHoneyTokenAddress();
  const deployed = !!honeyTokenAddr;

  const { data: onChainTier } = useStakingGetUserTier(address);
  const { data: onChainFeeDiscount } = useStakingGetFeeDiscount(address);
  const { data: onChainStakeInfo } = useStakingGetStakeInfo(address);

  const { data: apiData, isLoading: apiLoading } = useQuery<TierData>({
    queryKey: ["/api/honey/tier", address],
    queryFn: async () => {
      const res = await fetch(`/api/honey/tier/${address}`);
      if (!res.ok) throw new Error("Failed to fetch tier");
      return res.json();
    },
    enabled: isConnected && !!address && !deployed,
  });

  if (deployed && isConnected && address) {
    const tierIndex = onChainTier !== undefined ? Number(onChainTier) : 0;
    const tierName = TIER_NAMES[tierIndex] || "none";
    const info = TIER_INFO[tierName];
    const stakedAmount = onChainStakeInfo ? formatEther(onChainStakeInfo[0] as bigint) : "0";
    const feeDiscount = onChainFeeDiscount !== undefined ? Number(onChainFeeDiscount) : 0;

    return {
      tier: tierName,
      feeDiscount,
      pointsMultiplier: info.pointsMultiplier,
      badgeColor: info.badgeColor,
      benefits: info.benefits,
      stakedAmount,
      isLoading: false,
      hasTier: tierName !== "none",
    };
  }

  const tierData = apiData || {
    tier: "none",
    stakedAmount: "0",
    feeDiscount: 0,
    pointsMultiplier: 1,
  };

  const badgeColor = tierData.tierInfo?.badgeColor || TIER_INFO[tierData.tier]?.badgeColor || "#6B7280";
  const benefits = tierData.tierInfo?.benefits || TIER_INFO[tierData.tier]?.benefits || [];

  return {
    tier: tierData.tier,
    feeDiscount: tierData.feeDiscount,
    pointsMultiplier: tierData.pointsMultiplier,
    badgeColor,
    benefits,
    stakedAmount: tierData.stakedAmount,
    isLoading: apiLoading,
    hasTier: tierData.tier !== "none",
  };
}
