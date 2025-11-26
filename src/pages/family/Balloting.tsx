import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Shuffle, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Member {
  id: string;
  profiles: {
    full_name: string;
  } | null;
}

interface BalloatingAssignment {
  id: string;
  year: number;
  assignment_type: string;
  assignments: { month: number; member_id: string; member_name: string }[];
  balloted_at: string;
}

const Balloting = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, userId, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [hostingAssignments, setHostingAssignments] = useState<BalloatingAssignment | null>(null);
  const [njangiAssignments, setNjangiAssignments] = useState<BalloatingAssignment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [assignmentType, setAssignmentType] = useState<"hosting" | "njangi">("hosting");

  useEffect(() => {
    if (family) {
      loadData();
    }
  }, [family, selectedYear]);

  const loadData = async () => {
    if (!family) return;

    try {
      // Fetch members
      const { data: membersData } = await supabase
        .from("family_members")
        .select("id, profiles(full_name)")
        .eq("family_id", family.id);

      setMembers((membersData as any) || []);

      // Fetch hosting assignments
      const { data: hostingData } = await supabase
        .from("balloting_assignments")
        .select("*")
        .eq("family_id", family.id)
        .eq("year", selectedYear)
        .eq("assignment_type", "hosting")
        .maybeSingle();

      setHostingAssignments(hostingData as any);

      // Fetch njangi assignments
      const { data: njangiData } = await supabase
        .from("balloting_assignments")
        .select("*")
        .eq("family_id", family.id)
        .eq("year", selectedYear)
        .eq("assignment_type", "njangi")
        .maybeSingle();

      setNjangiAssignments(njangiData as any);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleBalloting = async () => {
    if (!family || !userId) return;

    try {
      const shuffledMembers = shuffleArray(members);
      const assignments = [];

      // Assign members to months (12 months, cycling through members if needed)
      for (let month = 1; month <= 12; month++) {
        const memberIndex = (month - 1) % shuffledMembers.length;
        const member = shuffledMembers[memberIndex];
        assignments.push({
          month,
          member_id: member.id,
          member_name: member.profiles?.full_name || "Unknown",
        });
      }

      // Check if assignment already exists
      const existingAssignment = assignmentType === "hosting" ? hostingAssignments : njangiAssignments;

      if (existingAssignment) {
        const { error } = await supabase
          .from("balloting_assignments")
          .update({
            assignments,
            balloted_at: new Date().toISOString(),
            balloted_by: userId,
          })
          .eq("id", existingAssignment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("balloting_assignments")
          .insert({
            family_id: family.id,
            year: selectedYear,
            assignment_type: assignmentType,
            assignments,
            balloted_by: userId,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${assignmentType === "hosting" ? "Hosting" : "Njangi"} schedule created successfully`,
      });

      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error creating balloting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create balloting",
        variant: "destructive",
      });
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (authLoading || loading) {
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
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{family?.name} - Balloting</h1>
                <p className="text-sm text-muted-foreground">Hosting and Njangi schedule assignments</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {isFamilyHead && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Shuffle className="w-4 h-4 mr-2" />
                      Run Balloting
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Run Balloting for {selectedYear}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Assignment Type</Label>
                        <Select value={assignmentType} onValueChange={(value: any) => setAssignmentType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hosting">Hosting Schedule</SelectItem>
                            <SelectItem value="njangi">Njangi Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This will randomly assign members to months for {assignmentType === "hosting" ? "hosting meetings" : "njangi payouts"}.
                        Members will be cycled through if there are more months than members.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleBalloting}>
                          <Shuffle className="w-4 h-4 mr-2" />
                          Run Balloting
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hosting Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Hosting Schedule {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hostingAssignments ? (
                <div className="space-y-2">
                  {hostingAssignments.assignments.map((assignment: any) => (
                    <div key={assignment.month} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">{monthNames[assignment.month - 1]}</span>
                      <span className="text-muted-foreground">{assignment.member_name}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-4">
                    Balloted on: {new Date(hostingAssignments.balloted_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hosting schedule for {selectedYear}</p>
                  {isFamilyHead && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setAssignmentType("hosting");
                        setIsDialogOpen(true);
                      }}
                    >
                      Run Balloting
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Njangi Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Njangi Schedule {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {njangiAssignments ? (
                <div className="space-y-2">
                  {njangiAssignments.assignments.map((assignment: any) => (
                    <div key={assignment.month} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">{monthNames[assignment.month - 1]}</span>
                      <span className="text-muted-foreground">{assignment.member_name}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-4">
                    Balloted on: {new Date(njangiAssignments.balloted_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No njangi schedule for {selectedYear}</p>
                  {isFamilyHead && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setAssignmentType("njangi");
                        setIsDialogOpen(true);
                      }}
                    >
                      Run Balloting
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Balloting;
