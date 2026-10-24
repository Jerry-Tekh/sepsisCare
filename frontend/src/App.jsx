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
import AccountPage from "./pages/account/AccountPage.jsx";
import MonitoringPage from "./pages/monitoring/MonitoringPage.jsx";

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard"           element={<Protected><Dashboard /></Protected>} />
      <Route path="/patients"            element={<Protected><PatientList /></Protected>} />
      <Route path="/patients/new"        element={<Protected><PatientForm /></Protected>} />
      <Route path="/patients/:id"        element={<Protected><PatientProfile /></Protected>} />
      <Route path="/patients/:id/edit"   element={<Protected><PatientForm /></Protected>} />
      <Route path="/patients/:id/onboarding"    element={<Protected><DiscoverySession /></Protected>} />
      <Route path="/patients/:id/safety-query"  element={<Protected><SafetyQueryPage /></Protected>} />
      <Route path="/patients/:id/microlearning" element={<Protected><MicrolearningPage /></Protected>} />
      <Route path="/patients/:id/monitoring"    element={<Protected><MonitoringPage /></Protected>} />
      <Route path="/account" element={<Protected><AccountPage /></Protected>} />

      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
