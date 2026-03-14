import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { isAdmin } from "@/lib/admin";

export const AdminRoute = () => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin(session.user.email)) return <Navigate to="/" replace />;

  return <Outlet />;
};
