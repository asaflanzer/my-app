import { Link } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
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
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  done: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  not_started:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  done: "Done",
  not_started: "Not started",
};

export const HistoryPage = () => {
  const { data: session } = useSession();
  const { data: leagues = [] } = trpc.league.listWithStatus.useQuery(
    undefined,
    {
      enabled: !!session,
    },
  );

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto text-foreground pb-16">
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-[57px] z-40">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>History</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">History</h1>

        {leagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leagues found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6 px-2 text-xs">#</TableHead>
                <TableHead className="text-xs">League</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="w-28 text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagues.map((league, idx) => (
                <TableRow key={league.id}>
                  <TableCell className="text-muted-foreground text-xs px-2 py-2">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="py-2 text-[10px] truncate max-w-[180px] font-medium">
                    {league.name}
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded whitespace-nowrap text-[10px] font-medium ${STATUS_STYLES[league.status] ?? ""}`}
                    >
                      {STATUS_LABEL[league.status] ?? league.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      asChild
                    >
                      <Link to={`/history/${league.id}`}>View matches</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  );
};
