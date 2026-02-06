import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import {
  Plus,
  CalendarDays,
  Gift,
  Heart,
  Calendar as CalendarIcon,
  Bell,
  Tag,
  Trash2,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFamilyEvents, FamilyEvent } from '@/hooks/useFamilyEvents';
import { EventForm } from './EventForm';

interface Member {
  id: string;
  profiles: {
    full_name: string;
  };
}

interface FamilyCalendarProps {
  familyId: string;
  memberId: string;
  members?: Member[];
  meetings?: Array<{
    id: string;
    meeting_date: string;
    meeting_type: string;
    meeting_time: string;
    host_house: string | null;
  }>;
  className?: string;
}

const eventTypeIcons = {
  birthday: Gift,
  anniversary: Heart,
  meeting: CalendarDays,
  reminder: Bell,
  custom: Tag,
};

const eventTypeColors = {
  birthday: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  anniversary: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  reminder: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  custom: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function FamilyCalendar({
  familyId,
  memberId,
  members = [],
  meetings = [],
  className,
}: FamilyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    events,
    isLoading,
    createEvent,
    deleteEvent,
    isCreating,
    isDeleting,
    getEventsForDate,
    getUpcomingEvents,
  } = useFamilyEvents({ familyId });

  // Combine events with meetings for the calendar
  const allEventDates = [
    ...events.map((e) => new Date(e.event_date)),
    ...meetings.map((m) => new Date(m.meeting_date)),
  ];

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedDateMeetings = selectedDate
    ? meetings.filter((m) => isSameDay(new Date(m.meeting_date), selectedDate))
    : [];

  const upcomingEvents = getUpcomingEvents(14);

  const handleCreateEvent = (values: any) => {
    createEvent({
      family_id: familyId,
      created_by: memberId,
      title: values.title,
      event_date: format(values.event_date, 'yyyy-MM-dd'),
      event_time: values.event_time || null,
      event_type: values.event_type,
      description: values.description || null,
      member_id: values.member_id || null,
      is_recurring: values.is_recurring,
      recurrence_pattern: values.is_recurring ? values.recurrence_pattern : null,
      reminder_days: values.reminder_days,
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className={className}>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Family Calendar
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                </DialogHeader>
                <EventForm
                  members={members}
                  onSubmit={handleCreateEvent}
                  isSubmitting={isCreating}
                  defaultValues={
                    selectedDate ? { event_date: selectedDate } : undefined
                  }
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                hasEvent: allEventDates,
              }}
              modifiersClassNames={{
                hasEvent: 'bg-primary/20 font-bold',
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate
                ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {selectedDateEvents.length === 0 && selectedDateMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                  <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>No events on this date</p>
                  <Button
                    variant="link"
                    onClick={() => setIsAddDialogOpen(true)}
                    className="mt-2"
                  >
                    Add an event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Meetings */}
                  {selectedDateMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="p-2 rounded-full bg-primary/10">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">
                          {meeting.meeting_type} Meeting
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {meeting.meeting_time}
                          {meeting.host_house && ` • ${meeting.host_house}`}
                        </p>
                      </div>
                      <Badge variant="outline">Meeting</Badge>
                    </div>
                  ))}

                  {/* Events */}
                  {selectedDateEvents.map((event) => {
                    const Icon = eventTypeIcons[event.event_type];
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div
                          className={`p-2 rounded-full ${
                            eventTypeColors[event.event_type]
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{event.title}</p>
                          {event.event_time && (
                            <p className="text-sm text-muted-foreground">
                              {event.event_time}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                          {event.is_recurring && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Repeats {event.recurrence_pattern}
                            </Badge>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Event</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{event.title}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteEvent(event.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Upcoming Events (Next 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingEvents.slice(0, 6).map((event) => {
                const Icon = eventTypeIcons[event.event_type];
                const daysUntil = Math.ceil(
                  (new Date(event.event_date).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="p-2 rounded-full bg-accent">
                      <Icon className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {daysUntil === 0
                          ? 'Today'
                          : daysUntil === 1
                          ? 'Tomorrow'
                          : `In ${daysUntil} days`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FamilyCalendar;
