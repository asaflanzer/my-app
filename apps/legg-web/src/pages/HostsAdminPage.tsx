import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

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
              <BreadcrumbPage>Hosts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Manage Hosts</h1>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6 px-2 text-xs">#</TableHead>
              <TableHead className="text-xs">Host</TableHead>
              <TableHead className="text-xs">Leagues</TableHead>
              <TableHead className="w-12 text-xs text-center">
                Enabled
              </TableHead>
              <TableHead className="w-8 px-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hosts.map((host, idx) => (
              <TableRow key={host.id}>
                <TableCell className="text-muted-foreground text-xs px-2 py-2">
                  {idx + 1}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-col gap-0.5">
                    <EditableName host={host} />
                    <span className="text-xs text-neutral-500 leading-tight truncate max-w-[180px]">
                      {host.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  {host.leagues.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {host.leagues.map((l) => (
                        <span
                          key={l.id}
                          className="text-xs text-neutral-500 leading-tight"
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Switch
                    checked={host.enabled}
                    onCheckedChange={(enabled) =>
                      toggleEnabled.mutate({ hostId: host.id, enabled })
                    }
                    aria-label={`${host.enabled ? "Disable" : "Enable"} ${host.name}`}
                  />
                </TableCell>
                <TableCell className="px-1 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => revoke.mutate({ hostId: host.id })}
                    aria-label={`Remove ${host.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="text-muted-foreground text-xs px-2 py-2">
                {hosts.length + 1}
              </TableCell>
              <TableCell colSpan={4} className="py-2">
                <div className="flex flex-col gap-1.5">
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
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </main>
    </div>
  );
};
