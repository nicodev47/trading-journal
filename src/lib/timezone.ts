/**
 * "UTC+1" or "UTC+2" depending on whether Rome is on standard or daylight
 * saving time at the given date.
 */
export function getRomeUtcLabel(date: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      timeZoneName: 'shortOffset',
    })
      .formatToParts(date)
      .find(item => item.type === 'timeZoneName')?.value;
    const match = part ? /GMT([+-]\d+)/.exec(part) : null;

    if (match) return `UTC${match[1]}`;
  } catch {
    // Falls through to the generic label below.
  }

  return 'UTC+1/+2';
}
