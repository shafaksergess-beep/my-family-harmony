import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Mail, ChevronRight, Crown, Shield, Wallet, Users } from "lucide-react";

interface MemberCardProps {
  member: {
    id: string;
    user_id: string;
    role: string;
    house_name: string | null;
    is_house_representative: boolean;
    profiles: {
      full_name: string;
      email: string | null;
      phone: string | null;
      avatar_url: string | null;
      is_working: boolean;
    };
  };
  onClick?: () => void;
  showContact?: boolean;
}

export function MemberCard({ member, onClick, showContact = true }: MemberCardProps) {
  const getRoleConfig = (role: string) => {
    switch (role) {
      case "family_head":
        return { label: "Family Head", variant: "default" as const, icon: Crown, color: "text-yellow-600" };
      case "family_admin":
        return { label: "Admin", variant: "default" as const, icon: Shield, color: "text-blue-600" };
      case "treasurer":
        return { label: "Treasurer", variant: "secondary" as const, icon: Wallet, color: "text-green-600" };
      case "loan_committee":
        return { label: "Loan Committee", variant: "outline" as const, icon: Users, color: "text-purple-600" };
      case "secretary":
        return { label: "Secretary", variant: "outline" as const, icon: User, color: "text-orange-600" };
      case "guest":
        return { label: "Guest", variant: "outline" as const, icon: User, color: "text-muted-foreground" };
      default:
        return { label: "Member", variant: "outline" as const, icon: User, color: "text-muted-foreground" };
    }
  };

  const roleConfig = getRoleConfig(member.role);
  const RoleIcon = roleConfig.icon;

  return (
    <Card
      className="overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={member.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{member.profiles.full_name}</h3>
              {member.is_house_representative && (
                <Badge variant="secondary" className="text-[10px] h-5">Rep</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={roleConfig.variant} className="text-xs">
                <RoleIcon className={`h-3 w-3 mr-1 ${roleConfig.color}`} />
                {roleConfig.label}
              </Badge>
              {member.house_name && (
                <span className="text-xs text-muted-foreground truncate">
                  {member.house_name}
                </span>
              )}
            </div>

            {showContact && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {member.profiles.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{member.profiles.phone}</span>
                  </div>
                )}
                {member.profiles.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{member.profiles.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>

        {member.profiles.is_working && (
          <div className="mt-3 pt-3 border-t">
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
              Working Member
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
