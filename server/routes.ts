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
} from "@shared/schema";
import { z } from "zod";

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

  return httpServer;
}
