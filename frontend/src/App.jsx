import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/landing.jsx";
import Login from "./pages/login.jsx";
import Register from "./pages/Register";
import Dashboard from "./pages/dashboard.jsx";
import SubmitGrievance from "./pages/SubmitGrievance.jsx";
import MyGrievances from "./pages/MyGrievances.jsx";
import GrievanceDetail from "./pages/GrievanceDetail.jsx";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AuthorityLogin from "./pages/AuthorityLogin";
import ManagerGrievanceDetail from "./pages/ManagerGrievanceDetail";
import AssistantDeanDashboard from "./pages/AssistantDeanDashboard";
import AssistantDeanGrievanceDetail from "./pages/AssistantDeanGrievanceDetail";
import AssociateDeanDashboard from "./pages/AssociateDeanDashboard";
import AssociateDeanGrievanceDetail from "./pages/AssociateDeanGrievanceDetail";
import DeanDashboard from "./pages/DeanDashboard";
import DeanGrievanceDetail from "./pages/DeanGrievanceDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/dashboard/submit"
          element={<SubmitGrievance />}
        />

        <Route
         path="/dashboard/grievances"
         element={<MyGrievances />}
        />

        <Route
        path="/dashboard/grievances/:grievanceId"
        element={<GrievanceDetail />}
        />

        <Route
        path="/reviewer"
        element={<ReviewerDashboard />}
        />

        <Route
        path="/manager"
        element={<ManagerDashboard />}
        />

        <Route
        path="/authority/login"
        element={<AuthorityLogin />}
        />

        <Route
        path="/manager/grievances/:grievanceId"
        element={<ManagerGrievanceDetail />}
        />

        <Route
        path="/assistant-dean"
        element={<AssistantDeanDashboard />}
        />

        <Route
        path="/assistant-dean/grievances/:grievanceId"
        element={
        <AssistantDeanGrievanceDetail />}
        />

        <Route
        path="/associate-dean"
        element={<AssociateDeanDashboard />}
        />

        <Route
        path="/associate-dean/grievances/:grievanceId"
        element={<AssociateDeanGrievanceDetail />}
        />

        <Route
         path="/dean"
         element={<DeanDashboard />}
        />

        <Route
        path="/dean/grievances/:grievanceId"
        element={<DeanGrievanceDetail />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;