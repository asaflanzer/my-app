import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { CreateTournamentPage } from "@/pages/CreateTournamentPage";
import { TournamentDetailPage } from "@/pages/TournamentDetailPage";
import { TournamentsPage } from "@/pages/TournamentsPage";
import { EditTournamentPage } from "@/pages/EditTournamentPage";

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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/create-tournament"
              element={<CreateTournamentPage />}
            />
            <Route path="/tournament/:id" element={<TournamentDetailPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route
              path="/tournament/:id/edit"
              element={<EditTournamentPage />}
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
