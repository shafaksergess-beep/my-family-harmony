import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Check, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";

interface Permission {
  module: string;
  action: string;
  family_head: boolean;
  treasurer: boolean;
  loan_committee: boolean;
  member: boolean;
  guest: boolean;
}

const permissions: Permission[] = [
  // Contributions
  { module: "Contributions", action: "View All", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Contributions", action: "View Own", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Contributions", action: "Add/Edit", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Contributions", action: "Delete", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Contributions", action: "Mark Paid", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  
  // Loans
  { module: "Loans", action: "View All", family_head: true, treasurer: true, loan_committee: true, member: false, guest: false },
  { module: "Loans", action: "View Own", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Loans", action: "Request", family_head: true, treasurer: true, loan_committee: true, member: true, guest: false },
  { module: "Loans", action: "Approve", family_head: true, treasurer: false, loan_committee: true, member: false, guest: false },
  { module: "Loans", action: "Disburse", family_head: true, treasurer: false, loan_committee: true, member: false, guest: false },
  
  // Savings
  { module: "Savings", action: "View All", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Savings", action: "View Own", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Savings", action: "Add/Edit", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Savings", action: "Delete", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  
  // Njangi
  { module: "Njangi", action: "View", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Njangi", action: "Create Cycle", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
  { module: "Njangi", action: "Manage Participants", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
  { module: "Njangi", action: "Mark Paid", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
  
  // Assistance
  { module: "Assistance", action: "View", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Assistance", action: "Add Event", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Assistance", action: "Edit/Delete", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  
  // Shares
  { module: "Shares", action: "View", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Shares", action: "Issue Shares", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  { module: "Shares", action: "Declare Dividends", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  
  // Meetings
  { module: "Meetings", action: "View", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Meetings", action: "Create/Edit", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
  { module: "Meetings", action: "Manage Attendance", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
  
  // Analytics
  { module: "Analytics", action: "View Dashboard", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Analytics", action: "Export Reports", family_head: true, treasurer: true, loan_committee: false, member: false, guest: false },
  
  // Members
  { module: "Members", action: "View", family_head: true, treasurer: true, loan_committee: true, member: true, guest: true },
  { module: "Members", action: "Add/Remove", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
  { module: "Members", action: "Change Roles", family_head: true, treasurer: false, loan_committee: false, member: false, guest: false },
];

const Permissions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const roles = [
    { key: "family_head", label: t("roles.family_head"), color: "bg-purple-500" },
    { key: "treasurer", label: t("roles.treasurer"), color: "bg-blue-500" },
    { key: "loan_committee", label: t("roles.loan_committee"), color: "bg-green-500" },
    { key: "member", label: t("roles.member"), color: "bg-orange-500" },
    { key: "guest", label: t("roles.guest"), color: "bg-gray-500" },
  ];

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin/families")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Permissions Overview
                </h1>
                <p className="text-sm text-muted-foreground">Role-based access control matrix</p>
              </div>
            </div>
            
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Role Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {roles.map((role) => (
                <Badge key={role.key} variant="outline" className="px-3 py-1">
                  <div className={`w-3 h-3 rounded-full ${role.color} mr-2`} />
                  {role.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle>{module}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Action</th>
                        {roles.map((role) => (
                          <th key={role.key} className="text-center py-3 px-4 font-medium">
                            <div className={`w-3 h-3 rounded-full ${role.color} mx-auto mb-1`} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{perm.action}</td>
                          <td className="text-center py-3 px-4">
                            {perm.family_head ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-500/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {perm.treasurer ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-500/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {perm.loan_committee ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-500/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {perm.member ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-500/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {perm.guest ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-500/30 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Permissions;
