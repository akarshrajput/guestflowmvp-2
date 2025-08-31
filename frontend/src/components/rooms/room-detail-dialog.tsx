
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, QrCode, ExternalLink, MapPin, Users, Bed, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
  qrCode?: string;
  qrCodeUrl?: string;
}

interface RoomDetailDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomUpdate?: () => void;
}

export function RoomDetailDialog({ room, open, onOpenChange, onRoomUpdate }: RoomDetailDialogProps) {
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    number: '',
    type: '',
    floor: 1,
    status: 'available' as Room['status']
  });

  if (!room) return null;

  const startEditing = () => {
    setEditFormData({
      number: room.number,
      type: room.type,
      floor: room.floor,
      status: room.status
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFormData({
      number: '',
      type: '',
      floor: 1,
      status: 'available'
    });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/rooms/${room._id}`, editFormData);
      toast.success('Room updated successfully');
      setIsEditing(false);
      onRoomUpdate?.();
    } catch (error) {
      console.error('Error updating room:', error);
      toast.error('Failed to update room');
    } finally {
      setIsSaving(false);
    }
  };

  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      const response = await apiClient.post(`/rooms/${room._id}/qr`);
      if (response.data.success) {
        toast.success('QR code generated successfully');
        onRoomUpdate?.();
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const downloadQRCode = async () => {
    if (!room.qrCode) {
      toast.error('No QR code available');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await apiClient.get(`/rooms/${room._id}/qr/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-${room.number}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    } finally {
      setIsDownloading(false);
    }
  };

  const openRoomUrl = () => {
    if (room.qrCodeUrl) {
      window.open(room.qrCodeUrl, '_blank');
    }
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
     <DialogContent className="min-w-[500px] max-w-3xl w-auto">

        <DialogHeader className="pb-4 mt-6">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Room {room.number}
              </div>
              <Badge variant={getStatusVariant(room.status)}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </Badge>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Room
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 px-0">
          
         <Card>
                     <CardHeader>
                       <CardTitle className="text-lg flex items-center gap-2">
                         <MapPin className="h-4 w-4" />
                         Room Details
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="grid grid-cols-2 gap-4">
                       {isEditing ? (
                         <>
                           <div>
                             <Label htmlFor="edit-number">Room Number</Label>
                             <Input
                               id="edit-number"
                               value={editFormData.number}
                               onChange={(e) => setEditFormData({ ...editFormData, number: e.target.value })}
                               required
                             />
                           </div>
                           <div>
                             <Label htmlFor="edit-type">Room Type</Label>
                             <Select
                               value={editFormData.type}
                               onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}
                             >
                               <SelectTrigger>
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
                           <div>
                             <Label htmlFor="edit-floor">Floor</Label>
                             <Input
                               id="edit-floor"
                               type="number"
                               min="1"
                               value={editFormData.floor}
                               onChange={(e) => setEditFormData({ ...editFormData, floor: parseInt(e.target.value) })}
                               required
                             />
                           </div>
                           <div>
                             <Label htmlFor="edit-status">Status</Label>
                             <Select
                               value={editFormData.status}
                               onValueChange={(value: Room['status']) => setEditFormData({ ...editFormData, status: value })}
                             >
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="available">Available</SelectItem>
                                 <SelectItem value="occupied">Occupied</SelectItem>
                                 <SelectItem value="maintenance">Maintenance</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         </>
                       ) : (
                         <>
                           <div>
                             <p className="text-sm font-medium text-muted-foreground">Room Number</p>
                             <p className="text-lg font-semibold">{room.number}</p>
                           </div>
                           <div>
                             <p className="text-sm font-medium text-muted-foreground">Room Type</p>
                             <p className="text-lg">{room.type}</p>
                           </div>
                           <div>
                             <p className="text-sm font-medium text-muted-foreground">Floor</p>
                             <p className="text-lg">{room.floor}</p>
                           </div>
                           <div>
                             <p className="text-sm font-medium text-muted-foreground">Status</p>
                             <Badge variant={getStatusVariant(room.status)}>
                               {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                             </Badge>
                           </div>
                         </>
                       )}
                     </CardContent>
                   </Card>

          {/* QR Code Section */}
          {/* <Card> */}
          <div>
           
              <div className="text-lg mb-4 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Guest Access QR Code
              </div>
         
            <div>
              {room.qrCode ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                      <img 
                        src={room.qrCode} 
                        alt={`QR Code for Room ${room.number}`}
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Guests can scan this QR code to access room services
                    </p>
                    <p className="text-xs font-mono bg-muted p-2 rounded">
                      {room.qrCodeUrl}
                    </p>
                  </div>

                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={downloadQRCode}
                      disabled={isDownloading}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {isDownloading ? 'Downloading...' : 'Download QR Code'}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={openRoomUrl}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Link
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={generateQRCode}
                      disabled={isGeneratingQR}
                      className="flex items-center gap-2"
                    >
                      <QrCode className="h-4 w-4" />
                      {isGeneratingQR ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 py-8">
                  <div className="w-24 h-24 mx-auto bg-muted rounded-lg flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">No QR Code Generated</p>
                    <p className="text-sm text-muted-foreground">
                      Generate a QR code for guests to access room services
                    </p>
                  </div>
                  <Button 
                    onClick={generateQRCode}
                    disabled={isGeneratingQR}
                    className="flex items-center gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    {isGeneratingQR ? 'Generating...' : 'Generate QR Code'}
                  </Button>
                </div>
              )}
            </div>
            </div>
        </div>
        
        {isEditing && (
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveChanges} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
