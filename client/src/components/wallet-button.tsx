import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, ChevronDown, LogOut, Copy, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (error) {
      toast({
        title: "Wallet connection failed",
        description: error.message || "Please make sure you have a Web3 wallet installed (like MetaMask).",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast({ title: "Address copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (connector: typeof connectors[0]) => {
    try {
      // Show connecting toast for WalletConnect
      if (connector.name === "WalletConnect") {
        toast({
          title: "Opening WalletConnect",
          description: "Please scan the QR code with your mobile wallet.",
        });
      }
      connect({ connector });
    } catch (err) {
      console.error("Connection error:", err);
      toast({
        title: "Connection failed",
        description: "Unable to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get connector icon/description
  const getConnectorInfo = (name: string) => {
    switch (name) {
      case "MetaMask":
        return "Browser extension";
      case "WalletConnect":
        return "Mobile wallets (Trust, Binance, OKX)";
      case "Injected":
        return "Other browser wallets";
      default:
        return "";
    }
  };

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            className="gap-2"
            disabled={isPending}
            data-testid="button-connect-wallet"
          >
            <Wallet className="h-4 w-4" />
            {isPending ? "Connecting..." : "Connect Wallet"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {connectors.length === 0 ? (
            <div className="px-2 py-3 text-center">
              <p className="text-sm text-muted-foreground">No wallet detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Install MetaMask or another Web3 wallet
              </p>
            </div>
          ) : (
            connectors.map((connector) => (
              <DropdownMenuItem
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                className="cursor-pointer flex flex-col items-start gap-0.5"
                data-testid={`button-connect-${connector.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <span className="font-medium">{connector.name}</span>
                <span className="text-xs text-muted-foreground">
                  {getConnectorInfo(connector.name)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="gap-2"
          data-testid="button-wallet-menu"
        >
          <div className="h-2 w-2 rounded-full bg-green-500" />
          {formatAddress(address!)}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Connected to</p>
          <p className="text-sm font-medium">{chain?.name || "Unknown"}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
          {copied ? (
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="cursor-pointer text-destructive"
          data-testid="button-disconnect-wallet"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
