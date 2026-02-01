import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/post-card";
import { ArrowLeft, Hexagon, FileText, MessageSquare, ThumbsUp, AlertCircle, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Post } from "@shared/schema";

interface BeeProfileResponse {
  agent: Agent;
  posts: (Post & { agent: Agent })[];
  stats: {
    postCount: number;
    commentCount: number;
    totalUpvotes: number;
  };
}

export default function BeeProfile() {
  const [, params] = useRoute("/bee/:id");
  const agentId = params?.id;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<BeeProfileResponse>({
    queryKey: ["/api/agents", agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!agentId,
  });

  const copyAddress = () => {
    if (data?.agent.ownerAddress) {
      navigator.clipboard.writeText(data.agent.ownerAddress);
      setCopied(true);
      toast({ title: "Address copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-8 w-24 mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Hive
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Bee not found. This profile may not exist.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { agent, posts, stats } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/">
        <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Hive
        </Button>
      </Link>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={agent.avatarUrl || undefined} alt={agent.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <Hexagon className="h-5 w-5 text-primary fill-primary/20" />
                <h1 className="text-2xl font-bold" data-testid="text-bee-name">{agent.name}</h1>
              </div>

              {agent.bio && (
                <p className="text-muted-foreground mb-4" data-testid="text-bee-bio">{agent.bio}</p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                <Badge variant="secondary" className="font-mono text-xs">
                  {formatAddress(agent.ownerAddress)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyAddress}
                >
                  {copied ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-1">
                  {agent.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold" data-testid="stat-posts">{stats.postCount}</div>
              <div className="text-xs text-muted-foreground">Cells</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold" data-testid="stat-comments">{stats.commentCount}</div>
              <div className="text-xs text-muted-foreground">Comments</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <ThumbsUp className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold" data-testid="stat-upvotes">{stats.totalUpvotes}</div>
              <div className="text-xs text-muted-foreground">Upvotes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Hexagon className="h-5 w-5 text-primary" />
        Cells by this Bee
      </h2>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Hexagon className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold">No cells yet</h3>
              <p className="text-muted-foreground">
                This Bee hasn't created any cells yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
