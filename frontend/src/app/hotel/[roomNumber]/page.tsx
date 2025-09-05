"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, User, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface GuestInfo {
  guestName: string;
  roomNumber: string;
}

export default function GuestChatPage() {
  const params = useParams();
  const roomNumber = params?.roomNumber as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestName, setGuestName] = useState(`Guest-${roomNumber}`);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [pendingTicketMessage, setPendingTicketMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

  useEffect(() => {
    // Initialize with welcome message (no guest name required)
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm Ella, What do you need?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [roomNumber, searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGuestFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setShowGuestForm(false);
    // Add welcome message
    setMessages([
      {
        role: "assistant",
        content: `Hello ${guestName}! I'm your AI assistant for Room ${roomNumber}. How can I help you today? I can assist with room service, housekeeping, maintenance issues, or any other hotel services.`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    const currentMessage = message;
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsSubmitting(true);

    try {
      // Call the updated AI endpoint that uses external classification
      const aiResponse = await axios.post(`${API_BASE_URL}/chat/ai`, {
        message: currentMessage,
        guestInfo: {
          guestName: `Guest-${roomNumber}`,
          roomNumber: roomNumber,
        },
        conversationHistory: messages,
      });

      const aiMessage: Message = {
        role: "assistant",
        content: aiResponse.data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Create tickets if classification says we should
      if (
        aiResponse.data.shouldCreateTicket &&
        aiResponse.data.categories?.length > 0
      ) {
        try {
          const ticketResponse = await axios.post(
            `${API_BASE_URL}/tickets/guest`,
            {
              roomNumber: roomNumber,
              guestInfo: {
                name: `Guest-${roomNumber}`,
                email: `guest.${roomNumber}@hotel.com`,
                phone: "Not provided",
              },
              initialMessage: currentMessage,
            }
          );

          // Show success message for multiple tickets
          if (
            ticketResponse.data.success &&
            ticketResponse.data.ticketCount > 0
          ) {
            const ticketCount = ticketResponse.data.ticketCount;
            const categories = ticketResponse.data.categories.join(", ");

            if (ticketCount > 1) {
              toast.success(
                `🎫 ${ticketCount} service requests created for: ${categories}`
              );
            } else {
              toast.success(`🎫 Service request created for ${categories}`);
            }
          }
        } catch (ticketError: any) {
          console.error("Failed to create ticket:", ticketError);
          // Only show error if it's not a greeting message
          if (!ticketError.response?.data?.isGreeting) {
            toast.error("Failed to send request to staff");
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
      // Remove the user message if AI call failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen h-full ">
      {/* Mobile-first responsive container */}
      <div className=" mx-auto px-2 sm:px-4 md:px-6 lg:px-8  h-full relative">
        {/* Header Section - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 pt-2 sm:pt-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
            <div className="flex flex-row items-center gap-2">
              <div className="pt-0.5">
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => router.push("/")}
                  className="h-8 w-8  bg-[#f4f4f4] hover:bg-black/10 duration-500 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">Room - {roomNumber}</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowGuestForm(true);
                setMessages([]);
                setTicketCreated(false);
              }}
              className="h-9 w-full sm:h-10 sm:w-auto text-xs sm:text-sm touch-manipulation"
            >
              New Chat
            </Button>
          </div>
          <AnimatePresence>
            {ticketCreated && (
              <div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 hover:bg-green-100 text-xs sm:text-sm"
                >
                  ✅ Service Request Created
                </Badge>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Guest Form - Responsive */}
        <AnimatePresence mode="wait">
          {showGuestForm ? (
            <div key="guest-form" className="w-full max-w-4xl mx-auto ">
              <Card className="max-w-sm sm:max-w-md mx-auto shadow-lg border-none backdrop-blur-sm  ">
                <CardHeader className="text-center pb-2 px-4 sm:px-6">
                  <div className="flex items-center justify-center mb-3 sm:mb-4  ">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                      <AvatarFallback className="bg-primary/10">
                        <img src="/Logo.png" className="h-6" alt="" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Welcome to Room {roomNumber}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      Chat with Ella, your AI chatbot for instant help
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                  <form
                    onSubmit={handleGuestFormSubmit}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor="guestName"
                        className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Your Name
                      </label>
                      <Input
                        id="guestName"
                        type="text"
                        placeholder="Enter your name"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="h-9 sm:h-10 text-sm sm:text-base border-none"
                      />
                    </div>
                    <div>
                      <Button
                        type="submit"
                        className="w-full h-9 sm:h-10 text-sm sm:text-base border-none"
                      >
                        Start Chat with Ella
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Chat Interface - Responsive */
            <div key="chat-interface">
              <Card className=" w-full max-w-4xl mx-auto h-[calc(100vh-14rem)] sm:h-[calc(100vh-16rem)] md:h-[calc(100vh-18rem)] lg:h-[calc(100vh-20rem)] flex flex-col  border-none backdrop-blur-sm">
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full px-3 sm:px-4 md:px-6 py-2 sm:py-4">
                    <div className="space-y-3 sm:space-y-4">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
                          <div className="text-center">
                            <div>
                              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4">
                                <AvatarFallback className="bg-transparent">
                                  <img src="/Logo.png" className="h-3" alt="" />
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <p className="text-base sm:text-lg font-medium">
                              Start a conversation
                            </p>
                            <p className="text-xs sm:text-sm">
                              Ella chatbot is ready to help
                            </p>
                          </div>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {messages.map((msg, index) => (
                            <div
                              key={index}
                              className={`flex gap-2 sm:gap-3 items-center justify-center ${
                                msg.role === "user"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              {/* {msg.role === "assistant" && (
                                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 mt-1 flex-shrink-0 shadow-black/20 shadow-lg ">
                                  <AvatarFallback>
                                    <img
                                      src="/Logo.png"
                                      className="h-4"
                                      alt=""
                                    />
                                  </AvatarFallback>
                                </Avatar>
                              )} */}
                              <div
                                className={`max-w-[80%] sm:max-w-[75%] rounded-lg px-2 items-center justify-center sm:px-5 py-2 break-words ${
                                  msg.role === "user"
                                    ? "bg-[#f4f4f4] text-black"
                                    : "bg-transparent text-black "
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {/* <span className="text-xs font-medium">
                                    {msg.role === "user" ? "You" : "Ella"}
                                  </span> */}
                                  {/* <span className="text-xs opacity-70">
                                    {formatDistanceToNow(
                                      new Date(msg.timestamp),
                                      { addSuffix: true }
                                    )}
                                  </span> */}
                                </div>
                                <p className="whitespace-pre-wrap break-words text-md overflow-wrap-anywhere word-break-break-word ">
                                  {msg.content}
                                </p>
                              </div>
                              {/* {msg.role === "user" && (
                                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 mt-1 flex-shrink-0 shadow-black/10 shadow-lg ">
                                  <AvatarFallback className="bg-white">
                                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                  </AvatarFallback>
                                </Avatar>
                              )} */}
                            </div>
                          ))}
                        </AnimatePresence>
                      )}

                      {/* Loading Indicator - Responsive */}
                      <AnimatePresence>
                        {isSubmitting && (
                          <div className="flex gap-2 sm:gap-3 justify-start">
                            {/* <Avatar className="h-6 w-6 sm:h-8 sm:w-8 mt-1 flex-shrink-0 shadow-black/20 shadow-lg ">
                                  <AvatarFallback>
                                    <img
                                      src="/Logo.png"
                                      className="h-4"
                                      alt=""
                                    />
                                  </AvatarFallback>
                                </Avatar> */}
                            <div className=" rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                {/* <span className="text-xs sm:text-sm">
                                  Thinking...
                                </span> */}
                              </div>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </AnimatePresence>

        {/* Message Input - Responsive */}
        <AnimatePresence>
          {!showGuestForm && (
            <div
              className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none "
              style={{ bottom: "1.5rem" }} // bottom-10 = 2.5rem
            >
              <div className="w-full max-w-4xl px-2 sm:px-4 md:px-6 lg:px-8 pointer-events-auto">
                <Card className="border-none bg-white/80 backdrop-blur-sm shadow-black/10 shadow-md  rounded-full py-3">
                  <CardContent>
                    <form onSubmit={handleSendMessage}>
                      <div className="flex gap-2 sm:gap-3">
                        <Input
                          placeholder="Ask anything"
                          className="flex-1 text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                          autoComplete="off"
                          autoCorrect="on"
                          spellCheck="false"
                        />
                        <div>
                          <Button
                            type="submit"
                            size="icon"
                            className="h-10 w-10 sm:h-10 px-3 sm:px-4 border-none flex-shrink-0 rounded-full hover:cursor-pointer"
                            disabled={isSubmitting || !message.trim()}
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <div className="w-full mx-auto pt-3 text-center">
                  <p className="text-sm">
                    Ella can make mistakes. Only one request at a time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
