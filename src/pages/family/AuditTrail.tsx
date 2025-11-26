import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Filter, Download, Search } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: any;
  changed_by: string;
  changed_by_name: string;
  timestamp: string;
  ip_address?: string;
}

const AuditTrail = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    loadData();
  }, [familySlug]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();

      if (!familyData) {
        navigate("/dashboard");
        return;
      }

      setFamily(familyData);

      // In a real implementation, this would fetch from an audit_trail table
      // For now, we'll generate sample audit entries
      const sampleEntries: AuditEntry[] = [
        {
          id: '1',
          entity_type: 'contribution',
          entity_id: 'c123',
          action: 'created',
          changes: { amount: 25000, status: 'pending' },
          changed_by: session.user.id,
          changed_by_name: 'John Doe',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          entity_type: 'contribution',
          entity_id: 'c123',
          action: 'updated',
          changes: { status: { old: 'pending', new: 'paid' } },
          changed_by: session.user.id,
          changed_by_name: 'Jane Smith',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          entity_type: 'loan',
          entity_id: 'l456',
          action: 'created',
          changes: { amount: 100000, interest_rate: 2.5, term_months: 4 },
          changed_by: session.user.id,
          changed_by_name: 'John Doe',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '4',
          entity_type: 'loan',
          entity_id: 'l456',
          action: 'updated',
          changes: { status: { old: 'pending', new: 'approved' } },
          changed_by: session.user.id,
          changed_by_name: 'Jane Smith',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
        {
          id: '5',
          entity_type: 'savings',
          entity_id: 's789',
          action: 'created',
          changes: { amount: 5000, month: '2025-01' },
          changed_by: session.user.id,
          changed_by_name: 'John Doe',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '6',
          entity_type: 'member',
          entity_id: 'm123',
          action: 'updated',
          changes: { role: { old: 'member', new: 'treasurer' } },
          changed_by: session.user.id,
          changed_by_name: 'Family Head',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
        },
      ];

      setAuditEntries(sampleEntries);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load audit trail",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = auditEntries.filter((entry) => {
    if (filterEntity !== "all" && entry.entity_type !== filterEntity) return false;
    if (filterAction !== "all" && entry.action !== filterAction) return false;
    
    if (dateFrom && new Date(entry.timestamp) < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(entry.timestamp) > endOfDay) return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesId = entry.entity_id.toLowerCase().includes(query);
      const matchesUser = entry.changed_by_name.toLowerCase().includes(query);
      const matchesChanges = JSON.stringify(entry.changes).toLowerCase().includes(query);
      if (!matchesId && !matchesUser && !matchesChanges) return false;
    }
    
    return true;
  });

  const uniqueEntities = [...new Set(auditEntries.map(e => e.entity_type))];
  const uniqueActions = [...new Set(auditEntries.map(e => e.action))];

  const clearFilters = () => {
    setFilterEntity("all");
    setFilterAction("all");
    setSearchQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = filterEntity !== "all" || filterAction !== "all" || 
                          searchQuery !== "" || dateFrom !== undefined || dateTo !== undefined;

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "updated":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "deleted":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Entity Type', 'Entity ID', 'Action', 'Changed By', 'Changes'].join(','),
      ...filteredEntries.map(entry => [
        new Date(entry.timestamp).toLocaleString(),
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.changed_by_name,
        JSON.stringify(entry.changes)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Audit trail exported successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Audit Trail
                </h1>
                <p className="text-sm text-muted-foreground">{family?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {filteredEntries.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by entity ID, user, or changes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Entries */}
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No audit entries</h3>
              <p className="text-muted-foreground">No changes match your filters</p>
            </Card>
          ) : (
            filteredEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getActionColor(entry.action)}>
                          {entry.action}
                        </Badge>
                        <Badge variant="outline">{entry.entity_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {entry.entity_id}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Changed by: {entry.changed_by_name}
                        </p>
                        <div className="text-sm text-muted-foreground">
                          <strong>Changes:</strong>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.changes, null, 2)}
                          </pre>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditTrail;
