'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Ticket, Menu, X, LogOut, Bell, Search, Users, Settings, Hotel, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth-store';
import { logout } from '@/lib/api/auth';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, setIsAuthenticated, setUser } = useAuthStore();

  const navItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      description: 'Overview and analytics'
    },
    { 
      name: 'Rooms', 
      href: '/dashboard/rooms', 
      icon: Building2,
      description: 'Manage hotel rooms'
    },
    { 
      name: 'Service Requests', 
      href: '/dashboard/tickets', 
      icon: Ticket,
      description: 'Handle guest requests'
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <motion.div 
      className="flex h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-none shadow-lg lg:static lg:inset-0`}
        initial={{ x: -288 }}
        animate={{ x: isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 0 : -288 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex flex-col h-full">
          {/* Logo and brand */}
          <motion.div 
            className="flex items-center justify-between h-16 px-6 border-none"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Hotel className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-semibold text-foreground">GuestFlow</span>
                <p className="text-xs text-muted-foreground">Hotel Management</p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden border-none"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Navigation */}
          <motion.div 
            className="flex-1 overflow-y-auto py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <nav className="px-3 space-y-1">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <motion.div
                    key={item.name}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href={item.href}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className={`mr-3 h-4 w-4 transition-colors ${
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className={`text-xs transition-colors ${
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground group-hover:text-accent-foreground/70'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <ChevronRight className="h-4 w-4 text-primary-foreground/70" />
                        </motion.div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>

          {/* User profile and actions */}
          <motion.div 
            className="p-4 border-none space-y-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <motion.div 
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {user?.name?.charAt(0) || 'M'}
                </AvatarFallback>
                </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Manager'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'Hotel Staff'}</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="w-full justify-start border-none"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main content area */}
      <motion.div 
        className="flex flex-col flex-1 overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Top header */}
        <motion.header 
          className="bg-card border-none h-16 flex items-center px-6 shadow-sm"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden mr-3 border-none"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </motion.div>
          
          <div className="flex-1 flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-xl font-semibold text-foreground">
              {navItems.find((item) => item.href === pathname)?.name || 
                 (pathname?.startsWith('/dashboard/rooms') ? 'Rooms' : 
                  pathname?.startsWith('/dashboard/tickets') ? 'Service Requests' : 'Dashboard')}
            </h1>
              {pathname && pathname !== '/dashboard' && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {navItems.find((item) => item.href === pathname)?.description}
                  </span>
                </>
              )}
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button variant="ghost" size="icon" className="h-9 w-9 border-none">
                  <Bell className="h-4 w-4" />
                </Button>
              </motion.div>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </motion.div>
          </div>
        </motion.header>

        {/* Main content */}
        <motion.main 
          className="flex-1 overflow-y-auto bg-background"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {children}
        </motion.main>
      </motion.div>
    </motion.div>
  );
}
