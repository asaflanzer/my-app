import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ILeague {
  id: string;
  name: string;
}

interface IJoinLeagueSectionProps {
  availableLeagues: ILeague[];
  onSignUp: (leagueId: string) => void;
  isPending: boolean;
}

export const JoinLeagueSection = ({
  availableLeagues,
  onSignUp,
  isPending,
}: IJoinLeagueSectionProps) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState("");

  if (availableLeagues.length === 0) return null;

  return (
    <div className="w-full max-w-sm space-y-3 px-8">
      <p className="text-sm text-muted-foreground uppercase tracking-widest text-center">
        Join a League
      </p>
      <p className="text-neutral-500 text-sm">
        Choose a league from the list below.
      </p>
      <div className="space-y-2">
        <select
          value={selectedLeagueId}
          onChange={(e) => setSelectedLeagueId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>
            Select a league…
          </option>
          {availableLeagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="w-full"
          disabled={!selectedLeagueId || isPending}
          onClick={() => selectedLeagueId && onSignUp(selectedLeagueId)}
        >
          {isPending ? "Signing up…" : "Sign up"}
        </Button>
      </div>
    </div>
  );
};
