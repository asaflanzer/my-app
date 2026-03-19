import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";

export const AdminPlayoffsSection = () => {
  const { league } = useLeagueContext();
  const { activatedPlayoffs, canActivatePlayoff } = useAdminContext();
  const [open, setOpen] = useState(true);

  if (!league) return null;

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Playoffs
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-muted-foreground">
              {activatedPlayoffs}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold">{league.playoffMeetings}</span>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <>
          <Button
            disabled={!canActivatePlayoff}
            size="sm"
            className="w-full text-xs"
          >
            Activate Playoff #1
          </Button>
          <p className="text-xs text-muted-foreground">
            Playoff format coming soon.
          </p>
        </>
      )}
    </section>
  );
};
