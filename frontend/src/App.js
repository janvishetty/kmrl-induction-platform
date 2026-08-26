import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/index.css";
import { AppProvider } from "@/context/AppContext";
import { Kora } from "@/components/Kora";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Trains from "@/pages/TrainInduction"; // <--- Imported the new Fleet Inventory page
import TrainPlan from "@/pages/FleetInventory";
import Documents from "@/pages/Documents";
import OperationsMap from "@/pages/OperationsMap";
import LoginPage from "@/pages/LoginPage";

const AUTH_KEY = "rd-admin-auth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === "true"
  );

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={() => {
          localStorage.setItem(AUTH_KEY, "true");
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trains" element={<Trains />} />
          <Route path="/train-plan" element={<TrainPlan />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/map" element={<OperationsMap />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
        <Kora />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;