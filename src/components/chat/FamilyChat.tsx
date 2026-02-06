import { useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
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
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
              <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation with your family!</p>
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
