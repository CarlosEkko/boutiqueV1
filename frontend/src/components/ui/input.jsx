import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, onFocus, ...props }, ref) => {
  const handleFocus = React.useCallback((e) => {
    // Auto-select content on focus for number inputs — eliminates the need to manually delete "0"
    if (type === "number" || e.target.inputMode === "decimal") {
      e.target.select();
    }
    onFocus?.(e);
  }, [type, onFocus]);

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onFocus={handleFocus}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
