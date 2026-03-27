import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { CreateTournamentPage } from "@/pages/CreateTournamentPage";
import { TournamentDetailPage } from "@/pages/TournamentDetailPage";
import { TournamentsPage } from "@/pages/TournamentsPage";
import { EditTournamentPage } from "@/pages/EditTournamentPage";
import { AppContextProvider } from "@/contexts/AppContext";
import { GlobalSpinner } from "@/components/GlobalSpinner";
import { AppHeader } from "@/components/AppHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AdminPage } from "@/pages/AdminPage";

const PageTransitionLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Reset zoom on navigation (iOS Safari auto-zooms on input focus and persists)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const original = viewport.getAttribute("content") ?? "";
      viewport.setAttribute("content", original + ", maximum-scale=1");
      setTimeout(() => viewport.setAttribute("content", original), 300);
    }
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

const AppLayout = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <AppHeader />
    <Outlet />
  </div>
);

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${import.meta.env["VITE_API_URL"] ?? "http://localhost:3001"}/trpc`,
          fetch: (url, options) =>
            fetch(url, { ...options, credentials: "include" } as RequestInit),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContextProvider>
            <PageTransitionLoader />
            <GlobalSpinner />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/tournaments" element={<TournamentsPage />} />
                  <Route
                    path="/tournament/:id"
                    element={<TournamentDetailPage />}
                  />
                  <Route
                    path="/tournament/:id/edit"
                    element={<EditTournamentPage />}
                  />
                  <Route
                    path="/create-tournament"
                    element={<CreateTournamentPage />}
                  />
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppContextProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
