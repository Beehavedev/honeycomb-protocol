import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Shield, ExternalLink } from "lucide-react";
import {
  useBAP578OwnerOf,
  useBAP578TokenAddress,
  useGetAgentByOwner,
  useAgentRegistryAddress,
} from "@/contracts/hooks";

interface VerificationSignalsProps {
  onChainTokenId: number | null;
  ownerAddress: string;
  contractAddress: string | null;
  agentType: string;
  learningEnabled: boolean;
  learningTreeRoot: string | null;
  learningModuleId: string | null;
  proofOfPrompt: string;
  memoryRoot: string | null;
  registryStatus: string;
  mintTxHash: string | null;
}

function SignalRow({ label, status, detail, link }: {
  label: string;
  status: "verified" | "missing" | "loading" | "na";
  detail?: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
        ) : status === "verified" ? (
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
        ) : status === "na" ? (
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        )}
        <span className="text-sm truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {detail && (
          <span className="text-xs text-muted-foreground max-w-[120px] truncate">{detail}</span>
        )}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}

export function NfaVerificationSignals({ 
  onChainTokenId,
  ownerAddress,
  contractAddress,
  agentType,
  learningEnabled,
  learningTreeRoot,
  learningModuleId,
  proofOfPrompt,
  memoryRoot,
  registryStatus,
  mintTxHash,
}: VerificationSignalsProps) {
  const tokenId = onChainTokenId !== null ? BigInt(onChainTokenId) : undefined;
  const bap578Address = useBAP578TokenAddress();
  const resolvedContract = contractAddress || bap578Address;

  const { data: onChainOwner, isLoading: ownerLoading, isError: ownerError } = useBAP578OwnerOf(tokenId);

  const ownerAddr = ownerAddress as `0x${string}`;
  const { data: registryAgentId, isLoading: registryLoading } = useGetAgentByOwner(ownerAddr);
  const registryAddress = useAgentRegistryAddress();

  const isOnBAP578 = !ownerLoading && !ownerError && onChainOwner !== undefined && onChainOwner !== null;
  const ownerMatches = isOnBAP578 && (onChainOwner as string)?.toLowerCase() === ownerAddress?.toLowerCase();

  const hasRegistryId = !registryLoading && registryAgentId !== undefined && registryAgentId !== null && Number(registryAgentId) > 0;

  const hasContractVerified = !!mintTxHash && !!resolvedContract;

  const hasProofOfPrompt = proofOfPrompt && proofOfPrompt !== "0x" && proofOfPrompt.length > 4;
  const hasMemoryRoot = memoryRoot && memoryRoot !== "0x" && memoryRoot.length > 4;
  const hasLearningRoot = learningTreeRoot && learningTreeRoot !== "0x" && learningTreeRoot.length > 4;
  const hasLearningModule = !!learningModuleId;

  const bscScanBase = "https://bscscan.com";
  const tokenLink = onChainTokenId && resolvedContract
    ? `${bscScanBase}/token/${resolvedContract}?a=${onChainTokenId}`
    : undefined;
  const txLink = mintTxHash
    ? `${bscScanBase}/tx/${mintTxHash}`
    : undefined;

  const bap578Status = ownerLoading
    ? "loading" as const
    : onChainTokenId === null
      ? "na" as const
      : (isOnBAP578 && ownerMatches)
        ? "verified" as const
        : ownerError
          ? "missing" as const
          : "missing" as const;

  const erc8004Status = registryLoading
    ? "loading" as const
    : hasRegistryId
      ? "verified" as const
      : "missing" as const;

  const sourceCodeStatus = hasContractVerified ? "verified" as const : onChainTokenId === null ? "na" as const : "missing" as const;

  const signals = [
    { verified: bap578Status === "verified" },
    { verified: sourceCodeStatus === "verified" },
    { verified: erc8004Status === "verified" },
    { verified: !!hasProofOfPrompt },
    { verified: !!hasMemoryRoot },
    ...(learningEnabled ? [
      { verified: !!hasLearningRoot },
      { verified: !!hasLearningModule },
    ] : []),
  ];

  const verifiedCount = signals.filter(s => s.verified).length;
  const totalChecks = signals.length;
  const allLoading = ownerLoading || registryLoading;

  return (
    <Card data-testid="card-verification-signals">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Verification Signals
          </div>
          {!allLoading && (
            <Badge 
              variant={verifiedCount === totalChecks ? "outline" : "destructive"}
              className="text-xs"
            >
              {verifiedCount}/{totalChecks}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <SignalRow
          label="BAP-578 On-Chain"
          status={bap578Status}
          detail={isOnBAP578 ? `#${onChainTokenId}` : onChainTokenId === null ? "No token ID" : ownerError ? "RPC error" : "Not found"}
          link={tokenLink}
        />
        <SignalRow
          label="Source Code Verification"
          status={sourceCodeStatus}
          detail={hasContractVerified ? `Tx confirmed` : onChainTokenId === null ? "N/A" : "No mint tx"}
          link={hasContractVerified ? `${bscScanBase}/address/${resolvedContract}#code` : undefined}
        />
        <SignalRow
          label="ERC-8004 Identity"
          status={erc8004Status}
          detail={hasRegistryId ? `Agent #${Number(registryAgentId)}` : "Not registered"}
          link={hasRegistryId && registryAddress ? `${bscScanBase}/address/${registryAddress}` : undefined}
        />
        <SignalRow
          label="Proof-of-Prompt"
          status={hasProofOfPrompt ? "verified" : "missing"}
          detail={hasProofOfPrompt ? `${proofOfPrompt.slice(0, 10)}...` : "None"}
        />
        <SignalRow
          label="Memory Root"
          status={hasMemoryRoot ? "verified" : "missing"}
          detail={hasMemoryRoot ? `${memoryRoot!.slice(0, 10)}...` : "None"}
        />
        {learningEnabled && (
          <>
            <SignalRow
              label="Merkle Learning"
              status={hasLearningRoot ? "verified" : "missing"}
              detail={hasLearningRoot ? `${learningTreeRoot!.slice(0, 10)}...` : "No tree root"}
            />
            <SignalRow
              label="Learning Model"
              status={hasLearningModule ? "verified" : "missing"}
              detail={hasLearningModule ? "Assigned" : "None"}
            />
          </>
        )}
        {mintTxHash && (
          <SignalRow
            label="Mint Transaction"
            status="verified"
            detail={`${mintTxHash.slice(0, 10)}...`}
            link={txLink}
          />
        )}
      </CardContent>
    </Card>
  );
}
