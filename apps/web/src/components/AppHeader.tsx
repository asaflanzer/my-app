import {
  Sun,
  Moon,
  Menu,
  X,
  Calendar,
  CalendarDays,
  Shield,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/lib/use-theme";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const useHideOnScroll = () => {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY.current && y > 60);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
};

export const AppHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerHidden = useHideOnScroll();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!session });

  const navTo = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 flex items-center px-3 py-2 border-b border-border bg-background transition-transform duration-300 ${headerHidden ? "-translate-y-full" : "translate-y-0"}`}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="text-primary hover:text-primary hover:bg-muted"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="ml-1 text-2xl font-bold text-primary uppercase tracking-widest">
          Legg
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Sun
            className={`h-4 w-4 ${theme === "dark" ? "text-slate-400" : "text-yellow-500"}`}
          />
          <Switch
            size="xs"
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            aria-label="Toggle theme"
          />
          <Moon
            className={`h-4 w-4 ${theme === "dark" ? "text-yellow-500" : "text-slate-400"}`}
          />
        </div>
      </header>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-1/2 max-w-xs flex flex-col bg-popover border-r border-border text-card-foreground shadow-xl transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-2xl font-bold text-primary uppercase tracking-widest">
            Legg
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {session?.user?.name && (
          <p className="px-4 pt-3 text-sm text-primary">
            Welcome,{" "}
            <span className="font-semibold">
              {session.user.name.split(" ")[0]}
            </span>
            {" 👋"}
          </p>
        )}

        <nav className="flex flex-col gap-1 py-4 px-2">
          <Button
            variant="ghost"
            className="justify-start gap-2 hover:bg-muted/50"
            onClick={() => navTo("/tournaments")}
          >
            <Calendar className="h-4 w-4" />
            Events
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 hover:bg-muted/50"
            onClick={() => navTo("/dashboard")}
          >
            <CalendarDays className="h-4 w-4" />
            My Events
          </Button>
          {me?.isAdmin && (
            <Button
              variant="ghost"
              className="justify-start gap-2 hover:bg-muted/50"
              onClick={() => navTo("/admin")}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          )}
        </nav>
        <div className="mt-auto px-2 pb-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 hover:bg-muted/50"
            onClick={() => {
              signOut();
              setMenuOpen(false);
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
};
