/**
 * Format audit report as JSON.
 */
export function formatJSON(report) {
  return JSON.stringify(report, null, 2);
}
