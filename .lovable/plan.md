

## Conversational SMS Agent with Database Access

### Overview
Build a two-way SMS conversation system where customers can reply to the "order ready" SMS and chat with an AI agent that has tools to query the database (orders, customers, order timeline) to answer questions about their orders and the business.

### Architecture

```text
Customer sends SMS → Twilio → Webhook (Edge Function) → AI Agent with DB tools → Reply via Twilio SMS
```

### Implementation

**1. Database: `sms_conversations` table**
- Columns: `id`, `order_id` (nullable FK), `customer_id` (FK), `phone`, `role` (customer/assistant), `message`, `created_at`
- Stores full conversation history per phone number so AI has context
- RLS: allow all (no auth required, internal use)

**2. Edge Function: `supabase/functions/sms-webhook/index.ts`**
- Receives inbound SMS from Twilio (POST with form-encoded `From`, `Body`, `To`)
- Looks up the customer by phone number
- Loads recent conversation history from `sms_conversations`
- Calls Lovable AI (`google/gemini-3-flash-preview`) with:
  - **System prompt**: "You are a helpful LaundryOps assistant. Use the provided tools to look up order information before answering."
  - **Tools** (via function calling):
    - `get_customer_orders(phone)` — fetch all orders for this customer
    - `get_order_details(order_number)` — fetch a specific order with timeline
    - `get_order_status(order_number)` — quick status check
  - **Conversation history** from `sms_conversations`
- Executes any tool calls against the database, feeds results back to AI
- Sends AI's final response back to customer via Twilio SMS API
- Saves both inbound and outbound messages to `sms_conversations`

**3. Update `notify-order-ready` edge function**
- Save the outgoing "order ready" SMS to `sms_conversations` so the AI has context when the customer replies

**4. Twilio Configuration**
- User needs to configure their Twilio phone number's webhook URL to point to the `sms-webhook` edge function
- URL format: `https://<project-id>.supabase.co/functions/v1/sms-webhook`

### AI Tool Definitions

The AI agent will have these tools available via function calling:

- **`get_customer_orders`** — Returns all orders for the customer (order number, service type, status, price, date)
- **`get_order_details`** — Returns full order details including timeline, special instructions, weight, price breakdown
- **`get_order_status`** — Returns current status and last update time for a specific order

### Example Conversation
```text
Agent: "Hi Sarah! Your order #ORD-8831 (Wash & Fold) is ready for pickup."
Customer: "What time do you close?"
Agent: "Our hours are Mon-Sat 8am-8pm. Your order will be held for 7 days."
Customer: "How much was my order?"
Agent: [calls get_order_details] "Your order #ORD-8831 was $12.00 for 6 lbs of Wash & Fold."
Customer: "Do I have any other orders?"
Agent: [calls get_customer_orders] "You have one other order: #ORD-8829 (Dry Clean) currently in the Washing stage."
```

### Files Changed/Created
- **New migration**: Create `sms_conversations` table
- **New**: `supabase/functions/sms-webhook/index.ts` — inbound SMS handler with AI agent
- **Edit**: `supabase/functions/notify-order-ready/index.ts` — save outgoing SMS to conversation history
- **Edit**: Frontend — add a "Conversations" view on the order details page showing SMS history (optional, nice-to-have)

