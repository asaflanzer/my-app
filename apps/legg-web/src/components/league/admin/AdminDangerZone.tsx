import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const AdminDangerZone = () => {
  const { league } = useLeagueContext();
  const { deleteLeague } = useAdminContext();

  if (!league) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider">
        Danger Zone
      </h2>
      <div className="rounded-lg border border-destructive/30 p-4">
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <p className="text-sm font-medium">Delete this league</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete the league and all its data.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="xs">
                Delete League
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{league.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the league and all its data —
                  members, meetings, and match history. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteLeague.mutate({ leagueId: league.id })}
                  disabled={deleteLeague.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteLeague.isPending ? "Deleting..." : "Delete League"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
};
