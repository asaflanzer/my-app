import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Host {
  id: string;
  userId: string;
  enabled: boolean;
  name: string;
  email: string;
  leagues: { id: string; name: string }[];
}

const EditableName = ({ host }: { host: Host }) => {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(host.name);

  const updateName = trpc.hosts.updateName.useMutation({
    onSuccess: () => utils.hosts.list.invalidate(),
    onError: () => setValue(host.name),
  });

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== host.name) {
      updateName.mutate({ userId: host.userId, name: trimmed });
    } else {
      setValue(host.name);
    }
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(host.name);
            setEditing(false);
          }
        }}
        className="h-6 text-sm font-medium px-1 py-0 border-0 border-b rounded-none focus-visible:ring-0 w-full"
      />
    );
  }

  return (
    <span
      className="text-sm font-medium leading-tight cursor-pointer hover:underline"
      onClick={() => setEditing(true)}
      title="Click to edit name"
    >
      {host.name}
    </span>
  );
};

export const HostsAdminPage = () => {
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [leaguesDialogHost, setLeaguesDialogHost] = useState<Host | null>(null);

  const { data: hosts = [], refetch } = trpc.hosts.list.useQuery();

  const grant = trpc.hosts.grant.useMutation({
    onSuccess: () => {
      setNewEmail("");
      setNewName("");
      refetch();
    },
  });

  const revoke = trpc.hosts.revoke.useMutation({
    onSuccess: () => refetch(),
  });

  const toggleEnabled = trpc.hosts.toggleEnabled.useMutation({
    onSuccess: () => refetch(),
  });

  const handleAdd = () => {
    const email = newEmail.trim();
    if (!email) return;
    grant.mutate({ email, name: newName.trim() || undefined });
  };

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto text-foreground pb-16">
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-[57px] z-40">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Manage Hosts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Manage Hosts</h1>

        <div className="flex flex-col divide-y divide-border border rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
            <span className="w-6 shrink-0">#</span>
            <span className="flex-1">Host</span>
            <span className="w-20 text-center">Leagues</span>
            <span className="w-12 text-center">Enabled</span>
            <span className="w-8" />
          </div>

          {hosts.map((host, idx) => (
            <div key={host.id} className="flex items-center gap-3 px-3 py-3">
              <span className="w-6 shrink-0 text-xs text-muted-foreground">{idx + 1}</span>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <EditableName host={host} />
                <span className="text-[10px] text-neutral-500 leading-tight truncate">
                  {host.email}
                </span>
              </div>
              <div className="w-20 flex justify-center">
                {host.leagues.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setLeaguesDialogHost(host)}
                  >
                    View ({host.leagues.length})
                  </Button>
                )}
              </div>
              <div className="w-12 flex justify-center">
                <Switch
                  checked={host.enabled}
                  onCheckedChange={(enabled) =>
                    toggleEnabled.mutate({ hostId: host.id, enabled })
                  }
                  aria-label={`${host.enabled ? "Disable" : "Enable"} ${host.name}`}
                />
              </div>
              <div className="w-8 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => revoke.mutate({ hostId: host.id })}
                  aria-label={`Remove ${host.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-start gap-3 px-3 py-3">
            <span className="w-6 shrink-0 text-xs text-muted-foreground pt-2">{hosts.length + 1}</span>
            <div className="flex-1 flex flex-col gap-1.5">
              <Input
                placeholder="Name"
                type="text"
                maxLength={100}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Email address"
                type="email"
                maxLength={255}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-8 text-sm"
              />
              <Button
                className="w-full h-8"
                onClick={handleAdd}
                disabled={!newEmail.trim() || grant.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Host
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={leaguesDialogHost !== null}
        onOpenChange={(open) => !open && setLeaguesDialogHost(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{leaguesDialogHost?.name}'s Leagues</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 pt-2">
            {leaguesDialogHost?.leagues.map((l) => (
              <Link
                key={l.id}
                to={`/league/${l.id}`}
                className="text-sm text-primary hover:underline py-1"
                onClick={() => setLeaguesDialogHost(null)}
              >
                {l.name}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
