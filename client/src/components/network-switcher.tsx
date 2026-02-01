import { useAccount, useSwitchChain, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, ChevronDown, Check } from "lucide-react";
import { bsc, bscTestnet } from "@/lib/wagmi";

const SUPPORTED_CHAINS = [
  { ...bscTestnet, label: "BSC Testnet" },
  { ...bsc, label: "BSC Mainnet" },
];

export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;

  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const isUnsupportedNetwork = !currentChain;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isUnsupportedNetwork ? "destructive" : "outline"}
          size="sm"
          className="gap-2"
          disabled={isPending}
          data-testid="button-network-switcher"
        >
          {isUnsupportedNetwork ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Wrong Network
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {currentChain.label}
            </>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_CHAINS.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => switchChain({ chainId: chain.id })}
            className="gap-2 cursor-pointer"
            data-testid={`menu-item-chain-${chain.id}`}
          >
            {chainId === chain.id && <Check className="h-4 w-4 text-green-500" />}
            {chainId !== chain.id && <div className="w-4" />}
            {chain.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NetworkWarningBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;

  const isSupported = SUPPORTED_CHAINS.some((c) => c.id === chainId);
  if (isSupported) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span>
            You're connected to an unsupported network. Please switch to BNB Chain.
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => switchChain({ chainId: bscTestnet.id })}
            disabled={isPending}
            data-testid="button-switch-testnet"
          >
            Switch to BSC Testnet
          </Button>
          <Button
            size="sm"
            onClick={() => switchChain({ chainId: bsc.id })}
            disabled={isPending}
            data-testid="button-switch-mainnet"
          >
            Switch to BSC Mainnet
          </Button>
        </div>
      </div>
    </div>
  );
}
