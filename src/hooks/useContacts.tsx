import { useState, useCallback } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { usePlatform } from './usePlatform';
import { toast } from './use-toast';

interface ParsedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export function useContacts() {
  const { isNative } = usePlatform();
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      toast({
        title: "Not Available",
        description: "Contacts access is only available in the mobile app",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permResult = await Contacts.requestPermissions();
      const granted = permResult.contacts === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        toast({
          title: "Permission Denied",
          description: "Please enable contacts access in your device settings",
          variant: "destructive",
        });
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }, [isNative]);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const permResult = await Contacts.checkPermissions();
      const granted = permResult.contacts === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  }, [isNative]);

  const loadContacts = useCallback(async (): Promise<ParsedContact[]> => {
    if (!isNative) {
      return [];
    }

    setLoading(true);
    try {
      // Check/request permission first
      let granted = await checkPermission();
      if (!granted) {
        granted = await requestPermission();
      }

      if (!granted) {
        setLoading(false);
        return [];
      }

      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        },
      });

      const parsedContacts: ParsedContact[] = result.contacts
        .filter(contact => contact.name?.display || contact.phones?.length || contact.emails?.length)
        .map(contact => ({
          id: contact.contactId || crypto.randomUUID(),
          name: contact.name?.display || 'Unknown',
          email: contact.emails?.[0]?.address,
          phone: contact.phones?.[0]?.number,
        }))
        .filter(c => c.email || c.phone); // Only include contacts with email or phone

      setContacts(parsedContacts);
      return parsedContacts;
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [isNative, checkPermission, requestPermission]);

  const searchContacts = useCallback((query: string): ParsedContact[] => {
    if (!query) return contacts;
    
    const lowerQuery = query.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.email?.toLowerCase().includes(lowerQuery) ||
      contact.phone?.includes(query)
    );
  }, [contacts]);

  return {
    contacts,
    loading,
    hasPermission,
    isAvailable: isNative,
    loadContacts,
    searchContacts,
    requestPermission,
    checkPermission,
  };
}
