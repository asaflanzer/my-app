import { useNavigate, useParams, useLocation } from "react-router-dom";
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

export const LeagueGameHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { leagueId } = useParams<{ leagueId: string }>();
  const { league, isAdmin } = useLeagueContext();

  const isPlayoffPage = location.pathname.endsWith("/playoffs");

  return (
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
            {isPlayoffPage ? (
              <BreadcrumbLink asChild>
                <button onClick={() => navigate(`/league/${leagueId}`)}>
                  {league?.name ?? "League"}
                </button>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{league?.name ?? "League"}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {isPlayoffPage && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Playoffs</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
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
  );
};
