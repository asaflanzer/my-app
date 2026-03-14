import { Navigate, useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: { onSuccess: () => window.location.replace("/login") },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-8 py-4">
        <span className="text-xl font-bold">Game On</span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-4xl font-bold">
          Welcome, {session.user.name ?? session.user.email}
        </h1>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="lg" onClick={() => navigate("/tournaments")}>Join Tournament</Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/create-tournament")}>
            Host Tournament
          </Button>
        </div>
      </main>
    </div>
  );
};
