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
import FamilyReports from "./pages/family/Reports";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/families" element={<AdminFamilies />} />
        <Route path="/admin/families/:familyId/members" element={<FamilyMembers />} />
        <Route path="/admin/permissions" element={<Permissions />} />
        <Route path="/admin/activity-logs" element={<ActivityLogs />} />
        <Route path="/admin/email-reports" element={<EmailReports />} />
        <Route path="/admin/export-scheduler" element={<ExportScheduler />} />
        <Route path="/admin/global-analytics" element={<GlobalAnalytics />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/users/:userId" element={<UserDetail />} />
          <Route path="/family/:familySlug" element={<FamilyDetail />} />
          <Route path="/family/:familySlug/analytics" element={<FamilyAnalytics />} />
          <Route path="/family/:familySlug/financial-analytics" element={<FinancialAnalytics />} />
          <Route path="/family/:familySlug/notifications" element={<Notifications />} />
          <Route path="/family/:familySlug/audit-trail" element={<AuditTrail />} />
          <Route path="/family/:familySlug/members" element={<Members />} />
          <Route path="/family/:familySlug/members/:memberId" element={<MemberProfile />} />
          <Route path="/family/:familySlug/email-settings" element={<EmailSettings />} />
          <Route path="/family/:familySlug/pdf-reports" element={<PDFReports />} />
          <Route path="/family/:familySlug/meetings/:meetingId/checkin" element={<MeetingCheckIn />} />
          <Route path="/family/:familySlug/meetings" element={<FamilyMeetings />} />
          <Route path="/family/:familySlug/contributions" element={<FamilyContributions />} />
          <Route path="/family/:familySlug/loans" element={<FamilyLoans />} />
          <Route path="/family/:familySlug/attendance" element={<FamilyAttendance />} />
          <Route path="/family/:familySlug/savings" element={<FamilySavings />} />
          <Route path="/family/:familySlug/njangi" element={<FamilyNjangi />} />
          <Route path="/family/:familySlug/assistance" element={<FamilyAssistance />} />
          <Route path="/family/:familySlug/shares" element={<FamilyShares />} />
          <Route path="/family/:familySlug/members/:memberId" element={<MemberProfile />} />
          <Route path="/family/:familySlug/reports" element={<FamilyReports />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
