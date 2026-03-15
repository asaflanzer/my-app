import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
export const AdminRoute = () => {
    const { data: session, isPending: sessionPending } = useSession();
    const { data: me, isPending: mePending } = trpc.auth.me.useQuery(undefined, {
        enabled: !!session,
    });
    if (sessionPending || (!!session && mePending)) {
        return (_jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) }));
    }
    if (!session)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (!me?.isAdmin)
        return _jsx(Navigate, { to: "/", replace: true });
    return _jsx(Outlet, {});
};
