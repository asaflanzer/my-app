"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
const switchSizeStyles = {
    xs: {
        root: "h-4 w-7",
        thumb: "h-3 w-3 data-[state=checked]:translate-x-3",
    },
    default: {
        root: "h-6 w-11",
        thumb: "h-5 w-5 data-[state=checked]:translate-x-5",
    },
};
const Switch = React.forwardRef(({ className, size = "default", ...props }, ref) => (_jsx(SwitchPrimitives.Root, { className: cn("peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[hsl(var(--btn-primary))] data-[state=unchecked]:bg-input", switchSizeStyles[size].root, className), ...props, ref: ref, children: _jsx(SwitchPrimitives.Thumb, { className: cn("pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0", switchSizeStyles[size].thumb) }) })));
Switch.displayName = SwitchPrimitives.Root.displayName;
export { Switch };
