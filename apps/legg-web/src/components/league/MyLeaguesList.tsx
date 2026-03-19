import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ILeague {
  id: string;
  name: string;
}

interface IMyLeaguesListProps {
  leagues: ILeague[];
  isLoading: boolean;
}

export const MyLeaguesList = ({ leagues, isLoading }: IMyLeaguesListProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    );
  }

  if (leagues.length === 0) {
    return (
      <p className="text-neutral-500 text-sm">
        You&apos;re not in any leagues yet.
      </p>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-3 px-8">
      <p className="text-sm text-neutral-500 uppercase tracking-widest text-center">
        Your Leagues
      </p>
      {leagues.map((league) => (
        <Button
          key={league.id}
          size="sm"
          onClick={() => navigate(`/league/${league.id}`)}
          className="w-full"
        >
          <div className="text-foreground">{league.name}</div>
        </Button>
      ))}
    </div>
  );
};
