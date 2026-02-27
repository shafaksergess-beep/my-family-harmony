import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MessageType = 'text' | 'system' | 'agenda_reference';

interface ChatMessage {
  id: string;
  family_id: string;
  sender_id: string;
  meeting_id: string | null;
  content: string;
  message_type: MessageType;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface UseFamilyChatOptions {
  familyId: string;
  memberId?: string;
}

export function useFamilyChat({ familyId, memberId }: UseFamilyChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!familyId) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:family_members!chat_messages_sender_id_fkey(
            id,
            user_id,
            profiles(full_name, avatar_url)
          )
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as MessageType,
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [familyId, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!familyId) return;

    fetchMessages();

    const channel = supabase
      .channel(`chat-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:family_members!chat_messages_sender_id_fkey(
                id,
                user_id,
                profiles(full_name, avatar_url)
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, {
              ...data,
              message_type: data.message_type as MessageType,
            }]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, ...payload.new }
                : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, fetchMessages]);

  // Send a new message
  const sendMessage = useCallback(
    async (content: string, meetingId?: string) => {
      if (!familyId || !memberId || !content.trim()) return;

      setIsSending(true);
      try {
        const { error } = await supabase.from('chat_messages').insert({
          family_id: familyId,
          sender_id: memberId,
          content: content.trim(),
          message_type: meetingId ? 'agenda_reference' : 'text',
          meeting_id: meetingId || null,
        });

        if (error) throw error;

        // Trigger notification
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.functions.invoke('send-notification', {
            body: {
              familyId,
              type: 'chat_message',
              title: 'New Family Message',
              message: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
              data: { senderId: user.id }
            }
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive',
        });
      } finally {
        setIsSending(false);
      }
    },
    [familyId, memberId, toast]
  );

  // Edit a message
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({
            content: newContent.trim(),
            is_edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq('id', messageId);

        if (error) throw error;
      } catch (error) {
        console.error('Error editing message:', error);
        toast({
          title: 'Error',
          description: 'Failed to edit message',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting message:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete message',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
}

export default useFamilyChat;
