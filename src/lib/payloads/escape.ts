/** Backslash-escapes `\ ; , : "` (WiFi and MeCard fields). */
export function escapeMeCardStyle(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/** vCard / iCalendar TEXT escaping: `\ , ;` and newlines as `\n`. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([,;])/g, '\\$1')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** encodeURIComponent, with newlines normalised to LF first. */
export function encodeQueryValue(value: string): string {
  return encodeURIComponent(value.replace(/\r\n?/g, '\n'));
}
