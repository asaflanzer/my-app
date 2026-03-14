import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LoginPage } from "@/pages/LoginPage";
import { LeaguePage } from "@/pages/LeaguePage";
import { HomePage } from "@/pages/HomePage";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";

const PageTransitionLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/league/:leagueId" element={<LeaguePage />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
