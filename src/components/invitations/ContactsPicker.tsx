import { useState, useEffect } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Users, Phone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ContactsPickerProps {
  onSelectContacts: (contacts: { name: string; email?: string; phone?: string }[]) => void;
  disabled?: boolean;
}

export function ContactsPicker({ onSelectContacts, disabled }: ContactsPickerProps) {
  const { contacts, loading, isAvailable, loadContacts, searchContacts } = useContacts();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && isAvailable && contacts.length === 0) {
      loadContacts();
    }
  }, [open, isAvailable, contacts.length, loadContacts]);

  const filteredContacts = searchContacts(searchQuery);

  const toggleContact = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selected = contacts
      .filter(c => selectedIds.has(c.id))
      .map(c => ({ name: c.name, email: c.email, phone: c.phone }));
    onSelectContacts(selected);
    setOpen(false);
    setSelectedIds(new Set());
    setSearchQuery('');
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="gap-2">
          <Users className="w-4 h-4" />
          From Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Contacts</DialogTitle>
          <DialogDescription>
            Choose contacts to invite to your family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedIds).map(id => {
                const contact = contacts.find(c => c.id === id);
                return contact ? (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {contact.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No contacts found' : 'No contacts with email or phone'}
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleContact(contact.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {contact.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Invite {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
