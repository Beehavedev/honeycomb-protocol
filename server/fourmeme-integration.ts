import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const FOURMEME_API = "https://four.meme/meme-api/v1";
const BSC_RPC = "https://bsc-dataseed1.binance.org";
const BSCSCAN_API = "https://api.etherscan.io/v2/api";
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY || "";
const TOKEN_MANAGER = "0x5c952063c7fc8610FFDB798152D69F0B9550762b" as Address;
const TOKEN_MANAGER_HELPER = "0xF251F83e40a78868FcfA3FA4599Dad6494E46034" as Address;

const TOKEN_MANAGER_ABI = [
  {
    name: "createToken",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "createArg", type: "bytes" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "buyTokenAMAP",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "origin", type: "uint256" },
      { name: "token", type: "address" },
      { name: "funds", type: "uint256" },
      { name: "minAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sellToken",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "origin", type: "uint256" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minFunds", type: "uint256" },
      { name: "feeRate", type: "uint256" },
      { name: "feeRecipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

const HELPER_ABI = [
  {
    name: "getTokenInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "version", type: "uint256" },
      { name: "tokenManager", type: "address" },
      { name: "quote", type: "address" },
      { name: "lastPrice", type: "uint256" },
      { name: "tradingFeeRate", type: "uint256" },
      { name: "minTradingFee", type: "uint256" },
      { name: "launchTime", type: "uint256" },
      { name: "offers", type: "uint256" },
      { name: "maxOffers", type: "uint256" },
      { name: "funds", type: "uint256" },
      { name: "maxFunds", type: "uint256" },
      { name: "liquidityAdded", type: "bool" },
    ],
  },
  {
    name: "tryBuy",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "funds", type: "uint256" },
    ],
    outputs: [
      { name: "tokenManager", type: "address" },
      { name: "quote", type: "address" },
      { name: "estimatedAmount", type: "uint256" },
      { name: "estimatedCost", type: "uint256" },
      { name: "estimatedFee", type: "uint256" },
      { name: "fundRequirement", type: "uint256" },
      { name: "fundAsParameter", type: "uint256" },
    ],
  },
  {
    name: "trySell",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "tokenManager", type: "address" },
      { name: "quote", type: "address" },
      { name: "funds", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function getPublicClient() {
  return createPublicClient({ chain: bsc, transport: http(BSC_RPC) });
}

function getWalletClient(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return {
    walletClient: createWalletClient({ account, chain: bsc, transport: http(BSC_RPC) }),
    account,
  };
}

export interface FourMemeTokenInfo {
  version: number;
  tokenManager: string;
  quote: string;
  lastPrice: string;
  tradingFeeRate: string;
  minTradingFee: string;
  launchTime: number;
  offers: string;
  maxOffers: string;
  funds: string;
  maxFunds: string;
  liquidityAdded: boolean;
  bondingCurveProgress: number;
}

export interface FourMemeBuyEstimate {
  estimatedAmount: string;
  estimatedCost: string;
  estimatedFee: string;
  fundRequirement: string;
}

export interface FourMemeSellEstimate {
  funds: string;
  fee: string;
}

export interface FourMemeTokenCreateParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  imageBase64?: string;
  webUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  presaleBNB?: string;
}

export interface FourMemeTokenCreateResult {
  tokenAddress: string;
  txHash: string;
  name: string;
  symbol: string;
  fourMemeUrl: string;
}

async function fourmemeAuth(privateKey: Hex): Promise<string> {
  const account = privateKeyToAccount(privateKey);

  const nonceRes = await fetch(`${FOURMEME_API}/public/user/login/nonce`);
  if (!nonceRes.ok) throw new Error(`FourMeme nonce request failed: ${nonceRes.status}`);
  const nonceData = await nonceRes.json();
  const nonce = nonceData.data?.nonce || nonceData.nonce;
  if (!nonce) throw new Error("Failed to get FourMeme nonce");

  const message = `You are sign in Meme ${nonce}`;
  const signature = await account.signMessage({ message });

  const loginRes = await fetch(`${FOURMEME_API}/public/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nonce,
      signature,
      address: account.address,
      loginType: 1,
    }),
  });
  if (!loginRes.ok) throw new Error(`FourMeme login failed: ${loginRes.status}`);
  const loginData = await loginRes.json();
  const accessToken = loginData.data?.accessToken || loginData.accessToken;
  if (!accessToken) throw new Error("Failed to get FourMeme access token");
  return accessToken;
}

async function fourmemeUploadImage(accessToken: string, imageBase64: string): Promise<string> {
  const buffer = Buffer.from(imageBase64, "base64");
  const boundary = `----FormBoundary${Date.now()}`;
  const filename = `token-logo-${Date.now()}.png`;

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(`${FOURMEME_API}/private/tool/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`FourMeme image upload failed: ${res.status}`);
  const data = await res.json();
  return data.data?.url || data.url;
}

export async function getTokenInfo(tokenAddress: string): Promise<FourMemeTokenInfo> {
  const client = getPublicClient();

  const result = (await client.readContract({
    address: TOKEN_MANAGER_HELPER,
    abi: HELPER_ABI,
    functionName: "getTokenInfo",
    args: [tokenAddress as Address],
  })) as any;

  const funds = BigInt(result[9] || result.funds || 0);
  const maxFunds = BigInt(result[10] || result.maxFunds || 0);
  const progress = maxFunds > 0n ? Number((funds * 10000n) / maxFunds) / 100 : 0;

  return {
    version: Number(result[0] || result.version || 0),
    tokenManager: String(result[1] || result.tokenManager),
    quote: String(result[2] || result.quote),
    lastPrice: formatEther(BigInt(result[3] || result.lastPrice || 0)),
    tradingFeeRate: String(result[4] || result.tradingFeeRate || 0),
    minTradingFee: formatEther(BigInt(result[5] || result.minTradingFee || 0)),
    launchTime: Number(result[6] || result.launchTime || 0),
    offers: formatEther(BigInt(result[7] || result.offers || 0)),
    maxOffers: formatEther(BigInt(result[8] || result.maxOffers || 0)),
    funds: formatEther(funds),
    maxFunds: formatEther(maxFunds),
    liquidityAdded: Boolean(result[11] || result.liquidityAdded),
    bondingCurveProgress: progress,
  };
}

export async function estimateBuy(
  tokenAddress: string,
  bnbAmount: string
): Promise<FourMemeBuyEstimate> {
  const client = getPublicClient();
  const funds = parseEther(bnbAmount);

  const result = (await client.readContract({
    address: TOKEN_MANAGER_HELPER,
    abi: HELPER_ABI,
    functionName: "tryBuy",
    args: [tokenAddress as Address, 0n, funds],
  })) as any;

  return {
    estimatedAmount: formatEther(BigInt(result[2] || result.estimatedAmount || 0)),
    estimatedCost: formatEther(BigInt(result[3] || result.estimatedCost || 0)),
    estimatedFee: formatEther(BigInt(result[4] || result.estimatedFee || 0)),
    fundRequirement: formatEther(BigInt(result[5] || result.fundRequirement || 0)),
  };
}

export async function estimateSell(
  tokenAddress: string,
  tokenAmount: string
): Promise<FourMemeSellEstimate> {
  const client = getPublicClient();
  const amount = parseEther(tokenAmount);

  const result = (await client.readContract({
    address: TOKEN_MANAGER_HELPER,
    abi: HELPER_ABI,
    functionName: "trySell",
    args: [tokenAddress as Address, amount],
  })) as any;

  return {
    funds: formatEther(BigInt(result[2] || result.funds || 0)),
    fee: formatEther(BigInt(result[3] || result.fee || 0)),
  };
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  const bscResult = await bscscanFetch({
    module: "account",
    action: "tokenbalance",
    contractaddress: tokenAddress,
    address: walletAddress,
    tag: "latest",
  });
  if (bscResult) {
    try { return formatEther(BigInt(bscResult)); } catch {}
  }
  const client = getPublicClient();
  const balance = await client.readContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress as Address],
  });
  return formatEther(balance);
}

export async function getTokenMetadata(tokenAddress: string) {
  const [supplyResult, infoResult] = await Promise.all([
    bscscanFetch({ module: "stats", action: "tokensupply", contractaddress: tokenAddress }),
    bscscanFetch({ module: "token", action: "tokeninfo", contractaddress: tokenAddress }),
  ]);
  const info = Array.isArray(infoResult) ? infoResult[0] : infoResult;
  if (info?.tokenName) {
    return {
      name: info.tokenName,
      symbol: info.symbol,
      decimals: Number(info.divisor || 18),
      totalSupply: formatEther(BigInt(supplyResult || "0")),
    };
  }
  const client = getPublicClient();
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({ address: tokenAddress as Address, abi: ERC20_ABI, functionName: "name" }),
    client.readContract({ address: tokenAddress as Address, abi: ERC20_ABI, functionName: "symbol" }),
    client.readContract({ address: tokenAddress as Address, abi: ERC20_ABI, functionName: "decimals" }),
    client.readContract({ address: tokenAddress as Address, abi: ERC20_ABI, functionName: "totalSupply" }),
  ]);
  return { name, symbol, decimals: Number(decimals), totalSupply: formatEther(totalSupply) };
}

async function bscscanFetch(params: Record<string, string>): Promise<any> {
  if (!BSCSCAN_KEY) return null;
  const qs = new URLSearchParams({ chainid: "56", ...params, apikey: BSCSCAN_KEY }).toString();
  const res = await fetch(`${BSCSCAN_API}?${qs}`);
  const data = await res.json();
  return data.status === "1" ? data.result : null;
}

export async function getTokenHolders(tokenAddress: string): Promise<number | null> {
  const result = await bscscanFetch({
    module: "token",
    action: "tokenholdercount",
    contractaddress: tokenAddress,
  });
  return result ? parseInt(result) : null;
}

export async function getTokenTransfers(tokenAddress: string, page = 1, limit = 20): Promise<any[]> {
  const result = await bscscanFetch({
    module: "account",
    action: "tokentx",
    contractaddress: tokenAddress,
    page: String(page),
    offset: String(limit),
    sort: "desc",
  });
  return Array.isArray(result) ? result.map((tx: any) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: formatEther(BigInt(tx.value || "0")),
    timestamp: Number(tx.timeStamp) * 1000,
    tokenSymbol: tx.tokenSymbol,
  })) : [];
}

export async function getContractVerified(tokenAddress: string): Promise<boolean> {
  const result = await bscscanFetch({
    module: "contract",
    action: "getabi",
    address: tokenAddress,
  });
  return result !== null;
}

export async function getWalletBnbBalance(walletAddress: string): Promise<string> {
  if (BSCSCAN_KEY) {
    try {
      const result = await bscscanFetch({
        module: "account",
        action: "balance",
        address: walletAddress,
        tag: "latest",
      });
      if (result) return formatEther(BigInt(result));
    } catch {}
  }
  const client = getPublicClient();
  const balance = await client.getBalance({ address: walletAddress as Address });
  return formatEther(balance);
}

export async function getWalletTokenList(walletAddress: string): Promise<any[]> {
  const result = await bscscanFetch({
    module: "account",
    action: "tokentx",
    address: walletAddress,
    page: "1",
    offset: "100",
    sort: "desc",
  });
  if (!Array.isArray(result)) return [];
  const tokenMap = new Map<string, { address: string; name: string; symbol: string; decimals: number; lastTx: number }>();
  for (const tx of result) {
    if (!tokenMap.has(tx.contractAddress)) {
      tokenMap.set(tx.contractAddress, {
        address: tx.contractAddress,
        name: tx.tokenName,
        symbol: tx.tokenSymbol,
        decimals: Number(tx.tokenDecimal),
        lastTx: Number(tx.timeStamp) * 1000,
      });
    }
  }
  return Array.from(tokenMap.values());
}

export async function getTxStatus(txHash: string): Promise<{ status: boolean; blockNumber?: string; gasUsed?: string }> {
  if (BSCSCAN_KEY) {
    try {
      const result = await bscscanFetch({
        module: "transaction",
        action: "gettxreceiptstatus",
        txhash: txHash,
      });
      if (result) {
        return { status: result.status === "1", blockNumber: result.blockNumber, gasUsed: result.gasUsed };
      }
    } catch {}
  }
  const client = getPublicClient();
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
    return { status: receipt.status === "success" };
  } catch {
    return { status: false };
  }
}

export async function createToken(
  privateKey: Hex,
  params: FourMemeTokenCreateParams
): Promise<FourMemeTokenCreateResult> {
  const accessToken = await fourmemeAuth(privateKey);

  let imgUrl = params.imageUrl || "";
  if (params.imageBase64 && !imgUrl) {
    imgUrl = await fourmemeUploadImage(accessToken, params.imageBase64);
  }

  const presaleBNB = params.presaleBNB || "0";
  const createRes = await fetch(`${FOURMEME_API}/private/token/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      symbol: params.symbol,
      description: params.description,
      imgUrl,
      webUrl: params.webUrl || "",
      twitterUrl: params.twitterUrl || "",
      telegramUrl: params.telegramUrl || "",
      presaleBNB,
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`FourMeme create token failed: ${createRes.status} - ${errText}`);
  }
  const createData = await createRes.json();
  const createArg = createData.data?.createArg || createData.createArg;
  const signature = createData.data?.signature || createData.signature;
  if (!createArg || !signature) throw new Error("Failed to get createArg/signature from FourMeme");

  const { walletClient, account } = getWalletClient(privateKey);
  const creationFee = parseEther("0.01");
  const presaleValue = parseEther(presaleBNB);
  const totalValue = creationFee + presaleValue;

  const txHash = await walletClient.writeContract({
    address: TOKEN_MANAGER,
    abi: TOKEN_MANAGER_ABI,
    functionName: "createToken",
    args: [createArg as Hex, signature as Hex],
    value: totalValue,
  });

  const publicClient = getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2 });

  let tokenAddress = "";
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === TOKEN_MANAGER.toLowerCase() && log.topics.length >= 3) {
      const possibleAddr = `0x${log.topics[2]?.slice(26)}`;
      if (possibleAddr && possibleAddr.length === 42) {
        tokenAddress = possibleAddr;
        break;
      }
    }
  }

  if (!tokenAddress) {
    for (const log of receipt.logs) {
      if (
        log.topics[0] &&
        log.data &&
        log.address.toLowerCase() !== TOKEN_MANAGER.toLowerCase()
      ) {
        const addr = log.address;
        try {
          const meta = await getTokenMetadata(addr);
          if (meta.name === params.name && meta.symbol === params.symbol) {
            tokenAddress = addr;
            break;
          }
        } catch {}
      }
    }
  }

  return {
    tokenAddress,
    txHash,
    name: params.name,
    symbol: params.symbol,
    fourMemeUrl: tokenAddress ? `https://four.meme/token/${tokenAddress}` : "",
  };
}

export async function buyToken(
  privateKey: Hex,
  tokenAddress: string,
  bnbAmount: string,
  slippagePct: number = 10
): Promise<{ txHash: string; estimatedTokens: string }> {
  const funds = parseEther(bnbAmount);

  const { walletClient, account } = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const balance = await publicClient.getBalance({ address: account.address });
  const gasEstimate = 300000n;
  const gasPrice = await publicClient.getGasPrice();
  const gasCost = gasEstimate * gasPrice;

  if (balance < funds + gasCost) {
    const available = formatEther(balance > gasCost ? balance - gasCost : 0n);
    throw new Error(`Insufficient BNB balance. You have ${parseFloat(available).toFixed(6)} BNB available (after gas). You need ${bnbAmount} BNB.`);
  }

  const estimate = await estimateBuy(tokenAddress, bnbAmount);
  const estimatedTokens = parseEther(estimate.estimatedAmount);
  const minAmount = (estimatedTokens * BigInt(100 - slippagePct)) / 100n;

  const txHash = await walletClient.writeContract({
    address: TOKEN_MANAGER,
    abi: TOKEN_MANAGER_ABI,
    functionName: "buyTokenAMAP",
    args: [0n, tokenAddress as Address, funds, minAmount],
    value: funds,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2 });

  return { txHash, estimatedTokens: estimate.estimatedAmount };
}

export async function sellToken(
  privateKey: Hex,
  tokenAddress: string,
  tokenAmount: string,
  slippagePct: number = 10
): Promise<{ txHash: string; estimatedBNB: string }> {
  const amount = parseEther(tokenAmount);
  const { walletClient, account } = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const [tokenBalance, bnbBalance, gasPrice] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }) as Promise<bigint>,
    publicClient.getBalance({ address: account.address }),
    publicClient.getGasPrice(),
  ]);

  if (tokenBalance < amount) {
    const available = formatEther(tokenBalance);
    throw new Error(`Insufficient token balance. You have ${parseFloat(available).toFixed(6)} tokens available.`);
  }

  const gasCost = 500000n * gasPrice;
  if (bnbBalance < gasCost) {
    throw new Error(`Insufficient BNB for gas fees. You need ~${parseFloat(formatEther(gasCost)).toFixed(6)} BNB for gas.`);
  }

  const allowance = await publicClient.readContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, TOKEN_MANAGER],
  });

  if (allowance < amount) {
    const approveTx = await walletClient.writeContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [TOKEN_MANAGER, amount * 2n],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 });
  }

  const estimate = await estimateSell(tokenAddress, tokenAmount);
  const estimatedFunds = parseEther(estimate.funds);
  const minFunds = (estimatedFunds * BigInt(100 - slippagePct)) / 100n;

  const txHash = await walletClient.writeContract({
    address: TOKEN_MANAGER,
    abi: TOKEN_MANAGER_ABI,
    functionName: "sellToken",
    args: [
      0n,
      tokenAddress as Address,
      amount,
      minFunds,
      0n,
      "0x0000000000000000000000000000000000000000" as Address,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2 });

  return { txHash, estimatedBNB: estimate.funds };
}

function mapDexPairToToken(p: any) {
  return {
    address: p.baseToken?.address,
    name: p.baseToken?.name,
    symbol: p.baseToken?.symbol,
    logoUrl: p.info?.imageUrl || null,
    priceUsd: p.priceUsd,
    volume24h: p.volume?.h24,
    marketCap: p.marketCap,
    liquidity: p.liquidity?.usd,
    priceChange24h: p.priceChange?.h24,
    pairCreatedAt: p.pairCreatedAt,
    dexId: p.dexId,
    url: p.url,
  };
}

export async function getTrendingTokens(): Promise<any[]> {
  try {
    const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=fourmeme", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const pairs = (data.pairs || [])
      .filter((p: any) => p.chainId === "bsc" && p.dexId === "fourmeme")
      .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .filter((p: any) => {
        const addr = p.baseToken?.address?.toLowerCase();
        if (!addr || seen.has(addr)) return false;
        seen.add(addr);
        return true;
      })
      .slice(0, 20)
      .map(mapDexPairToToken);
    return pairs;
  } catch {
    return [];
  }
}

export async function getNewTokens(): Promise<any[]> {
  try {
    const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=fourmeme", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const pairs = (data.pairs || [])
      .filter((p: any) => p.chainId === "bsc" && p.dexId === "fourmeme")
      .sort((a: any, b: any) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0))
      .filter((p: any) => {
        const addr = p.baseToken?.address?.toLowerCase();
        if (!addr || seen.has(addr)) return false;
        seen.add(addr);
        return true;
      })
      .slice(0, 20)
      .map(mapDexPairToToken);
    return pairs;
  } catch {
    return [];
  }
}

export async function searchTokens(query: string): Promise<any[]> {
  try {
    const trimmed = query.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      const detail = await getTokenDetail(trimmed);
      if (detail && (detail.name || detail.symbol)) {
        return [{
          address: detail.address,
          name: detail.name,
          symbol: detail.symbol,
          logoUrl: detail.logoUrl || null,
          priceUsd: detail.market?.priceUsd,
          priceNative: detail.market?.priceNative,
          volume24h: detail.market?.volume24h,
          marketCap: detail.market?.marketCap,
          fdv: detail.market?.fdv,
          liquidity: detail.market?.liquidity,
          pairAddress: detail.market?.pairAddress,
          dexId: detail.market?.dexId,
          priceChange24h: detail.market?.priceChange24h,
          holders: detail.holders,
          bondingCurveProgress: detail.onChain?.bondingCurveProgress,
        }];
      }
      return [];
    }

    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(trimmed)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pairs = (data.pairs || [])
      .filter((p: any) => p.chainId === "bsc")
      .slice(0, 20)
      .map((p: any) => ({
        address: p.baseToken?.address,
        name: p.baseToken?.name,
        symbol: p.baseToken?.symbol,
        logoUrl: p.info?.imageUrl || null,
        priceUsd: p.priceUsd,
        priceNative: p.priceNative,
        volume24h: p.volume?.h24,
        marketCap: p.marketCap,
        fdv: p.fdv,
        liquidity: p.liquidity?.usd,
        pairAddress: p.pairAddress,
        dexId: p.dexId,
        url: p.url,
        priceChange24h: p.priceChange?.h24,
      }));
    return pairs;
  } catch {
    return [];
  }
}

export async function getTokenDetail(tokenAddress: string): Promise<any> {
  try {
    const [onChain, dexData, metadata, holders, verified] = await Promise.all([
      getTokenInfo(tokenAddress).catch(() => null),
      fetch(`https://api.dexscreener.com/tokens/v1/bsc/${tokenAddress}`, {
        headers: { Accept: "application/json" },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      getTokenMetadata(tokenAddress).catch(() => null),
      getTokenHolders(tokenAddress).catch(() => null),
      getContractVerified(tokenAddress).catch(() => false),
    ]);

    const pair = Array.isArray(dexData) ? dexData[0] : dexData?.pairs?.[0] || null;

    return {
      address: tokenAddress,
      name: metadata?.name || pair?.baseToken?.name || "",
      symbol: metadata?.symbol || pair?.baseToken?.symbol || "",
      logoUrl: pair?.info?.imageUrl || null,
      decimals: metadata?.decimals || 18,
      totalSupply: metadata?.totalSupply || "",
      onChain,
      market: pair
        ? {
            priceUsd: pair.priceUsd,
            priceNative: pair.priceNative,
            volume24h: pair.volume?.h24,
            marketCap: pair.marketCap,
            fdv: pair.fdv,
            liquidity: pair.liquidity?.usd,
            priceChange24h: pair.priceChange?.h24,
            dexId: pair.dexId,
            pairAddress: pair.pairAddress,
          }
        : null,
      holders,
      verified,
      fourMemeUrl: `https://four.meme/token/${tokenAddress}`,
      bscScanUrl: `https://bscscan.com/token/${tokenAddress}`,
      dexScreenerUrl: `https://dexscreener.com/bsc/${tokenAddress}`,
    };
  } catch (err: any) {
    throw new Error(`Failed to get token detail: ${err.message}`);
  }
}
