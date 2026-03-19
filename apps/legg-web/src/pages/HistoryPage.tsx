import { Link } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
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
          <div className="divide-y divide-border">
            {leagues.map((league, idx) => (
              <div key={league.id} className="flex items-center gap-2 py-2.5">
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                  #{idx + 1}
                </span>
                <span className="flex-1 text-xs font-medium truncate min-w-0">
                  <Button
                    variant="link"
                    size="sm"
                    className="shrink-0 h-7 px-2 text-xs"
                    asChild
                  >
                    <Link to={`/league/${league.id}`}>{league.name}</Link>
                  </Button>
                </span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[league.status] ?? ""}`}
                >
                  {STATUS_LABEL[league.status] ?? league.status}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-7 px-2 text-xs"
                  asChild
                >
                  <Link to={`/history/${league.id}`}>View matches</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
