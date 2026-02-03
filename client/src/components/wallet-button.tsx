import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, ChevronDown, LogOut, Copy, CheckCircle, Smartphone } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

// Detect if user is on mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if we're inside a wallet's in-app browser
const isInWalletBrowser = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('metamask') || 
         ua.includes('trust') || 
         ua.includes('tokenpocket') ||
         ua.includes('imtoken') ||
         ua.includes('coinbase') ||
         (window as any).ethereum?.isMetaMask ||
         (window as any).ethereum?.isTrust ||
         (window as any).ethereum?.isCoinbaseWallet;
};

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showMobileHelp, setShowMobileHelp] = useState(false);
  
  const mobile = useMemo(() => isMobile(), []);
  const inWalletBrowser = useMemo(() => isInWalletBrowser(), []);

  useEffect(() => {
    if (error) {
      // On mobile, if connection fails, show help
      if (mobile && !inWalletBrowser) {
        setShowMobileHelp(true);
      }
      toast({
        title: "Wallet connection failed",
        description: mobile && !inWalletBrowser 
          ? "Open this page in your wallet app's browser."
          : error.message || "Please make sure you have a Web3 wallet installed.",
        variant: "destructive",
      });
    }
  }, [error, toast, mobile, inWalletBrowser]);

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
        return mobile ? "Tap to connect" : "Browser extension";
      case "Coinbase Wallet":
        return mobile ? "Tap to connect" : "Coinbase app or extension";
      case "WalletConnect":
        return "Scan QR or tap to connect";
      case "Injected":
        return "Connected wallet";
      default:
        return "";
    }
  };

  // Sort connectors - prioritize injected on mobile
  const sortedConnectors = useMemo(() => {
    if (!mobile) return connectors;
    // On mobile, put injected/MetaMask first (works in wallet browsers)
    return [...connectors].sort((a, b) => {
      if (a.name === "Injected" || a.name === "MetaMask") return -1;
      if (b.name === "Injected" || b.name === "MetaMask") return 1;
      return 0;
    });
  }, [connectors, mobile]);

  // Auto-connect if we're in a wallet browser and not connected
  useEffect(() => {
    if (inWalletBrowser && !isConnected && !isPending && connectors.length > 0) {
      // Find injected or MetaMask connector
      const injectedConnector = connectors.find(
        c => c.name === "Injected" || c.name === "MetaMask"
      );
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [inWalletBrowser, isConnected, isPending, connectors, connect]);

  // Generate deep link for opening in wallet app
  const openInWallet = (walletType: 'metamask' | 'trust') => {
    const currentUrl = encodeURIComponent(window.location.href);
    let deepLink = '';
    
    if (walletType === 'metamask') {
      deepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
    } else if (walletType === 'trust') {
      deepLink = `https://link.trustwallet.com/open_url?coin_id=714&url=${currentUrl}`;
    }
    
    window.location.href = deepLink;
  };

  if (!isConnected) {
    // Show mobile helper on regular mobile browser
    if (mobile && !inWalletBrowser && showMobileHelp) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="gap-2"
              data-testid="button-connect-wallet"
            >
              <Smartphone className="h-4 w-4" />
              Open in Wallet
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Open this page in your wallet app:
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openInWallet('metamask')}
              className="cursor-pointer"
            >
              <span className="font-medium">MetaMask</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openInWallet('trust')}
              className="cursor-pointer"
            >
              <span className="font-medium">Trust Wallet</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowMobileHelp(false)}
              className="cursor-pointer text-xs text-muted-foreground"
            >
              Try connecting anyway
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

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
        <DropdownMenuContent align="end" className="w-64">
          {mobile && !inWalletBrowser && (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50">
                For best experience, open in your wallet app
              </div>
              <DropdownMenuItem
                onClick={() => openInWallet('metamask')}
                className="cursor-pointer"
              >
                <span className="font-medium">Open in MetaMask</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openInWallet('trust')}
                className="cursor-pointer"
              >
                <span className="font-medium">Open in Trust Wallet</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {sortedConnectors.length === 0 ? (
            <div className="px-2 py-3 text-center">
              <p className="text-sm text-muted-foreground">No wallet detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Install MetaMask or another Web3 wallet
              </p>
            </div>
          ) : (
            sortedConnectors.map((connector) => (
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
