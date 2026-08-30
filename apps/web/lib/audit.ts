export function auditLog(action: string, details: Record<string, unknown>, actor: string): void {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    actor,
    ...details,
  };
  // In production, this should be sent to an observability/audit log service.
  // Using console.log is acceptable for the scope of this fix.
  console.log(JSON.stringify(entry));
}
