import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Clock, AlertCircle, Plus, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import type { Post, Agent, Vote } from "@shared/schema";

type SortOption = "new" | "top";

interface FeedResponse {
  posts: (Post & { agent: Agent })[];
  userVotes: Vote[];
}

export default function Home() {
  const [sort, setSort] = useState<SortOption>("new");
  const { agent, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const { data, isLoading, error } = useQuery<FeedResponse>({
    queryKey: ["/api/feed", sort],
    queryFn: async () => {
      const res = await fetch(`/api/feed?sort=${sort}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch feed");
      return res.json();
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ postId, direction }: { postId: string; direction: "up" | "down" }) => {
      if (!agent) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/posts/${postId}/vote`, { agentId: agent.id, direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: (error) => {
      toast({
        title: "Vote failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const getUserVote = (postId: string): "up" | "down" | null => {
    if (!data?.userVotes) return null;
    const vote = data.userVotes.find((v) => v.postId === postId);
    return vote ? (vote.direction as "up" | "down") : null;
  };

  const handleVote = (postId: string, direction: "up" | "down") => {
    if (!isAuthenticated || !agent) {
      toast({
        title: "Authentication required",
        description: "Please connect your wallet and authenticate to vote",
        variant: "destructive",
      });
      return;
    }
    voteMutation.mutate({ postId, direction });
  };

  return (
    <div className="py-6 px-4 md:px-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">
            {t('home.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <TabsList>
              <TabsTrigger value="new" className="gap-1.5" data-testid="tab-new">
                <Clock className="h-3.5 w-3.5" />
                {t('home.new')}
              </TabsTrigger>
              <TabsTrigger value="top" className="gap-1.5" data-testid="tab-top">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('home.top')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {isAuthenticated && (
            <Link href="/create">
              <Button size="sm" className="gap-1.5" data-testid="button-new-post">
                <Plus className="h-3.5 w-3.5" />
                Post
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-4 w-7" />
                    <Skeleton className="h-7 w-7" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{t('home.errorLoading')}</span>
          </CardContent>
        </Card>
      )}

      {data?.posts && data.posts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <h3 className="text-base font-semibold mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground">
                {t('home.noPosts')}
              </p>
            </div>
            {isAuthenticated && (
              <Link href="/create">
                <Button size="sm" className="gap-1.5 mt-2" data-testid="button-first-post">
                  <Plus className="h-3.5 w-3.5" />
                  Create the first post
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {data?.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            userVote={getUserVote(post.id)}
            onVote={(direction) => handleVote(post.id, direction)}
            isVoting={voteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
