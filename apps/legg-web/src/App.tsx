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
import { LeagueGamePage } from "@/pages/LeagueGamePage";
import { LeagueHostPage } from "@/pages/LeagueHostPage";
import { HomePage } from "@/pages/HomePage";
import { ChooseLeaguePage } from "@/pages/ChooseLeaguePage";
import { MeetingDetailPage } from "@/pages/MeetingDetailPage";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { LeagueProvider } from "@/contexts/LeagueContext";
import { AdminRoute } from "@/components/AdminRoute";
import { AppAdminRoute } from "@/components/AppAdminRoute";
import { HostsAdminPage } from "@/pages/HostsAdminPage";
import { MyLeaguesPage } from "@/pages/MyLeaguesPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { LeagueHistoryPage } from "@/pages/LeagueHistoryPage";

const PageTransitionLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Reset zoom on navigation (iOS Safari auto-zooms on input focus and persists)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const original = viewport.getAttribute('content') ?? '';
      viewport.setAttribute('content', original + ', maximum-scale=1');
      setTimeout(() => viewport.setAttribute('content', original), 300);
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
          <PageTransitionLoader />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/leagues" element={<ChooseLeaguePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <LeagueProvider>
                  <AppLayout />
                </LeagueProvider>
              }
            >
              <Route path="/league/:leagueId" element={<LeagueGamePage />} />
              <Route
                path="/league/:leagueId/meeting/:meetingId"
                element={<MeetingDetailPage />}
              />
              <Route element={<AdminRoute />}>
                <Route
                  path="/league/:leagueId/admin"
                  element={<LeagueHostPage />}
                />
              </Route>
            </Route>
            <Route element={<AppLayout />}>
                <Route path="/my-leagues" element={<MyLeaguesPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:leagueId" element={<LeagueHistoryPage />} />
              <Route element={<AppAdminRoute />}>
                <Route path="/admin/hosts" element={<HostsAdminPage />} />
              </Route>
            </Route>
            x
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
