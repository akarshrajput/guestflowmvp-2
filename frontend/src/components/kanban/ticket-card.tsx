import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Clock, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Priority = 'low' | 'medium' | 'high'

type TicketCardProps = {
  id: string
  title: string
  description?: string
  priority: Priority
  status: 'raised' | 'in_progress' | 'completed'
  roomNumber: string
  roomType?: string
  guestName: string
  guestAvatar?: string
  messagesCount: number
  updatedAt: string
  onClick?: () => void
  className?: string
}
const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function TicketCard({
  id,
  title,
  description,
  priority,
  status,
  roomNumber,
  roomType,
  guestName,
  guestAvatar,
  messagesCount,
  updatedAt,
  onClick,
  className,
}: TicketCardProps) {
  const statusColors = {
    raised: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const statusLabels = {
    raised: 'Raised',
    in_progress: 'In Progress',
    completed: 'Completed',
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md hover:border-primary/50 dark:hover:border-primary/70",
        className
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <h4 className="font-medium text-sm line-clamp-2">{title}</h4>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium rounded-full px-2 py-0.5",
              statusColors[status]
            )}
          >
            {statusLabels[status]}
          </Badge>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              priorityColors[priority || 'low']
            )}>
              {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Low'}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              {messagesCount}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
              Room {roomNumber}
            </div>
            {roomType && (
              <div className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                {roomType}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t mt-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={guestAvatar} alt={guestName} />
              <AvatarFallback className="text-xs">
                {guestName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{guestName}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
