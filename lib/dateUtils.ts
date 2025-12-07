/**
 * Datetime utility functions for handling timezone-aware conversions
 *
 * The app stores datetimes in MySQL as local time (JST) without timezone info.
 * These utilities ensure proper handling without unwanted timezone conversions.
 */

/**
 * Formats a datetime string for use in datetime-local inputs
 * Preserves the time values without timezone conversion
 *
 * @param dateString - Date string from database (e.g., "2025-12-07T15:00:00.000Z" or "2025-12-07 15:00:00")
 * @returns Formatted string for datetime-local input (e.g., "2025-12-07T15:00")
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';

  // Convert to string and trim
  let str = String(dateString).trim();

  // Remove milliseconds and timezone info to get raw datetime
  // "2025-12-07T15:00:00.000Z" → "2025-12-07T15:00:00"
  // "2025-12-07T15:00:00Z" → "2025-12-07T15:00:00"
  str = str.replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');

  // Replace space with T if it's in MySQL format
  // "2025-12-07 15:00:00" → "2025-12-07T15:00:00"
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }

  // Return first 16 characters (YYYY-MM-DDTHH:mm)
  return str.substring(0, 16);
}

/**
 * Formats a datetime string for display to users
 *
 * @param dateString - Date string from database
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '';

  // Parse without timezone conversion
  const formatted = formatDateForInput(dateString);
  if (!formatted) return '';

  // Create date from local time string
  // This ensures the date is interpreted as local time, not UTC
  const [datePart, timePart] = formatted.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  const date = new Date(year, month - 1, day, hours, minutes);

  return date.toLocaleString('ja-JP', options || {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Converts a datetime-local input value to ISO string for API submission
 * Treats the input as local time (JST)
 *
 * @param dateTimeLocalValue - Value from datetime-local input (e.g., "2025-12-07T15:00")
 * @returns ISO string without timezone conversion (e.g., "2025-12-07T15:00:00")
 */
export function dateTimeLocalToISO(dateTimeLocalValue: string): string {
  if (!dateTimeLocalValue) return '';

  // Add seconds if not present
  if (dateTimeLocalValue.length === 16) {
    return `${dateTimeLocalValue}:00`;
  }

  return dateTimeLocalValue;
}

/**
 * Gets current datetime formatted for datetime-local input
 *
 * @param offsetDays - Optional number of days to offset from now (e.g., 7 for one week from now)
 * @returns Current datetime in format "YYYY-MM-DDTHH:mm"
 */
export function getCurrentDateTimeLocal(offsetDays: number = 0): string {
  const now = new Date();

  // Apply offset if provided
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a date string for use in date inputs (type="date")
 * Preserves the date value without timezone conversion
 *
 * @param dateString - Date string from database
 * @returns Formatted string for date input (e.g., "2025-12-07")
 */
export function formatDateForDateInput(dateString: string | null | undefined): string {
  if (!dateString) return '';

  // First convert to datetime-local format, then extract date part
  const datetimeLocal = formatDateForInput(dateString);
  if (!datetimeLocal) return '';

  // Extract just the date part (YYYY-MM-DD)
  return datetimeLocal.split('T')[0];
}
