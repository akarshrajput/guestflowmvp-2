'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Hotel, Plus, Search, Grid, List } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RoomCard } from '@/components/rooms/room-card';
import { RoomListItem } from '@/components/rooms/room-list-item';
import { RoomDetailDialog } from '@/components/rooms/room-detail-dialog';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
  qrCode?: string;
  qrCodeUrl?: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    number: '',
    type: '',
    floor: 1,
    status: 'available' as Room['status']
  });

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get('/rooms');
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setRooms(response.data.data);
      } else {
        console.error('Unexpected API response format:', response.data);
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to load rooms');
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await apiClient.delete(`/rooms/${id}`);
      setRooms(rooms.filter(room => room._id !== id));
      toast.success('Room deleted successfully');
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error('Failed to delete room');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom._id}`, formData);
        toast.success('Room updated successfully');
      } else {
        await apiClient.post('/rooms', formData);
        toast.success('Room created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingRoom(null);
      setFormData({ number: '', type: '', floor: 1, status: 'available' });
      fetchRooms();
    } catch (error) {
      console.error('Failed to save room:', error);
      toast.error('Failed to save room');
    }
  };

  const openCreateDialog = () => {
    setEditingRoom(null);
    setFormData({ number: '', type: '', floor: 1, status: 'available' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      number: room.number,
      type: room.type,
      floor: room.floor,
      status: room.status
    });
    setIsDialogOpen(true);
  };

  const openRoomDetail = (room: Room) => {
    setSelectedRoom(room);
    setIsRoomDetailOpen(true);
  };

  const getFilteredRooms = () => {
    let filtered = rooms;
    
    if (searchQuery) {
      filtered = filtered.filter(room => 
        room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.floor.toString().includes(searchQuery)
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(room => room.status === filterStatus);
    }
    
    return filtered;
  };

  const filteredRooms = getFilteredRooms();

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
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
              Room Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage hotel rooms, view QR codes, and track status
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button onClick={openCreateDialog} className="shadow-sm border-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </motion.div>
        </motion.div>

        {/* Enhanced Filters and Search */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
                  placeholder="Search rooms by number, type, or floor..."
                  className="pl-10 h-11 border-none bg-muted/50 focus:bg-background transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
              <div className="flex flex-col sm:flex-row gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 border-none bg-muted/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
                <div className="flex border-none rounded-lg overflow-hidden bg-muted/50">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
                    className="rounded-r-none h-11 border-none bg-transparent hover:bg-background data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
                    className="rounded-l-none h-11 border-none bg-transparent hover:bg-background data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Enhanced Rooms Display */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-none shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Hotel className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">
            Rooms ({filteredRooms.length})
          </CardTitle>
                <CardDescription className="text-muted-foreground">
            Manage all hotel rooms, view QR codes, and track status
          </CardDescription>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {filteredRooms.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                  <Hotel className="h-8 w-8 text-muted-foreground" />
                </div>
              <h3 className="text-lg font-medium mb-2">No rooms found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters to find what you\'re looking for'
                    : 'Get started by adding your first room to the system'
                }
              </p>
              {!searchQuery && filterStatus === 'all' && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button onClick={openCreateDialog} className="shadow-sm border-none">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Room
                    </Button>
                  </motion.div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => (
                  <RoomListItem
                    key={room._id}
                    room={room}
                    onViewDetails={openRoomDetail}
                    onEdit={openEditDialog}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onViewDetails={openRoomDetail}
                />
              ))}
            </div>
          )}
        </CardContent>
          </Card>
        </motion.div>

      {/* Room Detail Dialog */}
      <RoomDetailDialog 
        room={selectedRoom}
        open={isRoomDetailOpen}
        onOpenChange={setIsRoomDetailOpen}
        onRoomUpdate={fetchRooms}
      />

      {/* Add/Edit Room Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? 'Update room information' : 'Add a new room to the hotel'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Room Number</Label>
                <Input
                  id="number"
                  className="border-none"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Room Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="border-none">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                    <SelectItem value="Presidential">Presidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  min="1"
                  className="border-none"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: Room['status']) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="border-none" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="border-none">
                {editingRoom ? 'Update Room' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </motion.div>
  );
}
