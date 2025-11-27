import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Install from "./pages/Install";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminFamilies = lazy(() => import("./pages/admin/Families"));
const FamilyMembers = lazy(() => import("./pages/admin/FamilyMembers"));
const AdminMemberDetail = lazy(() => import("./pages/admin/MemberDetail"));
const MemberLeaderboard = lazy(() => import("./pages/admin/MemberLeaderboard"));
const Permissions = lazy(() => import("./pages/admin/Permissions"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const EmailReports = lazy(() => import("./pages/admin/EmailReports"));
const ExportScheduler = lazy(() => import("./pages/admin/ExportScheduler"));
const GlobalAnalytics = lazy(() => import("./pages/admin/GlobalAnalytics"));
const Users = lazy(() => import("./pages/admin/Users"));
const UserDetail = lazy(() => import("./pages/admin/UserDetail"));
const RolePermissions = lazy(() => import("./pages/admin/RolePermissions"));
const UserActivity = lazy(() => import("./pages/admin/UserActivity"));
const DigestSettings = lazy(() => import("./pages/admin/DigestSettings"));
const CustomizeDashboard = lazy(() => import("./pages/admin/CustomizeDashboard"));
const ModuleManagement = lazy(() => import("./pages/admin/ModuleManagement"));
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));

// Lazy load family pages
const FamilyDetail = lazy(() => import("./pages/family/Detail"));
const FamilyAnalytics = lazy(() => import("./pages/family/Analytics"));
const FinancialAnalytics = lazy(() => import("./pages/family/FinancialAnalytics"));
const Notifications = lazy(() => import("./pages/family/Notifications"));
const AuditTrail = lazy(() => import("./pages/family/AuditTrail"));
const MemberDetail = lazy(() => import("./pages/family/MemberDetail"));
const PDFReports = lazy(() => import("./pages/family/PDFReports"));
const MeetingCheckIn = lazy(() => import("./pages/family/MeetingCheckIn"));
const FamilyMeetings = lazy(() => import("./pages/family/Meetings"));
const FamilyContributions = lazy(() => import("./pages/family/Contributions"));
const ContributionSettings = lazy(() => import("./pages/family/ContributionSettings"));
const FinancialSettings = lazy(() => import("./pages/family/FinancialSettings"));
const FamilyLoans = lazy(() => import("./pages/family/Loans"));
const LoanCommitteeDashboard = lazy(() => import("./pages/family/LoanCommitteeDashboard"));
const FamilyAttendance = lazy(() => import("./pages/family/Attendance"));
const FamilySavings = lazy(() => import("./pages/family/Savings"));
const FamilyNjangi = lazy(() => import("./pages/family/Njangi"));
const FamilyAssistance = lazy(() => import("./pages/family/Assistance"));
const FamilyShares = lazy(() => import("./pages/family/Shares"));
const MemberProfile = lazy(() => import("./pages/family/MemberProfile"));
const Members = lazy(() => import("./pages/family/Members"));
const EmailSettings = lazy(() => import("./pages/family/EmailSettings"));
const AuditTrailEnhanced = lazy(() => import("./pages/family/AuditTrailEnhanced"));
const Invitations = lazy(() => import("./pages/family/Invitations"));
const Payments = lazy(() => import("./pages/family/Payments"));
const MeetingReminders = lazy(() => import("./pages/family/MeetingReminders"));
const PaymentIntegration = lazy(() => import("./pages/family/PaymentIntegration"));
const ContributionAnalytics = lazy(() => import("./pages/family/ContributionAnalytics"));
const ReminderSettings = lazy(() => import("./pages/family/ReminderSettings"));
const FinancialForecasting = lazy(() => import("./pages/family/FinancialForecasting"));
const PaymentPlans = lazy(() => import("./pages/family/PaymentPlans"));
const FamilyEmailReports = lazy(() => import("./pages/family/EmailReports"));
const FamilyReports = lazy(() => import("./pages/family/Reports"));
const FamilyExportScheduler = lazy(() => import("./pages/family/ExportScheduler"));
const BudgetPlanning = lazy(() => import("./pages/family/BudgetPlanning"));
const Balloting = lazy(() => import("./pages/family/Balloting"));
const AttendanceAnalytics = lazy(() => import("./pages/family/AttendanceAnalytics"));
const MeetingDetail = lazy(() => import("./pages/family/MeetingDetail"));
const MeetingTemplates = lazy(() => import("./pages/family/MeetingTemplates"));
const MeetingSettings = lazy(() => import("./pages/family/MeetingSettings"));
const MeetingAnalyticsDashboard = lazy(() => import("./pages/family/MeetingAnalyticsDashboard"));
const LoanAnalytics = lazy(() => import("./pages/family/LoanAnalytics"));
const LoanHistory = lazy(() => import("./pages/family/LoanHistory"));
const FamilyAssistanceAnalytics = lazy(() => import("./pages/family/AssistanceAnalytics"));
const FamilyAssistanceReports = lazy(() => import("./pages/family/AssistanceReports"));
const BackupRestore = lazy(() => import("./pages/family/BackupRestore"));
const NotificationSettings = lazy(() => import("./pages/family/NotificationSettings"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg">Loading...</div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/families" element={<AdminFamilies />} />
          <Route path="/admin/families/:familyId/members" element={<FamilyMembers />} />
          <Route path="/admin/families/:familyId/members/:memberId" element={<AdminMemberDetail />} />
          <Route path="/admin/leaderboard" element={<MemberLeaderboard />} />
        <Route path="/admin/permissions" element={<Permissions />} />
        <Route path="/admin/activity-logs" element={<ActivityLogs />} />
        <Route path="/admin/email-reports" element={<EmailReports />} />
        <Route path="/admin/export-scheduler" element={<ExportScheduler />} />
        <Route path="/admin/global-analytics" element={<GlobalAnalytics />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/users/:userId" element={<UserDetail />} />
        <Route path="/admin/digest-settings" element={<DigestSettings />} />
        <Route path="/admin/customize-dashboard" element={<CustomizeDashboard />} />
        <Route path="/admin/modules" element={<ModuleManagement />} />
        <Route path="/admin/role-permissions" element={<RolePermissions />} />
        <Route path="/admin/user-activity" element={<UserActivity />} />
          
          {/* Family Role Management */}
          <Route path="/family/:familySlug/role-management" element={<RoleManagement />} />
          
          <Route path="/family/:familySlug" element={<FamilyDetail />} />
          <Route path="/family/:familySlug/audit-trail-enhanced" element={<AuditTrailEnhanced />} />
          <Route path="/family/:familySlug/analytics" element={<FamilyAnalytics />} />
          <Route path="/family/:familySlug/financial-analytics" element={<FinancialAnalytics />} />
          <Route path="/family/:familySlug/notifications" element={<Notifications />} />
          <Route path="/family/:familySlug/audit-trail" element={<AuditTrail />} />
          <Route path="/family/:familySlug/members" element={<Members />} />
          <Route path="/family/:familySlug/members/:memberId" element={<MemberProfile />} />
          <Route path="/family/:familySlug/email-settings" element={<EmailSettings />} />
          <Route path="/family/:familySlug/pdf-reports" element={<PDFReports />} />
          <Route path="/family/:familySlug/meetings/:meetingId" element={<MeetingDetail />} />
          <Route path="/family/:familySlug/meetings/:meetingId/checkin" element={<MeetingCheckIn />} />
          <Route path="/family/:familySlug/meetings" element={<FamilyMeetings />} />
          <Route path="/family/:familySlug/contributions" element={<FamilyContributions />} />
          <Route path="/family/:familySlug/contribution-settings" element={<ContributionSettings />} />
          <Route path="/family/:familySlug/financial-settings" element={<FinancialSettings />} />
          <Route path="/family/:familySlug/loans" element={<FamilyLoans />} />
          <Route path="/family/:familySlug/loan-committee" element={<LoanCommitteeDashboard />} />
          <Route path="/family/:familySlug/loan-analytics" element={<LoanAnalytics />} />
          <Route path="/family/:familySlug/loan-history" element={<LoanHistory />} />
          <Route path="/family/:familySlug/attendance" element={<FamilyAttendance />} />
          <Route path="/family/:familySlug/savings" element={<FamilySavings />} />
          <Route path="/family/:familySlug/njangi" element={<FamilyNjangi />} />
          <Route path="/family/:familySlug/assistance" element={<FamilyAssistance />} />
          <Route path="/family/:familySlug/shares" element={<FamilyShares />} />
          <Route path="/family/:familySlug/balloting" element={<Balloting />} />
          <Route path="/family/:familySlug/attendance-analytics" element={<AttendanceAnalytics />} />
          <Route path="/family/:familySlug/meeting-analytics" element={<MeetingAnalyticsDashboard />} />
          <Route path="/family/:familySlug/meeting-templates" element={<MeetingTemplates />} />
          <Route path="/family/:familySlug/meeting-settings" element={<MeetingSettings />} />
          <Route path="/family/:familySlug/members/:memberId" element={<MemberProfile />} />
          <Route path="/family/:familySlug/reports" element={<FamilyReports />} />
          <Route path="/family/:familySlug/invitations" element={<Invitations />} />
          <Route path="/family/:familySlug/payments" element={<Payments />} />
          <Route path="/family/:familySlug/payment-integration" element={<PaymentIntegration />} />
          <Route path="/family/:familySlug/meeting-reminders" element={<MeetingReminders />} />
          <Route path="/family/:familySlug/contribution-analytics" element={<ContributionAnalytics />} />
          <Route path="/family/:familySlug/reminder-settings" element={<ReminderSettings />} />
          <Route path="/family/:familySlug/forecasting" element={<FinancialForecasting />} />
          <Route path="/family/:familySlug/payment-plans" element={<PaymentPlans />} />
          <Route path="/family/:familySlug/email-reports" element={<FamilyEmailReports />} />
          <Route path="/family/:familySlug/export-scheduler" element={<FamilyExportScheduler />} />
          <Route path="/family/:familySlug/budget" element={<BudgetPlanning />} />
          <Route path="/family/:familySlug/assistance-analytics" element={<FamilyAssistanceAnalytics />} />
          <Route path="/family/:familySlug/assistance-reports" element={<FamilyAssistanceReports />} />
          <Route path="/family/:familySlug/backup-restore" element={<BackupRestore />} />
          <Route path="/family/:familySlug/notification-settings" element={<NotificationSettings />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/install" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
