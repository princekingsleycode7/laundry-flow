export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  washing: 'Washing',
  drying: 'Drying',
  ready: 'Ready',
  picked_up: 'Picked Up',
};

export const STATUS_NEXT: Record<string, string> = {
  pending: 'washing',
  washing: 'drying',
  drying: 'ready',
  ready: 'picked_up',
};

export const STATUS_ACTION_LABELS: Record<string, string> = {
  pending: 'Start Wash',
  washing: 'Move to Drying',
  drying: 'Mark Ready',
  ready: 'Mark Delivered',
};

export const SERVICE_LABELS: Record<string, string> = {
  wash_and_fold: 'Wash & Fold',
  dry_clean: 'Dry Clean',
  ironing: 'Ironing',
};

export const SERVICE_PRICES: Record<string, number> = {
  wash_and_fold: 2.0,
  dry_clean: 10.0,
  ironing: 3.5,
};
