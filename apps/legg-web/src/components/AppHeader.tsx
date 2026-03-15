import { Menu, Sun, Moon, LogOut, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { useTheme } from "@/lib/use-theme";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
  const navigate = useNavigate();
  const headerHidden = useHideOnScroll();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!session,
  });

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: { onSuccess: () => window.location.replace("/") },
    });
  };

  return (
    <header
      className={`sticky top-0 z-50 flex items-center px-3 py-2 border-b border-border bg-background transition-transform duration-300 ${headerHidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <Drawer direction="left">
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="text-primary hover:text-primary hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <h1 className="ml-1 text-2xl font-bold text-primary uppercase tracking-widest">
          Legg
        </h1>
        <DrawerContent className="w-1/2 h-full top-0 left-0 mt-0 rounded-none bg-card border-r border-card-border text-card-foreground">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-primary text-2xl font-bold uppercase tracking-widest">
              Legg
            </DrawerTitle>
            {session?.user.name && (
              <p className="text-sm text-primary">
                Welcome,{" "}
                <span className="font-semibold text-primary">
                  {session.user.name.split(" ")[0]}
                </span>
                {` 👋`}
              </p>
            )}
          </DrawerHeader>
          <nav className="flex flex-col gap-1 py-4 h-full">
            {/* Leagues group */}
            <DrawerClose asChild>
              <Button
                variant="ghost"
                className="justify-start gap-2 hover:bg-muted/50"
                onClick={() => navigate("/leagues")}
              >
                <Trophy className="h-4 w-4" />
                Leagues
              </Button>
            </DrawerClose>
            {leagues && leagues.length > 0 && (
              <div className="flex flex-col gap-0.5 pl-6">
                {leagues.map((league) => (
                  <DrawerClose key={league.id} asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2 text-primary hover:bg-muted/50 hover:text-foreground h-8 text-xs"
                      onClick={() => navigate(`/league/${league.id}`)}
                    >
                      {league.name}
                    </Button>
                  </DrawerClose>
                ))}
              </div>
            )}

            <div className="mt-auto">
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 hover:bg-muted/50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </DrawerClose>
            </div>
          </nav>
        </DrawerContent>
      </Drawer>
      <div className="ml-auto flex items-center gap-2">
        <Sun className="h-4 w-4 text-yellow-500" />
        <Switch
          size="xs"
          checked={theme === "light"}
          onCheckedChange={toggleTheme}
          aria-label="Toggle theme"
        />
        <Moon className="h-4 w-4 text-slate-400" />
      </div>
    </header>
  );
};
