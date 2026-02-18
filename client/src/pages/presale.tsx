import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";
import { HoneyPresaleABI } from "@/contracts/abis";
import { getPresaleAddress } from "@/contracts/addresses";
import {
  ArrowLeft, Lock, Globe, Clock, Coins, Users, TrendingUp,
  Shield, Crown, Hexagon, Copy, CheckCircle2, AlertTriangle,
  Rocket, Gift, Target, Timer, Zap, ArrowUpRight, Loader2,
  Settings, Plus, UserPlus, BarChart3, Sparkles, Wallet, ExternalLink,
} from "lucide-react";

const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7".toLowerCase();

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function getTimeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getTimeUntilStart(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return "Started";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

async function authFetch(url: string) {
  const token = (await import("@/lib/auth")).getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function authPost(url: string, body: any) {
  const token = (await import("@/lib/auth")).getToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || text);
    } catch (e: any) {
      if (e.message) throw e;
      throw new Error(text);
    }
  }
  return res.json();
}

async function authPatch(url: string, body: any) {
  const token = (await import("@/lib/auth")).getToken();
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function PhaseStatusBadge({ phase }: { phase: any }) {
  const now = Date.now();
  const start = new Date(phase.startTime).getTime();
  const end = new Date(phase.endTime).getTime();

  if (phase.status === "paused") return <Badge variant="secondary">Paused</Badge>;
  if (now < start) return <Badge variant="outline">Upcoming</Badge>;
  if (now > end) return <Badge variant="secondary">Completed</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Live</Badge>;
}

function PhaseCard({ phase, isAdmin, onContribute }: { phase: any; isAdmin: boolean; onContribute: (p: any) => void }) {
  const now = Date.now();
  const start = new Date(phase.startTime).getTime();
  const end = new Date(phase.endTime).getTime();
  const isActive = phase.status !== "paused" && now >= start && now <= end;
  const raised = parseFloat(phase.totalRaisedBnb);
  const hardCap = parseFloat(phase.hardCapBnb);
  const progress = hardCap > 0 ? Math.min((raised / hardCap) * 100, 100) : 0;

  return (
    <Card className={isActive ? "border-amber-500/50" : ""} data-testid={`card-phase-${phase.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {phase.type === "private" ? (
            <Lock className="h-4 w-4 text-amber-400" />
          ) : (
            <Globe className="h-4 w-4 text-blue-400" />
          )}
          <CardTitle className="text-lg">{phase.name}</CardTitle>
          <PhaseStatusBadge phase={phase} />
        </div>
        {isActive && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Timer className="h-3 w-3" />
            <span>{getTimeRemaining(phase.endTime)}</span>
          </div>
        )}
        {now < start && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Starts in {getTimeUntilStart(phase.startTime)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {phase.description && (
          <p className="text-sm text-muted-foreground">{phase.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {formatNumber(raised)} / {formatNumber(hardCap)} BNB
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Soft Cap: {phase.softCapBnb} BNB</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Token Price</p>
            <p className="text-sm font-semibold">{phase.tokenPrice} BNB</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Tokens Allocated</p>
            <p className="text-sm font-semibold">{formatNumber(parseFloat(phase.totalTokens))}</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Min / Max BNB</p>
            <p className="text-sm font-semibold">{phase.minContribution} / {phase.maxContribution}</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Participants</p>
            <p className="text-sm font-semibold">{phase.participants}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>TGE Unlock: {phase.tgeUnlockPercent}%</span>
          <span>Cliff: {phase.vestingCliffDays}d</span>
          <span>Vesting: {phase.vestingDurationDays}d</span>
          <span>Referral Bonus: {phase.referralBonusPercent}%</span>
        </div>

        {phase.type === "public" && (
          <div className="flex items-center gap-2 rounded-md bg-blue-500/10 p-2 text-xs text-blue-400">
            <Shield className="h-3 w-3 shrink-0" />
            <span>Requires an active Honeycomb agent to participate</span>
          </div>
        )}

        {isActive && (
          <Button
            className="w-full"
            onClick={() => onContribute(phase)}
            data-testid={`button-contribute-${phase.id}`}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Contribute BNB
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ContributeModal({
  phase,
  onClose,
}: {
  phase: any;
  onClose: () => void;
}) {
  const [bnbAmount, setBnbAmount] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [txStep, setTxStep] = useState<"input" | "sending" | "confirming" | "recording" | "done">("input");
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const presaleAddress = getPresaleAddress(chainId);
  const balance = useBalance({ address });

  const whitelistQuery = useQuery({
    queryKey: ["/api/presale/whitelist-check", phase.id],
    queryFn: () => authFetch(`/api/presale/whitelist-check/${phase.id}`),
    enabled: phase.type === "private",
  });

  const { writeContract, data: txHash, isPending: isSending, error: sendError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      authPost("/api/presale/contribute", {
        phaseId: phase.id,
        bnbAmount,
        referralCode: referralCode || undefined,
        txHash: txHash,
      }),
    onSuccess: (data) => {
      setTxStep("done");
      toast({
        title: "Contribution Successful",
        description: `You'll receive ${formatNumber(parseFloat(data.tokensReceived))} $HONEY${parseFloat(data.bonusTokens) > 0 ? ` + ${formatNumber(parseFloat(data.bonusTokens))} bonus` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/presale"] });
    },
    onError: (err: any) => {
      toast({ title: "Recording Failed", description: err.message, variant: "destructive" });
      setTxStep("input");
    },
  });

  useEffect(() => {
    if (isConfirmed && txHash && txStep === "confirming") {
      setTxStep("recording");
      recordMutation.mutate();
    }
  }, [isConfirmed, txHash, txStep]);

  useEffect(() => {
    if (txHash && txStep === "sending") {
      setTxStep("confirming");
    }
  }, [txHash, txStep]);

  useEffect(() => {
    if (sendError) {
      toast({ title: "Transaction Failed", description: sendError.message?.split('\n')[0] || "Transaction rejected", variant: "destructive" });
      setTxStep("input");
    }
  }, [sendError]);

  const tokenPrice = parseFloat(phase.tokenPrice);
  const bnb = parseFloat(bnbAmount) || 0;
  const tokensToReceive = bnb > 0 ? bnb / tokenPrice : 0;
  const userBalance = balance.data ? parseFloat(formatEther(balance.data.value)) : 0;
  const hasContractDeployed = presaleAddress && presaleAddress !== "0x0000000000000000000000000000000000000000";

  const handleContribute = () => {
    if (!isConnected || !address) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    if (hasContractDeployed) {
      setTxStep("sending");
      writeContract({
        address: presaleAddress!,
        abi: HoneyPresaleABI,
        functionName: "contribute",
        args: [BigInt(phase.onChainPhaseId || 0), referralCode || ""],
        value: parseEther(bnbAmount),
      });
    } else {
      setTxStep("sending");
      authPost("/api/presale/contribute", {
        phaseId: phase.id,
        bnbAmount,
        referralCode: referralCode || undefined,
      }).then((data) => {
        setTxStep("done");
        toast({
          title: "Contribution Recorded",
          description: `You'll receive ${formatNumber(parseFloat(data.tokensReceived))} $HONEY. On-chain contract deployment pending — your allocation is secured.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/presale"] });
      }).catch((err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
        setTxStep("input");
      });
    }
  };

  if (phase.type === "private" && whitelistQuery.data && !whitelistQuery.data.whitelisted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <Card className="w-full max-w-md" onClick={(e: any) => e.stopPropagation()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" />
              Whitelist Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your wallet is not whitelisted for the private presale. Join our community to get whitelisted.
            </p>
            <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (txStep === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <Card className="w-full max-w-md" onClick={(e: any) => e.stopPropagation()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Contribution Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
              <p className="text-2xl font-bold text-amber-400">{formatNumber(tokensToReceive)} $HONEY</p>
              <p className="text-sm text-muted-foreground">allocated to your wallet</p>
            </div>
            {txHash && (
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-sm text-amber-400 hover:underline"
                data-testid="link-tx-hash"
              >
                View on BscScan <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button onClick={onClose} className="w-full" data-testid="button-close-success">Done</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e: any) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-amber-400" />
            Contribute to {phase.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected && (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-3 flex items-center gap-2 text-sm text-amber-300">
                <Wallet className="h-4 w-4 flex-shrink-0" />
                Connect your wallet to contribute
              </CardContent>
            </Card>
          )}

          {isConnected && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Balance</span>
              <span className="font-medium">{userBalance.toFixed(4)} BNB</span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">BNB Amount</label>
            <Input
              type="number"
              step="0.01"
              min={phase.minContribution}
              max={phase.maxContribution}
              placeholder={`${phase.minContribution} - ${phase.maxContribution} BNB`}
              value={bnbAmount}
              onChange={(e) => setBnbAmount(e.target.value)}
              data-testid="input-bnb-amount"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Min: {phase.minContribution} BNB | Max: {phase.maxContribution} BNB
            </p>
          </div>

          {bnb > 0 && (
            <Card className="bg-muted/50 border-amber-500/20">
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You send</span>
                  <span className="font-medium">{bnb} BNB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You receive</span>
                  <span className="font-medium text-amber-400">
                    {formatNumber(tokensToReceive)} $HONEY
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span>{phase.tokenPrice} BNB per HONEY</span>
                </div>
                {hasContractDeployed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Funds sent to</span>
                    <span className="text-emerald-400">Gnosis Safe Treasury</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">Referral Code (optional)</label>
            <Input
              placeholder="HONEY-XXXXXXXX"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              data-testid="input-referral-code"
            />
            {referralCode && (
              <p className="text-xs text-emerald-400 mt-1">
                {phase.referralBonusPercent}% bonus tokens with valid referral
              </p>
            )}
          </div>

          {txStep !== "input" && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span>
                    {txStep === "sending" && "Waiting for wallet confirmation..."}
                    {txStep === "confirming" && "Confirming on-chain..."}
                    {txStep === "recording" && "Recording contribution..."}
                  </span>
                </div>
                {txHash && (
                  <a
                    href={`https://bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline"
                  >
                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={txStep !== "input"}>
              Cancel
            </Button>
            <Button
              onClick={handleContribute}
              disabled={!bnbAmount || bnb <= 0 || txStep !== "input" || (isConnected && bnb > userBalance)}
              className="flex-1"
              data-testid="button-confirm-contribute"
            >
              {txStep !== "input" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wallet className="h-4 w-4 mr-2" />
              )}
              {hasContractDeployed ? "Send BNB" : "Contribute"}
            </Button>
          </div>

          {hasContractDeployed && (
            <p className="text-xs text-muted-foreground text-center">
              BNB is sent directly to the on-chain presale contract. Funds are forwarded to a Gnosis Safe multisig treasury.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MyAllocationTab() {
  const allocationQuery = useQuery({
    queryKey: ["/api/presale/my-allocation"],
    queryFn: () => authFetch("/api/presale/my-allocation"),
  });

  const contributionsQuery = useQuery({
    queryKey: ["/api/presale/my-contributions"],
    queryFn: () => authFetch("/api/presale/my-contributions"),
  });

  const referralQuery = useQuery({
    queryKey: ["/api/presale/my-referral"],
    queryFn: () => authFetch("/api/presale/my-referral"),
  });

  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyReferral = () => {
    if (referralQuery.data?.referralCode) {
      navigator.clipboard.writeText(referralQuery.data.referralCode);
      setCopied(true);
      toast({ title: "Copied", description: "Referral code copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (allocationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const alloc = allocationQuery.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="h-5 w-5 mx-auto mb-1 text-amber-400" />
            <p className="text-xs text-muted-foreground">Total Tokens</p>
            <p className="text-lg font-bold" data-testid="text-total-tokens">
              {formatNumber(parseFloat(alloc?.totalTokensAllocated || "0"))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-xs text-muted-foreground">BNB Contributed</p>
            <p className="text-lg font-bold" data-testid="text-total-bnb">
              {parseFloat(alloc?.totalBnbContributed || "0").toFixed(4)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-blue-400" />
            <p className="text-xs text-muted-foreground">Contributions</p>
            <p className="text-lg font-bold" data-testid="text-contribution-count">
              {alloc?.contributionCount || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {referralQuery.data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-400" />
              Your Referral Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={referralQuery.data.referralCode}
                className="font-mono"
                data-testid="input-my-referral-code"
              />
              <Button size="icon" variant="outline" onClick={copyReferral} data-testid="button-copy-referral">
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>Referrals: {referralQuery.data.totalReferrals}</span>
              <span>Bonus Tokens: {formatNumber(parseFloat(referralQuery.data.totalBonusTokens || "0"))}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {contributionsQuery.data && contributionsQuery.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contribution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contributionsQuery.data.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 text-sm flex-wrap"
                  data-testid={`row-contribution-${c.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <span>{parseFloat(c.bnbAmount).toFixed(4)} BNB</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{formatNumber(parseFloat(c.tokenAmount))} HONEY</span>
                    {parseFloat(c.bonusTokens) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{formatNumber(parseFloat(c.bonusTokens))} bonus
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {alloc?.allocation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Vesting Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">TGE Unlock</span>
              <span>{alloc.allocation.tgeUnlockPercent}%</span>
            </div>
            {alloc.allocation.vestingCliffEnd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliff Ends</span>
                <span>{new Date(alloc.allocation.vestingCliffEnd).toLocaleDateString()}</span>
              </div>
            )}
            {alloc.allocation.vestingEnd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Full Unlock</span>
                <span>{new Date(alloc.allocation.vestingEnd).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Allocated</span>
              <span className="font-medium">{formatNumber(parseFloat(alloc.allocation.totalTokens))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed</span>
              <span>{formatNumber(parseFloat(alloc.allocation.claimedTokens))}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdminPanel() {
  const [newPhase, setNewPhase] = useState({
    name: "", type: "private", startTime: "", endTime: "",
    tokenPrice: "", totalTokens: "", hardCapBnb: "", softCapBnb: "",
    minContribution: "", maxContribution: "", vestingCliffDays: 30,
    vestingDurationDays: 180, tgeUnlockPercent: 25,
    referralBonusPercent: 5, description: "",
  });
  const [whitelistPhaseId, setWhitelistPhaseId] = useState("");
  const [whitelistWallets, setWhitelistWallets] = useState("");
  const { toast } = useToast();

  const phasesQuery = useQuery({
    queryKey: ["/api/presale/phases"],
    queryFn: () => authFetch("/api/presale/phases"),
  });

  const seedMutation = useMutation({
    mutationFn: () => authPost("/api/presale/admin/seed-defaults", {}),
    onSuccess: () => {
      toast({ title: "Success", description: "Default phases created" });
      queryClient.invalidateQueries({ queryKey: ["/api/presale"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createPhaseMutation = useMutation({
    mutationFn: () => authPost("/api/presale/admin/phase", newPhase),
    onSuccess: () => {
      toast({ title: "Phase Created" });
      queryClient.invalidateQueries({ queryKey: ["/api/presale"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const whitelistMutation = useMutation({
    mutationFn: () =>
      authPost("/api/presale/admin/whitelist", {
        phaseId: whitelistPhaseId,
        wallets: whitelistWallets.split("\n").map((w) => w.trim()).filter(Boolean),
      }),
    onSuccess: (data) => {
      toast({ title: "Wallets Added", description: `${data.added} wallets whitelisted` });
      setWhitelistWallets("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authPatch(`/api/presale/admin/phase/${id}`, { status }),
    onSuccess: () => {
      toast({ title: "Phase Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/presale"] });
    },
  });

  const treasuryQuery = useQuery({
    queryKey: ["/api/presale/treasury"],
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Treasury & Smart Contract
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-muted-foreground">Gnosis Safe Treasury</span>
              <span className="font-mono text-xs">
                {treasuryQuery.data?.treasury || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-muted-foreground">Presale Contract</span>
              <Badge variant={treasuryQuery.data?.contractDeployed ? "default" : "secondary"}>
                {treasuryQuery.data?.contractDeployed ? "Deployed" : "Pending Deployment"}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            All BNB contributions are sent to the on-chain presale contract, which forwards funds to the Gnosis Safe multisig treasury. Set PRESALE_TREASURY_ADDRESS in environment variables.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Quick Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Create default Private + Public presale phases with recommended settings.
          </p>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-defaults"
          >
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Create Default Phases
          </Button>
        </CardContent>
      </Card>

      {phasesQuery.data && phasesQuery.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Phases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {phasesQuery.data.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <PhaseStatusBadge phase={p} />
                </div>
                <div className="flex gap-1">
                  {p.status !== "paused" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pauseMutation.mutate({ id: p.id, status: "paused" })}
                    >
                      Pause
                    </Button>
                  )}
                  {p.status === "paused" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pauseMutation.mutate({ id: p.id, status: "upcoming" })}
                    >
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-400" />
            Whitelist Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Select Phase</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={whitelistPhaseId}
              onChange={(e) => setWhitelistPhaseId(e.target.value)}
              data-testid="select-whitelist-phase"
            >
              <option value="">Choose phase...</option>
              {phasesQuery.data?.filter((p: any) => p.type === "private").map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Wallet Addresses (one per line)</label>
            <Textarea
              rows={5}
              placeholder="0x1234...&#10;0x5678...&#10;0xabcd..."
              value={whitelistWallets}
              onChange={(e) => setWhitelistWallets(e.target.value)}
              data-testid="textarea-whitelist"
            />
          </div>
          <Button
            onClick={() => whitelistMutation.mutate()}
            disabled={!whitelistPhaseId || !whitelistWallets.trim() || whitelistMutation.isPending}
            data-testid="button-add-whitelist"
          >
            {whitelistMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add to Whitelist
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Custom Phase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newPhase.name} onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })} placeholder="Phase name" data-testid="input-phase-name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={newPhase.type} onChange={(e) => setNewPhase({ ...newPhase, type: e.target.value })}>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Start Time</label>
              <Input type="datetime-local" value={newPhase.startTime} onChange={(e) => setNewPhase({ ...newPhase, startTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Time</label>
              <Input type="datetime-local" value={newPhase.endTime} onChange={(e) => setNewPhase({ ...newPhase, endTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Token Price (BNB)</label>
              <Input value={newPhase.tokenPrice} onChange={(e) => setNewPhase({ ...newPhase, tokenPrice: e.target.value })} placeholder="0.000005" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Total Tokens</label>
              <Input value={newPhase.totalTokens} onChange={(e) => setNewPhase({ ...newPhase, totalTokens: e.target.value })} placeholder="200000000" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hard Cap (BNB)</label>
              <Input value={newPhase.hardCapBnb} onChange={(e) => setNewPhase({ ...newPhase, hardCapBnb: e.target.value })} placeholder="500" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Soft Cap (BNB)</label>
              <Input value={newPhase.softCapBnb} onChange={(e) => setNewPhase({ ...newPhase, softCapBnb: e.target.value })} placeholder="100" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Min BNB</label>
              <Input value={newPhase.minContribution} onChange={(e) => setNewPhase({ ...newPhase, minContribution: e.target.value })} placeholder="0.5" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max BNB</label>
              <Input value={newPhase.maxContribution} onChange={(e) => setNewPhase({ ...newPhase, maxContribution: e.target.value })} placeholder="10" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">TGE Unlock %</label>
              <Input type="number" value={newPhase.tgeUnlockPercent} onChange={(e) => setNewPhase({ ...newPhase, tgeUnlockPercent: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Vesting Days</label>
              <Input type="number" value={newPhase.vestingDurationDays} onChange={(e) => setNewPhase({ ...newPhase, vestingDurationDays: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea value={newPhase.description} onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })} placeholder="Phase description..." />
          </div>
          <Button
            onClick={() => createPhaseMutation.mutate()}
            disabled={!newPhase.name || !newPhase.startTime || createPhaseMutation.isPending}
            data-testid="button-create-phase"
          >
            {createPhaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Phase
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TokenomicsSection() {
  const allocations = [
    { label: "Private Presale", pct: 10, color: "bg-amber-500" },
    { label: "Public Presale", pct: 15, color: "bg-amber-400" },
    { label: "Liquidity Pool", pct: 20, color: "bg-blue-500" },
    { label: "Community & Rewards", pct: 25, color: "bg-emerald-500" },
    { label: "Team & Advisors", pct: 10, color: "bg-purple-500" },
    { label: "Ecosystem Fund", pct: 10, color: "bg-cyan-500" },
    { label: "Treasury", pct: 10, color: "bg-rose-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-400" />
          $HONEY Tokenomics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-4 rounded-md overflow-hidden">
          {allocations.map((a) => (
            <div key={a.label} className={`${a.color}`} style={{ width: `${a.pct}%` }} title={`${a.label}: ${a.pct}%`} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allocations.map((a) => (
            <div key={a.label} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-sm ${a.color}`} />
              <span className="text-muted-foreground">{a.label}</span>
              <span className="ml-auto font-medium">{a.pct}%</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Supply</span>
            <span className="font-medium">1,000,000,000 $HONEY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Listing Price</span>
            <span className="font-medium">0.00001 BNB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Team Vesting</span>
            <span className="font-medium">12-month cliff, 24-month linear</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PresalePage() {
  const { isAuthenticated, agent } = useAuth();
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const walletAddress = agent?.ownerAddress?.toLowerCase();
  const isAdminUser = walletAddress === ADMIN_ADDRESS;

  const phasesQuery = useQuery({
    queryKey: ["/api/presale/phases"],
    queryFn: () => authFetch("/api/presale/phases"),
  });

  const statsQuery = useQuery({
    queryKey: ["/api/presale/stats"],
    queryFn: () => authFetch("/api/presale/stats"),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-amber-400" />
            $HONEY Presale
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure your $HONEY tokens before public launch
          </p>
        </div>
        <Link href="/token">
          <Button variant="outline" size="sm" data-testid="link-token-page">
            <Coins className="h-4 w-4 mr-1" />
            Token
          </Button>
        </Link>
      </div>

      {statsQuery.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
              <p className="text-xs text-muted-foreground">Total Raised</p>
              <p className="text-lg font-bold" data-testid="text-total-raised">
                {parseFloat(statsQuery.data.totalRaisedBnb).toFixed(2)} BNB
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Coins className="h-4 w-4 mx-auto mb-1 text-amber-400" />
              <p className="text-xs text-muted-foreground">Tokens Sold</p>
              <p className="text-lg font-bold" data-testid="text-tokens-sold">
                {formatNumber(parseFloat(statsQuery.data.totalTokensSold))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-400" />
              <p className="text-xs text-muted-foreground">Participants</p>
              <p className="text-lg font-bold" data-testid="text-participants">
                {statsQuery.data.totalParticipants}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Rocket className="h-4 w-4 mx-auto mb-1 text-purple-400" />
              <p className="text-xs text-muted-foreground">Active Phase</p>
              <p className="text-lg font-bold" data-testid="text-active-phase">
                {statsQuery.data.activePhase?.name || "None"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Rocket className="h-4 w-4 mr-1" />
            Presale
          </TabsTrigger>
          <TabsTrigger value="tokenomics" data-testid="tab-tokenomics">
            <Target className="h-4 w-4 mr-1" />
            Tokenomics
          </TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger value="my-allocation" data-testid="tab-allocation">
              <Coins className="h-4 w-4 mr-1" />
              My Allocation
            </TabsTrigger>
          )}
          {isAdminUser && (
            <TabsTrigger value="admin" data-testid="tab-admin">
              <Settings className="h-4 w-4 mr-1" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {phasesQuery.isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {phasesQuery.data && phasesQuery.data.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Hexagon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-1">Presale Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  The $HONEY presale phases haven't been configured yet. Stay tuned for announcements.
                </p>
              </CardContent>
            </Card>
          )}

          {phasesQuery.data?.map((phase: any) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              isAdmin={isAdminUser}
              onContribute={(p) => {
                if (!isAuthenticated) {
                  return;
                }
                setSelectedPhase(p);
              }}
            />
          ))}

          {!isAuthenticated && phasesQuery.data && phasesQuery.data.length > 0 && (
            <Card className="border-amber-500/30">
              <CardContent className="p-4 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                <p className="font-medium mb-1">Connect Your Wallet</p>
                <p className="text-sm text-muted-foreground">
                  Connect your wallet and sign in to participate in the presale.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">1</div>
                    <span className="text-sm font-medium">Private Presale</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Whitelisted wallets get early access at the best price with bonus tokens.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">2</div>
                    <span className="text-sm font-medium">Public Presale</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Open to everyone at a discounted price before listing.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">3</div>
                    <span className="text-sm font-medium">Token Launch</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    $HONEY launches on PancakeSwap with full liquidity and staking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokenomics" className="mt-4">
          <TokenomicsSection />
        </TabsContent>

        <TabsContent value="my-allocation" className="mt-4">
          <MyAllocationTab />
        </TabsContent>

        {isAdminUser && (
          <TabsContent value="admin" className="mt-4">
            <AdminPanel />
          </TabsContent>
        )}
      </Tabs>

      {selectedPhase && (
        <ContributeModal
          phase={selectedPhase}
          onClose={() => setSelectedPhase(null)}
        />
      )}
    </div>
  );
}
