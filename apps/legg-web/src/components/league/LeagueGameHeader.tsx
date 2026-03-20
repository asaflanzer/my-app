import { useNavigate, useParams } from "react-router-dom";
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
  const { leagueId } = useParams<{ leagueId: string }>();
  const { league, isAdmin } = useLeagueContext();

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
  );
};
