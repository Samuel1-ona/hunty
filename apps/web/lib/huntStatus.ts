export type HuntLifecycleStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Active'
  | 'Ended'
  | 'Completed'
  | 'Cancelled';

/**
 * Normalizes a status string to the app's canonical, capitalized form.
 * Case-insensitive on input so legacy/lowercase values still map correctly,
 * but the output always matches the existing store convention
 * ("Active" / "Draft" / "Cancelled" / "Completed"), plus the new
 * scheduling states ("Scheduled" / "Ended").
 */
export function normalizeHuntStatus(status?: string): HuntLifecycleStatus {
  const value = status?.toLowerCase();
  switch (value) {
    case 'scheduled':
      return 'Scheduled';
    case 'active':
      return 'Active';
    case 'ended':
      return 'Ended';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'draft':
      return 'Draft';
    default:
      return (status as HuntLifecycleStatus) ?? 'Draft';
  }
}

export function getDisplayHuntStatus(status?: string): string {
  return normalizeHuntStatus(status);
}
