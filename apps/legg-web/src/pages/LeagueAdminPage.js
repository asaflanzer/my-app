import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronDown, ChevronUp, Loader, Pause, Pencil, Play, Plus, RotateCcw, Trash2, } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
const DatePicker = ({ label, value, onChange, }) => {
    const selected = value ? new Date(value) : undefined;
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { className: "text-xs font-normal text-muted-foreground", children: label }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: cn("w-44 justify-start text-left font-normal", !selected && "text-muted-foreground"), children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), selected ? format(selected, "PPP") : "Pick a date"] }) }), _jsx(PopoverContent, { className: "w-auto p-0", align: "start", children: _jsx(Calendar, { mode: "single", selected: selected, onSelect: (d) => onChange(d ? d.toISOString() : null), initialFocus: true }) })] })] }));
};
export const LeagueAdminPage = () => {
    const { leagueId } = useParams();
    const navigate = useNavigate();
    const { league, isLoading, refetch } = useLeagueContext();
    const [newEmail, setNewEmail] = useState("");
    const [meetingsOpen, setMeetingsOpen] = useState(true);
    const [playoffsOpen, setPlayoffsOpen] = useState(true);
    const [playersOpen, setPlayersOpen] = useState(true);
    const [tablesOpen, setTablesOpen] = useState(true);
    const [newTableNumber, setNewTableNumber] = useState("");
    const [editingTableId, setEditingTableId] = useState(null);
    const [editingTableNumber, setEditingTableNumber] = useState("");
    const [confirmComplete, setConfirmComplete] = useState(null);
    const utils = trpc.useUtils();
    const updateSettings = trpc.league.updateSettings.useMutation({
        onSuccess: () => {
            void utils.league.getById.invalidate();
        },
        onError: (e) => toast.error(e.message),
    });
    const addMember = trpc.league.addMember.useMutation({
        onSuccess: () => {
            refetch();
            setNewEmail("");
            toast("Player added!");
        },
        onError: (e) => toast.error(e.message),
    });
    const removeMember = trpc.league.removeMember.useMutation({
        onSuccess: () => refetch(),
        onError: (e) => toast.error(e.message),
    });
    const toggleDisabled = trpc.league.toggleDisabled.useMutation({
        onSuccess: () => refetch(),
        onError: (e) => toast.error(e.message),
    });
    const leagueTablesList = trpc.league.listTables.useQuery({ leagueId: leagueId }, { enabled: !!leagueId });
    const addTable = trpc.league.addTable.useMutation({
        onSuccess: () => {
            void utils.league.listTables.invalidate();
            setNewTableNumber("");
        },
        onError: (e) => toast.error(e.message),
    });
    const updateTable = trpc.league.updateTable.useMutation({
        onSuccess: () => {
            void utils.league.listTables.invalidate();
            setEditingTableId(null);
        },
        onError: (e) => toast.error(e.message),
    });
    const removeTable = trpc.league.removeTable.useMutation({
        onSuccess: () => void utils.league.listTables.invalidate(),
        onError: (e) => toast.error(e.message),
    });
    const meetingList = trpc.meeting.list.useQuery({ leagueId: leagueId }, { enabled: !!leagueId });
    const activateMeeting = trpc.meeting.activate.useMutation({
        onSuccess: () => {
            void utils.meeting.list.invalidate();
            toast("Meeting activated!");
            setTimeout(() => navigate(`/league/${leagueId}`), 1000);
        },
        onError: (e) => toast.error(e.message),
    });
    const pauseMeeting = trpc.meeting.togglePause.useMutation({
        onSuccess: () => void utils.meeting.list.invalidate(),
        onError: (e) => toast.error(e.message),
    });
    const completeMeeting = trpc.meeting.complete.useMutation({
        onSuccess: () => {
            void utils.meeting.list.invalidate();
            setConfirmComplete(null);
            toast("Meeting completed!");
        },
        onError: (e) => toast.error(e.message),
    });
    const resetMeetings = trpc.meeting.reset.useMutation({
        onSuccess: () => {
            void utils.meeting.list.invalidate();
            toast("Meetings reset!");
        },
        onError: (e) => toast.error(e.message),
    });
    if (isLoading || !league) {
        return (_jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) }));
    }
    const { members } = league;
    const regularMeetingsList = (meetingList.data ?? []).filter((m) => m.status !== "playoff");
    const activatedMeetings = regularMeetingsList.length;
    const activatedPlayoffs = (meetingList.data ?? []).filter((m) => m.status === "playoff").length;
    const canStartMeeting = !!league.startDate && !!league.maxPlayers;
    // Pre-populate all N meeting slots; find first non-done slot to highlight
    const allMeetingSlots = Array.from({ length: league.regularMeetings }, (_, i) => {
        const num = i + 1;
        const data = meetingList.data?.find((m) => m.meetingNumber === num) ?? null;
        return { meetingNumber: num, data };
    });
    const currentSlotIndex = allMeetingSlots.findIndex((s) => !s.data || s.data.status !== "completed");
    const lastRegularMeeting = regularMeetingsList[regularMeetingsList.length - 1];
    const allRegularMeetingsDone = activatedMeetings >= league.regularMeetings &&
        !!lastRegularMeeting &&
        lastRegularMeeting.status !== "active";
    const canActivatePlayoff = allRegularMeetingsDone && activatedPlayoffs === 0;
    const handleAddPlayer = () => {
        const trimmed = newEmail.trim();
        if (!trimmed || !leagueId)
            return;
        addMember.mutate({ leagueId, email: trimmed });
    };
    const startEditTable = (table) => {
        setEditingTableId(table.id);
        setEditingTableNumber(String(table.tableNumber));
    };
    const handleSaveTable = () => {
        const num = parseInt(editingTableNumber, 10);
        if (!editingTableId || isNaN(num) || num < 1 || !leagueId)
            return;
        updateTable.mutate({ leagueId, tableId: editingTableId, tableNumber: num });
    };
    const handleAddTable = () => {
        const num = parseInt(newTableNumber, 10);
        if (isNaN(num) || num < 1 || !leagueId)
            return;
        addTable.mutate({ leagueId, tableNumber: num });
    };
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50", children: _jsx(Breadcrumb, { children: _jsxs(BreadcrumbList, { children: [_jsx(BreadcrumbItem, { children: _jsx(BreadcrumbLink, { asChild: true, children: _jsx("button", { onClick: () => navigate("/leagues"), children: "Leagues" }) }) }), _jsx(BreadcrumbSeparator, {}), _jsx(BreadcrumbItem, { children: _jsx(BreadcrumbLink, { asChild: true, children: _jsx("button", { onClick: () => navigate(`/league/${leagueId}`), children: league.name }) }) }), _jsx(BreadcrumbSeparator, {}), _jsx(BreadcrumbItem, { children: _jsx(BreadcrumbPage, { children: "Admin" }) })] }) }) }), _jsxs("main", { className: "mx-auto max-w-2xl px-4 py-6 space-y-8", children: [_jsx("h1", { className: "text-2xl font-bold text-foreground uppercase tracking-widest", children: "Admin" }), _jsxs("section", { className: "space-y-4", children: [_jsx("h2", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wider", children: "League Schedule" }), _jsxs("div", { className: "flex flex-wrap gap-6", children: [_jsx(DatePicker, { label: "Start Date", value: league.startDate, onChange: (iso) => updateSettings.mutate({ leagueId: league.id, startDate: iso }) }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { className: "text-xs font-normal text-muted-foreground", children: "Start Time" }), _jsx(Input, { type: "time", value: league.startTime, onChange: (e) => updateSettings.mutate({
                                                    leagueId: league.id,
                                                    startTime: e.target.value,
                                                }), className: "w-32" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-6", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { className: "text-xs font-normal text-muted-foreground", children: "Meetings" }), _jsx(Input, { type: "number", min: 1, defaultValue: league.regularMeetings, onBlur: (e) => updateSettings.mutate({
                                                    leagueId: league.id,
                                                    regularMeetings: Math.max(1, Number(e.target.value)),
                                                }), className: "w-24" })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { className: "text-xs font-normal text-muted-foreground", children: "Playoff" }), _jsx(Input, { type: "number", min: 1, defaultValue: league.playoffMeetings, onBlur: (e) => updateSettings.mutate({
                                                    leagueId: league.id,
                                                    playoffMeetings: Math.max(1, Number(e.target.value)),
                                                }), className: "w-24" })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Label, { className: "text-xs font-normal text-muted-foreground", children: "Max players" }), _jsx(Input, { type: "number", min: 1, defaultValue: league.maxPlayers, onBlur: (e) => updateSettings.mutate({
                                                    leagueId: league.id,
                                                    maxPlayers: Math.max(1, Number(e.target.value)),
                                                }), className: "w-24" })] })] })] }), _jsx(Separator, {}), _jsxs("section", { className: "space-y-3", children: [_jsxs("div", { className: "flex w-full items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-0", children: [_jsx("h2", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-widest", children: "Meetings" }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-destructive ml-1", onClick: () => leagueId && resetMeetings.mutate({ leagueId }), disabled: resetMeetings.isPending, "aria-label": "Testing:Reset meetings", children: resetMeetings.isPending ? (_jsx(Loader, { className: "h-3.5 w-3.5 animate-spin" })) : (_jsx(RotateCcw, { className: "h-3.5 w-3.5 text-amber-500" })) })] }), _jsxs("button", { type: "button", className: "flex items-center gap-2 text-sm", onClick: () => setMeetingsOpen((o) => !o), children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-2xl font-bold text-muted-foreground", children: activatedMeetings }), _jsx("span", { className: "text-muted-foreground", children: "/" }), _jsx("span", { className: "font-bold", children: league.regularMeetings })] }), meetingsOpen ? (_jsx(ChevronUp, { className: "h-4 w-4 text-muted-foreground" })) : (_jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }))] })] }), meetingsOpen && (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "text-xs", children: "Meeting" }), _jsx(TableHead, { className: "text-xs", children: "Date" }), _jsx(TableHead, { className: "w-28 text-center text-xs px-2", children: "Status" }), _jsx(TableHead, { className: "w-16 px-1" })] }) }), _jsx(TableBody, { children: allMeetingSlots.map((slot, idx) => {
                                            const isCurrent = idx === currentSlotIndex;
                                            const meeting = slot.data;
                                            const status = meeting?.status ?? null;
                                            const isCompleted = status === "completed";
                                            const isStarted = !!meeting;
                                            const statusLabel = !isStarted
                                                ? "—"
                                                : status === "active"
                                                    ? "Active"
                                                    : status === "completed"
                                                        ? "Done"
                                                        : "Paused";
                                            return (_jsxs(TableRow, { className: isCurrent ? "bg-primary/5" : "", children: [_jsx(TableCell, { className: "py-2", children: _jsxs("span", { className: cn("text-sm text-left whitespace-nowrap", isCurrent
                                                                ? "font-semibold"
                                                                : "font-medium text-muted-foreground", meeting &&
                                                                "cursor-pointer hover:underline hover:text-foreground"), onClick: () => meeting &&
                                                                navigate(`/league/${leagueId}/meeting/${meeting.id}`), children: ["Meeting #", slot.meetingNumber] }) }), _jsx(TableCell, { className: "text-xs text-muted-foreground px-2 py-2 whitespace-nowrap", children: meeting?.createdAt
                                                            ? format(new Date(meeting.createdAt), "dd.MM.yyyy")
                                                            : "—" }), _jsx(TableCell, { className: "text-center px-2 py-2", children: _jsx("span", { className: cn("text-xs font-medium", status === "active"
                                                                ? "text-primary"
                                                                : "text-muted-foreground"), children: statusLabel }) }), _jsx(TableCell, { className: "px-1 py-2", children: !isCompleted && (_jsxs("div", { className: "flex items-center gap-0.5", children: [!isStarted ? (isCurrent && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-foreground", onClick: () => leagueId &&
                                                                        activateMeeting.mutate({ leagueId }), disabled: activateMeeting.isPending ||
                                                                        !canStartMeeting, "aria-label": "Start meeting", children: activateMeeting.isPending ? (_jsx(Loader, { className: "h-3.5 w-3.5 animate-spin" })) : (_jsx(Play, { className: "h-3.5 w-3.5" })) }))) : (_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-foreground", onClick: () => leagueId &&
                                                                        meeting &&
                                                                        pauseMeeting.mutate({
                                                                            leagueId,
                                                                            meetingId: meeting.id,
                                                                        }), disabled: pauseMeeting.isPending, "aria-label": status === "active" ? "Pause" : "Resume", children: status === "active" ? (_jsx(Pause, { className: "h-3.5 w-3.5" })) : (_jsx(Play, { className: "h-3.5 w-3.5" })) })), isStarted && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-primary", onClick: () => meeting &&
                                                                        setConfirmComplete({
                                                                            id: meeting.id,
                                                                            meetingNumber: slot.meetingNumber,
                                                                        }), "aria-label": "Mark done", children: _jsx(Check, { className: "h-3.5 w-3.5" }) }))] })) })] }, slot.meetingNumber));
                                        }) })] }))] }), _jsx(Separator, {}), _jsxs("section", { className: "space-y-3", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between", onClick: () => setPlayoffsOpen((o) => !o), children: [_jsx("h2", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-widest", children: "Playoffs" }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-2xl font-bold text-muted-foreground", children: activatedPlayoffs }), _jsx("span", { className: "text-muted-foreground", children: "/" }), _jsx("span", { className: "font-bold", children: league.playoffMeetings })] }), playoffsOpen ? (_jsx(ChevronUp, { className: "h-4 w-4 text-muted-foreground" })) : (_jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }))] })] }), playoffsOpen && (_jsxs(_Fragment, { children: [_jsx(Button, { disabled: !canActivatePlayoff, size: "sm", className: "w-full text-xs", children: "Activate Playoff #1" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Playoff format coming soon." })] }))] }), _jsx(Separator, {}), _jsxs("section", { className: "space-y-3", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between", onClick: () => setPlayersOpen((o) => !o), children: [_jsx("h2", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-widest", children: "Players" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-2xl font-bold text-muted-foreground", children: members.length }), "/", _jsx("span", { className: "font-bold", children: league.maxPlayers })] }), playersOpen ? (_jsx(ChevronUp, { className: "h-4 w-4 text-muted-foreground" })) : (_jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }))] })] }), playersOpen && (_jsx(_Fragment, { children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-6 px-2 text-xs", children: "#" }), _jsx(TableHead, { className: "text-xs", children: "Name" }), _jsx(TableHead, { className: "w-14 text-center text-xs px-2", children: "Active" }), _jsx(TableHead, { className: "w-8 px-1" })] }) }), _jsxs(TableBody, { children: [members.map((member, idx) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-muted-foreground text-xs px-2 py-2", children: idx + 1 }), _jsx(TableCell, { className: "py-2", children: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: cn("text-sm font-medium leading-tight", member.disabled &&
                                                                            "line-through text-muted-foreground"), children: member.userName }), _jsx("span", { className: "text-xs text-neutral-500 leading-tight truncate max-w-[180px]", children: member.userEmail })] }) }), _jsx(TableCell, { className: "text-center px-2 py-2", children: _jsx(Switch, { size: "xs", checked: !member.disabled, onCheckedChange: () => leagueId &&
                                                                    toggleDisabled.mutate({
                                                                        leagueId,
                                                                        memberId: member.id,
                                                                    }), "aria-label": `Toggle ${member.userName}` }) }), _jsx(TableCell, { className: "px-1 py-2", children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-destructive", onClick: () => leagueId &&
                                                                    removeMember.mutate({
                                                                        leagueId,
                                                                        memberId: member.id,
                                                                    }), "aria-label": `Remove ${member.userName}`, children: _jsx(Trash2, { className: "h-3 w-3" }) }) })] }, member.id))), _jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-muted-foreground text-xs px-2 py-2", children: members.length + 1 }), _jsx(TableCell, { colSpan: 3, className: "py-2", children: _jsxs("div", { className: "relative", children: [_jsx(Input, { placeholder: "Email address", type: "email", maxLength: 255, value: newEmail, onChange: (e) => setNewEmail(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleAddPlayer(), className: "h-8 text-sm pr-9" }), _jsx(Button, { variant: "ghost", size: "icon", className: "absolute right-0 top-0 h-8 w-8", onClick: handleAddPlayer, disabled: !newEmail.trim() || addMember.isPending, "aria-label": "Add player", children: _jsx(Plus, { className: "h-4 w-4" }) })] }) })] })] })] }) }))] }), _jsx(Separator, {}), _jsxs("section", { className: "space-y-3", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between", onClick: () => setTablesOpen((o) => !o), children: [_jsx("h2", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-widest", children: "Tables" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl font-bold text-muted-foreground", children: leagueTablesList.data?.length ?? 0 }), tablesOpen ? (_jsx(ChevronUp, { className: "h-4 w-4 text-muted-foreground" })) : (_jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }))] })] }), tablesOpen && (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "text-xs", children: "Id" }), _jsx(TableHead, { className: "text-xs", children: "Table Number" }), _jsx(TableHead, { className: "w-16 px-1" })] }) }), _jsxs(TableBody, { children: [(leagueTablesList.data ?? []).map((t, idx) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-muted-foreground text-xs px-2 py-2 truncate max-w-[80px]", children: idx + 1 }), _jsx(TableCell, { className: "py-2", children: editingTableId === t.id ? (_jsx(Input, { type: "number", min: 1, value: editingTableNumber, onChange: (e) => setEditingTableNumber(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSaveTable(), className: "h-8 text-sm w-20" })) : (_jsx("span", { className: "text-sm font-medium", children: t.tableNumber })) }), _jsx(TableCell, { className: "px-1 py-2", children: _jsxs("div", { className: "flex items-center gap-0.5", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-foreground", onClick: () => editingTableId === t.id
                                                                        ? handleSaveTable()
                                                                        : startEditTable(t), "aria-label": editingTableId === t.id ? "Save" : "Edit", children: editingTableId === t.id ? (_jsx(Check, { className: "h-3 w-3" })) : (_jsx(Pencil, { className: "h-3 w-3 text-neutral-500" })) }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-muted-foreground hover:text-destructive", onClick: () => leagueId &&
                                                                        removeTable.mutate({ leagueId, tableId: t.id }), "aria-label": `Remove table ${t.tableNumber}`, children: _jsx(Trash2, { className: "h-3 w-3 text-neutral-500" }) })] }) })] }, t.id))), _jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-muted-foreground text-xs px-2 py-2", children: (leagueTablesList.data?.length ?? 0) + 1 }), _jsx(TableCell, { colSpan: 2, className: "py-2", children: _jsxs("div", { className: "flex justify-between items-center gap-2", children: [_jsx(Input, { placeholder: "Table Number", type: "number", min: 1, value: newTableNumber, onChange: (e) => setNewTableNumber(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleAddTable(), className: "h-8 text-sm pr-9 w-36" }), _jsx(Button, { variant: "ghost", size: "icon", onClick: handleAddTable, disabled: !newTableNumber.trim() || addTable.isPending, "aria-label": "Add table", children: _jsx(Plus, { className: "h-4 w-4" }) })] }) })] })] })] }))] })] }), confirmComplete !== null && (_jsx("div", { onClick: () => setConfirmComplete(null), className: "fixed inset-0 bg-black/80 flex items-end z-[100]", children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full sm:max-w-sm sm:mx-auto bg-card border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8 space-y-4", children: [_jsx("div", { className: "text-center text-lg font-extrabold", children: "End Meeting?" }), _jsxs("p", { className: "text-center text-sm text-muted-foreground", children: ["Are you sure you wish to end Meeting #", confirmComplete.meetingNumber, "?"] }), _jsx(Button, { onClick: () => leagueId &&
                                completeMeeting.mutate({
                                    leagueId,
                                    meetingId: confirmComplete.id,
                                }), disabled: completeMeeting.isPending, className: "w-full", children: completeMeeting.isPending ? (_jsx(Loader, { className: "h-4 w-4 animate-spin" })) : ("Yes, end meeting") }), _jsx(Button, { variant: "ghost", className: "w-full text-muted-foreground", onClick: () => setConfirmComplete(null), children: "Cancel" })] }) }))] }));
};
