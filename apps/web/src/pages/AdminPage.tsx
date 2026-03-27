import { UserCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const AdminPage = () => {
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();
  const utils = trpc.useUtils();

  const toggleActive = trpc.admin.toggleActive.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  const toggleHost = trpc.admin.toggleHost.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
      <h2 className="text-xl font-bold">Users</h2>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      )}

      {users?.map((user) => (
        <div
          key={user.id}
          className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
        >
          {/* User identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  {user.name ? getInitials(user.name) : <UserCircle className="h-5 w-5" />}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6 border-t border-border pt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Switch
                checked={user.isActive}
                onCheckedChange={() =>
                  toggleActive.mutate({ userId: user.id })
                }
                disabled={toggleActive.isPending}
              />
              <span className={user.isActive ? "" : "text-muted-foreground"}>
                Active
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Switch
                checked={user.isHost}
                onCheckedChange={() =>
                  toggleHost.mutate({ userId: user.id })
                }
                disabled={toggleHost.isPending}
              />
              <span className={user.isHost ? "" : "text-muted-foreground"}>
                Host
              </span>
            </label>
          </div>
        </div>
      ))}

      {!isLoading && users?.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No users yet.</p>
      )}
    </div>
  );
};
