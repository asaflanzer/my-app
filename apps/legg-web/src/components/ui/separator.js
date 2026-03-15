import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";
const Separator = React.forwardRef(({ className, orientation = "horizontal", decorative = true, variant = "default", type = "default", ...props }, ref) => {
    const isDashed = type === "dashed";
    const isSecondary = variant === "secondary";
    return (_jsx(SeparatorPrimitive.Root, { ref: ref, decorative: decorative, orientation: orientation, className: cn("shrink-0", isDashed
            ? [
                isSecondary ? "border-neutral-500" : "border-border",
                "border-dashed",
                orientation === "horizontal"
                    ? "h-0 w-full border-t"
                    : "h-full w-0 border-l",
            ]
            : [
                isSecondary ? "bg-neutral-500" : "bg-border",
                orientation === "horizontal"
                    ? "h-[1px] w-full"
                    : "h-full w-[1px]",
            ], className), ...props }));
});
Separator.displayName = SeparatorPrimitive.Root.displayName;
export { Separator };
