import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Bot, Send, Loader2, Minimize2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

export function SmartAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="fixed bottom-20 md:bottom-8 left-4 z-50 flex flex-col items-start" dir="rtl">
      {isOpen && (
        <div className="mb-4 bg-background border shadow-2xl rounded-2xl w-[90vw] md:w-[380px] h-[500px] max-h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-primary text-primary-foreground p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-full">
                <Bot className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">المساعد الذكي</h3>
                <p className="text-[11px] text-primary-foreground/80">مدعوم بـ Gemini AI</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-md transition-colors">
              <Minimize2 className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-60">
                <Sparkles className="size-10 mb-2 text-primary/40" />
                <p className="text-sm">كيف يمكنني مساعدتك في إدارة أموالك اليوم؟</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">جاري التفكير...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-muted/30 border-t flex items-center gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="اسأل المساعد الذكي..."
              className="flex-1 bg-background"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full size-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="size-14 bg-gradient-primary text-primary-foreground rounded-full shadow-elevated flex items-center justify-center hover:scale-105 transition-transform animate-in zoom-in group"
        >
          <Bot className="size-6 group-hover:animate-bounce" />
        </button>
      )}
    </div>
  );
}
