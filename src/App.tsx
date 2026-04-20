import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { queryClient } from "@/lib/queryClient";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MaterialsList from "./pages/MaterialsList";
import MaterialNew from "./pages/MaterialNew";
import MaterialDetail from "./pages/MaterialDetail";
import EventsList from "./pages/EventsList";
import EventNew from "./pages/EventNew";
import EventDetail from "./pages/EventDetail";
import NotFound from "./pages/NotFound.tsx";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/materials" element={<MaterialsList />} />
              <Route path="/materials/new" element={<MaterialNew />} />
              <Route path="/materials/:id" element={<MaterialDetail />} />
              <Route path="/events" element={<EventsList />} />
              <Route path="/events/new" element={<EventNew />} />
              <Route path="/events/:id" element={<EventDetail />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
