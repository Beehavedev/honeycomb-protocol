// Contract interaction hooks using wagmi
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  HoneycombAgentRegistryABI,
  HoneycombBountyEscrowABI,
  HoneycombPostBondABI,
  HoneycombReputationABI,
} from './abis';
import { getContractAddresses } from './addresses';

// ============= Agent Registry Hooks =============

export function useAgentRegistryAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.agentRegistry;
}

export function useAgentExists(agentId?: bigint) {
  const address = useAgentRegistryAddress();
  return useReadContract({
    address,
    abi: HoneycombAgentRegistryABI,
    functionName: 'agentExists',
    args: agentId !== undefined ? [agentId] : undefined,
    query: { enabled: agentId !== undefined && !!address },
  });
}

export function useGetAgentByOwner(walletAddress?: `0x${string}`) {
  const address = useAgentRegistryAddress();
  return useReadContract({
    address,
    abi: HoneycombAgentRegistryABI,
    functionName: 'getAgentByOwner',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress && !!address },
  });
}

export function useGetAgent(agentId?: bigint) {
  const address = useAgentRegistryAddress();
  return useReadContract({
    address,
    abi: HoneycombAgentRegistryABI,
    functionName: 'getAgent',
    args: agentId !== undefined ? [agentId] : undefined,
    query: { enabled: agentId !== undefined && !!address },
  });
}

export function useTotalAgents() {
  const address = useAgentRegistryAddress();
  return useReadContract({
    address,
    abi: HoneycombAgentRegistryABI,
    functionName: 'totalAgents',
    query: { enabled: !!address },
  });
}

export function useRegisterAgent() {
  const address = useAgentRegistryAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const registerAgent = (metadataCID: string) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombAgentRegistryABI,
      functionName: 'registerAgent',
      args: [metadataCID],
    });
  };
  
  return { registerAgent, isPending, isConfirming, isSuccess, hash, error };
}

export function useUpdateAgent() {
  const address = useAgentRegistryAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const updateAgent = (agentId: bigint, newMetadataCID: string) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombAgentRegistryABI,
      functionName: 'updateAgent',
      args: [agentId, newMetadataCID],
    });
  };
  
  return { updateAgent, isPending, isConfirming, isSuccess, hash, error };
}

// ============= Bounty Escrow Hooks =============

export function useBountyEscrowAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.bountyEscrow;
}

export function useGetBounty(bountyId?: bigint) {
  const address = useBountyEscrowAddress();
  return useReadContract({
    address,
    abi: HoneycombBountyEscrowABI,
    functionName: 'getBounty',
    args: bountyId !== undefined ? [bountyId] : undefined,
    query: { enabled: bountyId !== undefined && !!address },
  });
}

export function useGetSolution(bountyId?: bigint, solutionId?: bigint) {
  const address = useBountyEscrowAddress();
  return useReadContract({
    address,
    abi: HoneycombBountyEscrowABI,
    functionName: 'getSolution',
    args: bountyId !== undefined && solutionId !== undefined ? [bountyId, solutionId] : undefined,
    query: { enabled: bountyId !== undefined && solutionId !== undefined && !!address },
  });
}

export function useTotalBounties() {
  const address = useBountyEscrowAddress();
  return useReadContract({
    address,
    abi: HoneycombBountyEscrowABI,
    functionName: 'totalBounties',
    query: { enabled: !!address },
  });
}

export function useCreateBounty() {
  const address = useBountyEscrowAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const createBounty = (agentId: bigint, bountyCID: string, deadline: bigint, rewardBnb: string) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombBountyEscrowABI,
      functionName: 'createBounty',
      args: [agentId, bountyCID, deadline],
      value: parseEther(rewardBnb),
    });
  };
  
  return { createBounty, isPending, isConfirming, isSuccess, hash, error };
}

export function useSubmitSolution() {
  const address = useBountyEscrowAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const submitSolution = (bountyId: bigint, agentId: bigint, solutionCID: string) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombBountyEscrowABI,
      functionName: 'submitSolution',
      args: [bountyId, agentId, solutionCID],
    });
  };
  
  return { submitSolution, isPending, isConfirming, isSuccess, hash, error };
}

export function useAwardSolution() {
  const address = useBountyEscrowAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const awardSolution = (bountyId: bigint, solutionId: bigint) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombBountyEscrowABI,
      functionName: 'awardSolution',
      args: [bountyId, solutionId],
    });
  };
  
  return { awardSolution, isPending, isConfirming, isSuccess, hash, error };
}

export function useCancelBounty() {
  const address = useBountyEscrowAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const cancelBounty = (bountyId: bigint) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombBountyEscrowABI,
      functionName: 'cancelBounty',
      args: [bountyId],
    });
  };
  
  return { cancelBounty, isPending, isConfirming, isSuccess, hash, error };
}

// ============= Post Bond Hooks =============

export function usePostBondAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.postBond;
}

export function useGetPost(postId?: bigint) {
  const address = usePostBondAddress();
  return useReadContract({
    address,
    abi: HoneycombPostBondABI,
    functionName: 'getPost',
    args: postId !== undefined ? [postId] : undefined,
    query: { enabled: postId !== undefined && !!address },
  });
}

export function useBondAmount() {
  const address = usePostBondAddress();
  return useReadContract({
    address,
    abi: HoneycombPostBondABI,
    functionName: 'bondAmount',
    query: { enabled: !!address },
  });
}

export function useChallengeStake() {
  const address = usePostBondAddress();
  return useReadContract({
    address,
    abi: HoneycombPostBondABI,
    functionName: 'challengeStake',
    query: { enabled: !!address },
  });
}

export function useCreatePostBond() {
  const address = usePostBondAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const createPost = (agentId: bigint, contentCID: string, bondBnb: string) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombPostBondABI,
      functionName: 'createPost',
      args: [agentId, contentCID],
      value: parseEther(bondBnb),
    });
  };
  
  return { createPost, isPending, isConfirming, isSuccess, hash, error };
}

export function useChallengePost() {
  const address = usePostBondAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const challengePost = (postId: bigint, reason: string, stakeBnb: string) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombPostBondABI,
      functionName: 'challengePost',
      args: [postId, reason],
      value: parseEther(stakeBnb),
    });
  };
  
  return { challengePost, isPending, isConfirming, isSuccess, hash, error };
}

// ============= Reputation Hooks =============

export function useReputationAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.reputation;
}

export function useReputationsOf(agentIds?: readonly bigint[]) {
  const address = useReputationAddress();
  return useReadContract({
    address,
    abi: HoneycombReputationABI,
    functionName: 'reputationsOf',
    args: agentIds ? [agentIds] : undefined,
    query: { enabled: !!agentIds && agentIds.length > 0 && !!address },
  });
}

export function useLastUpdatedAt(agentId?: bigint) {
  const address = useReputationAddress();
  return useReadContract({
    address,
    abi: HoneycombReputationABI,
    functionName: 'lastUpdatedAt',
    args: agentId !== undefined ? [agentId] : undefined,
    query: { enabled: agentId !== undefined && !!address },
  });
}

// ============= Utility =============

export function useContractsDeployed() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  
  if (!addresses) return false;
  
  const ZERO = "0x0000000000000000000000000000000000000000";
  return (
    addresses.agentRegistry !== ZERO &&
    addresses.bountyEscrow !== ZERO &&
    addresses.postBond !== ZERO &&
    addresses.reputation !== ZERO
  );
}

export { parseEther, formatEther };
