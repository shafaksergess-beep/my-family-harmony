import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FamilyChatbotProps {
  familyId: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/family-chatbot`;

const SUGGESTIONS = [
  "What's my financial summary?",
  "How many shares do I own?",
  "When is the next meeting?",
  "Show my loan status",
  "What's my njangi position?",
];

export function FamilyChatbot({ familyId }: FamilyChatbotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          familyId,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        toast({ title: 'Error', description: err.error || 'Something went wrong', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error('Chatbot error:', e);
      toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [messages, familyId, isLoading, toast]);

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg p-0 md:bottom-6"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] max-h-[500px] flex flex-col bg-card border rounded-xl shadow-2xl md:bottom-6 md:w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Family Insights</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 max-h-[350px] px-3 py-2">
        {messages.length === 0 ? (
          <div className="space-y-2 py-4">
            <p className="text-xs text-muted-foreground text-center mb-3">Ask me about your finances, meetings, njangi…</p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="block w-full text-left text-xs p-2 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors border border-border/30"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your data…"
          className="min-h-[36px] max-h-[80px] text-xs resize-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim() || isLoading} onClick={() => sendMessage(input)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
