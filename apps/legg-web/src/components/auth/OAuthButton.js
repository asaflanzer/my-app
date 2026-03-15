import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
const PROVIDER_ICONS = {
    google: "G",
    facebook: "f",
    apple: "",
};
export const OAuthButton = ({ provider, label, callbackURL = `${window.location.origin}/` }) => {
    const handleClick = async () => {
        try {
            const result = await signIn.social({ provider, callbackURL });
            if (result?.error) {
                if (import.meta.env.DEV)
                    console.error(`[${provider} sign-in error]`, result.error);
                alert("Sign-in failed. Please try again.");
            }
        }
        catch (err) {
            if (import.meta.env.DEV)
                console.error(`[${provider} sign-in exception]`, err);
            alert("Sign-in failed. Please try again.");
        }
    };
    return (_jsxs(Button, { variant: "outline", className: "w-full gap-3", onClick: handleClick, children: [_jsx("span", { className: "flex h-5 w-5 items-center justify-center font-bold text-sm", children: PROVIDER_ICONS[provider] }), label] }));
};
