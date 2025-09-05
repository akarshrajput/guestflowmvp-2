'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface Ticket {
  _id: string;
  room: string | {
    _id: string;
    number: string;
    type?: string;
    floor?: number;
  };
  roomNumber: string;
  category?: 'reception' | 'housekeeping' | 'porter' | 'concierge' | 'service_fb' | 'maintenance';
  guestInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  status: 'raised' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  messages: Array<{
    _id: string;
    content: string;
    sender: 'guest' | 'manager';
    senderName: string;
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const statuses = [
  { value: 'raised', label: 'Raised' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>({
    raised: [],
    in_progress: [],
    completed: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await apiClient.get('/tickets');
      // The API returns { success: boolean, count: number, data: Ticket[] }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const ticketsData = response.data.data;
        
        // Group tickets by status
        const groupedTickets = ticketsData.reduce((acc: Record<string, Ticket[]>, ticket: Ticket) => {
          if (!acc[ticket.status]) {
            acc[ticket.status] = [];
          }
          acc[ticket.status].push(ticket);
          return acc;
        }, { raised: [], in_progress: [], completed: [] });
        
        setTickets(groupedTickets);
      } else {
        console.error('Unexpected API response format:', response.data);
        toast.error('Failed to load tickets: Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category?: Ticket['category']) => {
    switch (category) {
      case 'reception': return 'Reception';
      case 'housekeeping': return 'Housekeeping';
      case 'porter': return 'Porter';
      case 'concierge': return 'Concierge';
      case 'service_fb': return 'Service (F&B)';
      case 'maintenance': return 'Maintenance';
      default: return 'Reception';
    }
  };

  const getCategoryColor = (category?: Ticket['category']) => {
    switch (category) {
      case 'reception': return 'bg-purple-100 text-purple-800';
      case 'housekeeping': return 'bg-teal-100 text-teal-800';
      case 'porter': return 'bg-sky-100 text-sky-800';
      case 'concierge': return 'bg-pink-100 text-pink-800';
      case 'service_fb': return 'bg-orange-100 text-orange-800';
      case 'maintenance': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const inferCategory = (ticket: Ticket): Ticket['category'] => {
    if (ticket.category) return ticket.category;
    const text = `${ticket.messages?.map(m => m.content).join(' ') || ''} ${ticket.roomNumber || ''}`.toLowerCase();
    if (/(clean|towel|linen|sheet|housekeep|trash|amenit)/.test(text)) return 'housekeeping';
    if (/(luggage|baggage|bags|bell ?(boy|hop)|porter|trolley|cart|carry|help with bags)/.test(text)) return 'porter';
    if (/(break|broken|leak|ac|heater|hvac|power|door|plumb|fix|repair|not working|maintenance)/.test(text)) return 'maintenance';
    if (/(food|breakfast|dinner|lunch|menu|order|restaurant|bar|drink|beverage|room service)/.test(text)) return 'service_fb';
    if (/(taxi|uber|cab|transport|reservation|book|tour|attraction|recommend|directions|concierge)/.test(text)) return 'concierge';
    if (/(check[- ]?in|check[- ]?out|bill|payment|key|card|front desk|reception)/.test(text)) return 'reception';
    return 'reception';
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await apiClient.put(`/tickets/${ticketId}/status`, { status: newStatus });
      // Refetch tickets to update the UI
      fetchTickets();
      toast.success('Ticket status updated');
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const filteredTickets = Object.entries(tickets).flatMap(([status, tickets]) => {
    if (filterStatus && status !== filterStatus) return [];
    return tickets
      .filter(ticket => {
        const matchesSearch = ticket.guestInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (ticket.messages[0]?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !filterPriority || ticket.priority === filterPriority;
        return matchesSearch && matchesPriority;
      })
      .map(ticket => ({
        ...ticket,
        status: status as 'raised' | 'in_progress' | 'completed'
      }));
  });

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: 'Low', variant: 'default' },
      medium: { label: 'Medium', variant: 'secondary' },
      high: { label: 'High', variant: 'destructive' },
    } as const;

    const priorityInfo = priorityMap[priority as keyof typeof priorityMap] || { label: priority, variant: 'default' };
    
    return (
      <Badge variant={priorityInfo.variant as any}>
        {priorityInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-6 h-6" />
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tickets..."
              className="pl-8 sm:w-[200px] md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-semibold">Status</div>
                {statuses.map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    className={filterStatus === status.value ? 'bg-accent' : ''}
                    onSelect={() => setFilterStatus(filterStatus === status.value ? null : status.value)}
                  >
                    {status.label}
                  </DropdownMenuItem>
                ))}
                <div className="px-2 py-1.5 text-sm font-semibold mt-2">Priority</div>
                {['low', 'medium', 'high'].map((priority) => (
                  <DropdownMenuItem
                    key={priority}
                    className={filterPriority === priority ? 'bg-accent' : ''}
                    onSelect={() => setFilterPriority(filterPriority === priority ? null : priority)}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </DropdownMenuItem>
                ))}
                {(filterStatus || filterPriority) && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <DropdownMenuItem onSelect={() => {
                      setFilterStatus(null);
                      setFilterPriority(null);
                    }}>
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => router.push('/tickets/new')}>
              <Plus className="mr-2 h-4 w-4" /> New Ticket
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket._id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/tickets/${ticket._id}`)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{ticket.guestInfo.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={`${getCategoryColor(inferCategory(ticket))} border-0`}>
                    {getCategoryLabel(inferCategory(ticket))}
                  </Badge>
                  <Badge variant={ticket.status === 'raised' ? 'default' : ticket.status === 'in_progress' ? 'secondary' : 'outline'}>
                    {ticket.status === 'raised' ? 'Raised' : ticket.status === 'in_progress' ? 'In Progress' : 'Completed'}
                  </Badge>
                  <Badge variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'default' : 'outline'}>
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {ticket.messages[0]?.content?.substring(0, 100)}{ticket.messages[0]?.content?.length > 100 ? '...' : ''}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{ticket.messages.length} {ticket.messages.length === 1 ? 'message' : 'messages'}</span>
                </div>
                <div className="text-right">
                  <div>Room {ticket.roomNumber}</div>
                  {ticket.room && typeof ticket.room === 'object' && ticket.room.type && (
                    <div className="text-xs capitalize">{ticket.room.type}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
