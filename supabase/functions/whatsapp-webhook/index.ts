import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVICE_LABELS: Record<string, string> = {
  wash_and_fold: "Wash & Fold",
  dry_clean: "Dry Clean",
  ironing: "Ironing",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  washing: "Washing",
  drying: "Drying",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
};

const tools = [
  {
    type: "function",
    function: {
      name: "get_customer_orders",
      description: "Get all orders for a customer by their phone number.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Customer phone number" },
        },
        required: ["phone"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Get full details of a specific order by order number.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "The order number (e.g. ORD-8831)" },
        },
        required: ["order_number"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Quick status check for a specific order by order number.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "The order number (e.g. ORD-8831)" },
        },
        required: ["order_number"],
        additionalProperties: false,
      },
    },
  },
];

async function executeTool(supabase: any, toolName: string, args: any): Promise<string> {
  try {
    if (toolName === "get_customer_orders") {
      const phone = args.phone.trim();
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone")
        .or(`phone.eq.${phone},phone.eq.${phone.replace(/^\+/, "")},phone.eq.+${phone.replace(/^\+/, "")}`);

      if (!customers || customers.length === 0) {
        return JSON.stringify({ result: "No customer found with this phone number." });
      }

      const customerIds = customers.map((c: any) => c.id);
      const { data: orders } = await supabase
        .from("orders")
        .select("order_number, service_type, status, price, weight, weight_unit, created_at")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false });

      if (!orders || orders.length === 0) {
        return JSON.stringify({ result: "No orders found for this customer." });
      }

      return JSON.stringify({
        orders: orders.map((o: any) => ({
          order_number: o.order_number,
          service: SERVICE_LABELS[o.service_type] || o.service_type,
          status: STATUS_LABELS[o.status] || o.status,
          price: `$${Number(o.price).toFixed(2)}`,
          weight: `${o.weight} ${o.weight_unit}`,
          date: o.created_at,
        })),
      });
    }

    if (toolName === "get_order_details") {
      const { data: order } = await supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("order_number", args.order_number)
        .single();

      if (!order) return JSON.stringify({ result: "Order not found." });

      const { data: timeline } = await supabase
        .from("order_timeline")
        .select("status, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      return JSON.stringify({
        order_number: order.order_number,
        service: SERVICE_LABELS[order.service_type] || order.service_type,
        status: STATUS_LABELS[order.status] || order.status,
        price: `$${Number(order.price).toFixed(2)}`,
        weight: `${order.weight} ${order.weight_unit}`,
        special_instructions: order.special_instructions || "None",
        customer_name: order.customers?.name,
        created_at: order.created_at,
        timeline: (timeline || []).map((t: any) => ({
          status: STATUS_LABELS[t.status] || t.status,
          time: t.created_at,
        })),
      });
    }

    if (toolName === "get_order_status") {
      const { data: order } = await supabase
        .from("orders")
        .select("order_number, status, updated_at")
        .eq("order_number", args.order_number)
        .single();

      if (!order) return JSON.stringify({ result: "Order not found." });

      return JSON.stringify({
        order_number: order.order_number,
        status: STATUS_LABELS[order.status] || order.status,
        last_updated: order.updated_at,
      });
    }

    return JSON.stringify({ error: "Unknown tool" });
  } catch (e) {
    console.error(`Tool ${toolName} error:`, e);
    return JSON.stringify({ error: `Failed to execute ${toolName}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Parse Twilio webhook (form-encoded)
    const formData = await req.formData();
    const rawFrom = (formData.get("From") as string) || "";
    const inboundBody = (formData.get("Body") as string) || "";

    if (!rawFrom || !inboundBody) {
      return new Response("<Response><Message>Invalid request</Message></Response>", {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Strip "whatsapp:" prefix to get the plain phone number
    const fromPhone = rawFrom.replace(/^whatsapp:/, "");
    const whatsappFrom = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;
    const whatsappTo = `whatsapp:${TWILIO_PHONE_NUMBER}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find customer by phone
    const normalizedPhone = fromPhone.replace(/^\+/, "");
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, phone")
      .or(`phone.eq.${fromPhone},phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`);

    const customer = customers?.[0];
    if (!customer) {
      const replyMsg = "Hi! We couldn't find your account. Please contact us at the store for assistance.";
      await sendTwilioMessage(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, whatsappTo, whatsappFrom, replyMsg);
      return new Response("<Response></Response>", {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Save inbound message
    await supabase.from("sms_conversations").insert({
      customer_id: customer.id,
      phone: fromPhone,
      role: "customer",
      message: inboundBody,
      channel: "whatsapp",
    });

    // Load recent conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("sms_conversations")
      .select("role, message, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationMessages = (history || []).map((h: any) => ({
      role: h.role === "customer" ? "user" : "assistant",
      content: h.message,
    }));

    const systemPrompt = `You are a friendly WhatsApp assistant for LaundryOps, a laundry service business. 
The customer messaging you is ${customer.name} (phone: ${fromPhone}).

RULES:
- Keep responses SHORT (under 160 characters when possible, max 320 chars)
- Be warm, friendly, and professional
- Use the provided tools to look up order information before answering order-related questions
- If asked about business hours, say: Mon-Sat 8am-8pm, Sun 10am-5pm
- If asked about pricing: Wash & Fold $2/lb, Dry Clean $10/item, Ironing $3.50/item
- Orders are held for 7 days after being marked ready
- Do not use emojis
- Return ONLY the message text, nothing else`;

    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
    ];

    let finalResponse = "";
    let iterations = 0;
    const MAX_ITERATIONS = 3;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
        finalResponse = "Sorry, I'm having trouble right now. Please try again later or visit us in store.";
        break;
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      if (!choice) {
        finalResponse = "Sorry, I'm having trouble right now. Please try again later.";
        break;
      }

      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        aiMessages.push(message);

        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          if (toolName === "get_customer_orders" && !toolArgs.phone) {
            toolArgs.phone = fromPhone;
          }

          const result = await executeTool(supabase, toolName, toolArgs);
          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        continue;
      }

      finalResponse = message.content?.trim() || "Sorry, I couldn't process your request.";
      break;
    }

    // Save assistant response
    await supabase.from("sms_conversations").insert({
      customer_id: customer.id,
      phone: fromPhone,
      role: "assistant",
      message: finalResponse,
      channel: "whatsapp",
    });

    // Send WhatsApp reply via Twilio
    await sendTwilioMessage(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, `whatsapp:${TWILIO_PHONE_NUMBER}`, whatsappFrom, finalResponse);

    return new Response("<Response></Response>", {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("whatsapp-webhook error:", e);
    return new Response("<Response><Message>Something went wrong. Please try again.</Message></Response>", {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});

async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });

  if (!response.ok) {
    const data = await response.json();
    console.error("Twilio send error:", data);
    throw new Error(`Twilio error: ${data.message}`);
  }
}
