const TIMEZONE = "Africa/Dar_es_Salaam";

export function formatStaffDate(iso: string): string {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return `${formatted} Africa/Dar_es_Salaam`;
}
