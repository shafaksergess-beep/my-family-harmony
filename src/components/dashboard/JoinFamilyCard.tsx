import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, QrCode, Hash, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const JoinFamilyCard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);

  const handleCodeSubmit = async () => {
    if (!code || code.length < 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid reference code",
        variant: "destructive",
      });
      return;
    }

    setValidating(true);

    try {
      // Validate the code exists
      const { data: invitation, error } = await supabase
        .from("invitations")
        .select("id, family_id, families:family_id(slug)")
        .eq("reference_code", code.toUpperCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !invitation) {
        toast({
          title: "Invalid code",
          description: "This code is invalid or has expired",
          variant: "destructive",
        });
        return;
      }

      // Navigate to join page with code
      setOpen(false);
      navigate(`/join?code=${code.toUpperCase()}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate code",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <UserPlus className="w-5 h-5" />
          Join a Family
        </CardTitle>
        <CardDescription>
          Use an invitation code to join an existing family
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Hash className="w-4 h-4" />
              Enter Invitation Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join a Family</DialogTitle>
              <DialogDescription>
                Enter the invitation code shared by your family member
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  placeholder="e.g., ABC12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  maxLength={8}
                  className="text-center text-xl tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground text-center">
                  The code is 8 characters (letters and numbers)
                </p>
              </div>

              <Button 
                onClick={handleCodeSubmit}
                disabled={code.length < 6 || validating}
                className="w-full"
              >
                {validating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => {
                  setOpen(false);
                  navigate("/join");
                }}
              >
                <QrCode className="w-4 h-4" />
                Scan QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
