// Contract interaction hooks using wagmi
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  HoneycombAgentRegistryABI,
  HoneycombBountyEscrowABI,
  HoneycombPostBondABI,
  HoneycombReputationABI,
  HoneycombTokenFactoryABI,
  HoneycombBondingCurveMarketABI,
  HoneycombTokenABI,
  HoneycombMigrationABI,
} from './abis';
import { getContractAddresses, getDexConfig } from './addresses';

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

// ============= Token Factory Hooks (Launchpad) =============

export function useTokenFactoryAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.tokenFactory;
}

export function useBondingCurveMarketAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.bondingCurveMarket;
}

export function useCreateToken() {
  const address = useTokenFactoryAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const createToken = (name: string, symbol: string, metadataCID: string, creatorBeeId: bigint = BigInt(0), salt: `0x${string}` = `0x${'0'.repeat(64)}`) => {
    console.log("useCreateToken called with:", { name, symbol, metadataCID, creatorBeeId: creatorBeeId.toString(), salt, factoryAddress: address });
    if (!address) {
      console.error("Factory address is null or undefined");
      return;
    }
    console.log("Calling writeContract with factory address:", address);
    writeContract({
      address,
      abi: HoneycombTokenFactoryABI,
      functionName: 'createToken',
      args: [name, symbol, metadataCID, creatorBeeId, salt],
    });
  };
  
  return { createToken, isPending, isConfirming, isSuccess, hash, error };
}

export function useInitializeMarket() {
  const address = useBondingCurveMarketAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const initializeMarket = (tokenAddress: `0x${string}`) => {
    console.log("useInitializeMarket called with:", { tokenAddress, marketAddress: address });
    if (!address) {
      console.error("Market address is null or undefined");
      return;
    }
    writeContract({
      address,
      abi: HoneycombBondingCurveMarketABI,
      functionName: 'initializeMarket',
      args: [tokenAddress],
    });
  };
  
  return { initializeMarket, isPending, isConfirming, isSuccess, hash, error };
}

export function usePredictTokenAddressSingle(
  name?: string,
  symbol?: string,
  metadataCID?: string,
  creatorBeeId?: bigint,
  salt?: `0x${string}`
) {
  const address = useTokenFactoryAddress();
  const enabled = !!address && !!name && !!symbol && !!metadataCID && creatorBeeId !== undefined && !!salt;
  
  return useReadContract({
    address,
    abi: HoneycombTokenFactoryABI,
    functionName: 'predictTokenAddress',
    args: enabled ? [name!, symbol!, metadataCID!, creatorBeeId!, salt!] : undefined,
    query: { enabled },
  });
}

export function usePredictTokenAddress() {
  const address = useTokenFactoryAddress();
  
  return { factoryAddress: address };
}

export function useGetAllTokens() {
  const address = useTokenFactoryAddress();
  return useReadContract({
    address,
    abi: HoneycombTokenFactoryABI,
    functionName: 'allTokens',
    query: { enabled: !!address },
  });
}

export function useGetTokenCount() {
  const address = useTokenFactoryAddress();
  return useReadContract({
    address,
    abi: HoneycombTokenFactoryABI,
    functionName: 'totalTokens',
    query: { enabled: !!address },
  });
}

export function useIsHoneycombToken(tokenAddress?: `0x${string}`) {
  const address = useTokenFactoryAddress();
  return useReadContract({
    address,
    abi: HoneycombTokenFactoryABI,
    functionName: 'isHoneycombToken',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
}

// ============= Bonding Curve Market Hooks (Launchpad) =============

export function useGetMarketState(tokenAddress?: `0x${string}`) {
  const address = useBondingCurveMarketAddress();
  return useReadContract({
    address,
    abi: HoneycombBondingCurveMarketABI,
    functionName: 'getMarketState',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
}

export function useQuoteBuy(tokenAddress?: `0x${string}`, nativeAmountIn?: bigint) {
  const address = useBondingCurveMarketAddress();
  return useReadContract({
    address,
    abi: HoneycombBondingCurveMarketABI,
    functionName: 'getBuyQuote',
    args: tokenAddress && nativeAmountIn !== undefined ? [tokenAddress, nativeAmountIn] : undefined,
    query: { enabled: !!tokenAddress && nativeAmountIn !== undefined && !!address },
  });
}

export function useQuoteSell(tokenAddress?: `0x${string}`, tokenAmountIn?: bigint) {
  const address = useBondingCurveMarketAddress();
  return useReadContract({
    address,
    abi: HoneycombBondingCurveMarketABI,
    functionName: 'getSellQuote',
    args: tokenAddress && tokenAmountIn !== undefined ? [tokenAddress, tokenAmountIn] : undefined,
    query: { enabled: !!tokenAddress && tokenAmountIn !== undefined && !!address },
  });
}

export function useBuyTokens() {
  const address = useBondingCurveMarketAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const buy = (tokenAddress: `0x${string}`, minTokensOut: bigint, nativeValueWei: bigint) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombBondingCurveMarketABI,
      functionName: 'buy',
      args: [tokenAddress, minTokensOut],
      value: nativeValueWei,
    });
  };
  
  return { buy, isPending, isConfirming, isSuccess, hash, error };
}

export function useSellTokens() {
  const address = useBondingCurveMarketAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const sell = (tokenAddress: `0x${string}`, tokenAmountIn: bigint, minNativeOut: bigint) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombBondingCurveMarketABI,
      functionName: 'sell',
      args: [tokenAddress, tokenAmountIn, minNativeOut],
    });
  };
  
  return { sell, isPending, isConfirming, isSuccess, hash, error };
}

export function useGraduationThreshold() {
  const address = useBondingCurveMarketAddress();
  return useReadContract({
    address,
    abi: HoneycombBondingCurveMarketABI,
    functionName: 'graduationThreshold',
    query: { enabled: !!address },
  });
}

// ============= Token Balance Hooks =============

export function useTokenBalance(tokenAddress?: `0x${string}`, account?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: HoneycombTokenABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!tokenAddress && !!account },
  });
}

export function useTokenAllowance(tokenAddress?: `0x${string}`, owner?: `0x${string}`, spender?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: HoneycombTokenABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!tokenAddress && !!owner && !!spender },
  });
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const approve = (tokenAddress: `0x${string}`, spender: `0x${string}`, amount: bigint) => {
    writeContract({
      address: tokenAddress,
      abi: HoneycombTokenABI,
      functionName: 'approve',
      args: [spender, amount],
    });
  };
  
  return { approve, isPending, isConfirming, isSuccess, hash, error };
}

// ============= Migration Hooks =============

export function useMigrationAddress() {
  const chainId = useChainId();
  return getContractAddresses(chainId)?.migration;
}

export function useDexConfig() {
  const chainId = useChainId();
  return getDexConfig(chainId);
}

export function useCanMigrate(tokenAddress?: `0x${string}`) {
  const address = useMigrationAddress();
  return useReadContract({
    address,
    abi: HoneycombMigrationABI,
    functionName: 'canMigrate',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
}

export function useIsMigrated(tokenAddress?: `0x${string}`) {
  const address = useMigrationAddress();
  return useReadContract({
    address,
    abi: HoneycombMigrationABI,
    functionName: 'migrated',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
}

export function useGetMigrationInfo(tokenAddress?: `0x${string}`) {
  const address = useMigrationAddress();
  return useReadContract({
    address,
    abi: HoneycombMigrationABI,
    functionName: 'getMigrationInfo',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
}

export function useMigrateToken() {
  const address = useMigrationAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });
  
  const migrate = (tokenAddress: `0x${string}`) => {
    if (!address) return;
    writeContract({
      address,
      abi: HoneycombMigrationABI,
      functionName: 'migrate',
      args: [tokenAddress],
    });
  };
  
  return { migrate, isPending, isConfirming, isSuccess, hash, error, receipt };
}

export function useMigrationDeployed() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const dexConfig = getDexConfig(chainId);
  
  if (!addresses || !dexConfig) return false;
  
  const ZERO = "0x0000000000000000000000000000000000000000";
  return addresses.migration !== ZERO && dexConfig.router !== ZERO;
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

export function useLaunchpadDeployed() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  
  if (!addresses) return false;
  
  const ZERO = "0x0000000000000000000000000000000000000000";
  return (
    addresses.tokenFactory !== ZERO &&
    addresses.bondingCurveMarket !== ZERO
  );
}

// ============= Cooldown Hooks =============

export function useCooldownSeconds() {
  const address = useBondingCurveMarketAddress();
  return useReadContract({
    address,
    abi: HoneycombBondingCurveMarketABI,
    functionName: 'cooldownSeconds',
    query: { enabled: !!address },
  });
}

export function useLastTradeTime(tokenAddress?: `0x${string}`, trader?: `0x${string}`) {
  const address = useBondingCurveMarketAddress();
  return useReadContract({
    address,
    abi: HoneycombBondingCurveMarketABI,
    functionName: 'lastTradeTime',
    args: tokenAddress && trader ? [tokenAddress, trader] : undefined,
    query: { enabled: !!address && !!tokenAddress && !!trader },
  });
}

export function useMarketNativeBalance() {
  const address = useBondingCurveMarketAddress();
  return useBalance({ address });
}

// ============= Error Helpers =============

export function parseContractError(error: Error | null): string {
  if (!error) return "Transaction failed";
  
  const message = error.message || String(error);
  
  // Check for specific contract errors
  if (message.includes("CooldownActive")) {
    return "Please wait a few seconds between trades (cooldown active)";
  }
  if (message.includes("InsufficientNative")) {
    return "Insufficient liquidity in the pool. Try selling a smaller amount.";
  }
  if (message.includes("SlippageExceeded")) {
    return "Price moved too much. Try again or increase slippage tolerance.";
  }
  if (message.includes("MarketNotInitialized")) {
    return "Market not initialized. Initialize the market first.";
  }
  if (message.includes("TokenGraduated")) {
    return "Token has graduated. Trade on PancakeSwap instead.";
  }
  if (message.includes("TradingNotStarted")) {
    return "Trading hasn't started yet. Please wait.";
  }
  if (message.includes("ZeroAmount")) {
    return "Amount must be greater than zero.";
  }
  if (message.includes("User rejected") || message.includes("user rejected")) {
    return "Transaction was cancelled.";
  }
  if (message.includes("insufficient funds")) {
    return "Insufficient BNB for this transaction.";
  }
  
  // Try to extract a readable message
  const match = message.match(/reason="([^"]+)"/);
  if (match) return match[1];
  
  // Return truncated message
  return message.length > 100 ? message.substring(0, 100) + "..." : message;
}

export { parseEther, formatEther };
