import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_type: string;
}

interface ChatInputProps {
  onSendMessage: (content: string, meetingId?: string) => void;
  isSending: boolean;
  meetings?: Meeting[];
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  isSending,
  meetings = [],
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isSending) {
      onSendMessage(message, selectedMeeting?.id);
      setMessage('');
      setSelectedMeeting(null);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {selectedMeeting && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
          <Calendar className="h-4 w-4" />
          <span>
            Discussing: {selectedMeeting.meeting_type} on{' '}
            {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2"
            onClick={() => setSelectedMeeting(null)}
          >
            ×
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {meetings.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <ScrollArea className="h-48">
                <div className="p-2">
                  <p className="text-xs text-muted-foreground mb-2 px-2">
                    Link message to meeting
                  </p>
                  {meetings.map((meeting) => (
                    <Button
                      key={meeting.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      <div>
                        <div className="font-medium text-sm capitalize">
                          {meeting.meeting_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(meeting.meeting_date).toLocaleDateString()}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />

        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default ChatInput;
