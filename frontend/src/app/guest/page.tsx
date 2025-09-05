'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MessageSquare, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function GuestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    roomNumber: '',
    guestName: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStartChat = async () => {
    if (!formData.roomNumber.trim() || !formData.guestName.trim()) {
      toast.error('Please enter your room number and name');
      return;
    }

    setIsLoading(true);
    try {
      // Store guest info in localStorage for the chat session
      localStorage.setItem('guestInfo', JSON.stringify(formData));
      
      // Navigate to chat interface
      router.push('/guest/chat');
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Hotel Service</h1>
          <p className="text-muted-foreground">
            Need assistance? Start a conversation with our AI assistant
          </p>
        </div>

        {/* Guest Info Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number *</Label>
              <Input
                id="roomNumber"
                type="text"
                placeholder="e.g., 432"
                value={formData.roomNumber}
                onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestName">Your Name *</Label>
              <Input
                id="guestName"
                type="text"
                placeholder="Enter your full name"
                value={formData.guestName}
                onChange={(e) => handleInputChange('guestName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <Button 
              onClick={handleStartChat}
              disabled={isLoading || !formData.roomNumber.trim() || !formData.guestName.trim()}
              className="w-full"
            >
              {isLoading ? (
                'Starting Chat...'
              ) : (
                <>
                  Start Chat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Our AI assistant will help you with your requests and connect you with hotel staff when needed.</p>
        </div>
      </div>
    </div>
  );
}
