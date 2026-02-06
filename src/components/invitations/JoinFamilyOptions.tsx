import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Users, Hash, Search, Mail, ArrowRight, Loader2, 
  CheckCircle, AlertCircle, QrCode
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JoinFamilyOptionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinFamilyOptions = ({ open, onOpenChange }: JoinFamilyOptionsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactInfo, setContactInfo] = useState({ email: "", phone: "" });
  const [validating, setValidating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);

  const handleCodeSubmit = () => {
    if (code.length >= 6) {
      onOpenChange(false);
      navigate(`/join/family?code=${code.toUpperCase()}`);
    }
  };

  const validateCode = async (value: string) => {
    if (value.length < 6) {
      setCodeValid(null);
      return;
    }

    setValidating(true);
    try {
      const { data } = await supabase
        .from("invitations")
        .select("id, families:family_id(name)")
        .eq("reference_code", value.toUpperCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      setCodeValid(!!data);
    } catch {
      setCodeValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSearchFamilies = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data } = await supabase
        .from("families")
        .select("id, name, slug, description, logo_url")
        .ilike("name", `%${searchQuery}%`)
        .eq("is_active", true)
        .limit(5);

      setSearchResults(data || []);
      
      if (!data?.length) {
        toast({
          title: "No families found",
          description: "Try a different search term or use an invitation code",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleRequestByContact = async () => {
    if (!contactInfo.email && !contactInfo.phone) {
      toast({
        title: "Contact info required",
        description: "Please enter your email or phone number",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request sent",
      description: "Family admins will reach out if they recognize your contact info",
    });
    
    setContactInfo({ email: "", phone: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Join a Family
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to join a family group
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="code" className="gap-1">
              <Hash className="w-3 h-3" />
              Code
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1">
              <Search className="w-3 h-3" />
              Search
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1">
              <Mail className="w-3 h-3" />
              Contact
            </TabsTrigger>
          </TabsList>

          {/* Enter Code Tab */}
          <TabsContent value="code" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="inviteCode">Invitation Code</Label>
              <div className="relative mt-1.5">
                <Input
                  id="inviteCode"
                  placeholder="ABC12345"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setCode(value);
                    validateCode(value);
                  }}
                  maxLength={8}
                  className={`text-center text-lg tracking-widest font-mono pr-10 ${
                    codeValid === true ? "border-green-500" : 
                    codeValid === false ? "border-red-500" : ""
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {codeValid === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {codeValid === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {codeValid === false && (
                <p className="text-xs text-destructive mt-1">Invalid or expired code</p>
              )}
            </div>
            
            <Button 
              onClick={handleCodeSubmit}
              disabled={code.length < 6 || codeValid === false}
              className="w-full"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Continue with Code
            </Button>

            <div className="text-center">
              <Button variant="ghost" size="sm" className="gap-2">
                <QrCode className="w-4 h-4" />
                Scan QR Code
              </Button>
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="searchFamily">Family Name</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="searchFamily"
                  placeholder="Search family..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchFamilies()}
                />
                <Button onClick={handleSearchFamilies} disabled={searching}>
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((family) => (
                  <Card 
                    key={family.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/join/${family.slug}`);
                    }}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {family.logo_url ? (
                          <img src={family.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{family.name}</p>
                        {family.description && (
                          <p className="text-xs text-muted-foreground truncate">{family.description}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Note: Some families may not be publicly searchable
            </p>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              If a family member knows your contact info, they can invite you directly.
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+237 6XX XXX XXX"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Button onClick={handleRequestByContact} className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Notify Me When Invited
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
