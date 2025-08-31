'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Loader2, ArrowLeft } from 'lucide-react';

const roomFormSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  type: z.string().min(1, 'Room type is required'),
  floor: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(1, 'Floor must be at least 1')
  ),
  status: z.enum(['available', 'occupied', 'maintenance'] as const),
  description: z.string().optional(),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

export default function RoomFormPage() {
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = id !== 'new';
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema) as any,
    defaultValues: {
      number: '',
      type: '',
      floor: 1,
      status: 'available',
      description: '',
    },
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchRoom = async () => {
        try {
          const response = await apiClient.get(`/rooms/${id}`);
          form.reset(response.data);
        } catch (error) {
          console.error('Failed to fetch room:', error);
          toast.error('Failed to load room data');
          router.push('/rooms');
        } finally {
          setIsLoading(false);
        }
      };

      fetchRoom();
    }
  }, [id, isEditMode, form, router]);

  const onSubmit: SubmitHandler<RoomFormValues> = async (data) => {
    try {
      setIsSubmitting(true);
      if (isEditMode) {
        await apiClient.put(`/rooms/${id}`, data);
        toast.success('Room updated successfully');
      } else {
        await apiClient.post('/rooms', data);
        toast.success('Room created successfully');
      }
      router.push('/rooms');
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error('Failed to save room');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit Room' : 'Add New Room'}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Details</CardTitle>
          <CardDescription>
            {isEditMode ? 'Update the room information below.' : 'Fill in the details to add a new room.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="deluxe">Deluxe</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="presidential">Presidential</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Room features, view, or any additional information"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/rooms')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Update Room' : 'Add Room'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
