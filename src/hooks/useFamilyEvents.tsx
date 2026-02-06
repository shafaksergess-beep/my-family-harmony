import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FamilyEvent {
  id: string;
  family_id: string;
  member_id: string | null;
  created_by: string;
  event_date: string;
  event_time: string | null;
  event_type: 'birthday' | 'anniversary' | 'meeting' | 'custom' | 'reminder';
  title: string;
  description: string | null;
  is_recurring: boolean;
  recurrence_pattern: 'yearly' | 'monthly' | 'weekly' | null;
  reminder_days: number[];
  is_active: boolean;
  created_at: string;
  member?: {
    id: string;
    profiles: {
      full_name: string;
    };
  };
  creator?: {
    id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface CreateEventInput {
  family_id: string;
  created_by: string;
  member_id?: string;
  event_date: string;
  event_time?: string;
  event_type: FamilyEvent['event_type'];
  title: string;
  description?: string;
  is_recurring?: boolean;
  recurrence_pattern?: FamilyEvent['recurrence_pattern'];
  reminder_days?: number[];
}

interface UseFamilyEventsOptions {
  familyId: string;
}

export function useFamilyEvents({ familyId }: UseFamilyEventsOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['family-events', familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_events')
        .select(`
          *,
          member:family_members!family_events_member_id_fkey(
            id,
            profiles(full_name)
          ),
          creator:family_members!family_events_created_by_fkey(
            id,
            profiles(full_name)
          )
        `)
        .eq('family_id', familyId)
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as FamilyEvent[];
    },
    enabled: !!familyId,
  });

  const createEventMutation = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data, error } = await supabase
        .from('family_events')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-events', familyId] });
      toast({
        title: 'Event Created',
        description: 'The event has been added to the calendar.',
      });
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive',
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      updates,
    }: {
      eventId: string;
      updates: Partial<CreateEventInput>;
    }) => {
      const { data, error } = await supabase
        .from('family_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-events', familyId] });
      toast({
        title: 'Event Updated',
        description: 'The event has been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('family_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-events', familyId] });
      toast({
        title: 'Event Deleted',
        description: 'The event has been removed from the calendar.',
      });
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    },
  });

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      return events.filter((event) => {
        if (event.event_date === dateStr) return true;
        
        // Handle recurring events
        if (event.is_recurring && event.recurrence_pattern) {
          const eventDate = new Date(event.event_date);
          
          if (event.recurrence_pattern === 'yearly') {
            return (
              eventDate.getMonth() === date.getMonth() &&
              eventDate.getDate() === date.getDate()
            );
          }
          
          if (event.recurrence_pattern === 'monthly') {
            return eventDate.getDate() === date.getDate();
          }
          
          if (event.recurrence_pattern === 'weekly') {
            return eventDate.getDay() === date.getDay();
          }
        }
        
        return false;
      });
    },
    [events]
  );

  // Get upcoming events
  const getUpcomingEvents = useCallback(
    (days: number = 30) => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      return events.filter((event) => {
        const eventDate = new Date(event.event_date);
        return eventDate >= today && eventDate <= endDate;
      });
    },
    [events]
  );

  return {
    events,
    isLoading,
    refetch,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
    getEventsForDate,
    getUpcomingEvents,
  };
}

export default useFamilyEvents;
