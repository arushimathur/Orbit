export function lastSeenLabel(recordedAt: string): string {
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(recordedAt).getTime()) / 60000));
  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  return `${Math.round(minutesAgo / 60)}h ago`;
}
