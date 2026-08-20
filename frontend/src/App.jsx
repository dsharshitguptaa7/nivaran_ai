import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/landing.jsx";
import Login from "./pages/login.jsx";
import Register from "./pages/Register";
import Dashboard from "./pages/dashboard.jsx";
import SubmitGrievance from "./pages/SubmitGrievance.jsx";
import MyGrievances from "./pages/MyGrievances.jsx";
import GrievanceDetail from "./pages/GrievanceDetail.jsx";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerGrievanceDetail from "./pages/ManagerGrievanceDetail";
import AssistantDeanDashboard from "./pages/AssistantDeanDashboard";
import AssistantDeanGrievanceDetail from "./pages/AssistantDeanGrievanceDetail";
import AssociateDeanDashboard from "./pages/AssociateDeanDashboard";
import AssociateDeanGrievanceDetail from "./pages/AssociateDeanGrievanceDetail";
import DeanDashboard from "./pages/DeanDashboard";
import DeanGrievanceDetail from "./pages/DeanGrievanceDetail";
import NotificationsPage from "./pages/NotificationsPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/authority/login" element={<Navigate to="/login?type=authority" replace />} />

        {/* APPLICANT / STUDENT PORTAL (APPLICANT ONLY) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["APPLICANT"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/submit"
          element={
            <ProtectedRoute allowedRoles={["APPLICANT"]}>
              <SubmitGrievance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/grievances"
          element={
            <ProtectedRoute allowedRoles={["APPLICANT"]}>
              <MyGrievances />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/grievances/:grievanceId"
          element={
            <ProtectedRoute allowedRoles={["APPLICANT"]}>
              <GrievanceDetail />
            </ProtectedRoute>
          }
        />

        {/* CENTRAL MANAGER PORTAL (MANAGER ONLY) */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/grievances/:grievanceId"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerGrievanceDetail />
            </ProtectedRoute>
          }
        />

        {/* ASSISTANT DEAN PORTAL (ASSISTANT_DEAN ONLY) */}
        <Route
          path="/assistant-dean"
          element={
            <ProtectedRoute allowedRoles={["ASSISTANT_DEAN"]}>
              <AssistantDeanDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant-dean/grievances/:grievanceId"
          element={
            <ProtectedRoute allowedRoles={["ASSISTANT_DEAN"]}>
              <AssistantDeanGrievanceDetail />
            </ProtectedRoute>
          }
        />

        {/* ASSOCIATE DEAN PORTAL (ASSOCIATE_DEAN ONLY) */}
        <Route
          path="/associate-dean"
          element={
            <ProtectedRoute allowedRoles={["ASSOCIATE_DEAN"]}>
              <AssociateDeanDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/associate-dean/grievances/:grievanceId"
          element={
            <ProtectedRoute allowedRoles={["ASSOCIATE_DEAN"]}>
              <AssociateDeanGrievanceDetail />
            </ProtectedRoute>
          }
        />

        {/* DEAN EXECUTIVE PORTAL (DEAN ONLY) */}
        <Route
          path="/dean"
          element={
            <ProtectedRoute allowedRoles={["DEAN"]}>
              <DeanDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dean/grievances/:grievanceId"
          element={
            <ProtectedRoute allowedRoles={["DEAN"]}>
              <DeanGrievanceDetail />
            </ProtectedRoute>
          }
        />

        {/* AI REVIEWER PORTAL (REVIEWER / MANAGER ONLY) */}
        <Route
          path="/reviewer"
          element={
            <ProtectedRoute allowedRoles={["REVIEWER", "MANAGER"]}>
              <ReviewerDashboard />
            </ProtectedRoute>
          }
        />

        {/* CENTRAL NOTIFICATIONS PAGE (ALL AUTHENTICATED ROLES) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["APPLICANT", "MANAGER", "ASSISTANT_DEAN", "ASSOCIATE_DEAN", "DEAN", "REVIEWER"]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;