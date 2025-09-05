'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bed, Eye, QrCode, MapPin } from 'lucide-react';

interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
  qrCode?: string;
  qrCodeUrl?: string;
}

interface RoomCardProps {
  room: Room;
  onViewDetails: (room: Room) => void;
}

export function RoomCard({ room, onViewDetails }: RoomCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'occupied':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -5, scale: 1.02 }}
    >
      <Card className="hover:shadow-md transition-shadow border-none shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bed className="h-4 w-4" />
            Room {room.number}
          </CardTitle>
          <Badge variant={getStatusVariant(room.status)}>
            {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{room.type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Floor</p>
            <p className="font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {room.floor}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <QrCode className="h-3 w-3" />
            <span>{room.qrCode ? 'QR Available' : 'No QR Code'}</span>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(room)}
              className="flex items-center gap-1 border-none"
            >
              <Eye className="h-3 w-3" />
              View Details
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
