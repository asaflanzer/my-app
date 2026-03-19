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

export const MyLeaguesPage = () => {
  const { data: session } = useSession();
  const { data: leagues = [] } = trpc.league.list.useQuery(undefined, {
    enabled: !!session,
  });

  const hostedLeagues = leagues.filter(
    (l) => l.hostId === session?.user?.id,
  );

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto text-foreground pb-16">
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-[57px] z-40">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>My Leagues</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">My Leagues</h1>

        {hostedLeagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don't host any leagues yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6 px-2 text-xs">#</TableHead>
                <TableHead className="text-xs">League</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hostedLeagues.map((league, idx) => (
                <TableRow key={league.id}>
                  <TableCell className="text-muted-foreground text-xs px-2 py-2">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="py-2">
                    <Link
                      to={`/league/${league.id}/admin`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {league.name}
                    </Link>
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
