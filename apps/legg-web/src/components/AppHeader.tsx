import { Menu, User, Sun, Moon, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth-client";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import eightBallUrl from "@/assets/8ball.svg";

export const AppHeader = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: { onSuccess: () => window.location.replace("/login") },
    });
  };

  return (
    <header className="flex items-center px-3 py-2 border-b border-border bg-background">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="text-primary hover:text-primary hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <h1 className="ml-1 text-2xl font-bold text-primary uppercase tracking-widest font-mono">
          Legg
        </h1>
        <DropdownMenuContent
          align="start"
          className="w-auto bg-[#101810] border-[#1a2518] text-[#dde8dd]"
        >
          <DropdownMenuItem
            onClick={() => navigate("/league/lincoln-tlv/admin")}
            className="focus:bg-emerald-900/40 focus:text-emerald-200"
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1a2518]" />
          <DropdownMenuItem
            onClick={() => navigate("/profile")}
            className="focus:bg-emerald-900/40 focus:text-emerald-200"
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1a2518]" />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="focus:bg-emerald-900/40 focus:text-emerald-200"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ml-auto flex items-center gap-2">
        <Sun className="h-4 w-4 text-yellow-500" />
        <Switch
          checked={theme === "light"}
          onCheckedChange={toggleTheme}
          aria-label="Toggle theme"
        />
        <Moon className="h-4 w-4 text-slate-400" />
      </div>
    </header>
  );
};
