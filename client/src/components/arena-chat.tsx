import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  senderName: string;
  senderAddress?: string | null;
  message: string;
  createdAt: string;
}

interface ArenaChatProps {
  scopeType: "lobby" | "duel";
  scopeId?: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
}

export function ArenaChat({ scopeType, scopeId, className = "", maxHeight = "280px", compact = false }: ArenaChatProps) {
  const { agent } = useAuth();
  const { address } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: historyData } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ["/api/arena-chat", `?scopeType=${scopeType}${scopeId ? `&scopeId=${scopeId}` : ""}&limit=50`],
  });

  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages);
    }
  }, [historyData]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/arena-chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      const token = localStorage.getItem("honeycomb_jwt");
      ws.send(JSON.stringify({
        type: "join",
        scopeType,
        scopeId,
        token: token || undefined,
        senderName: agent?.name || `Anon-${(address || "").slice(-4) || Math.random().toString(36).slice(2, 6)}`,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages(prev => [...prev.slice(-99), {
            id: data.id,
            senderName: data.senderName,
            senderAddress: data.senderAddress,
            message: data.message,
            createdAt: data.createdAt,
          }]);
        } else if (data.type === "presence") {
          setOnlineCount(data.count);
        } else if (data.type === "error") {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            senderName: "System",
            message: data.message,
            createdAt: new Date().toISOString(),
          }]);
        }
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [scopeType, scopeId, agent?.name, agent?.id, address]);

  const sendMessage = () => {
    const msg = input.trim();
    if (!msg || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", message: msg }));
    setInput("");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getNameColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ["#f0b90b", "#0ecb81", "#3b82f6", "#a855f7", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`flex flex-col ${className}`} style={{ background: "#0d1117" }}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b" style={{ borderColor: "#1e2329" }}>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" style={{ color: "#f0b90b" }} />
          <span className="text-xs font-bold text-white">
            {scopeType === "duel" ? "Duel Chat" : "Lobby Chat"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? "#0ecb81" : "#ea3943" }} />
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground" data-testid="text-chat-online">{onlineCount}</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5"
        style={{ maxHeight, minHeight: compact ? "120px" : "180px" }}
        data-testid="container-chat-messages"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[11px] text-muted-foreground">No messages yet. Say something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-1 py-0.5 text-[12px] leading-snug" data-testid={`row-chat-msg-${msg.id}`}>
              <span className="text-[10px] text-muted-foreground shrink-0 mt-px" data-testid={`text-chat-time-${msg.id}`}>
                {formatTime(msg.createdAt)}
              </span>
              <span className="font-bold shrink-0" style={{ color: getNameColor(msg.senderName) }} data-testid={`text-chat-sender-${msg.id}`}>
                {msg.senderName}:
              </span>
              <span className="text-white break-all" data-testid={`text-chat-msg-${msg.id}`}>{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1.5 border-t" style={{ borderColor: "#1e2329" }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          disabled={!isConnected}
          className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 px-1.5"
          style={{ color: "#eaecef" }}
          maxLength={500}
          data-testid="input-chat-message"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={sendMessage}
          disabled={!input.trim() || !isConnected}
          className="h-7 w-7 shrink-0"
          data-testid="button-chat-send"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
