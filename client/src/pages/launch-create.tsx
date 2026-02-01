import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Rocket, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useCreateToken, useTokenFactoryAddress } from "@/contracts/hooks";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { HoneycombTokenFactoryABI } from "@/contracts/abis";

const createTokenSchema = z.object({
  name: z.string().min(1, "Name is required").max(32, "Name too long"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol too long").toUpperCase(),
  description: z.string().max(500, "Description too long").optional(),
  imageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
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
  
  const [step, setStep] = useState<"form" | "creating" | "recording">("form");
  const [metadataCID, setMetadataCID] = useState<string>("");
  const [formData, setFormData] = useState<CreateTokenForm | null>(null);
  
  const { createToken, isPending: isCreating, isSuccess: txSuccess, hash, error: txError } = useCreateToken();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: txReceipt } = useWaitForTransactionReceipt({ hash });

  const form = useForm<CreateTokenForm>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      imageUrl: "",
      website: "",
      twitter: "",
      telegram: "",
    },
  });

  const storeMutation = useMutation({
    mutationFn: async (data: CreateTokenForm) => {
      const res = await apiRequest("POST", "/api/launch/storage/token-metadata", {
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        description: data.description || "",
        imageUrl: data.imageUrl || "",
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
        imageUrl: data.formData.imageUrl || "",
        creatorBeeId: agent?.id,
      });
      return (res as Response).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/launch/tokens"] });
    },
  });

  const onSubmit = async (data: CreateTokenForm) => {
    if (!address || !factoryAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to launch a token.",
        variant: "destructive",
      });
      return;
    }

    try {
      setStep("creating");
      setFormData(data);
      
      const metaResult = await storeMutation.mutateAsync(data);
      setMetadataCID(metaResult.metadataCID);
      
      const beeId = agent?.id ? BigInt(agent.id.split("-")[0] || "0") : BigInt(0);
      createToken(data.name, data.symbol.toUpperCase(), metaResult.metadataCID, beeId);
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

  const isPending = step !== "form" || storeMutation.isPending || isCreating || isConfirming;

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

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/logo.png"
                        {...field}
                        disabled={isPending}
                        data-testid="input-image"
                      />
                    </FormControl>
                    <FormDescription>Optional, URL to your token logo</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    {step === "creating" ? "Creating Token..." : 
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
