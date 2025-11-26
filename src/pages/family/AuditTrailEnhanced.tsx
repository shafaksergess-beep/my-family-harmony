import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, History, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
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

interface AuditLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: {
    before?: any;
    after?: any;
    changes?: string[];
    [key: string]: any;
  };
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AuditTrailEnhanced() {
  const navigate = useNavigate();
  const { familySlug } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [family, setFamily] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showRollback, setShowRollback] = useState(false);

  useEffect(() => {
    fetchFamily();
  }, [familySlug]);

  useEffect(() => {
    if (family) {
      fetchAuditLogs();
    }
  }, [family]);

  const fetchFamily = async () => {
    const { data, error } = await supabase
      .from("families")
      .select("*")
      .eq("slug", familySlug)
      .single();

    if (error) {
      console.error("Error fetching family:", error);
      navigate("/dashboard");
      return;
    }

    setFamily(data);
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`*`)
        .eq("family_id", family.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(d => d.user_id).filter(Boolean))] as string[];
      const profilesData = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] };

      const profilesMap = new Map<string, any>();
      profilesData.data?.forEach(p => profilesMap.set(p.id, p));

      const enrichedData = data?.map(log => ({
        ...log,
        profiles: log.user_id ? profilesMap.get(log.user_id) : null,
      })) || [];

      setAuditLogs(enrichedData as AuditLog[]);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit trail",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedLog || !selectedLog.details?.before) {
      toast({
        title: "Error",
        description: "Cannot rollback: No previous state available",
        variant: "destructive",
      });
      return;
    }

    try {
      const { entity_type, entity_id, details } = selectedLog;
      
      if (!entity_type || !entity_id) {
        throw new Error("Invalid entity information");
      }

      // Perform rollback by restoring the 'before' state
      const { error } = await supabase
        .from(entity_type as any)
        .update(details.before)
        .eq("id", entity_id);

      if (error) throw error;

      // Log the rollback action
      await supabase.from("activity_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        family_id: family.id,
        action_type: "rollback",
        entity_type,
        entity_id,
        details: {
          rolled_back_from: selectedLog.id,
          restored_state: details.before,
        },
      });

      toast({
        title: "Success",
        description: "Successfully rolled back changes",
      });

      setShowRollback(false);
      setSelectedLog(null);
      fetchAuditLogs();
    } catch (error: any) {
      console.error("Error rolling back:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to rollback changes",
        variant: "destructive",
      });
    }
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("create")) return "bg-green-500";
    if (actionType.includes("update")) return "bg-blue-500";
    if (actionType.includes("delete")) return "bg-red-500";
    if (actionType === "rollback") return "bg-purple-500";
    return "bg-gray-500";
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      entityFilter === "all" || log.entity_type === entityFilter;

    return matchesSearch && matchesFilter;
  });

  const entityTypes = Array.from(
    new Set(auditLogs.map((l) => l.entity_type).filter(Boolean))
  ).sort();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/family/${familySlug}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Enhanced Audit Trail</h1>
            <p className="text-muted-foreground">
              Detailed change history with rollback capabilities
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type!}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredLogs.length} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading audit trail...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getActionColor(log.action_type)}>
                              {log.action_type}
                            </Badge>
                            {log.entity_type && (
                              <Badge variant="outline">{log.entity_type}</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium">
                              {log.profiles?.full_name || "System"}
                            </span>
                            {log.profiles?.email && (
                              <span className="text-muted-foreground ml-2">
                                ({log.profiles.email})
                              </span>
                            )}
                          </div>

                          {log.details?.changes && log.details.changes.length > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Changed fields: </span>
                              <span className="font-medium">
                                {log.details.changes.join(", ")}
                              </span>
                            </div>
                          )}

                          {log.details?.before && log.details?.after && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded">
                                <div className="text-xs font-semibold mb-1 text-red-700 dark:text-red-400">
                                  Before
                                </div>
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(log.details.before, null, 2)}
                                </pre>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded">
                                <div className="text-xs font-semibold mb-1 text-green-700 dark:text-green-400">
                                  After
                                </div>
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(log.details.after, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <div className="text-sm text-muted-foreground text-right whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM d, yyyy")}
                            <br />
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </div>
                          
                          {log.details?.before && log.action_type.includes("update") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLog(log);
                                setShowRollback(true);
                              }}
                            >
                              <History className="h-3 w-3 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showRollback} onOpenChange={setShowRollback}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Confirm Rollback
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this change? This will restore the previous state and create a new audit log entry.
              {selectedLog && (
                <div className="mt-4 p-3 bg-muted rounded text-sm">
                  <div className="font-semibold">Action: {selectedLog.action_type}</div>
                  <div>Entity: {selectedLog.entity_type}</div>
                  <div className="mt-2">
                    This will restore the data to its previous state.
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>
              Rollback Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
