import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/index.css";
import { AppProvider } from "@/context/AppContext";
import { Kora } from "@/components/Kora";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Trains from "@/pages/Trains"; // <--- Imported the new Fleet Inventory page
import TrainPlan from "@/pages/TrainPlan";
import Documents from "@/pages/Documents";
import OperationsMap from "@/pages/OperationsMap";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trains" element={<Trains />} /> {/* <--- Added /trains route */}
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