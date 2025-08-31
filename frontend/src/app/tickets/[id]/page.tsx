'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, ArrowLeft, CheckCircle, Clock, AlertCircle, Send, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender: 'guest' | 'manager' | 'ai';
  message: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: 'reception' | 'housekeeping' | 'porter' | 'concierge' | 'service_fb' | 'maintenance';
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const response = await apiClient.get(`/tickets/${id}`);
      setTicket(response.data);
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      toast.error('Failed to load ticket');
      router.push('/tickets');
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

  const getCategoryClass = (category?: Ticket['category']) => {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setIsSubmitting(true);
      await apiClient.post(`/tickets/${id}/messages`, {
        sender: 'manager',
        message,
        ticketId: id,
      });
      
      // Refresh the ticket to get the latest messages
      await fetchTicket();
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await apiClient.put(`/tickets/${id}/status`, { status: newStatus });
      setTicket(prev => prev ? { ...prev, status: newStatus as any } : null);
      toast.success('Ticket status updated');
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

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

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{ticket.subject}</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Room {ticket.roomNumber}</span>
            <span>•</span>
            <span>{ticket.guestName}</span>
            <span>•</span>
            <span>
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
          <Badge className={`${getCategoryClass(ticket.category)} border-0`}>
            {getCategoryLabel(ticket.category)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ticket.messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  ticket.messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback>
                          {msg.sender === 'manager' 
                            ? 'M' 
                            : msg.sender === 'guest' 
                              ? 'G' 
                              : 'AI'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {msg.sender === 'manager' 
                              ? 'You' 
                              : msg.sender === 'guest' 
                                ? ticket.guestName 
                                : 'AI Assistant'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="mt-6">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    className="min-h-[80px] flex-1"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button type="submit" size="icon" disabled={!message.trim() || isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={isUpdatingStatus}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="mt-1">{getPriorityBadge(ticket.priority)}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <div className={`mt-1 inline-flex`}>
                    <Badge className={`${getCategoryClass(ticket.category)} border-0`}>
                      {getCategoryLabel(ticket.category)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="mt-1 text-sm">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Room Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Room Number</p>
                  <p className="mt-1">{ticket.roomNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest Name</p>
                  <p className="mt-1">{ticket.guestName}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/hotel/${ticket.roomNumber}`)}
                >
                  View Room Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
