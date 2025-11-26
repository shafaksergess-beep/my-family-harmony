import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users } from "lucide-react";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  meeting_type: string;
  location: string | null;
  host_house: string | null;
  is_completed: boolean;
}

interface MeetingsCalendarProps {
  meetings: Meeting[];
  onDateSelect?: (date: Date) => void;
}

export const MeetingsCalendar = ({ meetings, onDateSelect }: MeetingsCalendarProps) => {
  const meetingDates = meetings.map(m => new Date(m.meeting_date));
  
  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(m => {
      const meetingDate = new Date(m.meeting_date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const selectedMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            modifiers={{
              meeting: meetingDates,
            }}
            modifiersClassNames={{
              meeting: "bg-primary/20 font-bold",
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? (
              <>Selected Date</>
            ) : (
              <>Upcoming Meetings</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate && selectedMeetings.length > 0 ? (
            <div className="space-y-4">
              {selectedMeetings.map(meeting => (
                <div key={meeting.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={meeting.is_completed ? "secondary" : "default"}>
                      {meeting.is_completed ? "Completed" : "Upcoming"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {meeting.meeting_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {meeting.meeting_time}
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {meeting.location}
                    </div>
                  )}
                  {meeting.host_house && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Host: {meeting.host_house}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <p className="text-center text-muted-foreground py-8">
              No meetings scheduled for this date
            </p>
          ) : (
            <div className="space-y-4">
              {meetings.slice(0, 5).map(meeting => (
                <div key={meeting.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {new Date(meeting.meeting_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {meeting.meeting_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {meeting.meeting_time}
                  </div>
                  {meeting.host_house && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {meeting.host_house}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import * as React from "react";
