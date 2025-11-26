import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckSquare, Mail, Download, Trash2, UserPlus } from "lucide-react";

interface BulkActionsMenuProps {
  selectedIds: string[];
  onActionComplete: () => void;
  entityType: "members" | "contributions" | "loans";
  familyId?: string;
}

const BulkActionsMenu = ({
  selectedIds,
  onActionComplete,
  entityType,
  familyId,
}: BulkActionsMenuProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBulkDelete = async () => {
    try {
      setLoading(true);

      let error;
      if (entityType === "members") {
        const result = await supabase
          .from("family_members")
          .delete()
          .in("id", selectedIds);
        error = result.error;
      } else if (entityType === "contributions") {
        const result = await supabase
          .from("contributions")
          .delete()
          .in("id", selectedIds);
        error = result.error;
      } else if (entityType === "loans") {
        const result = await supabase
          .from("loans")
          .delete()
          .in("id", selectedIds);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.length} ${entityType} deleted successfully`,
      });

      onActionComplete();
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEmail = async () => {
    try {
      setLoading(true);

      // Get email addresses for selected members
      const { data: members, error } = await supabase
        .from("family_members")
        .select("profiles!inner(email, full_name)")
        .in("id", selectedIds);

      if (error) throw error;

      const emails = members
        .map((m: any) => m.profiles?.email)
        .filter((email): email is string => Boolean(email));

      if (emails.length === 0) {
        toast({
          title: "No Emails",
          description: "No email addresses found for selected members",
          variant: "destructive",
        });
        return;
      }

      // Send bulk notification
      const { error: emailError } = await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            to: emails,
            subject: "Important Family Update",
            message: "You have been selected for an important family notification.",
            type: "general",
          },
        }
      );

      if (emailError) throw emailError;

      toast({
        title: "Success",
        description: `Email sent to ${emails.length} members`,
      });

      onActionComplete();
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    toast({
      title: "Export Started",
      description: `Exporting ${selectedIds.length} selected items...`,
    });
    // Export logic is handled by parent component
    onActionComplete();
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <CheckSquare className="h-4 w-4 mr-2" />
            Bulk Actions ({selectedIds.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {entityType === "members" && (
            <>
              <DropdownMenuItem onClick={handleBulkEmail} disabled={loading}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email to Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleBulkExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} {entityType}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsMenu;
