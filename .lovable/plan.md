

## Add WhatsApp Channel via Twilio

### Overview
Add WhatsApp as a second conversation channel alongside SMS. Twilio's WhatsApp API uses the same Messages API but with `whatsapp:` prefixed phone numbers. Both channels share the same AI agent logic and conversation history.

### Database Changes
- Add a `channel` column to `sms_conversations` table (default `'sms'`, values: `'sms'` or `'whatsapp'`) to track which channel each message came from.

### Edge Function Changes

**1. `supabase/functions/whatsapp-webhook/index.ts`** (New)
- Nearly identical to `sms-webhook` but handles WhatsApp-specific Twilio webhook format.
- The `From` field arrives as `whatsapp:+1234567890` — strip the `whatsapp:` prefix to find the customer.
- Reply via Twilio using `whatsapp:` prefixed `From` and `To` numbers.
- Save messages with `channel: 'whatsapp'` in `sms_conversations`.
- Same AI agent with same tools (get_customer_orders, get_order_details, get_order_status).

**2. `supabase/functions/notify-order-ready/index.ts`** (Update)
- Send the "order ready" notification via both SMS and WhatsApp (using `whatsapp:` prefix on From/To).
- Log both messages with their respective channel.

**3. `supabase/functions/sms-webhook/index.ts`** (Update)
- Save messages with `channel: 'sms'` explicitly.

### Frontend Changes

**`src/components/SmsConversation.tsx`**
- Rename title to "Conversations" and show a channel indicator (SMS/WhatsApp icon) on each message bubble.

### Config
- Add `[functions.whatsapp-webhook]` with `verify_jwt = false` to `supabase/config.toml`.

### Twilio Setup Required
- You need a Twilio WhatsApp-enabled sender (either the Twilio Sandbox for WhatsApp for testing, or a registered WhatsApp Business number).
- Configure the WhatsApp webhook URL in Twilio to: `https://djijlkklevisyvjzbtcx.supabase.co/functions/v1/whatsapp-webhook`

### Flow
```text
Customer sends WhatsApp → Twilio → whatsapp-webhook Edge Function
  → Strip "whatsapp:" prefix → Find customer → AI Agent with tools
  → Reply via Twilio WhatsApp API (whatsapp: prefixed numbers)
  → Save to sms_conversations with channel='whatsapp'
```

