import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPages";
import ServicePage from "./pages/ServicePage";
import LoginPage from "./pages/LoginPage";
import Profilepage from "./pages/Profilepage";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Productpage from "./pages/Productpage";
import Orderpage from "./pages/Orderpage";
import Salespage from "./pages/Salespage";
import Purchases from "./pages/Purchases";
import Categorypage from "./pages/Categorypage";
import Notificationpage from "./pages/Notificationpage";
import Supplierpage from "./pages/Supplierpage";
import Activitylogpage from "./pages/Activitylogpage";
import Dashboardpage from "./pages/Dashboardpage";
import Userstatus from "./pages/Userstatus";
import StoreManagementPage from "./pages/StoreManagementPage";
import NotificationPageRead from "./pages/Notificationpageread";
import Reportpage from "./pages/Reportpage";
import ChatBotPage from "./pages/ChatBotPage";
import ChatBotBubble from "./Components/ChatBotBubble";
import ProtectedRoute from "./lib/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import AttendancePage from "./pages/AttendancePage";
import RoundingAttendancePage from "./pages/RoundingAttendancePage";
import ScheduleManagementPage from "./pages/ScheduleManagementPage";
import DistributorDashboard from "./pages/DistributorDashboard";
import DistributorTeamPage from "./pages/DistributorTeamPage";
import CommandPalette from "./Components/CommandPalette";

// Common routes shared across Admin, Manager, and Staff
const commonDashboardRoutes = [
  { path: "product", element: <Productpage /> },
  { path: "order", element: <Orderpage /> },
  { path: "sales", element: <Salespage /> },
  { path: "stock-transaction", element: <Purchases /> },
  { path: "category", element: <Categorypage /> },
  { path: "profile", element: <Profilepage /> },
];

function App() {
  return (
    <Router>
      <div>
        <Toaster />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<ServicePage />} />
          <Route path="/SignupPage" element={<SignupPage />} />
          <Route path="/LoginPage" element={<LoginPage />} />
          <Route path="/chatbot" element={<ChatBotPage />} />

          {/* ── MANAGER DASHBOARD ── */}
          <Route path="/ManagerDashboard" element={<ProtectedRoute element={<ManagerDashboard />} allowedRoles={["manager"]} />}>
            <Route index element={<ProtectedRoute element={<Dashboardpage />} />} />
            {commonDashboardRoutes.map((route, i) => (
              <Route key={i} path={route.path} element={<ProtectedRoute element={route.element} />} />
            ))}
            <Route path="NotificationPageRead" element={<ProtectedRoute element={<NotificationPageRead />} />} />
            <Route path="supplier" element={<ProtectedRoute element={<Supplierpage />} />} />
            <Route path="stores" element={<ProtectedRoute element={<StoreManagementPage />} allowedRoles={["manager"]} />} />
            <Route path="users" element={<ProtectedRoute element={<Userstatus />} allowedRoles={["admin", "manager"]} />} />
            <Route path="activity-log" element={<ProtectedRoute element={<Activitylogpage />} allowedRoles={["admin", "manager"]} />} />
            <Route path="reports" element={<ProtectedRoute element={<Reportpage />} allowedRoles={["admin", "manager"]} />} />
            <Route path="schedules" element={<ProtectedRoute element={<ScheduleManagementPage />} allowedRoles={["manager"]} />} />
            <Route path="attendance-report" element={<ProtectedRoute element={<AttendancePage />} allowedRoles={["manager"]} />} />
          </Route>

          {/* ── ADMIN DASHBOARD ── */}
          <Route path="/AdminDashboard" element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={["admin"]} />}>
            <Route index element={<ProtectedRoute element={<Dashboardpage />} />} />
            {commonDashboardRoutes.map((route, i) => (
              <Route key={i} path={route.path} element={<ProtectedRoute element={route.element} />} />
            ))}
            <Route path="notifications" element={<ProtectedRoute element={<Notificationpage />} allowedRoles={["admin"]} />} />
            <Route path="supplier" element={<ProtectedRoute element={<Supplierpage />} />} />
            <Route path="Userstatus" element={<ProtectedRoute element={<Userstatus />} allowedRoles={["admin"]} />} />
            <Route path="stores" element={<ProtectedRoute element={<StoreManagementPage />} allowedRoles={["admin"]} />} />
            <Route path="activity-log" element={<ProtectedRoute element={<Activitylogpage />} allowedRoles={["admin", "manager"]} />} />
            <Route path="reports" element={<ProtectedRoute element={<Reportpage />} allowedRoles={["admin", "manager"]} />} />
            <Route path="schedules" element={<ProtectedRoute element={<ScheduleManagementPage />} allowedRoles={["admin"]} />} />
            <Route path="attendance-report" element={<ProtectedRoute element={<AttendancePage />} allowedRoles={["admin"]} />} />
          </Route>

          {/* ── STAFF DASHBOARD ── */}
          <Route path="/StaffDashboard" element={<ProtectedRoute element={<StaffDashboard />} allowedRoles={["staff"]} />}>
            <Route index element={<ProtectedRoute element={<Dashboardpage />} />} />
            {commonDashboardRoutes.map((route, i) => (
              <Route key={i} path={route.path} element={<ProtectedRoute element={route.element} />} />
            ))}
            <Route path="NotificationPageRead" element={<ProtectedRoute element={<NotificationPageRead />} />} />
            <Route path="attendance" element={<ProtectedRoute element={<AttendancePage />} allowedRoles={["staff"]} />} />
            <Route path="rounding-schedule" element={<ProtectedRoute element={<RoundingAttendancePage />} allowedRoles={["staff"]} />} />
          </Route>

          {/* ── DISTRIBUTOR DASHBOARD ── */}
          <Route path="/DistributorDashboard" element={<ProtectedRoute element={<DistributorDashboard />} allowedRoles={["distributor"]} />}>
            <Route index element={<ProtectedRoute element={<DistributorTeamPage />} />} />
            <Route path="team" element={<ProtectedRoute element={<DistributorTeamPage />} />} />
            <Route path="profile" element={<ProtectedRoute element={<Profilepage />} />} />
          </Route>
        </Routes>
        <ChatBotBubble />
        <CommandPalette />
      </div>
    </Router>
  );
}

export default App;
