'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Send, 
  Bot, 
  User, 
  ArrowLeft, 
  CheckCircle, 
  Clock,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface Message {
  id: string;
  content: string;
  sender: 'guest' | 'ai' | 'manager';
  senderName: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface GuestInfo {
  roomNumber: string;
  guestName: string;
  email?: string;
  phone?: string;
}

export default function GuestChatPage() {
  const router = useRouter();
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<'draft' | 'submitted' | 'in_progress' | 'completed'>('draft');
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load guest info from localStorage
    const storedGuestInfo = localStorage.getItem('guestInfo');
    if (!storedGuestInfo) {
      router.push('/guest');
      return;
    }

    const parsedGuestInfo = JSON.parse(storedGuestInfo);
    setGuestInfo(parsedGuestInfo);

    // Add welcome message from AI
    const welcomeMessage: Message = {
      id: '1',
      content: `Hello ${parsedGuestInfo.guestName}! I'm your AI assistant. I'm here to help you with any requests or questions about your stay in Room ${parsedGuestInfo.roomNumber}. What can I assist you with today?`,
      sender: 'ai',
      senderName: 'AI Assistant',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !guestInfo) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'guest',
      senderName: guestInfo.guestName,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      content: 'AI is thinking...',
      sender: 'ai',
      senderName: 'AI Assistant',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Send message to AI endpoint
      const response = await apiClient.post('/chat/ai', {
        message: newMessage,
        guestInfo,
        conversationHistory: messages.filter(m => !m.isTyping).map(m => ({
          role: m.sender === 'guest' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== 'typing'));

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: response.data.message,
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Check if AI suggests creating a ticket
      if (response.data.shouldCreateTicket) {
        setTimeout(() => {
          const ticketSuggestion: Message = {
            id: (Date.now() + 2).toString(),
            content: "Would you like me to create a service request for the hotel staff to assist you with this?",
            sender: 'ai',
            senderName: 'AI Assistant',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, ticketSuggestion]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async () => {
    if (!guestInfo) return;

    setIsLoading(true);
    try {
      const conversationSummary = messages
        .filter(m => !m.isTyping)
        .map(m => `${m.senderName}: ${m.content}`)
        .join('\n');

      const response = await apiClient.post('/tickets/guest', {
        roomNumber: guestInfo.roomNumber,
        guestInfo: {
          name: guestInfo.guestName,
          email: guestInfo.email,
          phone: guestInfo.phone
        },
        initialMessage: conversationSummary
      });

      setTicketId(response.data.data._id);
      setTicketStatus('submitted');
      setIsTicketDialogOpen(false);

      const confirmationMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: `Great! I've created a service request (#${response.data.data._id.slice(-6)}) for you. Hotel staff will be notified and will respond shortly. You can continue chatting here, and they'll join the conversation when available.`,
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, confirmationMessage]);
      toast.success('Service request created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create service request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!guestInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/guest')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold">Hotel Service Chat</h1>
              <p className="text-sm text-muted-foreground">
                Room {guestInfo.roomNumber} • {guestInfo.guestName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ticketStatus !== 'draft' && (
              <Badge variant={
                ticketStatus === 'submitted' ? 'default' :
                ticketStatus === 'in_progress' ? 'secondary' : 'outline'
              }>
                {ticketStatus === 'submitted' ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Request Submitted
                  </>
                ) : ticketStatus === 'in_progress' ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    In Progress
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === 'guest' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender !== 'guest' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.sender === 'ai' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`max-w-[80%] ${message.sender === 'guest' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === 'guest'
                      ? 'bg-primary text-primary-foreground'
                      : message.sender === 'ai'
                      ? 'bg-muted'
                      : 'bg-accent'
                  } ${message.isTyping ? 'animate-pulse' : ''}`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <span>{message.senderName}</span>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>

              {message.sender === 'guest' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {guestInfo.guestName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t p-4">
        <div className="max-w-4xl mx-auto">
          {ticketStatus === 'draft' && (
            <div className="mb-3">
              <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={isLoading || messages.length <= 1}
                    variant="outline"
                    size="sm"
                  >
                    Create Service Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Service Request</DialogTitle>
                    <DialogDescription>
                      This will create a service request for hotel staff based on your conversation. 
                      Staff will be notified and can join this chat to assist you.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Room:</strong> {guestInfo.roomNumber}<br/>
                      <strong>Guest:</strong> {guestInfo.guestName}<br/>
                      <strong>Messages:</strong> {messages.filter(m => !m.isTyping).length} messages will be included
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createTicket} disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Request'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !newMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
