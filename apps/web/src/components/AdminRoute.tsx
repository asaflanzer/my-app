import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export const AdminRoute = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: me, isPending: mePending } = trpc.auth.me.useQuery(undefined, {
    enabled: !!session,
  });

  if (sessionPending || (!!session && mePending)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!me?.isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
};
