import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      wrap="soft"
      className={cn(
        "flex min-h-16 w-full max-w-full resize-y overflow-x-hidden whitespace-pre-wrap break-words rounded-none border border-input bg-background px-2.5 py-2 text-sm leading-relaxed text-foreground caret-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      suppressHydrationWarning
    />
  )
}

export { Textarea }
