'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Search, Filter, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';

interface Ticket {
  _id: string;
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
    content: string;
    sender: 'guest' | 'manager';
    senderName: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const response = await apiClient.get('/tickets');
      // The API returns { success: boolean, count: number, data: Ticket[] }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const ticketsData = response.data.data;
        setTickets(ticketsData);
        setFilteredTickets(ticketsData);
      } else {
        console.error('Unexpected API response format:', response.data);
        setTickets([]);
        setFilteredTickets([]);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load tickets');
      setTickets([]);
      setFilteredTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter tickets based on search term, status, and priority
  useEffect(() => {
    let filtered = tickets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.guestInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.roomNumber.includes(searchTerm) ||
        ticket._id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/tickets/${selectedTicket._id}/messages`, {
        content: newMessage,
        sender: 'manager'
      });
      
      setNewMessage('');
      fetchTickets();
      
      // Update the selected ticket with new message
      const updatedTicket = tickets.find(t => t._id === selectedTicket._id);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
      
      toast.success('Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'raised': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-background/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Enhanced Header */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Service Requests
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage guest service requests and tickets
            </p>
          </div>
        </motion.div>

        {/* Enhanced Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-none shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
      </div>
              <div>
                <CardTitle className="text-xl font-semibold">
            Tickets ({filteredTickets.length})
          </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Filter and search through all service requests
                </CardDescription>
              </div>
            </div>
        </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by guest name, room number, or ticket ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-none bg-muted/50 focus:bg-background transition-colors"
                />
              </div>
            </div>
              <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 border-none bg-muted/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="raised">New Requests</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 border-none bg-muted/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

      {/* Enhanced Tickets Table */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="font-semibold">Ticket ID</TableHead>
                <TableHead className="font-semibold">Guest</TableHead>
                <TableHead className="font-semibold">Room</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold">Messages</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-sm font-medium">
                    #{ticket._id.slice(-6)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ticket.guestInfo.name}</div>
                      {ticket.guestInfo.email && (
                        <div className="text-sm text-muted-foreground">{ticket.guestInfo.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      Room {ticket.roomNumber}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getCategoryColor(inferCategory(ticket))} border-none font-medium`}>
                      {getCategoryLabel(inferCategory(ticket))}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(ticket.status)} font-medium`}>
                      {ticket.status === 'raised' ? 'New' : ticket.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={`${getPriorityColor(ticket.priority)} border-none font-medium`}
                    >
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{ticket.messages.length}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 border-none">
                          <span className="sr-only">Open menu</span>
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ticket._id, 'in_progress')}>
                          Mark In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ticket._id, 'completed')}>
                          Mark Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            
          {filteredTickets.length === 0 && (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No tickets found</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your search or filters to find what you\'re looking for'
                  : 'No service requests have been created yet'
                }
              </p>
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Ticket #{selectedTicket._id.slice(-6)}
                </DialogTitle>
                <DialogDescription>
                  Room {selectedTicket.roomNumber} • {selectedTicket.guestInfo.name} • {getCategoryLabel(selectedTicket.category)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status === 'raised' ? 'New' : 
                     selectedTicket.status === 'in_progress' ? 'In Progress' : 'Completed'}
                  </Badge>
                  <Badge className={getCategoryColor(inferCategory(selectedTicket))}>
                    {getCategoryLabel(inferCategory(selectedTicket))}
                  </Badge>
                  <Badge className={getPriorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority} priority
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(selectedTicket.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <h4 className="font-medium">Conversation</h4>
                  {selectedTicket.messages?.map((message, index) => (
                    <div key={index} className={`flex ${message.sender === 'guest' ? 'justify-start' : 'justify-end'} mb-4`}>
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender === 'guest' 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                          <span>{message.senderName}</span>
                          <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your response..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 border-none"
                    rows={3}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isSubmitting || !newMessage.trim()}
                    size="sm"
                    className="border-none"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </motion.div>
  );
}
