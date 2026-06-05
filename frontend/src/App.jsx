import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Footer from "./components/Footer";
import PolicyModal from "./components/PolicyModal";
import { PRIVACY_POLICY, TERMS_OF_USE } from "./data/policies";

import LoginPage     from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import IntakePage    from "./pages/IntakePage";
import PatientPage          from "./pages/PatientPage";
import ReportPage           from "./pages/ReportPage";
import ClinicalFindingsPage from "./pages/ClinicalFindingsPage";
import PatientSummaryPage   from "./pages/PatientSummaryPage";
import AboutPage            from "./pages/AboutPage";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const [activeModal, setActiveModal] = useState(null);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <main id="main-content" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer
        onPrivacy={() => setActiveModal("privacy")}
        onTerms={() => setActiveModal("terms")}
      />
      {activeModal === "privacy" && <PolicyModal policy={PRIVACY_POLICY} onClose={() => setActiveModal(null)} />}
      {activeModal === "terms"   && <PolicyModal policy={TERMS_OF_USE}   onClose={() => setActiveModal(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/"                              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"                     element={<DashboardPage />} />
          <Route path="/intake"                        element={<IntakePage />} />
          <Route path="/assessment/:key/record"    element={<PatientPage />} />
          <Route path="/assessment/:key/report"    element={<ReportPage />} />
          <Route path="/assessment/:key/findings"  element={<ClinicalFindingsPage />} />
          <Route path="/assessment/:key/summary"   element={<PatientSummaryPage />} />
          <Route path="/about"                     element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
