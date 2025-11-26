import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AttendancePredictionsProps {
  familyId: string;
  meetingDate: string;
}

interface Prediction {
  member_id: string;
  member_name: string;
  attendance_rate: number;
  predicted_attendance: "likely" | "unlikely" | "uncertain";
}

export const AttendancePredictions = ({ familyId, meetingDate }: AttendancePredictionsProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculatePredictions();
  }, [familyId, meetingDate]);

  const calculatePredictions = async () => {
    try {
      // Get all family members
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id, profiles(full_name)")
        .eq("family_id", familyId);

      if (membersError) throw membersError;

      // Get historical attendance for each member
      const memberPredictions = await Promise.all(
        (members || []).map(async (member) => {
          const { data: attendanceRecords, error: attendanceError } = await supabase
            .from("attendance")
            .select("status")
            .eq("member_id", member.id);

          if (attendanceError) throw attendanceError;

          const totalMeetings = attendanceRecords?.length || 0;
          const presentCount = attendanceRecords?.filter(
            (r) => r.status === "present" || r.status === "late"
          ).length || 0;

          const attendanceRate = totalMeetings > 0 ? (presentCount / totalMeetings) * 100 : 50;

          let predicted_attendance: "likely" | "unlikely" | "uncertain";
          if (attendanceRate >= 70) {
            predicted_attendance = "likely";
          } else if (attendanceRate < 40) {
            predicted_attendance = "unlikely";
          } else {
            predicted_attendance = "uncertain";
          }

          return {
            member_id: member.id,
            member_name: (member.profiles as any)?.full_name || "Unknown",
            attendance_rate: Math.round(attendanceRate),
            predicted_attendance,
          };
        })
      );

      setPredictions(memberPredictions.sort((a, b) => b.attendance_rate - a.attendance_rate));
    } catch (error: any) {
      console.error("Error calculating predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case "likely":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "unlikely":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPredictionVariant = (prediction: string) => {
    switch (prediction) {
      case "likely":
        return "default" as const;
      case "unlikely":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  if (loading) {
    return <div>Calculating predictions...</div>;
  }

  const likelyCount = predictions.filter(p => p.predicted_attendance === "likely").length;
  const unlikelyCount = predictions.filter(p => p.predicted_attendance === "unlikely").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Predictions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on historical attendance patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 mb-4">
          <Badge variant="default" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {likelyCount} Likely
          </Badge>
          <Badge variant="destructive" className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            {unlikelyCount} Unlikely
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Minus className="w-3 h-3" />
            {predictions.length - likelyCount - unlikelyCount} Uncertain
          </Badge>
        </div>

        <div className="space-y-2">
          {predictions.map((prediction) => (
            <div
              key={prediction.member_id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getPredictionIcon(prediction.predicted_attendance)}
                <div>
                  <p className="font-medium">{prediction.member_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Historical attendance: {prediction.attendance_rate}%
                  </p>
                </div>
              </div>
              <Badge variant={getPredictionVariant(prediction.predicted_attendance)}>
                {prediction.predicted_attendance}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
