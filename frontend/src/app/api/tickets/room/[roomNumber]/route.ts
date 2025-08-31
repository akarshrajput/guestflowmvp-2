import { NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/client';

export async function GET(
  request: Request,
  { params }: { params: { roomNumber: string } }
) {
  try {
    // In a real app, you would call your backend API to check for existing tickets
    // const response = await apiClient.get(`/tickets/room/${params.roomNumber}`);
    
    // For demo purposes, we'll simulate a response
    // In a real app, you would return the actual response from your API
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error checking for existing ticket:', error);
    return NextResponse.json(
      { error: 'Failed to check for existing ticket' },
      { status: 500 }
    );
  }
}
