import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminFamilies from "./pages/admin/Families";
import FamilyMembers from "./pages/admin/FamilyMembers";
import FamilyDetail from "./pages/family/Detail";
import FamilyAnalytics from "./pages/family/Analytics";
import FamilyMeetings from "./pages/family/Meetings";
import FamilyContributions from "./pages/family/Contributions";
import FamilyLoans from "./pages/family/Loans";
import FamilyAttendance from "./pages/family/Attendance";
import FamilySavings from "./pages/family/Savings";
import FamilyNjangi from "./pages/family/Njangi";
import FamilyAssistance from "./pages/family/Assistance";
import FamilyShares from "./pages/family/Shares";
import MemberProfile from "./pages/family/MemberProfile";
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
          <Route path="/admin/families" element={<AdminFamilies />} />
          <Route path="/admin/families/:familyId/members" element={<FamilyMembers />} />
          <Route path="/family/:familySlug" element={<FamilyDetail />} />
          <Route path="/family/:familySlug/analytics" element={<FamilyAnalytics />} />
          <Route path="/family/:familySlug/meetings" element={<FamilyMeetings />} />
          <Route path="/family/:familySlug/contributions" element={<FamilyContributions />} />
          <Route path="/family/:familySlug/loans" element={<FamilyLoans />} />
          <Route path="/family/:familySlug/attendance" element={<FamilyAttendance />} />
          <Route path="/family/:familySlug/savings" element={<FamilySavings />} />
          <Route path="/family/:familySlug/njangi" element={<FamilyNjangi />} />
          <Route path="/family/:familySlug/assistance" element={<FamilyAssistance />} />
          <Route path="/family/:familySlug/shares" element={<FamilyShares />} />
          <Route path="/family/:familySlug/members/:memberId" element={<MemberProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
