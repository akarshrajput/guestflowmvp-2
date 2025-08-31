import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

type KanbanColumnProps = {
  title: string
  count: number
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children: React.ReactNode
  onAddClick?: () => void
  className?: string
}

export function KanbanColumn({
  title,
  count,
  variant = 'default',
  children,
  onAddClick,
  className,
}: KanbanColumnProps) {
  return (
    <div className={cn("flex flex-col flex-1 min-w-[300px] max-w-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <Badge variant={variant} className="rounded-full px-2.5">
            {count}
          </Badge>
        </div>
        {onAddClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onAddClick}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add new {title.toLowerCase()} ticket</span>
          </Button>
        )}
      </div>
      <div className="space-y-3 overflow-y-auto flex-1 pb-4">
        {children}
      </div>
    </div>
  )
}
