import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, WashingMachine, Bell, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/components/OrderCard";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS = ["all", "pending", "washing", "drying", "ready"] as const;
const TAB_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  washing: "Washing",
  drying: "Drying",
  ready: "Ready",
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated");

      // Trigger SMS notification when status becomes "ready"
      if (result.status === "ready") {
        try {
          const { data, error } = await supabase.functions.invoke("notify-order-ready", {
            body: { order_id: result.id },
          });
          if (error) throw error;
          toast.success("Customer notified via SMS");
        } catch (e) {
          console.error("SMS notification failed:", e);
          toast.error("Failed to send SMS notification");
        }
      }
    },
    onError: () => toast.error("Failed to update status"),
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <WashingMachine className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">LaundryOps</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Search className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </header>

      {/* Order List */}
      <main className="p-4 space-y-3 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <WashingMachine className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No orders found</p>
            <p className="text-sm">Create your first order to get started</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order as any}
              onStatusUpdate={(id, status) => updateStatus.mutate({ id, status })}
            />
          ))
        )}
      </main>

      {/* FAB */}
      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => navigate("/orders/new")}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <BottomNav />
    </div>
  );
}
