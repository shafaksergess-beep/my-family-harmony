import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminFamilies from "./pages/admin/Families";
import FamilyMembers from "./pages/admin/FamilyMembers";
import AdminMemberDetail from "./pages/admin/MemberDetail";
import MemberLeaderboard from "./pages/admin/MemberLeaderboard";
import Permissions from "./pages/admin/Permissions";
import ActivityLogs from "./pages/admin/ActivityLogs";
import EmailReports from "./pages/admin/EmailReports";
import ExportScheduler from "./pages/admin/ExportScheduler";
import FamilyDetail from "./pages/family/Detail";
import FamilyAnalytics from "./pages/family/Analytics";
import FinancialAnalytics from "./pages/family/FinancialAnalytics";
import Notifications from "./pages/family/Notifications";
import AuditTrail from "./pages/family/AuditTrail";
import MemberDetail from "./pages/family/MemberDetail";
import PDFReports from "./pages/family/PDFReports";
import MeetingCheckIn from "./pages/family/MeetingCheckIn";
import FamilyMeetings from "./pages/family/Meetings";
import FamilyContributions from "./pages/family/Contributions";
import FamilyLoans from "./pages/family/Loans";
import FamilyAttendance from "./pages/family/Attendance";
import FamilySavings from "./pages/family/Savings";
import FamilyNjangi from "./pages/family/Njangi";
import FamilyAssistance from "./pages/family/Assistance";
import FamilyShares from "./pages/family/Shares";
import MemberProfile from "./pages/family/MemberProfile";
import Members from "./pages/family/Members";
import EmailSettings from "./pages/family/EmailSettings";
import GlobalAnalytics from "./pages/admin/GlobalAnalytics";
import Users from "./pages/admin/Users";
import UserDetail from "./pages/admin/UserDetail";
import RolePermissions from "./pages/admin/RolePermissions";
import UserActivity from "./pages/admin/UserActivity";
import DigestSettings from "./pages/admin/DigestSettings";
import CustomizeDashboard from "./pages/admin/CustomizeDashboard";
import AuditTrailEnhanced from "./pages/family/AuditTrailEnhanced";
import Install from "./pages/Install";
import Invitations from "./pages/family/Invitations";
import Payments from "./pages/family/Payments";
import AcceptInvitation from "./pages/AcceptInvitation";
import MeetingReminders from "./pages/family/MeetingReminders";
import PaymentIntegration from "./pages/family/PaymentIntegration";
import ContributionAnalytics from "./pages/family/ContributionAnalytics";
import ReminderSettings from "./pages/family/ReminderSettings";
import FinancialForecasting from "./pages/family/FinancialForecasting";
import PaymentPlans from "./pages/family/PaymentPlans";
import FamilyEmailReports from "./pages/family/EmailReports";
import FamilyReports from "./pages/family/Reports";
import FamilyExportScheduler from "./pages/family/ExportScheduler";
import BudgetPlanning from "./pages/family/BudgetPlanning";
import Balloting from "./pages/family/Balloting";
import AttendanceAnalytics from "./pages/family/AttendanceAnalytics";
import MeetingDetail from "./pages/family/MeetingDetail";
import MeetingTemplates from "./pages/family/MeetingTemplates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
        <Route path="/admin/role-permissions" element={<RolePermissions />} />
        <Route path="/admin/user-activity" element={<UserActivity />} />
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
          <Route path="/family/:familySlug/loans" element={<FamilyLoans />} />
          <Route path="/family/:familySlug/attendance" element={<FamilyAttendance />} />
          <Route path="/family/:familySlug/savings" element={<FamilySavings />} />
          <Route path="/family/:familySlug/njangi" element={<FamilyNjangi />} />
          <Route path="/family/:familySlug/assistance" element={<FamilyAssistance />} />
          <Route path="/family/:familySlug/shares" element={<FamilyShares />} />
          <Route path="/family/:familySlug/balloting" element={<Balloting />} />
          <Route path="/family/:familySlug/attendance-analytics" element={<AttendanceAnalytics />} />
          <Route path="/family/:familySlug/meeting-templates" element={<MeetingTemplates />} />
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
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/install" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
