const activeDiagnostics = new Map<string, number>();

function adjustCount(name: string, delta: number) {
  const current = activeDiagnostics.get(name) ?? 0;
  const next = Math.max(current + delta, 0);
  activeDiagnostics.set(name, next);
  if (__DEV__) {
    console.debug(`[MemoryDiagnostics] ${name} active=${next}`);
  }
  return next;
}

export function registerDiagnostic(name: string) {
  adjustCount(name, 1);
}

export function unregisterDiagnostic(name: string) {
  const next = adjustCount(name, -1);
  if (__DEV__ && next > 0) {
    console.warn(`[MemoryDiagnostics] ${name} still has ${next} active references after cleanup.`);
  }
}

export function dumpDiagnostics() {
  if (__DEV__) {
    const diagnostics = Array.from(activeDiagnostics.entries()).map(([name, count]) => ({ name, count }));
    if (diagnostics.length > 0) {
      console.table(diagnostics);
    }
  }
  return activeDiagnostics;
}
