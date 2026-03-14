import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import eightBallUrl from "@/assets/8ball.svg";

export const HomePage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/leagues" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
      <div
        className="h-24 w-24"
        style={{
          animation:
            "ball-drop 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        }}
      >
        <img
          src={eightBallUrl}
          alt="8 ball"
          className="h-full w-full"
          style={{
            animation: "ball-spin 1.2s ease-out forwards",
          }}
        />
      </div>

      <h1
        className="text-4xl font-bold tracking-widest text-white uppercase font-mono"
        style={{
          opacity: 0,
          animation: "fade-down 0.5s ease-out 1.2s forwards",
        }}
      >
        Legg
      </h1>
      <h2
        className="text-lg text-gray-400 uppercase tracking-widest"
        style={{
          opacity: 0,
          animation: "fade-down 0.5s ease-out 1.6s forwards",
        }}
      >
        <div className="flex items-center gap-2 font-mono">
          Pool League &amp; Tournaments
        </div>
      </h2>

      <div
        style={{
          opacity: 0,
          animation: "fade-up 0.4s ease-out 2s forwards",
        }}
      >
        <Button
          size="lg"
          className="px-12 text-base uppercase tracking-widest text-black font-mono"
          onClick={() => navigate("/login")}
        >
          Login
        </Button>
      </div>
    </div>
  );
};
