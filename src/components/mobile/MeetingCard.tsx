import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Users, QrCode, ChevronRight } from "lucide-react";
import { format, isAfter, isBefore, isToday, parseISO } from "date-fns";
import { haptics } from "@/lib/haptics";

interface MeetingCardProps {
  meeting: {
    id: string;
    meeting_date: string;
    meeting_time: string;
    meeting_type: string;
    location: string | null;
    host_house: string | null;
    is_completed: boolean;
    agenda?: string | null;
    attendeeCount?: number;
  };
  onCheckIn?: (id: string) => void;
  onView?: (id: string) => void;
  userHasCheckedIn?: boolean;
}

export function MeetingCard({ meeting, onCheckIn, onView, userHasCheckedIn }: MeetingCardProps) {
  const meetingDate = parseISO(meeting.meeting_date);
  const isUpcoming = isAfter(meetingDate, new Date()) || isToday(meetingDate);
  const isTodayMeeting = isToday(meetingDate);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "emergency":
        return { label: "Emergency", className: "bg-destructive/10 text-destructive border-destructive/20" };
      case "special":
        return { label: "Special", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
      default:
        return { label: "Regular", className: "bg-primary/10 text-primary border-primary/20" };
    }
  };

  const typeConfig = getTypeConfig(meeting.meeting_type);

  const handleCheckIn = () => {
    haptics.medium();
    onCheckIn?.(meeting.id);
  };

  const handleView = () => {
    haptics.light();
    onView?.(meeting.id);
  };

  return (
    <Card 
      className={`overflow-hidden transition-all ${isTodayMeeting ? "ring-2 ring-primary" : ""}`}
      onClick={handleView}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Date Column */}
          <div className={`w-16 flex flex-col items-center justify-center py-4 ${
            isTodayMeeting ? "bg-primary text-primary-foreground" : 
            isUpcoming ? "bg-primary/10" : "bg-muted"
          }`}>
            <span className={`text-xs uppercase font-medium ${
              isTodayMeeting ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}>
              {format(meetingDate, "MMM")}
            </span>
            <span className={`text-2xl font-bold ${
              isTodayMeeting ? "text-primary-foreground" : "text-foreground"
            }`}>
              {format(meetingDate, "d")}
            </span>
            <span className={`text-xs ${
              isTodayMeeting ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}>
              {format(meetingDate, "EEE")}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={typeConfig.className}>
                    {typeConfig.label}
                  </Badge>
                  {isTodayMeeting && (
                    <Badge className="bg-primary">Today</Badge>
                  )}
                  {meeting.is_completed && (
                    <Badge variant="secondary">Completed</Badge>
                  )}
                </div>
                
                {/* Time & Location */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{meeting.meeting_time}</span>
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{meeting.location}</span>
                    </div>
                  )}
                  {meeting.host_house && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Host: {meeting.host_house}</span>
                    </div>
                  )}
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Check-in button for today's meeting */}
            {isTodayMeeting && !meeting.is_completed && (
              <div className="mt-3 pt-3 border-t border-border">
                {userHasCheckedIn ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <QrCode className="h-4 w-4" />
                    <span>Checked in</span>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckIn();
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Check In Now
                  </Button>
                )}
              </div>
            )}

            {/* Attendee count for past meetings */}
            {meeting.is_completed && meeting.attendeeCount !== undefined && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{meeting.attendeeCount} attended</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
