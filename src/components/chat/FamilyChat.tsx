import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useFamilyChat } from '@/hooks/useFamilyChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface FamilyChatProps {
  familyId: string;
  memberId: string;
  currentUserId: string;
  meetings?: Array<{
    id: string;
    meeting_date: string;
    meeting_type: string;
  }>;
  className?: string;
}

export function FamilyChat({
  familyId,
  memberId,
  currentUserId,
  meetings = [],
  className,
}: FamilyChatProps) {
  const {
    messages,
    isLoading,
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useFamilyChat({ familyId, memberId });

  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [isFetchingIcebreakers, setIsFetchingIcebreakers] = useState(false);

  const fetchIcebreakers = useCallback(async () => {
    setIsFetchingIcebreakers(true);
    try {
      const { data, error } = await supabase.functions.invoke('vibe-starter', {
        body: { familyId },
      });
      if (error) throw error;
      setIcebreakers(data.icebreakers || []);
    } catch (error) {
      console.error('Failed to fetch icebreakers:', error);
    } finally {
      setIsFetchingIcebreakers(false);
    }
  }, [familyId]);

  useEffect(() => {
    if (messages.length === 0 && !isLoading && icebreakers.length === 0) {
      fetchIcebreakers();
    }
  }, [messages.length, isLoading, icebreakers.length, fetchIcebreakers]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Family Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Family Chat
          {messages.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({messages.length} messages)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-[400px] px-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-muted/20 rounded-lg">
              <MessageCircle className="h-12 w-12 mb-4 text-primary opacity-50" />
              <p className="text-lg font-semibold text-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mb-8">Start the conversation with your family!</p>
              
              <div className="w-full max-w-md space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Vibe-Starters</span>
                </div>
                
                {isFetchingIcebreakers ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : icebreakers.length > 0 ? (
                  <div className="grid gap-2">
                    {icebreakers.map((icebreaker, idx) => (
                      <button
                        key={idx}
                        className="text-left p-3 text-sm bg-card hover:bg-primary/5 border rounded-lg transition-colors border-border/50 hover:border-primary/20 shadow-sm"
                        onClick={() => sendMessage(icebreaker)}
                      >
                        {icebreaker}
                      </button>
                    ))}
                    <button 
                      onClick={fetchIcebreakers}
                      className="text-xs text-primary hover:underline pt-2 inline-flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Refresh suggestions
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No suggestions available right now.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => {
                const sender = message.sender;
                const senderName = sender?.profiles?.full_name || 'Unknown';
                const senderAvatar = sender?.profiles?.avatar_url;
                const isOwnMessage = sender?.user_id === currentUserId;

                return (
                  <ChatMessage
                    key={message.id}
                    id={message.id}
                    content={message.content}
                    senderName={senderName}
                    senderAvatar={senderAvatar}
                    isOwnMessage={isOwnMessage}
                    isEdited={message.is_edited}
                    createdAt={message.created_at}
                    messageType={message.message_type}
                    onEdit={isOwnMessage ? editMessage : undefined}
                    onDelete={isOwnMessage ? deleteMessage : undefined}
                  />
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <ChatInput
          onSendMessage={sendMessage}
          isSending={isSending}
          meetings={meetings}
          placeholder="Type a message to your family..."
        />
      </CardContent>
    </Card>
  );
}

export default FamilyChat;
