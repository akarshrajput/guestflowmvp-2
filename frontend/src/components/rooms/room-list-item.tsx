'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bed, Eye, QrCode, MapPin, Edit } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';

interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
  qrCode?: string;
  qrCodeUrl?: string;
}

interface RoomListItemProps {
  room: Room;
  onViewDetails: (room: Room) => void;
  onEdit: (room: Room) => void;
}

export function RoomListItem({ room, onViewDetails, onEdit }: RoomListItemProps) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <div className="flex items-center gap-2 font-medium">
          <Bed className="h-4 w-4 text-muted-foreground" />
          {room.number}
        </div>
      </TableCell>
      <TableCell>{room.type}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {room.floor}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(room.status)} className={getStatusColor(room.status)}>
          {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <QrCode className="h-3 w-3" />
          {room.qrCode ? 'Available' : 'Not Generated'}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(room)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onEdit(room)}
            className="flex items-center gap-1"
          >
            <Edit className="h-3 w-3" />
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
