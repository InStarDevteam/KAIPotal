export interface ActivityEvent {
  id: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  action: string;
  category: 'access' | 'usage' | 'admin' | 'security';
  resourceType: string;
  resourceId: string;
  result: 'success' | 'denied' | 'failed';
  reasonCode?: string;
  requestId: string;
  createdAt: string;
}

const KEY = 'kai.demo.activity.v1';
export function readDemoActivity(): ActivityEvent[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Explicit demo-only browser history; never substitutes for the server ledger. */
export function appendDemoActivity(
  input: Omit<ActivityEvent, 'id' | 'createdAt' | 'requestId'>,
) {
  const id = crypto.randomUUID();
  const event = {
    ...input,
    id,
    requestId: id,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(
    KEY,
    JSON.stringify([event, ...readDemoActivity()].slice(0, 2000)),
  );
  return event;
}

export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution, including leading control characters.
  // eslint-disable-next-line no-control-regex -- control prefixes must not bypass formula escaping
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
