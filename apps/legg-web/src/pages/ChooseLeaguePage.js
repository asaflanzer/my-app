import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { AppHeader } from "@/components/AppHeader";
export const ChooseLeaguePage = () => {
    const navigate = useNavigate();
    const { data: session, isPending } = useSession();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [selectedLeagueId, setSelectedLeagueId] = useState("");
    const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!session });
    const { data: leagues, isLoading: leaguesLoading } = trpc.league.list.useQuery(undefined, { enabled: !!session });
    const { data: availableLeagues, isLoading: availableLoading } = trpc.league.listAvailable.useQuery(undefined, { enabled: !!session });
    useEffect(() => {
        if (availableLeagues && availableLeagues.length > 0 && !selectedLeagueId) {
            setSelectedLeagueId(availableLeagues[0].id);
        }
    }, [availableLeagues, selectedLeagueId]);
    const createLeague = trpc.league.create.useMutation({
        onSuccess: (data) => {
            toast("League created!");
            navigate(`/league/${data.id}`);
        },
        onError: (e) => toast.error(e.message),
    });
    const signUp = trpc.league.signUp.useMutation({
        onSuccess: () => {
            toast("Signed up! Waiting for host approval.");
        },
        onError: (e) => toast.error(e.message),
    });
    if (isPending) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-background", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) }));
    }
    if (!session) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    const canCreateLeague = me?.isAdmin ?? false;
    return (_jsxs("div", { className: "flex min-h-screen flex-col bg-background", children: [_jsx(AppHeader, {}), _jsxs("div", { className: "flex flex-1 flex-col items-center px-4 pt-8 gap-8", children: [leaguesLoading ? (_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" })) : leagues && leagues.length > 0 ? (_jsxs("div", { className: "w-full max-w-sm space-y-3 px-8", children: [_jsx("p", { className: "text-sm text-neutral-500 uppercase tracking-widest text-center", children: "Your Leagues" }), leagues.map((league) => (_jsx(Button, { size: "sm", onClick: () => navigate(`/league/${league.id}`), className: "w-full", children: _jsx("div", { className: "text-foreground", children: league.name }) }, league.id)))] })) : (_jsx("p", { className: "text-neutral-500 text-sm", children: "You're not in any leagues yet." })), !availableLoading &&
                        availableLeagues &&
                        availableLeagues.length > 0 && (_jsxs("div", { className: "w-full max-w-sm space-y-3 px-8", children: [_jsx("p", { className: "text-sm text-muted-foreground uppercase tracking-widest text-center", children: "Join a League" }), _jsxs("div", { className: "space-y-2", children: [_jsx("select", { value: selectedLeagueId, onChange: (e) => setSelectedLeagueId(e.target.value), className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground", children: availableLeagues.map((league) => (_jsx("option", { value: league.id, children: league.name }, league.id))) }), _jsx(Button, { size: "sm", className: "w-full", disabled: !selectedLeagueId || signUp.isPending, onClick: () => selectedLeagueId &&
                                            signUp.mutate({ leagueId: selectedLeagueId }), children: signUp.isPending ? "Signing up…" : "Sign up" })] })] })), _jsx("div", { className: "w-full max-w-sm space-y-3 px-8 mt-auto pb-8", children: canCreateLeague &&
                            (!showCreate ? (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => setShowCreate(true), className: "gap-2 w-full", children: [_jsx(Plus, { className: "h-4 w-4" }), " Host a League"] })) : (_jsxs("div", { className: "w-full max-w-sm space-y-4 bg-card border border-card-border rounded-xl p-5", children: [_jsx("h2", { className: "font-bold text-sm uppercase tracking-widest", children: "New League" }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "League Name" }), _jsx(Input, { placeholder: "e.g. Lincoln TLV", value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => {
                                                    const slug = name
                                                        .trim()
                                                        .toLowerCase()
                                                        .replace(/[^a-z0-9]+/g, "-")
                                                        .replace(/^-|-$/g, "");
                                                    createLeague.mutate({ name, slug });
                                                }, disabled: !name.trim() || createLeague.isPending, className: "flex-1", children: createLeague.isPending ? "Creating…" : "Create" }), _jsx(Button, { variant: "ghost", onClick: () => setShowCreate(false), children: "Cancel" })] })] }))) })] })] }));
};
