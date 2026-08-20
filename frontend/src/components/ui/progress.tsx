import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              percentage >= 80
                ? "hsl(0, 84%, 60%)"      // Red — high risk
                : percentage >= 50
                ? "hsl(38, 92%, 50%)"      // Amber — medium risk
                : "hsl(142, 71%, 45%)",    // Green — low risk
          }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
