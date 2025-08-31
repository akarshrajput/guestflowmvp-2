'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Hotel, Users, MessageSquare, Shield, LogIn, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const [roomNumber, setRoomNumber] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const handleGuestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomNumber) {
      router.push(`/hotel/${roomNumber}`);
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.header 
        className="border-b bg-white/80 backdrop-blur-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Hotel className="h-8 w-8" />
            <span className="text-2xl font-bold">Guest Flow</span>
          </motion.div>
          <motion.p 
            className="text-sm text-muted-foreground hidden md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Modern hotel management made simple
          </motion.p>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 py-16">
        <motion.div 
          className="text-center mb-16"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold mb-4">
            Welcome to GuestFlow
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your hotel operations with intelligent guest services and staff management tools
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >

          {/* Manager Access Card */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="h-full shadow-lg border-none bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center">
                <motion.div 
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg shadow-md bg-gradient-to-br from-gray-50 to-gray-100"
                  whileHover={{ rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Shield className="h-8 w-8" />
                </motion.div>
                <CardTitle className="text-2xl">Manager Access</CardTitle>
                <CardDescription>
                  Access the management dashboard to oversee hotel operations, manage rooms, and handle guest requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <motion.div 
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Users className="h-4 w-4" />
                    <span>Staff management & coordination</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Real-time guest request handling</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Hotel className="h-4 w-4" />
                    <span>Room status & housekeeping</span>
                  </motion.div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    className="w-full border-none" 
                    onClick={() => router.push('/auth/login')}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to Dashboard
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Guest Access Card */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="h-full shadow-lg border-none bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center">
                <motion.div 
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg shadow-md bg-gradient-to-br from-blue-50 to-blue-100"
                  whileHover={{ rotate: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Users className="h-8 w-8" />
                </motion.div>
                <CardTitle className="text-2xl">Guest Services</CardTitle>
                <CardDescription>
                  Access your room's AI assistant for instant help with hotel services and submit service requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGuestAccess} className="space-y-4">
                  <motion.div 
                    className="space-y-2"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Label htmlFor="roomNumber">Room Number</Label>
                    <Input
                      id="roomNumber"
                      placeholder="e.g., 101, 205, 312"
                      className="border-none"
                      required
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button type="submit" className="w-full border-none">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Access Guest Services
                    </Button>
                  </motion.div>
                </form>
                
                <motion.div 
                  className="mt-6 pt-4 border-t"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <MessageSquare className="mx-auto mb-1 h-4 w-4" />
                      <p>AI Assistant</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Hotel className="mx-auto mb-1 h-4 w-4" />
                      <p>Room Services</p>
                    </motion.div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        className="border-t mt-16 bg-white/50 backdrop-blur-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <motion.div 
              className="flex items-center gap-3 mb-4 md:mb-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Hotel className="h-6 w-6" />
              <span className="text-lg font-semibold">HotelFlow</span>
            </motion.div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HotelFlow. Streamlining hotel operations.
            </p>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
}

