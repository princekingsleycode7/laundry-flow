import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";

interface SmsConversationProps {
  customerId: string;
}

export function SmsConversation({ customerId }: SmsConversationProps) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["sms-conversations", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_conversations")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">SMS Conversation</p>
        <div className="flex justify-center py-4">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">SMS Conversation</p>
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No messages yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">SMS Conversation</p>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "assistant"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p>{msg.message}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/70"
                }`}
              >
                {format(new Date(msg.created_at), "MMM d, h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
