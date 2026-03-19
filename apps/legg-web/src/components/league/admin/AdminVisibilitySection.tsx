import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { Switch } from "@/components/ui/switch";

export const AdminVisibilitySection = () => {
  const { league } = useLeagueContext();
  const { updateSettings } = useAdminContext();

  if (!league) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Visibility
      </h2>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">
            {league.isPublic ? "Public" : "Private"}
          </p>
          <p className="text-xs text-muted-foreground">
            {league.isPublic
              ? "Anyone can find and sign up for this league."
              : "Only people you invite can join this league."}
          </p>
        </div>
        <Switch
          checked={league.isPublic}
          onCheckedChange={(checked) =>
            updateSettings.mutate({
              leagueId: league.id,
              isPublic: checked,
            })
          }
          aria-label="Toggle league visibility"
        />
      </div>
    </section>
  );
};
