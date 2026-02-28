import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Gift, Clock, Users, Trophy, ExternalLink, Zap, Bot,
  CheckCircle, AlertCircle, ArrowRight, Sparkles, Timer, Crown,
  Shield, XCircle, Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import type { GiveawayCampaign, GiveawayEntry } from "@shared/schema";

interface GiveawayData {
  campaign: GiveawayCampaign | null;
  entryCount: number;
  entries: GiveawayEntry[];
}

interface VerificationEntry {
  walletAddress: string;
  nfaId: string | null;
  nfaName: string | null;
  onChainTokenId: number | null;
  bap578Verified: boolean;
  bap578Owner: string | null;
  registryVerified: boolean;
  registryAgentId: number | null;
  mintTxHash: string | null;
  registryTxHash: string | null;
}

function useCountdown(endDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    if (!endDate) return;

    const tick = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center" data-testid={`countdown-${label.toLowerCase()}`}>
      <div className="text-3xl md:text-4xl font-bold tabular-nums text-amber-500">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function truncateWallet(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <Badge
      variant={verified ? "outline" : "destructive"}
      className="text-xs gap-1"
      data-testid={`badge-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
    >
      {verified ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}

export default function GiveawayPage() {
  const { toast } = useToast();
  const { isAuthenticated, agent } = useAuth();
  const walletAddress = agent?.ownerAddress?.toLowerCase();
  const queryClient = useQueryClient();

  const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7";
  const isAdmin = walletAddress === ADMIN_ADDRESS;

  const { data, isLoading } = useQuery<GiveawayData>({
    queryKey: ["/api/giveaways/active"],
  });

  const campaign = data?.campaign;
  const entries = data?.entries || [];
  const entryCount = data?.entryCount || 0;

  const { data: verifyData, isLoading: verifyLoading } = useQuery<{ verifications: VerificationEntry[] }>({
    queryKey: ["/api/giveaways", campaign?.id, "verify"],
    queryFn: async () => {
      if (!campaign?.id) return { verifications: [] };
      const res = await fetch(`/api/giveaways/${campaign.id}/verify`);
      if (!res.ok) throw new Error("Failed to verify");
      return res.json();
    },
    enabled: !!campaign?.id,
    staleTime: 60000,
  });

  const verifications = verifyData?.verifications || [];
  const verifyMap = new Map(verifications.map(v => [v.walletAddress, v]));

  const bap578Count = verifications.filter(v => v.bap578Verified).length;
  const registryCount = verifications.filter(v => v.registryVerified).length;
  const bothCount = verifications.filter(v => v.bap578Verified && v.registryVerified).length;

  const countdown = useCountdown(campaign?.endAt ? new Date(campaign.endAt) : null);
  const isActive = campaign?.status === "active" && !countdown.expired;
  const isCompleted = campaign?.status === "completed" || (campaign?.status === "active" && countdown.expired);
  const hasWinner = !!campaign?.winnerWallet;

  const userEntry = entries.find(
    (e) => e.walletAddress === walletAddress?.toLowerCase()
  );

  const drawMutation = useMutation({
    mutationFn: async () => {
      if (!campaign) throw new Error("No campaign");
      return apiRequest("POST", `/api/giveaways/${campaign.id}/draw`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaways/active"] });
      toast({ title: "Winner Drawn!", description: "The giveaway winner has been selected." });
    },
    onError: (error: Error) => {
      toast({ title: "Draw Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="py-8 px-6 md:px-8 lg:px-12 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="py-8 px-6 md:px-8 lg:px-12 max-w-4xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-no-campaign">No Active Giveaway</h3>
            <p className="text-muted-foreground">Check back soon for upcoming giveaway campaigns.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-6 md:px-8 lg:px-12 max-w-4xl mx-auto space-y-6">
      <Card className="overflow-visible bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 border-amber-500/30">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
              <Gift className="h-4 w-4" />
              {isActive ? "Live Giveaway" : hasWinner ? "Giveaway Complete" : "Giveaway Ended"}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-campaign-name">
              {campaign.name}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto" data-testid="text-campaign-description">
              {campaign.description}
            </p>

            <div className="inline-flex items-center gap-2 text-4xl md:text-5xl font-bold text-amber-500">
              <span data-testid="text-prize-amount">${campaign.prizeAmountUsd}</span>
            </div>
            <p className="text-sm text-muted-foreground">Prize Pool</p>
          </div>
        </CardContent>
      </Card>

      {isActive && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                <Timer className="h-4 w-4" />
                <span>Time Remaining</span>
              </div>
              <div className="flex items-center justify-center gap-6 md:gap-8">
                <CountdownUnit value={countdown.days} label="Days" />
                <div className="text-2xl text-muted-foreground font-light">:</div>
                <CountdownUnit value={countdown.hours} label="Hours" />
                <div className="text-2xl text-muted-foreground font-light">:</div>
                <CountdownUnit value={countdown.minutes} label="Mins" />
                <div className="text-2xl text-muted-foreground font-light">:</div>
                <CountdownUnit value={countdown.seconds} label="Secs" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasWinner && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
          <CardContent className="py-6">
            <div className="text-center space-y-3">
              <Crown className="h-12 w-12 mx-auto text-amber-500" />
              <h2 className="text-2xl font-bold">Winner Announced!</h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20">
                <Trophy className="h-5 w-5 text-amber-500" />
                <a
                  href={`https://bscscan.com/address/${campaign.winnerWallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  data-testid="link-winner-wallet"
                >
                  {truncateWallet(campaign.winnerWallet!)}
                </a>
                <ExternalLink className="h-3 w-3 text-amber-500" />
              </div>
              {campaign.drawnAt && (
                <p className="text-sm text-muted-foreground">
                  Drawn on {new Date(campaign.drawnAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              How to Enter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-amber-600">1</div>
              <div>
                <p className="font-medium text-sm">Connect your wallet</p>
                <p className="text-xs text-muted-foreground">Use MetaMask or any Web3 wallet on BNB Chain</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-amber-600">2</div>
              <div>
                <p className="font-medium text-sm">Mint a Non-Fungible Agent</p>
                <p className="text-xs text-muted-foreground">Create your AI agent on-chain (FREE - no mint fee)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-amber-600">3</div>
              <div>
                <p className="font-medium text-sm">Automatic entry</p>
                <p className="text-xs text-muted-foreground">You're entered once your NFA is minted on-chain</p>
              </div>
            </div>

            {isActive && (
              <Link href="/nfa/mint">
                <Button className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white" data-testid="button-mint-nfa">
                  <Bot className="h-4 w-4 mr-2" />
                  Mint NFA to Enter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                One entry per wallet address
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Minting is FREE — you only pay gas fees
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Must mint an NFA on-chain during the campaign period
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Winner is selected by random draw
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Prize: ${campaign.prizeAmountUsd} paid to the winner's wallet
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Campaign runs {new Date(campaign.startAt).toLocaleDateString()} — {new Date(campaign.endAt).toLocaleDateString()}
              </li>
            </ul>

            {userEntry && (
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium" data-testid="text-already-entered">You're entered!</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Entered on {new Date(userEntry.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {verifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              On-Chain Verification Status
            </CardTitle>
            <CardDescription>
              Live verification against BAP-578 and HoneycombAgentRegistry contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold" data-testid="text-bap578-count">{bap578Count}/{verifications.length}</div>
                <div className="text-xs text-muted-foreground mt-1">BAP-578</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold" data-testid="text-registry-count">{registryCount}/{verifications.length}</div>
                <div className="text-xs text-muted-foreground mt-1">AgentRegistry</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-amber-500" data-testid="text-both-count">{bothCount}/{verifications.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Both Verified</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> BAP-578: 
                <a href="https://bscscan.com/address/0xd7Deb29ddBB13607375Ce50405A574AC2f7d978d" target="_blank" rel="noopener noreferrer" className="underline">
                  0xd7De...978d
                </a>
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> Registry: 
                <a href="https://bscscan.com/address/0xbff21cBa7299E8A9C08dcc0B7CAD97D06767F651" target="_blank" rel="noopener noreferrer" className="underline">
                  0xbff2...F651
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Participants
            <Badge variant="secondary">{entryCount}</Badge>
          </CardTitle>
          {verifyLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Verifying on-chain...
            </div>
          )}
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-participants">
                No participants yet. Be the first to enter!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {entries.map((entry, index) => {
                const v = verifyMap.get(entry.walletAddress);
                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-muted/30 space-y-2"
                    data-testid={`entry-${index}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground w-6 text-right">
                          #{index + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xs">
                            {entry.walletAddress.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={`https://bscscan.com/address/${entry.walletAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm hover:underline"
                            >
                              {truncateWallet(entry.walletAddress)}
                            </a>
                            {entry.walletAddress === campaign.winnerWallet && (
                              <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <Trophy className="h-3 w-3 mr-1" />
                                Winner
                              </Badge>
                            )}
                          </div>
                          {v?.nfaName && (
                            <span className="text-xs text-muted-foreground">
                              NFA: {v.nfaName}
                              {v.onChainTokenId && v.onChainTokenId > 0 && ` (#${v.onChainTokenId})`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {v && (
                      <div className="flex items-center gap-2 pl-9 flex-wrap">
                        <VerificationBadge verified={v.bap578Verified} label="BAP-578" />
                        <VerificationBadge verified={v.registryVerified} label="AgentRegistry" />
                        {v.mintTxHash && (
                          <a
                            href={`https://bscscan.com/tx/${v.mintTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                            data-testid={`link-mint-tx-${index}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Mint Tx
                          </a>
                        )}
                        {v.registryTxHash && v.registryTxHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                          <a
                            href={`https://bscscan.com/tx/${v.registryTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                            data-testid={`link-registry-tx-${index}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Registry Tx
                          </a>
                        )}
                      </div>
                    )}
                    {verifyLoading && !v && (
                      <div className="flex items-center gap-1.5 pl-9 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking on-chain status...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && campaign && !hasWinner && isCompleted && (
        <Card className="border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Admin: Draw Winner
            </CardTitle>
            <CardDescription>
              Select a random winner from {entryCount} participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => drawMutation.mutate()}
              disabled={drawMutation.isPending || entryCount === 0}
              variant="destructive"
              data-testid="button-draw-winner"
            >
              {drawMutation.isPending ? "Drawing..." : "Draw Random Winner"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
