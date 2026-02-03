import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout.jsx";
import { LandingPage } from "./ui/pages/LandingPage.jsx";
import { LoginPage } from "./ui/pages/LoginPage.jsx";
import { RegisterPage } from "./ui/pages/RegisterPage.jsx";
import { OAuthCallbackPage } from "./ui/pages/OAuthCallbackPage.jsx";
import { ApprovalLobbyPage } from "./ui/pages/ApprovalLobbyPage.jsx";
import { DaySelectionPage } from "./ui/pages/DaySelectionPage.jsx";
import { WeekSelectionPage } from "./ui/pages/WeekSelectionPage.jsx";
import { HistoryPage } from "./ui/pages/HistoryPage.jsx";
import { AdminDashboardPage } from "./ui/pages/admin/AdminDashboardPage.jsx";
import { AdminUsersPage } from "./ui/pages/admin/AdminUsersPage.jsx";
import { AdminCatalogPage } from "./ui/pages/admin/AdminCatalogPage.jsx";
import { AdminCalendarPage } from "./ui/pages/admin/AdminCalendarPage.jsx";
import { AdminCostPage } from "./ui/pages/admin/AdminCostPage.jsx";
import { AdminWfhPage } from "./ui/pages/admin/AdminWfhPage.jsx";
import { AdminApprovalsPage } from "./ui/pages/admin/AdminApprovalsPage.jsx";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/oauth/callback", element: <OAuthCallbackPage /> },
  { path: "/lobby", element: <ApprovalLobbyPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/day" replace /> },
      { path: "day", element: <DaySelectionPage /> },
      { path: "week", element: <WeekSelectionPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "admin", element: <Navigate to="/app/admin/dashboard" replace /> },
      { path: "admin/dashboard", element: <AdminDashboardPage /> },
      { path: "admin/approvals", element: <AdminApprovalsPage /> },
      { path: "admin/users", element: <AdminUsersPage /> },
      { path: "admin/catalog", element: <AdminCatalogPage /> },
      { path: "admin/calendar", element: <AdminCalendarPage /> },
      { path: "admin/costs", element: <AdminCostPage /> },
      { path: "admin/wfh", element: <AdminWfhPage /> }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

