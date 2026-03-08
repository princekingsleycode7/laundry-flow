
CREATE TABLE public.sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'assistant')),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sms_conversations" ON public.sms_conversations FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_sms_conversations_phone ON public.sms_conversations(phone);
CREATE INDEX idx_sms_conversations_customer_id ON public.sms_conversations(customer_id);
CREATE INDEX idx_sms_conversations_order_id ON public.sms_conversations(order_id);
