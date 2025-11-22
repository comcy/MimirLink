import { addDays, addWeeks, addMonths, setDay, startOfDay, nextDay, isSameDay, isAfter } from 'date-fns';

export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | string;

const DAY_MAP: { [key: string]: number } = {
  'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
};

/**
 * Calculates the next occurrence of a task based on a recurrence rule.
 * Ensures the returned date is strictly after the fromDate.
 * @param rule The recurrence rule (e.g., 'daily', 'weekly', '[Mon,Wed]').
 * @param fromDate The date to calculate the next occurrence from (usually today or the last completion date).
 * @returns The next occurrence date.
 */
export function getNextOccurrence(rule: RecurrenceRule, fromDate: Date): Date {
  let nextDate: Date;
  const startOfFromDate = startOfDay(fromDate); // Ensure comparison is always from start of day

  switch (rule) {
    case 'daily':
      nextDate = addDays(startOfFromDate, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(startOfFromDate, 1);
      break;
    case 'monthly':
      nextDate = addMonths(startOfFromDate, 1);
      break;
    default:
      // Handle custom day lists like '[Mon,Wed,Fri]'
      if (rule.startsWith('[') && rule.endsWith(']')) {
        const days = rule.slice(1, -1).toLowerCase().split(',').map(d => d.trim());
        const dayIndexes = days.map(d => DAY_MAP[d]).filter(d => d !== undefined);

        if (dayIndexes.length > 0) {
          let foundNext = false;
          let tempDate = startOfFromDate;
          // Iterate up to a week to find the next valid day
          for (let i = 0; i < 7; i++) {
            tempDate = addDays(startOfFromDate, i);
            if (dayIndexes.includes(tempDate.getDay()) && isAfter(tempDate, startOfFromDate)) {
              nextDate = tempDate;
              foundNext = true;
              break;
            }
          }
          // If no day found in the next 7 days (shouldn't happen with correct logic, but as a fallback)
          if (!foundNext) {
            nextDate = addDays(startOfFromDate, 1); // Fallback to tomorrow
          }
        } else {
          nextDate = addDays(startOfFromDate, 1); // Fallback if day list is invalid
        }
      } else {
        nextDate = addDays(startOfFromDate, 1); // Fallback if rule is unknown
      }
      break;
  }

  // Ensure the returned date is strictly after the fromDate
  // This handles cases where addDays/Weeks/Months might return the same day if fromDate was e.g. 23:59:59
  // Or for weekly/monthly if the rule means "same day next week/month" and fromDate is today.
  if (!isAfter(nextDate, startOfFromDate)) {
    // If nextDate is not strictly after startOfFromDate, advance it by one cycle
    switch (rule) {
      case 'daily':
        nextDate = addDays(nextDate, 1);
        break;
      case 'weekly':
        nextDate = addWeeks(nextDate, 1);
        break;
      case 'monthly':
        nextDate = addMonths(nextDate, 1);
        break;
      default:
        // For custom days, find the next one after the current nextDate
        if (rule.startsWith('[') && rule.endsWith(']')) {
          const days = rule.slice(1, -1).toLowerCase().split(',').map(d => d.trim());
          const dayIndexes = days.map(d => DAY_MAP[d]).filter(d => d !== undefined);
          if (dayIndexes.length > 0) {
            let tempNextDate = addDays(nextDate, 1); // Start checking from tomorrow
            while (!dayIndexes.includes(tempNextDate.getDay())) {
              tempNextDate = addDays(tempNextDate, 1);
            }
            nextDate = tempNextDate;
          }
        }
        break;
    }
  }

  return nextDate;
}
