export function customerWorkspaceKey(customerId: string | null): string {
  return customerId === null ? 'anonymous-session' : `customer:${customerId}`
}
