

## Laundry Order Management App

### Design
- Clean, modern UI matching the provided designs — card-based order list, Material-style icons (using Lucide equivalents), Manrope font, blue/white color scheme
- Mobile-first layout with bottom navigation bar

### Pages

1. **Orders Page** (home) — Filter tabs (All, Pending, Washing, Drying, Ready), order cards showing order number, customer name, status badge, service type, weight, price, and a status action button
2. **Order Details Page** — Full order info with status badge, customer details, order items, cost breakdown, order timeline, and action buttons (Mark as Picked Up, Send Notification)
3. **New Order Page** — Form with customer name/phone, service type selection (Wash & Fold, Dry Clean, Ironing), weight input (lbs/kg toggle), fulfillment type (Pick-up/Delivery), special instructions, and create button

### Database (Lovable Cloud / Supabase)

- **customers** table: id, name, phone
- **orders** table: id, order_number, customer_id (FK), service_type, weight, weight_unit, price, status (pending/washing/drying/ready/picked_up), fulfillment_type, special_instructions, created_at, updated_at
- **order_timeline** table: id, order_id (FK), status, timestamp

### Key Features
- Auto-generated order numbers (#ORD-XXXX)
- Status progression: Pending → Washing → Drying → Ready → Picked Up
- Status update button on each order card advances to next status
- Timeline entries auto-created on status changes
- Filter orders by status tabs
- Price calculated based on service type and weight

### Navigation
- Bottom nav bar with: Orders, Customers (placeholder), Pricing (placeholder), Settings (placeholder)
- Floating "+" button to create new order

