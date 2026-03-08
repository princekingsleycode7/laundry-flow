

## AI Agent for Twilio SMS Notifications on Order Ready

### Overview
When an order status is updated to "ready", an edge function will be triggered to send an SMS to the customer via Twilio, notifying them their laundry is ready for pickup. An AI model (via Lovable AI) will generate a friendly, personalized message.

### Prerequisites — Twilio Secrets
Three Twilio secrets are needed:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` (your Twilio sender number)

These will be added via the secrets tool before implementation.

### Implementation

**1. Edge Function: `supabase/functions/notify-order-ready/index.ts`**
- Accepts POST with `order_id`
- Fetches the order + customer details (name, phone) from the database
- Calls Lovable AI (e.g. `google/gemini-2.5-flash-lite`) to generate a short, friendly SMS message like: "Hi John! Your laundry order #ORD-8831 (Wash & Fold) is ready for pickup. Thanks for choosing LaundryOps!"
- Sends the SMS via Twilio REST API (`https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`)
- Returns success/failure

**2. Frontend Changes**
- In both `OrderDetails.tsx` and `Index.tsx` (via `OrderCard`), after a status update to "ready" succeeds, call the edge function via `supabase.functions.invoke('notify-order-ready', { body: { order_id } })`
- Show a toast confirming "Customer notified via SMS" or an error if notification fails
- Only trigger when the new status is specifically `"ready"`

**3. Config**
- Add `[functions.notify-order-ready]` with `verify_jwt = false` to `supabase/config.toml`

### Flow
```text
User clicks "Mark Ready"
  → orders.status updated to "ready"
  → Frontend calls notify-order-ready edge function
  → Edge function fetches order + customer data
  → AI generates personalized SMS text
  → Twilio sends SMS to customer phone
  → Toast confirms notification sent
```

