/** The next half hour, as HH:mm. 11:42 becomes 12:00; 11:30 becomes 12:00. */
export function nextHalfHour(now = new Date()): string {
  const d = new Date(now);
  const mins = d.getMinutes();
  const add = mins === 0 ? 30 : mins <= 30 ? 30 - mins : 60 - mins;
  if (mins === 30) d.setMinutes(60, 0, 0);
  else d.setMinutes(mins + add, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
