"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TicketCard } from "@/components/kanban/ticket-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { rectIntersection } from "@dnd-kit/core";
import {
  Search,
  Plus,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Sparkles,
  Bell,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import io from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Pie, PieChart, Label } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// --- Chart Color Customization (Grayscale) ---
// Adjusted to grayscale palette with good contrast
const CHART_COLORS = {
  raised: "#111827", // Gray 900 - darkest
  in_progress: "#6B7280", // Gray 500 - medium
  completed: "#D1D5DB", // Gray 300 - light
};

// Chart data will be generated dynamically based on ticket stats
const getChartData = (stats: DashboardStats) => [
  {
    status: "raised",
    count: stats.raisedTickets,
    fill: CHART_COLORS.raised,
    label: "New Tickets",
  },
  {
    status: "in_progress",
    count: stats.inProgressTickets,
    fill: CHART_COLORS.in_progress,
    label: "In Progress",
  },
  {
    status: "completed",
    count: stats.completedTickets,
    fill: CHART_COLORS.completed,
    label: "Completed",
  },
];

const chartConfig = {
  count: {
    label: "Tickets",
  },
  raised: {
    label: "New Tickets",
    color: CHART_COLORS.raised,
  },
  in_progress: {
    label: "In Progress",
    color: CHART_COLORS.in_progress,
  },
  completed: {
    label: "Completed",
    color: CHART_COLORS.completed,
  },
} satisfies ChartConfig;

interface Message {
  _id: string;
  content: string;
  sender: "guest" | "manager" | "ai_assistant" | "system";
  senderName: string;
  createdAt: string;
  timestamp?: string;
}

// Category helpers
const getCategoryLabel = (category?: Ticket["category"]) => {
  switch (category) {
    case "reception":
      return "Reception";
    case "housekeeping":
      return "Housekeeping";
    case "porter":
      return "Porter";
    case "concierge":
      return "Concierge";
    case "service_fb":
      return "Service (F&B)";
    case "maintenance":
      return "Maintenance";
    default:
      return "Reception";
  }
};

const getCategoryColor = (category?: Ticket["category"]) => {
  switch (category) {
    case "reception":
      return "bg-purple-100 text-purple-800";
    case "housekeeping":
      return "bg-teal-100 text-teal-800";
    case "porter":
      return "bg-sky-100 text-sky-800";
    case "concierge":
      return "bg-pink-100 text-pink-800";
    case "service_fb":
      return "bg-orange-100 text-orange-800";
    case "maintenance":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Group tickets by guest request (same guest, room, and similar creation time)
const groupRelatedTickets = (tickets: Ticket[]) => {
  const groups: Map<string, Ticket[]> = new Map();

  tickets.forEach((ticket) => {
    // Create a key based on guest name, room number, and creation time (within 5 minutes)
    const createdTime = new Date(ticket.createdAt);
    const timeSlot = Math.floor(createdTime.getTime() / (5 * 60 * 1000)); // 5-minute slots
    const groupKey = `${ticket.guestInfo.name}-${ticket.roomNumber}-${timeSlot}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(ticket);
  });

  return Array.from(groups.values());
};

// Get single category from ticket (no inference needed - AI already classified)
const getTicketCategory = (ticket: Ticket): Ticket["category"] => {
  return ticket.category || "reception";
};

interface Ticket {
  _id: string;
  room:
    | string
    | {
        _id: string;
        number: string;
        type?: string;
        floor?: number;
      };
  roomNumber: string;
  category?:
    | "reception"
    | "housekeeping"
    | "porter"
    | "concierge"
    | "service_fb"
    | "maintenance";
  guestInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  status: "raised" | "in_progress" | "completed";
  subject?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  status: "available" | "occupied" | "maintenance";
}

interface DashboardStats {
  totalRooms: number;
  raisedTickets: number;
  inProgressTickets: number;
  completedTickets: number;
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>({
    raised: [],
    in_progress: [],
    completed: [],
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    raisedTickets: 0,
    inProgressTickets: 0,
    completedTickets: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoom, setFilterRoom] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: "", type: "", floor: 1 });
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  // Category filter: default all selected
  const allCategories: Ticket["category"][] = [
    "reception",
    "housekeeping",
    "porter",
    "concierge",
    "service_fb",
    "maintenance",
  ];
  const [selectedCategories, setSelectedCategories] =
    useState<Ticket["category"][]>(allCategories);

  // Category quick-filter handler
  const handleSelectCategory = (cat: "all" | Ticket["category"]) => {
    if (cat === "all") {
      setSelectedCategories(allCategories);
    } else {
      setSelectedCategories([cat]);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const collisionDetectionStrategy = rectIntersection;

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Set up interval to fetch tickets every 15 seconds
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing tickets...");
      fetchData();
    }, 15000); // 15 seconds

    // Set up WebSocket connection for real-time ticket notifications
    const setupWebSocket = () => {
      // Use local WebSocket URL for development, production URL for production
      const wsUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:5050"
          : "wss://hotel-mvp-7vdz.vercel.app";

      console.log("🔌 Connecting to WebSocket:", wsUrl);
      console.log("🔌 NODE_ENV:", process.env.NODE_ENV);

      const newSocket = io(wsUrl, {
        transports: ["polling", "websocket"], // Try polling first, then websocket
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000, // Increased timeout
        forceNew: true,
        path: "/socket.io/",
        upgrade: true,
        rememberUpgrade: true,
      });

      newSocket.on("connect", () => {
        console.log("🔗 Connected to WebSocket server");
        console.log("🔗 Socket ID:", newSocket.id);
        // Join managers room to receive new ticket notifications
        newSocket.emit("joinManagersRoom", "manager");
      });

      newSocket.on("connect_error", (error: any) => {
        console.error("❌ WebSocket connection error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          type: error.type,
          description: error.description,
        });
      });

      newSocket.on("error", (error: any) => {
        console.error("❌ Socket error:", error);
      });

      newSocket.on("newTicket", (data: any) => {
        console.log("📨 New ticket received:", data);

        // Show toast notification
        toast.success(`New Ticket from ${data.ticket.guestInfo.name}`, {
          description: `Room ${data.ticket.roomNumber} - ${data.message}`,
          action: {
            label: "View",
            onClick: () => setSelectedTicket(data.ticket),
          },
        });

        // Play notification sound (optional)
        if (typeof window !== "undefined" && "Audio" in window) {
          try {
            const audio = new Audio("/notification.mp3");
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if sound fails
          } catch (e) {}
        }

        // Refresh tickets to show the new one
        fetchData();
      });

      newSocket.on("disconnect", () => {
        console.log("❌ Disconnected from WebSocket server");
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    };

    const cleanup = setupWebSocket();

    // Cleanup function to clear the interval and WebSocket connection
    return () => {
      clearInterval(refreshInterval);
      cleanup?.();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsResponse, roomsResponse] = await Promise.all([
        apiClient.get("/tickets"),
        apiClient.get("/rooms"),
      ]);

      if (
        ticketsResponse.data?.success &&
        Array.isArray(ticketsResponse.data.data)
      ) {
        const ticketsData = ticketsResponse.data.data;

        // Check for new tickets and show notifications
        const currentRaisedCount = tickets.raised?.length || 0;
        const newRaisedCount = ticketsData.filter(
          (t: Ticket) => t.status === "raised"
        ).length;

        if (newRaisedCount > currentRaisedCount && currentRaisedCount > 0) {
          const newTickets = ticketsData.filter(
            (t: Ticket) =>
              t.status === "raised" &&
              !tickets.raised?.some((existing) => existing._id === t._id)
          );

          newTickets.forEach((ticket: Ticket) => {
            toast.success(
              `🔔 New service request from ${ticket.guestInfo.name} in Room ${ticket.roomNumber}`,
              {
                duration: 5000,
                action: {
                  label: "View",
                  onClick: () => setSelectedTicket(ticket),
                },
              }
            );
          });
        }

        const groupedTickets = ticketsData.reduce(
          (acc: Record<string, Ticket[]>, ticket: Ticket) => {
            if (!acc[ticket.status]) {
              acc[ticket.status] = [];
            }
            acc[ticket.status].push(ticket);
            return acc;
          },
          { raised: [], in_progress: [], completed: [] }
        );

        setTickets(groupedTickets);
        setStats({
          totalRooms: roomsResponse.data?.data?.length || 0,
          raisedTickets: groupedTickets.raised?.length || 0,
          inProgressTickets: groupedTickets.in_progress?.length || 0,
          completedTickets: groupedTickets.completed?.length || 0,
        });
      }

      if (
        roomsResponse.data?.success &&
        Array.isArray(roomsResponse.data.data)
      ) {
        setRooms(roomsResponse.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      console.log("Updating ticket status:", { ticketId, newStatus });
      await apiClient.put(`/tickets/${ticketId}/status`, { status: newStatus });
      fetchData();
      toast.success("Ticket status updated");
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Failed to update ticket status");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post(
        `/tickets/${selectedTicket._id}/messages`,
        {
          content: newMessage,
          sender: "manager",
        }
      );

      if (response.data.success) {
        // Update the ticket with new message
        const updatedTicket = { ...selectedTicket };
        updatedTicket.messages = [
          ...(updatedTicket.messages || []),
          response.data.data,
        ];
        setSelectedTicket(updatedTicket);

        // Update tickets list
        setTickets((prev) => {
          const newTickets = { ...prev };
          Object.keys(newTickets).forEach((status) => {
            newTickets[status] = newTickets[status].map((t: Ticket) =>
              t._id === selectedTicket._id ? updatedTicket : t
            );
          });
          return newTickets;
        });

        setNewMessage("");
        setAiSuggestion(""); // Clear AI suggestion after sending
        toast.success("Message sent successfully");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const getAISuggestion = async () => {
    if (!selectedTicket) return;

    setIsLoadingAI(true);
    try {
      const response = await apiClient.post("/chat/manager-assist", {
        ticketId: selectedTicket._id,
        conversationHistory: selectedTicket.messages || [],
        requestType: "General",
      });

      if (response.data.success) {
        setAiSuggestion(response.data.suggestion);
        toast.success("AI suggestion generated");
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast.error("Failed to get AI suggestion");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const useAISuggestion = () => {
    if (aiSuggestion) {
      setNewMessage(aiSuggestion);
      setAiSuggestion("");
    }
  };

  const handleAddRoom = async () => {
    try {
      await apiClient.post("/rooms", newRoom);
      setNewRoom({ number: "", type: "", floor: 1 });
      setIsRoomDialogOpen(false);
      fetchData();
      toast.success("Room added successfully");
    } catch (error) {
      console.error("Failed to add room:", error);
      toast.error("Failed to add room");
    }
  };

  const getFilteredTickets = (status: string) => {
    let filtered = tickets[status] || [];

    // Filter out greeting messages or system messages that shouldn't create tickets
    filtered = filtered.filter((ticket) => {
      const firstMessage = ticket.messages?.[0]?.content?.toLowerCase() || "";
      const isGreeting =
        /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|how are you|nice to meet you)\s*[!.]?$/i.test(
          firstMessage.trim()
        );
      return !isGreeting;
    });

    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.guestInfo.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ticket.roomNumber.includes(searchQuery) ||
          (ticket.messages[0]?.content || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    if (filterRoom) {
      filtered = filtered.filter((ticket) => ticket.roomNumber === filterRoom);
    }

    // Category filter (defaults to all) - single category per ticket
    filtered = filtered.filter((ticket) => {
      const ticketCategory = getTicketCategory(ticket);
      return selectedCategories.includes(ticketCategory);
    });

    return filtered;
  };

  const openTicketDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsTicketDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = Object.values(tickets)
      .flat()
      .find((t) => t._id === active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as string;

    // Find the ticket being moved
    const ticket = Object.values(tickets)
      .flat()
      .find((t) => t._id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    // Update ticket status
    await handleStatusChange(ticketId, newStatus);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalTickets =
    stats.raisedTickets + stats.inProgressTickets + stats.completedTickets;

  const completionRate =
    totalTickets > 0 ? (stats.completedTickets / totalTickets) * 100 : 0;

  let rateColor = "text-red-500"; // default red
  if (completionRate >= 70) {
    rateColor = "text-green-500"; // high performance
  } else if (completionRate >= 40) {
    rateColor = "text-yellow-500"; // medium
  }

  return (
    <motion.div
      className="min-h-screen bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tighter text-foreground">
              Overview
            </h1>
          </div>

          {/* Search and Room Filter */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 items-center justify-center">
            <div className="relative flex-1 lg:flex-none lg:w-80 focus:ring-0 rounded-full py-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tickets by guest name, room number, or message content..."
                className="pl-10 h-11 bg-transparent border-none focus:ring-0 focus:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select
                value={filterRoom || "all"}
                onValueChange={(value) =>
                  setFilterRoom(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] h-11 bg-gray-50 rounded-lg border-none">
                  <SelectValue placeholder="Room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room._id} value={room.number}>
                      Room {room.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filterRoom || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterRoom(null);
                    setSearchQuery("");
                  }}
                  className="h-11 border-none bg-gray-50 rounded-lg"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <motion.div
          className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-[#1f1e24] border border-[#e7e7e7] h-fit pb-8">
              <CardHeader className="px-4 pt-4">
                <CardTitle className="text-sm font-medium text-white">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-8xl mx-auto text-center font-bold text-white tracking-tighter">
                    {stats.raisedTickets +
                      stats.inProgressTickets +
                      stats.completedTickets}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-white text-center font-semibold text-3xl tracking-tight">
                Total Tickets
              </CardContent>
            </Card>

            <Card className="border border-[#e7e7e7] h-fit pb-8">
              <CardHeader className="px-4 pt-4">
                <CardTitle className="text-sm font-medium">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-8xl mx-auto text-center font-bold text-foreground tracking-tighter">
                    {stats.raisedTickets}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-foreground text-center font-semibold text-3xl tracking-tight">
                New Tickets
              </CardContent>
            </Card>

            <Card className="border border-[#e7e7e7] h-fit pb-8">
              <CardHeader className="px-4 pt-4">
                <CardTitle className="text-sm font-medium">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-8xl mx-auto text-center font-bold text-foreground tracking-tighter">
                    {stats.inProgressTickets}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-foreground text-center font-semibold text-3xl tracking-tight">
                In Progress
              </CardContent>
            </Card>

            <Card className="border border-[#e7e7e7] h-fit pb-8">
              <CardHeader className="px-4 pt-4">
                <CardTitle className="text-sm font-medium">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-8xl mx-auto text-center font-bold text-foreground tracking-tighter">
                    {stats.completedTickets}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-foreground text-center font-semibold text-3xl tracking-tight">
                Completed
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col bg-white border border-[#e7e7e7]">
            <CardHeader className="items-center pb-2 px-4 pt-4">
              <CardTitle className="text-lg font-semibold">
                Ticket Distribution
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Completion rate:{" "}
                <span className={rateColor}>{completionRate.toFixed(2)}%</span>
              </p>
            </CardHeader>
            <CardContent className="flex-1 pb-4 px-4">
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[280px] sm:max-h-[320px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={getChartData(stats)}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={70}
                    strokeWidth={5}
                  >
                    <Label
                      content={(props: any) => {
                        const totalTickets =
                          stats.raisedTickets +
                          stats.inProgressTickets +
                          stats.completedTickets;
                        const { viewBox } = props;
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {totalTickets.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Total Tickets
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className=" rounded-md">
            <div className="p-4">
              {/* Tabs */}
              <div className="flex flex-wrap gap-6 relative border-b border-gray-200">
                {/* All tab */}
                <button
                  onClick={() => handleSelectCategory("all")}
                  className={`relative pb-2 text-sm font-medium ${
                    selectedCategories.length === 0
                      ? "text-black font-semibold"
                      : "text-gray-400 hover:text-black"
                  }`}
                >
                  All
                  {selectedCategories.length === 0 && (
                    <motion.div
                      layoutId="underline"
                      className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-black"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </button>

                {/* Other tabs */}
                {allCategories.map((cat) => {
                  const isActive =
                    selectedCategories.length === 1 &&
                    selectedCategories[0] === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      className={`relative pb-2 text-sm font-medium ${
                        isActive
                          ? "text-black font-semibold"
                          : "text-gray-400 hover:text-black"
                      }`}
                    >
                      {getCategoryLabel(cat)}
                      {isActive && (
                        <motion.div
                          layoutId="underline"
                          className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-black"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-200px)]">
            {/* New Requests Column */}
            <DroppableColumn id="raised">
              <Card className="h-full shadow-lg border-none">
                <CardHeader className="bg-[#1f1e24] rounded-t-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl font-semibold text-white p-5">
                        New Tickets
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 h-full overflow-y-auto p-3">
                  <SortableContext
                    items={getFilteredTickets("raised").map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {getFilteredTickets("raised").map((ticket) => (
                        <DraggableTicketCard
                          key={ticket._id}
                          ticket={ticket}
                          allTickets={Object.values(tickets).flat()}
                          onClick={() => setSelectedTicket(ticket)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </DroppableColumn>

            {/* In Progress Column */}
            <DroppableColumn id="in_progress">
              <Card className="h-full shadow-lg border-none">
                <CardHeader className="bg-[#1f1e24] rounded-t-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl font-semibold text-white p-5">
                        In Progress
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 h-[calc(100vh-400px)] overflow-y-auto p-3">
                  <SortableContext
                    items={getFilteredTickets("in_progress").map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {getFilteredTickets("in_progress").map((ticket) => (
                        <DraggableTicketCard
                          key={ticket._id}
                          ticket={ticket}
                          allTickets={Object.values(tickets).flat()}
                          onClick={() => setSelectedTicket(ticket)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </DroppableColumn>

            {/* Completed Column */}
            <DroppableColumn id="completed">
              <Card className="h-full shadow-lg border-none">
                <CardHeader className="bg-[#1f1e24] rounded-t-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl font-semibold text-white p-5">
                        Completed
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 h-[calc(100vh-400px)] overflow-y-auto p-3">
                  <SortableContext
                    items={getFilteredTickets("completed").map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {getFilteredTickets("completed").map((ticket) => (
                        <DraggableTicketCard
                          key={ticket._id}
                          ticket={ticket}
                          allTickets={Object.values(tickets).flat()}
                          onClick={() => setSelectedTicket(ticket)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </DroppableColumn>
          </div>

          {/* Enhanced Drag Overlay */}
          {activeTicket && (
            <DragOverlay>
              <div className="bg-card shadow-2xl rounded-xl p-4 scale-105 rotate-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">
                      Room-{activeTicket.roomNumber}
                    </h3>
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      {activeTicket.subject || "Service Request"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getCategoryColor(
                        getTicketCategory(activeTicket)
                      )}`}
                    >
                      {getTicketCategory(activeTicket)
                        ?.replace("_", " ")
                        .toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {activeTicket.messages[0]?.content || "No message content"}
                </p>
              </div>
            </DragOverlay>
          )}
        </DndContext>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={() => setSelectedTicket(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">
                      Ticket #{selectedTicket._id.slice(-6)}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Room {selectedTicket.roomNumber} •{" "}
                      {selectedTicket.guestInfo.name}
                    </p>
                    {(() => {
                      // Find related tickets
                      const allTicketsFlat = Object.values(tickets).flat();
                      const relatedTickets = allTicketsFlat.filter(
                        (t: Ticket) => {
                          if (t._id === selectedTicket._id) return true;
                          if (
                            t.guestInfo.name !== selectedTicket.guestInfo.name
                          )
                            return false;
                          if (t.roomNumber !== selectedTicket.roomNumber)
                            return false;

                          const timeDiff = Math.abs(
                            new Date(t.createdAt).getTime() -
                              new Date(selectedTicket.createdAt).getTime()
                          );
                          return timeDiff <= 5 * 60 * 1000; // 5 minutes
                        }
                      );

                      const allCategories = [
                        ...new Set(
                          relatedTickets.map((t: Ticket) =>
                            getTicketCategory(t)
                          )
                        ),
                      ];
                      const isMultiCategory = allCategories.length > 1;

                      if (isMultiCategory) {
                        return (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 font-medium mb-1">
                              🔗 Multi-service request
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              {allCategories.map((category) => (
                                <span
                                  key={category}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(
                                    category
                                  )}`}
                                >
                                  {getCategoryLabel(category)}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              {relatedTickets.length} related tickets created
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) =>
                        handleStatusChange(selectedTicket._id, value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raised">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-medium">
                      {selectedTicket.guestInfo.name}
                    </span>
                    {selectedTicket.guestInfo.email && (
                      <p className="text-sm text-muted-foreground">
                        {selectedTicket.guestInfo.email}
                      </p>
                    )}
                    {selectedTicket.guestInfo.phone && (
                      <p className="text-sm text-muted-foreground">
                        {selectedTicket.guestInfo.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Conversation History</h4>
                    <Badge variant="outline" className="text-xs">
                      {selectedTicket.messages?.length || 0} messages
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {selectedTicket.messages?.map(
                      (message: Message, index: number) => {
                        const isGuest = message.sender === "guest";
                        const isAI = message.sender === "ai_assistant";
                        const isSystem = message.sender === "system";
                        const isManager = message.sender === "manager";

                        return (
                          <div
                            key={index}
                            className={`flex ${
                              isGuest || isAI ? "justify-start" : "justify-end"
                            } mb-3`}
                          >
                            <div className="flex items-start gap-3 max-w-[85%]">
                              {/* Avatar */}
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  isGuest
                                    ? "bg-blue-100 text-blue-700"
                                    : isAI
                                    ? "bg-purple-100 text-purple-700"
                                    : isSystem
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {isGuest
                                  ? "👤"
                                  : isAI
                                  ? "🤖"
                                  : isSystem
                                  ? "⚙️"
                                  : "👨‍💼"}
                              </div>

                              {/* Message Content */}
                              <div
                                className={`flex-1 p-3 rounded-lg ${
                                  isGuest
                                    ? "bg-blue-50 border border-blue-200"
                                    : isAI
                                    ? "bg-purple-50 border border-purple-200"
                                    : isSystem
                                    ? "bg-gray-50 border border-gray-200"
                                    : "bg-green-50 border border-green-200"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className={`text-xs font-medium ${
                                      isGuest
                                        ? "text-blue-800"
                                        : isAI
                                        ? "text-purple-800"
                                        : isSystem
                                        ? "text-gray-800"
                                        : "text-green-800"
                                    }`}
                                  >
                                    {message.senderName}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(
                                        message.createdAt ||
                                          message.timestamp ||
                                          new Date()
                                      ),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </div>
                                <div
                                  className={`text-sm leading-relaxed ${
                                    isGuest
                                      ? "text-blue-900"
                                      : isAI
                                      ? "text-purple-900"
                                      : isSystem
                                      ? "text-gray-900"
                                      : "text-green-900"
                                  }`}
                                >
                                  {message.content
                                    .split("\n")
                                    .map((line, i) => (
                                      <p
                                        key={i}
                                        className={i > 0 ? "mt-2" : ""}
                                      >
                                        {line.startsWith("**") &&
                                        line.endsWith("**") ? (
                                          <strong>{line.slice(2, -2)}</strong>
                                        ) : line.startsWith("- ") ? (
                                          <span className="block ml-2">
                                            • {line.slice(2)}
                                          </span>
                                        ) : (
                                          line
                                        )}
                                      </p>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {selectedTicket.messages?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversation history available</p>
                    </div>
                  )}
                </div>

                {/* AI Suggestion Section */}
                {aiSuggestion && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        AI Suggestion
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">{aiSuggestion}</p>
                    <div className="mb-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getCategoryColor(
                          getTicketCategory(selectedTicket)
                        )}`}
                      >
                        {getTicketCategory(selectedTicket)
                          ?.replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={useAISuggestion}
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-none hover:bg-blue-50"
                      >
                        Use This Response
                      </Button>
                      <Button
                        onClick={() => setAiSuggestion("")}
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 border-none"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={getAISuggestion}
                      disabled={isLoadingAI}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 border-none"
                    >
                      {isLoadingAI ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isLoadingAI ? "Generating..." : "Get AI Suggestion"}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 border-none"
                      rows={3}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !newMessage.trim()}
                      size="sm"
                      className="border-none"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Droppable Column Component
function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] transition-all duration-200 ${
        isOver
          ? "bg-muted/30 rounded-lg ring-2 ring-primary/20 scale-[1.02]"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

// Draggable Ticket Card Component
function DraggableTicketCard({
  ticket,
  onClick,
  allTickets,
}: {
  ticket: Ticket;
  onClick: () => void;
  allTickets?: Ticket[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  // Since each ticket now has only one category, no need to group
  const ticketCategory = getTicketCategory(ticket);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-card border-none shadow-md rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 ${
        isDragging ? "shadow-2xl scale-105 rotate-2" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-sm line-clamp-1">
            Room-{ticket.roomNumber}
          </h3>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {ticket.subject || "Service Request"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(
              ticketCategory
            )}`}
          >
            {getCategoryLabel(ticketCategory)}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {ticket.messages?.[0]?.content || "No message"}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
        </span>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>{ticket.messages?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}
