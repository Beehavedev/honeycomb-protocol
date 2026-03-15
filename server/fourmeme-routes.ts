import { Router, type Request, type Response } from "express";
import {
  createToken,
  buyToken,
  sellToken,
  getTokenInfo,
  getTokenDetail,
  getTokenBalance,
  estimateBuy,
  estimateSell,
  getTrendingTokens,
  getNewTokens,
  searchTokens,
  type FourMemeTokenCreateParams,
} from "./fourmeme-integration";
import { decryptPrivateKey } from "./custodial-wallet";
import { verifyToken } from "./auth";
import { storage } from "./storage";

const router = Router();

async function resolveAuth(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = verifyToken(authHeader.split(" ")[1]);
  if (!payload) return null;
  const agent = await storage.getAgentByAddress(payload.address);
  if (!agent) return null;
  const wallet = await storage.getCustodialWallet(agent.id);
  return wallet ? { agent, wallet } : null;
}

router.get("/tokens/trending", async (_req, res) => {
  try {
    const tokens = await getTrendingTokens();
    res.json({ tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tokens/new", async (_req, res) => {
  try {
    const tokens = await getNewTokens();
    res.json({ tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tokens/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "Query parameter 'q' required" });
  try {
    const tokens = await searchTokens(query);
    res.json({ tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tokens/:address/info", async (req, res) => {
  try {
    const info = await getTokenInfo(req.params.address);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tokens/:address/detail", async (req, res) => {
  try {
    const detail = await getTokenDetail(req.params.address);
    res.json(detail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tokens/:address/estimate-buy", async (req, res) => {
  const { bnbAmount } = req.body;
  if (!bnbAmount) return res.status(400).json({ error: "bnbAmount required" });
  try {
    const estimate = await estimateBuy(req.params.address, bnbAmount);
    res.json(estimate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tokens/:address/estimate-sell", async (req, res) => {
  const { tokenAmount } = req.body;
  if (!tokenAmount) return res.status(400).json({ error: "tokenAmount required" });
  try {
    const estimate = await estimateSell(req.params.address, tokenAmount);
    res.json(estimate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tokens/:address/balance", async (req, res) => {
  const auth = await resolveAuth(req);
  if (!auth) return res.status(401).json({ error: "Authentication required" });
  try {
    const balance = await getTokenBalance(req.params.address, auth.wallet.address);
    res.json({ balance, token: req.params.address, wallet: auth.wallet.address });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/launch", async (req, res) => {
  const auth = await resolveAuth(req);
  if (!auth) return res.status(401).json({ error: "Authentication required" });
  try {
    const { name, symbol, description, imageUrl, imageBase64, webUrl, twitterUrl, telegramUrl, presaleBNB } = req.body;
    if (!name || !symbol) return res.status(400).json({ error: "name and symbol required" });
    if (name.length > 50) return res.status(400).json({ error: "Name too long (max 50)" });
    if (symbol.length > 10) return res.status(400).json({ error: "Symbol too long (max 10)" });

    const presaleNum = parseFloat(presaleBNB || "0");
    if (presaleNum > 1) return res.status(400).json({ error: "Presale BNB capped at 1 BNB" });

    const privateKey = decryptPrivateKey(auth.wallet.encryptedPrivateKey, auth.wallet.iv, auth.wallet.authTag);

    const params: FourMemeTokenCreateParams = {
      name, symbol,
      description: description || `${name} — launched via Honeycomb`,
      imageUrl, imageBase64, webUrl, twitterUrl, telegramUrl,
      presaleBNB: presaleBNB || "0",
    };

    console.log(`[FourMeme] Agent ${auth.agent.id} launching token: ${symbol}`);
    const result = await createToken(privateKey, params);
    console.log(`[FourMeme] Token ${symbol} created: ${result.tokenAddress} tx: ${result.txHash}`);

    res.json({ success: true, ...result, bscScanUrl: `https://bscscan.com/tx/${result.txHash}` });
  } catch (err: any) {
    console.error("[FourMeme] Launch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/buy", async (req, res) => {
  const auth = await resolveAuth(req);
  if (!auth) return res.status(401).json({ error: "Authentication required" });
  try {
    const { tokenAddress, bnbAmount, slippage } = req.body;
    if (!tokenAddress || !bnbAmount) return res.status(400).json({ error: "tokenAddress and bnbAmount required" });
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return res.status(400).json({ error: "Invalid token address" });

    const bnbNum = parseFloat(bnbAmount);
    if (isNaN(bnbNum) || bnbNum <= 0 || bnbNum > 10) return res.status(400).json({ error: "BNB must be between 0 and 10" });
    const slippagePct = Math.min(Math.max(parseInt(slippage) || 10, 1), 50);

    const privateKey = decryptPrivateKey(auth.wallet.encryptedPrivateKey, auth.wallet.iv, auth.wallet.authTag);

    console.log(`[FourMeme] Agent ${auth.agent.id} buying ${bnbAmount} BNB of ${tokenAddress}`);
    const result = await buyToken(privateKey, tokenAddress, bnbAmount, slippagePct);

    res.json({ success: true, ...result, bscScanUrl: `https://bscscan.com/tx/${result.txHash}` });
  } catch (err: any) {
    console.error("[FourMeme] Buy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/sell", async (req, res) => {
  const auth = await resolveAuth(req);
  if (!auth) return res.status(401).json({ error: "Authentication required" });
  try {
    const { tokenAddress, tokenAmount, slippage } = req.body;
    if (!tokenAddress || !tokenAmount) return res.status(400).json({ error: "tokenAddress and tokenAmount required" });
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return res.status(400).json({ error: "Invalid token address" });

    const amountNum = parseFloat(tokenAmount);
    if (isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: "Token amount must be positive" });
    const slippagePct = Math.min(Math.max(parseInt(slippage) || 10, 1), 50);

    const privateKey = decryptPrivateKey(auth.wallet.encryptedPrivateKey, auth.wallet.iv, auth.wallet.authTag);

    console.log(`[FourMeme] Agent ${auth.agent.id} selling ${tokenAmount} of ${tokenAddress}`);
    const result = await sellToken(privateKey, tokenAddress, tokenAmount, slippagePct);

    res.json({ success: true, ...result, bscScanUrl: `https://bscscan.com/tx/${result.txHash}` });
  } catch (err: any) {
    console.error("[FourMeme] Sell error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
