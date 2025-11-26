import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Minus, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vote {
  id: string;
  member_id: string;
  vote: "yes" | "no" | "abstain";
}

interface AgendaVotingProps {
  agendaItemId: string;
  requiresVote: boolean;
  currentMemberId: string | null;
}

export const AgendaVoting = ({ agendaItemId, requiresVote, currentMemberId }: AgendaVotingProps) => {
  const { toast } = useToast();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVotes();
  }, [agendaItemId]);

  const loadVotes = async () => {
    try {
      const { data, error } = await supabase
        .from("agenda_item_votes")
        .select("*")
        .eq("agenda_item_id", agendaItemId);

      if (error) throw error;
      const castData = (data || []) as Vote[];
      setVotes(castData);
      
      const userVote = castData.find(v => v.member_id === currentMemberId);
      setMyVote(userVote?.vote || null);
    } catch (error: any) {
      console.error("Error loading votes:", error);
    }
  };

  const handleVote = async (vote: "yes" | "no" | "abstain") => {
    if (!currentMemberId) {
      toast({
        title: "Error",
        description: "You must be a member to vote",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("agenda_item_votes")
        .upsert({
          agenda_item_id: agendaItemId,
          member_id: currentMemberId,
          vote,
        }, {
          onConflict: "agenda_item_id,member_id"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Your vote (${vote}) has been recorded`,
      });

      await loadVotes();
    } catch (error: any) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record vote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!requiresVote) return null;

  const yesCount = votes.filter(v => v.vote === "yes").length;
  const noCount = votes.filter(v => v.vote === "no").length;
  const abstainCount = votes.filter(v => v.vote === "abstain").length;
  const totalVotes = votes.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Voting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleVote("yes")}
            disabled={loading}
            variant={myVote === "yes" ? "default" : "outline"}
            className="flex-1"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Yes
          </Button>
          <Button
            onClick={() => handleVote("no")}
            disabled={loading}
            variant={myVote === "no" ? "destructive" : "outline"}
            className="flex-1"
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            No
          </Button>
          <Button
            onClick={() => handleVote("abstain")}
            disabled={loading}
            variant={myVote === "abstain" ? "secondary" : "outline"}
            className="flex-1"
          >
            <Minus className="w-4 h-4 mr-2" />
            Abstain
          </Button>
        </div>

        {/* Vote Results */}
        {totalVotes > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Votes:</span>
              <Badge variant="outline">{totalVotes}</Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Yes</span>
                <span className="font-medium">{yesCount} ({totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600">No</span>
                <span className="font-medium">{noCount} ({totalVotes > 0 ? Math.round((noCount / totalVotes) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalVotes > 0 ? (noCount / totalVotes) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Abstain</span>
                <span className="font-medium">{abstainCount} ({totalVotes > 0 ? Math.round((abstainCount / totalVotes) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-muted-foreground h-2 rounded-full transition-all"
                  style={{ width: `${totalVotes > 0 ? (abstainCount / totalVotes) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
