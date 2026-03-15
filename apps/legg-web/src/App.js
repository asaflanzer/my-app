import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { BrowserRouter, Routes, Route, Outlet, useLocation, } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LoginPage } from "@/pages/LoginPage";
import { LeaguePage } from "@/pages/LeaguePage";
import { LeagueAdminPage } from "@/pages/LeagueAdminPage";
import { HomePage } from "@/pages/HomePage";
import { ChooseLeaguePage } from "@/pages/ChooseLeaguePage";
import { MeetingDetailPage } from "@/pages/MeetingDetailPage";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { LeagueProvider } from "@/contexts/LeagueContext";
import { AdminRoute } from "@/components/AdminRoute";
const PageTransitionLoader = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        window.scrollTo(0, 0);
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), 300);
        return () => clearTimeout(timer);
    }, [location.pathname]);
    if (!loading)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm", children: _jsx(Loader, { className: "h-8 w-8 animate-spin text-primary" }) }));
};
const AppLayout = () => (_jsxs("div", { className: "flex min-h-screen flex-col bg-background", children: [_jsx(AppHeader, {}), _jsx(Outlet, {})] }));
export default function App() {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() => trpc.createClient({
        links: [
            httpBatchLink({
                url: `${import.meta.env["VITE_API_URL"] ?? "http://localhost:3001"}/trpc`,
                fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
            }),
        ],
    }));
    return (_jsx(trpc.Provider, { client: trpcClient, queryClient: queryClient, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsxs(BrowserRouter, { children: [_jsx(PageTransitionLoader, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/leagues", element: _jsx(ChooseLeaguePage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsxs(Route, { element: _jsx(LeagueProvider, { children: _jsx(AppLayout, {}) }), children: [_jsx(Route, { path: "/league/:leagueId", element: _jsx(LeaguePage, {}) }), _jsx(Route, { path: "/league/:leagueId/meeting/:meetingId", element: _jsx(MeetingDetailPage, {}) }), _jsx(Route, { element: _jsx(AdminRoute, {}), children: _jsx(Route, { path: "/league/:leagueId/admin", element: _jsx(LeagueAdminPage, {}) }) })] })] }), _jsx(Toaster, {})] }) }) }));
}
