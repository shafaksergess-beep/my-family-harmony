import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { MedianProvider } from "@/contexts/MedianContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { PageLoadingSkeleton } from "@/components/PageLoadingSkeleton";
import { RoutePageViewTracker } from "@/components/RoutePageViewTracker";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { OfflineIndicator } from "@/components/mobile/OfflineIndicator";
import { OfflineBootstrap } from "@/components/OfflineBootstrap";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { AuthBootstrap } from "@/components/AuthBootstrap";
// Lazy load core pages
const Index = lazy(() => import("./pages/Index"));
const WhatIsNjangi = lazy(() => import("./pages/blog/WhatIsNjangi"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Install = lazy(() => import("./pages/Install"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const NotFound = lazy(() => import("./pages/NotFound"));
const JoinFamily = lazy(() => import("./pages/JoinFamily"));
const LinkedAccounts = lazy(() => import("./pages/LinkedAccounts"));
const JoinFamilyOnboarding = lazy(() => import("./pages/onboarding/JoinFamilyOnboarding"));

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
const AdminAnnouncements = lazy(() => import("./pages/admin/Announcements"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const PendingApprovals = lazy(() => import("./pages/family/PendingApprovals"));

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
const FamilyMore = lazy(() => import("./pages/family/More"));
const FamilyChat = lazy(() => import("./pages/family/Chat"));
const FamilyCalendar = lazy(() => import("./pages/family/Calendar"));

const queryClient = new QueryClient();

const LoadingFallback = () => <PageLoadingSkeleton />;

// Wrapper components for module error boundaries
const AdminModule = ({ children }: { children: ReactNode }) => (
  <ModuleErrorBoundary moduleName="admin" fallbackPath="/dashboard">
    {children}
  </ModuleErrorBoundary>
);

const FamilyModule = ({ children }: { children: ReactNode }) => (
  <ModuleErrorBoundary moduleName="family" fallbackPath="/dashboard">
    {children}
  </ModuleErrorBoundary>
);

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
      <MedianProvider>
        <TooltipProvider>
            <Toaster />
            <Sonner />
        <BrowserRouter>
          <OfflineBootstrap />
          <AuthBootstrap />
          <PWAUpdatePrompt />
          <OfflineIndicator />
          <RoutePageViewTracker />
          <AnnouncementBanner />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog/what-is-njangi" element={<WhatIsNjangi />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminModule><AdminDashboard /></AdminModule>} />
            <Route path="/install" element={<Install />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/dashboard" element={<AdminModule><AdminDashboard /></AdminModule>} />
            <Route path="/admin/families" element={<AdminModule><AdminFamilies /></AdminModule>} />
          <Route path="/admin/families/:familyId/members" element={<AdminModule><FamilyMembers /></AdminModule>} />
          <Route path="/admin/families/:familyId/members/:memberId" element={<AdminModule><AdminMemberDetail /></AdminModule>} />
          <Route path="/admin/leaderboard" element={<AdminModule><MemberLeaderboard /></AdminModule>} />
        <Route path="/admin/permissions" element={<AdminModule><Permissions /></AdminModule>} />
        <Route path="/admin/activity-logs" element={<AdminModule><ActivityLogs /></AdminModule>} />
        <Route path="/admin/email-reports" element={<AdminModule><EmailReports /></AdminModule>} />
        <Route path="/admin/export-scheduler" element={<AdminModule><ExportScheduler /></AdminModule>} />
        <Route path="/admin/global-analytics" element={<AdminModule><GlobalAnalytics /></AdminModule>} />
        <Route path="/admin/users" element={<AdminModule><Users /></AdminModule>} />
        <Route path="/admin/users/:userId" element={<AdminModule><UserDetail /></AdminModule>} />
        <Route path="/admin/digest-settings" element={<AdminModule><DigestSettings /></AdminModule>} />
        <Route path="/admin/customize-dashboard" element={<AdminModule><CustomizeDashboard /></AdminModule>} />
        <Route path="/admin/modules" element={<AdminModule><ModuleManagement /></AdminModule>} />
        <Route path="/admin/role-permissions" element={<AdminModule><RolePermissions /></AdminModule>} />
        <Route path="/admin/user-activity" element={<AdminModule><UserActivity /></AdminModule>} />
        <Route path="/admin/announcements" element={<AdminModule><AdminAnnouncements /></AdminModule>} />
        <Route path="/admin/system-health" element={<AdminModule><SystemHealth /></AdminModule>} />
          
          {/* Family Role Management */}
          <Route path="/family/:familySlug/role-management" element={<FamilyModule><RoleManagement /></FamilyModule>} />
          
          <Route path="/family/:familySlug" element={<FamilyModule><FamilyDetail /></FamilyModule>} />
          <Route path="/family/:familySlug/audit-trail-enhanced" element={<FamilyModule><AuditTrailEnhanced /></FamilyModule>} />
          <Route path="/family/:familySlug/analytics" element={<FamilyModule><FamilyAnalytics /></FamilyModule>} />
          <Route path="/family/:familySlug/financial-analytics" element={<FamilyModule><FinancialAnalytics /></FamilyModule>} />
          <Route path="/family/:familySlug/notifications" element={<FamilyModule><Notifications /></FamilyModule>} />
          <Route path="/family/:familySlug/audit-trail" element={<FamilyModule><AuditTrail /></FamilyModule>} />
          <Route path="/family/:familySlug/members" element={<FamilyModule><Members /></FamilyModule>} />
          <Route path="/family/:familySlug/members/:memberId" element={<FamilyModule><MemberProfile /></FamilyModule>} />
          <Route path="/family/:familySlug/email-settings" element={<FamilyModule><EmailSettings /></FamilyModule>} />
          <Route path="/family/:familySlug/pdf-reports" element={<FamilyModule><PDFReports /></FamilyModule>} />
          <Route path="/family/:familySlug/meetings/:meetingId" element={<FamilyModule><MeetingDetail /></FamilyModule>} />
          <Route path="/family/:familySlug/meetings/:meetingId/checkin" element={<FamilyModule><MeetingCheckIn /></FamilyModule>} />
          <Route path="/family/:familySlug/meetings" element={<FamilyModule><FamilyMeetings /></FamilyModule>} />
          <Route path="/family/:familySlug/contributions" element={<FamilyModule><FamilyContributions /></FamilyModule>} />
          <Route path="/family/:familySlug/contribution-settings" element={<FamilyModule><ContributionSettings /></FamilyModule>} />
          <Route path="/family/:familySlug/financial-settings" element={<FamilyModule><FinancialSettings /></FamilyModule>} />
          <Route path="/family/:familySlug/loans" element={<FamilyModule><FamilyLoans /></FamilyModule>} />
          <Route path="/family/:familySlug/loan-committee" element={<FamilyModule><LoanCommitteeDashboard /></FamilyModule>} />
          <Route path="/family/:familySlug/loan-analytics" element={<FamilyModule><LoanAnalytics /></FamilyModule>} />
          <Route path="/family/:familySlug/loan-history" element={<FamilyModule><LoanHistory /></FamilyModule>} />
          <Route path="/family/:familySlug/attendance" element={<FamilyModule><FamilyAttendance /></FamilyModule>} />
          <Route path="/family/:familySlug/savings" element={<FamilyModule><FamilySavings /></FamilyModule>} />
          <Route path="/family/:familySlug/njangi" element={<FamilyModule><FamilyNjangi /></FamilyModule>} />
          <Route path="/family/:familySlug/assistance" element={<FamilyModule><FamilyAssistance /></FamilyModule>} />
          <Route path="/family/:familySlug/shares" element={<FamilyModule><FamilyShares /></FamilyModule>} />
          <Route path="/family/:familySlug/balloting" element={<FamilyModule><Balloting /></FamilyModule>} />
          <Route path="/family/:familySlug/attendance-analytics" element={<FamilyModule><AttendanceAnalytics /></FamilyModule>} />
          <Route path="/family/:familySlug/meeting-analytics" element={<FamilyModule><MeetingAnalyticsDashboard /></FamilyModule>} />
          <Route path="/family/:familySlug/meeting-templates" element={<FamilyModule><MeetingTemplates /></FamilyModule>} />
          <Route path="/family/:familySlug/meeting-settings" element={<FamilyModule><MeetingSettings /></FamilyModule>} />
          <Route path="/family/:familySlug/reports" element={<FamilyModule><FamilyReports /></FamilyModule>} />
          <Route path="/family/:familySlug/invitations" element={<FamilyModule><Invitations /></FamilyModule>} />
          <Route path="/family/:familySlug/payments" element={<FamilyModule><Payments /></FamilyModule>} />
          <Route path="/family/:familySlug/payment-integration" element={<FamilyModule><PaymentIntegration /></FamilyModule>} />
          <Route path="/family/:familySlug/meeting-reminders" element={<FamilyModule><MeetingReminders /></FamilyModule>} />
          <Route path="/family/:familySlug/contribution-analytics" element={<FamilyModule><ContributionAnalytics /></FamilyModule>} />
          <Route path="/family/:familySlug/reminder-settings" element={<FamilyModule><ReminderSettings /></FamilyModule>} />
          <Route path="/family/:familySlug/forecasting" element={<FamilyModule><FinancialForecasting /></FamilyModule>} />
          <Route path="/family/:familySlug/payment-plans" element={<FamilyModule><PaymentPlans /></FamilyModule>} />
          <Route path="/family/:familySlug/email-reports" element={<FamilyModule><FamilyEmailReports /></FamilyModule>} />
          <Route path="/family/:familySlug/export-scheduler" element={<FamilyModule><FamilyExportScheduler /></FamilyModule>} />
          <Route path="/family/:familySlug/budget" element={<FamilyModule><BudgetPlanning /></FamilyModule>} />
          <Route path="/family/:familySlug/assistance-analytics" element={<FamilyModule><FamilyAssistanceAnalytics /></FamilyModule>} />
          <Route path="/family/:familySlug/assistance-reports" element={<FamilyModule><FamilyAssistanceReports /></FamilyModule>} />
          <Route path="/family/:familySlug/backup-restore" element={<FamilyModule><BackupRestore /></FamilyModule>} />
          <Route path="/family/:familySlug/notification-settings" element={<FamilyModule><NotificationSettings /></FamilyModule>} />
          <Route path="/family/:familySlug/more" element={<FamilyModule><FamilyMore /></FamilyModule>} />
          <Route path="/family/:familySlug/chat" element={<FamilyModule><FamilyChat /></FamilyModule>} />
          <Route path="/family/:familySlug/calendar" element={<FamilyModule><FamilyCalendar /></FamilyModule>} />
          <Route path="/family/:familySlug/pending-approvals" element={<FamilyModule><PendingApprovals /></FamilyModule>} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/join" element={<JoinFamily />} />
          <Route path="/join/:familySlug" element={<JoinFamily />} />
          <Route path="/install" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </MedianProvider>
      </CurrencyProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
