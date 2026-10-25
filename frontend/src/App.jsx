import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import PatientList from "./pages/patients/PatientList.jsx";
import PatientForm from "./pages/patients/PatientForm.jsx";
import PatientProfile from "./pages/patients/PatientProfile.jsx";
import DiscoverySession from "./pages/discovery/DiscoverySession.jsx";
import SafetyQueryPage from "./pages/safety-query/SafetyQueryPage.jsx";
import MicrolearningPage from "./pages/microlearning/MicrolearningPage.jsx";
import DashboardRedirect from "./components/DashboardRedirect.jsx";
import OrganizationDashboard from "./pages/organization/OrganizationDashboard.jsx";
import LearningGuidesPage from "./pages/learning-guides/LearningGuidesPage.jsx";
import MicrolearningHome from "./pages/microlearning/MicrolearningHome.jsx";

function Protected({ children, roles }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<Protected><DashboardRedirect /></Protected>} />
      <Route path="/caregiver/dashboard" element={<Protected roles={["CAREGIVER"]}><Dashboard /></Protected>} />
      <Route path="/organization/dashboard" element={<Protected roles={["ORGANIZATION_ADMIN"]}><OrganizationDashboard /></Protected>} />
      <Route path="/learning-guides" element={<Protected roles={["CAREGIVER"]}><LearningGuidesPage /></Protected>} />
      <Route path="/microlearning" element={<Protected roles={["CAREGIVER"]}><MicrolearningHome /></Protected>} />
      <Route path="/patients"            element={<Protected roles={["CAREGIVER"]}><PatientList /></Protected>} />
      <Route path="/patients/new"        element={<Protected roles={["CAREGIVER"]}><PatientForm /></Protected>} />
      <Route path="/patients/:id"        element={<Protected roles={["CAREGIVER"]}><PatientProfile /></Protected>} />
      <Route path="/patients/:id/edit"   element={<Protected roles={["CAREGIVER"]}><PatientForm /></Protected>} />
      <Route path="/patients/:id/onboarding"    element={<Protected roles={["CAREGIVER"]}><DiscoverySession /></Protected>} />
      <Route path="/patients/:id/safety-query"  element={<Protected roles={["CAREGIVER"]}><SafetyQueryPage /></Protected>} />
      <Route path="/patients/:id/microlearning" element={<Protected roles={["CAREGIVER"]}><MicrolearningPage /></Protected>} />

      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
