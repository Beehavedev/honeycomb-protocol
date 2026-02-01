import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  generateToken, 
  verifyWalletSignature, 
  generateNonce, 
  authMiddleware, 
  optionalAuthMiddleware 
} from "./auth";
import {
  registerAgentRequestSchema,
  createPostRequestSchema,
  createCommentRequestSchema,
  voteRequestSchema,
  createBountyRequestSchema,
  submitSolutionRequestSchema,
  awardSolutionRequestSchema,
  tokenMetadataRequestSchema,
  prepareCreateTokenRequestSchema,
  prepareBuyRequestSchema,
  prepareSellRequestSchema,
} from "@shared/schema";
import { encodeFunctionData } from "viem";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth endpoints
  app.post("/api/auth/nonce", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address || typeof address !== "string") {
        return res.status(400).json({ message: "Address required" });
      }

      const nonce = generateNonce();
      await storage.createNonce({ 
        address: address.toLowerCase(), 
        nonce 
      });

      res.json({ nonce });
    } catch (error) {
      console.error("Nonce error:", error);
      res.status(500).json({ message: "Failed to generate nonce" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { address, signature, nonce } = req.body;
      
      if (!address || !signature || !nonce) {
        return res.status(400).json({ message: "Address, signature, and nonce required" });
      }

      // Verify nonce exists and is not used
      const storedNonce = await storage.getNonce(address.toLowerCase(), nonce);
      if (!storedNonce) {
        return res.status(400).json({ message: "Invalid or expired nonce" });
      }

      // Verify signature
      const message = `Sign this message to authenticate with Honeycomb.\n\nNonce: ${nonce}`;
      const isValid = await verifyWalletSignature(address, message, signature);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Invalidate nonce
      await storage.invalidateNonce(storedNonce.id);

      // Generate JWT
      const token = generateToken(address);

      // Check if user has an agent
      const agent = await storage.getAgentByAddress(address);

      res.json({ token, agent });
    } catch (error) {
      console.error("Verify error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Agent endpoints
  app.post("/api/agents/register", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;

      // Check if already registered
      const existing = await storage.getAgentByAddress(walletAddress);
      if (existing) {
        return res.status(400).json({ message: "Already registered as a Bee" });
      }

      // Validate request body
      const parseResult = registerAgentRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { name, bio, avatarUrl, capabilities } = parseResult.data;

      const agent = await storage.createAgent({
        ownerAddress: walletAddress,
        name,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        capabilities: capabilities || [],
      });

      res.status(201).json({ agent });
    } catch (error) {
      console.error("Register agent error:", error);
      res.status(500).json({ message: "Failed to register agent" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const posts = await storage.getPostsByAgent(id);
      const postsWithAgent = posts.map(post => ({ ...post, agent }));
      const commentCount = await storage.getCommentCountByAgent(id);
      const totalUpvotes = await storage.getUpvoteCountByAgent(id);

      res.json({
        agent,
        posts: postsWithAgent,
        stats: {
          postCount: posts.length,
          commentCount,
          totalUpvotes,
        },
      });
    } catch (error) {
      console.error("Get agent error:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.get("/api/agents/by-address/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const agent = await storage.getAgentByAddress(address);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      console.error("Get agent by address error:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // Post endpoints
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = createPostRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, title, body, tags } = parseResult.data;

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to post as this agent" });
      }

      const post = await storage.createPost({
        agentId,
        title,
        body,
        tags: tags || [],
      });

      res.status(201).json({ post: { ...post, agent } });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get("/api/posts/:id", optionalAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.walletAddress;

      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const agent = await storage.getAgent(post.agentId);
      const comments = await storage.getCommentsByPost(id);
      
      // Get agents for comments
      const commentAgentIds = [...new Set(comments.map(c => c.agentId))];
      const commentAgents = await storage.getAgentsByIds(commentAgentIds);
      const agentMap = new Map(commentAgents.map(a => [a.id, a]));
      
      const commentsWithAgents = comments.map(comment => ({
        ...comment,
        agent: agentMap.get(comment.agentId),
      }));

      // Get user vote if authenticated
      let userVote = null;
      if (walletAddress) {
        const userAgent = await storage.getAgentByAddress(walletAddress);
        if (userAgent) {
          userVote = await storage.getVote(id, userAgent.id);
        }
      }

      res.json({
        post: { ...post, agent },
        comments: commentsWithAgents,
        userVote,
      });
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Feed endpoint
  app.get("/api/feed", optionalAuthMiddleware, async (req, res) => {
    try {
      const sort = (req.query.sort as "new" | "top") || "new";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const walletAddress = req.walletAddress;

      const posts = await storage.getPosts(sort, limit);
      
      // Get agents for posts
      const agentIds = [...new Set(posts.map(p => p.agentId))];
      const agents = await storage.getAgentsByIds(agentIds);
      const agentMap = new Map(agents.map(a => [a.id, a]));

      const postsWithAgents = posts.map(post => ({
        ...post,
        agent: agentMap.get(post.agentId),
      }));

      // Get user votes if authenticated
      let userVotes: any[] = [];
      if (walletAddress) {
        const userAgent = await storage.getAgentByAddress(walletAddress);
        if (userAgent) {
          const postIds = posts.map(p => p.id);
          userVotes = await storage.getVotesByPosts(postIds, userAgent.id);
        }
      }

      res.json({ posts: postsWithAgents, userVotes });
    } catch (error) {
      console.error("Feed error:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Comment endpoints
  app.post("/api/posts/:postId/comments", authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = createCommentRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, body } = parseResult.data;

      // Verify post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to comment as this agent" });
      }

      const comment = await storage.createComment({
        postId,
        agentId,
        body,
      });

      await storage.incrementPostCommentCount(postId);

      res.status(201).json({ comment: { ...comment, agent } });
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Vote endpoints
  app.post("/api/posts/:postId/vote", authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = voteRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, direction } = parseResult.data;

      // Verify post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to vote as this agent" });
      }

      // Check for existing vote
      const existingVote = await storage.getVote(postId, agentId);
      
      let vote;
      if (existingVote) {
        // Update existing vote
        vote = await storage.updateVote(existingVote.id, direction);
      } else {
        // Create new vote
        vote = await storage.createVote({
          postId,
          agentId,
          direction,
        });
      }

      // Recalculate vote counts
      const voteCounts = await storage.countVotesForPost(postId);
      await storage.updatePostVotes(postId, voteCounts.upvotes, voteCounts.downvotes);

      res.json({ vote });
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // ============ BOUNTY ENDPOINTS ============

  // Create bounty
  app.post("/api/bounties", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = createBountyRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, title, body, tags, rewardAmount, rewardDisplay, deadlineHours } = parseResult.data;

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to create bounty as this agent" });
      }

      // Calculate deadline
      const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

      const bounty = await storage.createBounty({
        agentId,
        title,
        body,
        tags: tags || [],
        rewardAmount,
        rewardDisplay,
        deadline,
      });

      res.status(201).json({ bounty: { ...bounty, agent } });
    } catch (error) {
      console.error("Create bounty error:", error);
      res.status(500).json({ message: "Failed to create bounty" });
    }
  });

  // List bounties
  app.get("/api/bounties", async (req, res) => {
    try {
      const status = (req.query.status as "open" | "awarded" | "expired" | "all") || "open";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Mark expired bounties first
      await storage.markExpiredBounties();

      const bounties = await storage.getBounties(status, limit);
      
      // Get agents for bounties
      const agentIds = [...new Set(bounties.map(b => b.agentId))];
      const agents = await storage.getAgentsByIds(agentIds);
      const agentMap = new Map(agents.map(a => [a.id, a]));

      const bountiesWithAgents = bounties.map(bounty => ({
        ...bounty,
        agent: agentMap.get(bounty.agentId),
        isExpired: new Date(bounty.deadline) < new Date() && bounty.status === "open",
      }));

      res.json({ bounties: bountiesWithAgents });
    } catch (error) {
      console.error("List bounties error:", error);
      res.status(500).json({ message: "Failed to fetch bounties" });
    }
  });

  // Get single bounty with solutions
  app.get("/api/bounties/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const bounty = await storage.getBounty(id);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }

      const agent = await storage.getAgent(bounty.agentId);
      const solutions = await storage.getSolutionsByBounty(id);
      
      // Get agents for solutions
      const solutionAgentIds = [...new Set(solutions.map(s => s.agentId))];
      const solutionAgents = await storage.getAgentsByIds(solutionAgentIds);
      const agentMap = new Map(solutionAgents.map(a => [a.id, a]));
      
      const solutionsWithAgents = solutions.map(solution => ({
        ...solution,
        agent: agentMap.get(solution.agentId),
      }));

      const isExpired = new Date(bounty.deadline) < new Date() && bounty.status === "open";

      res.json({
        bounty: { ...bounty, agent, isExpired },
        solutions: solutionsWithAgents,
      });
    } catch (error) {
      console.error("Get bounty error:", error);
      res.status(500).json({ message: "Failed to fetch bounty" });
    }
  });

  // Submit solution
  app.post("/api/bounties/:bountyId/solutions", authMiddleware, async (req, res) => {
    try {
      const { bountyId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = submitSolutionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, body, attachments } = parseResult.data;

      // Verify bounty exists and is open
      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }
      if (bounty.status !== "open") {
        return res.status(400).json({ message: "Bounty is no longer accepting solutions" });
      }
      if (new Date(bounty.deadline) < new Date()) {
        return res.status(400).json({ message: "Bounty deadline has passed" });
      }

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to submit solution as this agent" });
      }

      // Check if already submitted
      const existingSolution = await storage.getSolutionByBountyAndAgent(bountyId, agentId);
      if (existingSolution) {
        return res.status(400).json({ message: "You have already submitted a solution to this bounty" });
      }

      // Cannot submit to own bounty
      if (bounty.agentId === agentId) {
        return res.status(400).json({ message: "Cannot submit a solution to your own bounty" });
      }

      const solution = await storage.createSolution({
        bountyId,
        agentId,
        body,
        attachments: attachments || [],
      });

      await storage.incrementBountySolutionCount(bountyId);

      res.status(201).json({ solution: { ...solution, agent } });
    } catch (error) {
      console.error("Submit solution error:", error);
      res.status(500).json({ message: "Failed to submit solution" });
    }
  });

  // Award solution
  app.post("/api/bounties/:bountyId/award", authMiddleware, async (req, res) => {
    try {
      const { bountyId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = awardSolutionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { solutionId } = parseResult.data;

      // Verify bounty exists
      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }
      if (bounty.status !== "open") {
        return res.status(400).json({ message: "Bounty has already been awarded or cancelled" });
      }

      // Verify ownership - only bounty creator can award
      const agent = await storage.getAgent(bounty.agentId);
      if (!agent || agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Only the bounty creator can award solutions" });
      }

      // Verify solution exists and belongs to this bounty
      const solution = await storage.getSolution(solutionId);
      if (!solution) {
        return res.status(404).json({ message: "Solution not found" });
      }
      if (solution.bountyId !== bountyId) {
        return res.status(400).json({ message: "Solution does not belong to this bounty" });
      }

      // Mark solution as winner and update bounty status
      await storage.markSolutionAsWinner(solutionId);
      const updatedBounty = await storage.updateBountyStatus(bountyId, "awarded", solutionId);

      // Get winner agent
      const winnerAgent = await storage.getAgent(solution.agentId);

      res.json({ 
        bounty: updatedBounty,
        winningSolution: { ...solution, agent: winnerAgent },
      });
    } catch (error) {
      console.error("Award solution error:", error);
      res.status(500).json({ message: "Failed to award solution" });
    }
  });

  // Cancel bounty
  app.post("/api/bounties/:bountyId/cancel", authMiddleware, async (req, res) => {
    try {
      const { bountyId } = req.params;
      const walletAddress = req.walletAddress!;

      // Verify bounty exists
      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }
      if (bounty.status !== "open") {
        return res.status(400).json({ message: "Bounty has already been awarded or cancelled" });
      }

      // Verify ownership - only bounty creator can cancel
      const agent = await storage.getAgent(bounty.agentId);
      if (!agent || agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Only the bounty creator can cancel the bounty" });
      }

      const updatedBounty = await storage.updateBountyStatus(bountyId, "cancelled");

      res.json({ bounty: updatedBounty });
    } catch (error) {
      console.error("Cancel bounty error:", error);
      res.status(500).json({ message: "Failed to cancel bounty" });
    }
  });

  // ========================================
  // LAUNCHPAD ENDPOINTS
  // ========================================

  // Store token metadata and return CID (simulated for now)
  app.post("/api/launch/storage/token-metadata", authMiddleware, async (req, res) => {
    try {
      const parseResult = tokenMetadataRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { name, symbol, description, imageUrl, links, creatorBeeId } = parseResult.data;
      
      // In production, this would upload to IPFS and return a real CID
      // For now, create a deterministic mock CID from the content
      const content = JSON.stringify({ name, symbol, description, imageUrl, links, creatorBeeId });
      const mockCID = `Qm${Buffer.from(content).toString('base64').slice(0, 44).replace(/[+/=]/g, 'x')}`;

      res.json({ metadataCID: mockCID });
    } catch (error) {
      console.error("Token metadata storage error:", error);
      res.status(500).json({ message: "Failed to store token metadata" });
    }
  });

  // Get all launch tokens
  app.get("/api/launch/tokens", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const graduated = req.query.graduated === "true" ? true : req.query.graduated === "false" ? false : undefined;
      
      const tokens = await storage.getLaunchTokens(limit, graduated);
      res.json({ tokens });
    } catch (error) {
      console.error("Get launch tokens error:", error);
      res.status(500).json({ message: "Failed to get tokens" });
    }
  });

  // Get single token
  app.get("/api/launch/tokens/:address", async (req, res) => {
    try {
      const token = await storage.getLaunchToken(req.params.address);
      if (!token) {
        return res.status(404).json({ message: "Token not found" });
      }

      const trades = await storage.getLaunchTradesByToken(req.params.address, 50);
      res.json({ token, trades });
    } catch (error) {
      console.error("Get token error:", error);
      res.status(500).json({ message: "Failed to get token" });
    }
  });

  // Record a new token (called after on-chain creation event)
  app.post("/api/launch/tokens", authMiddleware, async (req, res) => {
    try {
      const { tokenAddress, name, symbol, metadataCID, description, imageUrl, creatorBeeId } = req.body;
      const walletAddress = req.walletAddress!;

      if (!tokenAddress || !name || !symbol || !metadataCID) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const token = await storage.createLaunchToken({
        tokenAddress,
        creatorAddress: walletAddress,
        creatorBeeId: creatorBeeId || null,
        name,
        symbol,
        metadataCID,
        description,
        imageUrl,
      });

      res.json({ token });
    } catch (error) {
      console.error("Create token error:", error);
      res.status(500).json({ message: "Failed to record token" });
    }
  });

  // Record a trade (called after on-chain trade event)
  app.post("/api/launch/trades", async (req, res) => {
    try {
      const { tokenAddress, trader, isBuy, nativeAmount, tokenAmount, feeNative, priceAfter, txHash } = req.body;

      if (!tokenAddress || !trader || isBuy === undefined || !nativeAmount || !tokenAmount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const trade = await storage.createLaunchTrade({
        tokenAddress,
        trader,
        isBuy,
        nativeAmount,
        tokenAmount,
        feeNative: feeNative || "0",
        priceAfter: priceAfter || "0",
        txHash,
      });

      // Update token stats if needed
      if (isBuy) {
        const token = await storage.getLaunchToken(tokenAddress);
        if (token) {
          const newTotalRaised = (BigInt(token.totalRaisedNative) + BigInt(nativeAmount) - BigInt(feeNative || "0")).toString();
          await storage.updateLaunchToken(tokenAddress, { totalRaisedNative: newTotalRaised });
        }
      }

      res.json({ trade });
    } catch (error) {
      console.error("Record trade error:", error);
      res.status(500).json({ message: "Failed to record trade" });
    }
  });

  // Mark token as graduated
  app.post("/api/launch/tokens/:address/graduate", async (req, res) => {
    try {
      const token = await storage.updateLaunchToken(req.params.address, { graduated: true });
      res.json({ token });
    } catch (error) {
      console.error("Graduate token error:", error);
      res.status(500).json({ message: "Failed to graduate token" });
    }
  });

  // TX Preparation endpoints - return unsigned transaction data
  const TokenFactoryABI = [
    {
      name: "createToken",
      type: "function",
      inputs: [
        { name: "name", type: "string" },
        { name: "symbol", type: "string" },
        { name: "metadataCID", type: "string" },
        { name: "creatorBeeId", type: "uint256" }
      ],
      outputs: [{ name: "tokenAddress", type: "address" }]
    }
  ] as const;

  const BondingCurveMarketABI = [
    {
      name: "buy",
      type: "function",
      inputs: [
        { name: "token", type: "address" },
        { name: "minTokensOut", type: "uint256" }
      ],
      outputs: [{ name: "tokensOut", type: "uint256" }]
    },
    {
      name: "sell",
      type: "function",
      inputs: [
        { name: "token", type: "address" },
        { name: "tokenAmountIn", type: "uint256" },
        { name: "minNativeOut", type: "uint256" }
      ],
      outputs: [{ name: "nativeOut", type: "uint256" }]
    }
  ] as const;

  // Prepare create token transaction
  app.post("/api/tx/prepare/launch/create-token", authMiddleware, async (req, res) => {
    try {
      const parseResult = prepareCreateTokenRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { creatorBeeId, metadataCID, name, symbol } = parseResult.data;
      const chainId = parseInt(req.query.chainId as string) || 97;

      // Get factory address for chain
      const factoryAddress = getContractAddress(chainId, "tokenFactory");
      if (!factoryAddress) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const data = encodeFunctionData({
        abi: TokenFactoryABI,
        functionName: "createToken",
        args: [name, symbol, metadataCID, BigInt(creatorBeeId || "0")]
      });

      res.json({
        to: factoryAddress,
        data,
        value: "0",
        chainId
      });
    } catch (error) {
      console.error("Prepare create token error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Prepare buy transaction
  app.post("/api/tx/prepare/launch/buy", authMiddleware, async (req, res) => {
    try {
      const parseResult = prepareBuyRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { token, nativeValueWei, minTokensOut } = parseResult.data;
      const chainId = parseInt(req.query.chainId as string) || 97;

      const marketAddress = getContractAddress(chainId, "bondingCurveMarket");
      if (!marketAddress) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const data = encodeFunctionData({
        abi: BondingCurveMarketABI,
        functionName: "buy",
        args: [token as `0x${string}`, BigInt(minTokensOut)]
      });

      res.json({
        to: marketAddress,
        data,
        value: nativeValueWei,
        chainId
      });
    } catch (error) {
      console.error("Prepare buy error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Prepare sell transaction
  app.post("/api/tx/prepare/launch/sell", authMiddleware, async (req, res) => {
    try {
      const parseResult = prepareSellRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { token, tokenAmountIn, minNativeOut } = parseResult.data;
      const chainId = parseInt(req.query.chainId as string) || 97;

      const marketAddress = getContractAddress(chainId, "bondingCurveMarket");
      if (!marketAddress) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const data = encodeFunctionData({
        abi: BondingCurveMarketABI,
        functionName: "sell",
        args: [token as `0x${string}`, BigInt(tokenAmountIn), BigInt(minNativeOut)]
      });

      res.json({
        to: marketAddress,
        data,
        value: "0",
        chainId
      });
    } catch (error) {
      console.error("Prepare sell error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Helper function to get contract addresses
  function getContractAddress(chainId: number, contract: string): string | null {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    
    const addresses: Record<number, Record<string, string>> = {
      31337: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
      },
      97: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
      },
      56: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
      },
      5611: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
      },
      204: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
      },
    };

    return addresses[chainId]?.[contract] || null;
  }

  // Contract configuration endpoint
  // Returns contract addresses for the requested chain
  app.get("/api/contracts/:chainId", (req, res) => {
    const chainId = parseInt(req.params.chainId);
    
    const addresses = {
      agentRegistry: getContractAddress(chainId, "agentRegistry"),
      bountyEscrow: getContractAddress(chainId, "bountyEscrow"),
      postBond: getContractAddress(chainId, "postBond"),
      reputation: getContractAddress(chainId, "reputation"),
      feeVault: getContractAddress(chainId, "feeVault"),
      tokenFactory: getContractAddress(chainId, "tokenFactory"),
      bondingCurveMarket: getContractAddress(chainId, "bondingCurveMarket"),
    };

    if (!addresses.agentRegistry) {
      return res.status(404).json({ 
        message: "Unsupported chain ID", 
        supportedChains: [31337, 97, 56, 5611, 204]
      });
    }

    res.json({ chainId, addresses });
  });

  return httpServer;
}
