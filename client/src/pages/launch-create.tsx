import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Rocket, ArrowLeft, AlertCircle, Upload, X, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { useCreateToken, useTokenFactoryAddress } from "@/contracts/hooks";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { HoneycombTokenFactoryABI } from "@/contracts/abis";

const createTokenSchema = z.object({
  name: z.string().min(1, "Name is required").max(32, "Name too long"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol too long").toUpperCase(),
  description: z.string().max(500, "Description too long").optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitter: z.string().optional().or(z.literal("")),
  telegram: z.string().optional().or(z.literal("")),
});

type CreateTokenForm = z.infer<typeof createTokenSchema>;

export default function LaunchCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, agent } = useAuth();
  const { address } = useAccount();
  const factoryAddress = useTokenFactoryAddress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"form" | "creating" | "recording">("form");
  const [metadataCID, setMetadataCID] = useState<string>("");
  const [formData, setFormData] = useState<CreateTokenForm | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  const { createToken, isPending: isCreating, isSuccess: txSuccess, hash, error: txError } = useCreateToken();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: txReceipt } = useWaitForTransactionReceipt({ hash });

  const form = useForm<CreateTokenForm>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      website: "",
      twitter: "",
      telegram: "",
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setUploadedLogoUrl(data.url);
      toast({ title: "Logo uploaded!" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      setLogoFile(null);
      setLogoPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setUploadedLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const storeMutation = useMutation({
    mutationFn: async (data: CreateTokenForm) => {
      const res = await apiRequest("POST", "/api/launch/storage/token-metadata", {
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        description: data.description || "",
        imageUrl: uploadedLogoUrl || "",
        links: {
          website: data.website || undefined,
          twitter: data.twitter || undefined,
          telegram: data.telegram || undefined,
        },
        creatorBeeId: agent?.id,
      });
      return (res as Response).json();
    },
  });

  const recordMutation = useMutation({
    mutationFn: async (data: { tokenAddress: string; formData: CreateTokenForm }) => {
      const res = await apiRequest("POST", "/api/launch/tokens", {
        tokenAddress: data.tokenAddress,
        name: data.formData.name,
        symbol: data.formData.symbol.toUpperCase(),
        metadataCID,
        description: data.formData.description || "",
        imageUrl: uploadedLogoUrl || "",
        creatorBeeId: agent?.id,
      });
      return (res as Response).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/launch/tokens"] });
    },
  });

  const onSubmit = async (data: CreateTokenForm) => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to launch a token.",
        variant: "destructive",
      });
      return;
    }

    const contractsDeployed = factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000";

    try {
      setStep("creating");
      setFormData(data);
      
      const metaResult = await storeMutation.mutateAsync(data);
      setMetadataCID(metaResult.metadataCID);
      
      if (contractsDeployed) {
        // On-chain token creation
        const beeId = agent?.id ? BigInt(agent.id.split("-")[0] || "0") : BigInt(0);
        createToken(data.name, data.symbol.toUpperCase(), metaResult.metadataCID, beeId);
      } else {
        // Demo mode: create token in database without on-chain contract
        const demoTokenAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`;
        
        await recordMutation.mutateAsync({
          tokenAddress: demoTokenAddress,
          formData: data,
        });
        
        toast({
          title: "Token launched (Demo Mode)",
          description: "Smart contracts are not deployed yet. Token created in demo mode for testing.",
        });
        
        navigate(`/launch/${demoTokenAddress}`);
      }
    } catch (error) {
      console.error("Error creating token:", error);
      setStep("form");
      setFormData(null);
      toast({
        title: "Error",
        description: "Failed to prepare token creation. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (txError) {
      setStep("form");
      toast({
        title: "Transaction failed",
        description: txError.message || "Failed to create token on-chain.",
        variant: "destructive",
      });
    }
  }, [txError, toast]);

  useEffect(() => {
    const recordToken = async () => {
      if (isConfirmed && hash && txReceipt && formData && metadataCID) {
        try {
          setStep("recording");
          
          let tokenAddress: string | null = null;
          for (const log of txReceipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: HoneycombTokenFactoryABI,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === "TokenCreated") {
                const args = decoded.args as { token: string; creator: string; name: string; symbol: string };
                tokenAddress = args.token;
                break;
              }
            } catch {
            }
          }
          
          if (tokenAddress) {
            await recordMutation.mutateAsync({
              tokenAddress,
              formData,
            });
            
            toast({
              title: "Token launched!",
              description: "Your token has been created and is now tradable.",
            });
            
            navigate(`/launch/${tokenAddress}`);
          } else {
            toast({
              title: "Token launched!",
              description: "Your token has been created on the blockchain.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/launch/tokens"] });
            navigate("/launch");
          }
        } catch (error) {
          console.error("Error recording token:", error);
          toast({
            title: "Token launched!",
            description: "Your token was created but recording failed. Check launchpad.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/launch/tokens"] });
          navigate("/launch");
        }
      }
    };
    
    recordToken();
  }, [isConfirmed, hash, txReceipt, formData, metadataCID, navigate, toast, recordMutation]);

  if (!isAuthenticated || !agent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold">Authentication Required</h3>
              <p className="text-muted-foreground mb-4">
                You need to be registered as a Bee to launch a token.
              </p>
            </div>
            <Link href="/register">
              <Button>Register as Bee</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = step !== "form" || storeMutation.isPending || isCreating || isConfirming || isUploading;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/launch">
        <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Launchpad
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Launch New Token
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Honeycomb Token"
                          {...field}
                          disabled={isPending}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="HONEY"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          disabled={isPending}
                          data-testid="input-symbol"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell the world about your token..."
                        rows={3}
                        {...field}
                        disabled={isPending}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>Optional, max 500 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Token Logo</FormLabel>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isPending}
                    data-testid="input-logo-file"
                  />
                  
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 rounded-lg">
                        <AvatarImage src={logoPreview} alt="Token logo" className="object-cover" />
                        <AvatarFallback className="rounded-lg">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">{logoFile?.name}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isPending}
                            data-testid="button-change-logo"
                          >
                            Change
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeLogo}
                            disabled={isPending}
                            data-testid="button-remove-logo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {isUploading && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending}
                      className="w-full h-24 border-dashed"
                      data-testid="button-upload-logo"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload logo</span>
                      </div>
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Optional, max 5MB. Recommended: square image, 256x256px or larger.
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 text-muted-foreground">Social Links (Optional)</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://"
                            {...field}
                            disabled={isPending}
                            data-testid="input-website"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@handle"
                            {...field}
                            disabled={isPending}
                            data-testid="input-twitter"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telegram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telegram</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="t.me/group"
                            {...field}
                            disabled={isPending}
                            data-testid="input-telegram"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {(!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-md text-sm">
                  <p className="font-medium mb-1 text-amber-600 dark:text-amber-400">Demo Mode Active</p>
                  <p className="text-muted-foreground">
                    Smart contracts are not yet deployed on this network. Tokens will be created in demo mode for testing purposes only.
                  </p>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-md text-sm">
                <p className="font-medium mb-2">Token Launch Details:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Total Supply: 1,000,000,000 tokens</li>
                  <li>Trading starts immediately via bonding curve</li>
                  <li>1% fee on all trades</li>
                  <li>Graduates to DEX at 10 BNB raised</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isPending}
                data-testid="button-submit"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isUploading ? "Uploading..." :
                     step === "creating" ? "Creating Token..." : 
                     isConfirming ? "Confirming..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Launch Token
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
