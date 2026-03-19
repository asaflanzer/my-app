import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { useLeagueContext } from "@/contexts/LeagueContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { LeagueHero } from "@/components/league/LeagueHero";
import { LeagueStandings } from "@/components/league/LeagueStandings";
import { LeagueTables } from "@/components/league/LeagueTables";

export const LeagueGamePage = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: session, isPending: sessionPending } = useSession();
  const { league, isLoading: leagueLoading, isAdmin } = useLeagueContext();

  if (sessionPending || leagueLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="w-full sm:max-w-sm sm:mx-auto text-foreground pb-16">
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50 flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button onClick={() => navigate("/leagues")}>Leagues</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{league?.name ?? "League"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {isAdmin && (
          <Button
            size="xs"
            className="bg-amber-500 text-white"
            onClick={() => navigate(`/league/${leagueId}/admin`)}
          >
            Admin
          </Button>
        )}
      </header>

      <LeagueHero />
      <LeagueStandings />
      <LeagueTables />
    </div>
  );
};
