import { addDays, addWeeks, addMonths, startOfDay, isAfter } from 'date-fns';

export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | string;

const DAY_MAP: { [key: string]: number } = {
  'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
};

// NOTE: This is a copy of the backend's getNextOccurrence function.
// It's important to keep them in sync if changes are made.
export function getNextOccurrence(rule: RecurrenceRule, fromDate: Date): Date {
  const startOfFromDate = startOfDay(fromDate);
  // Initialize with a fallback of the next day
  let nextDate: Date = addDays(startOfFromDate, 1);

  // Base calculation
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
      if (rule.startsWith('[') && rule.endsWith(']')) {
        const days = rule.slice(1, -1).toLowerCase().split(',').map(d => d.trim());
        const dayIndexes = days.map(d => DAY_MAP[d]).filter(d => d !== undefined);

        if (dayIndexes.length > 0) {
          let tempDate = startOfFromDate;
          // Check the next 7 days to find the next valid day
          for (let i = 1; i <= 7; i++) {
            tempDate = addDays(startOfFromDate, i);
            if (dayIndexes.includes(tempDate.getDay())) {
              nextDate = tempDate;
              break; // Exit for loop once the next valid day is found
            }
          }
        }
      }
      // If rule is not recognized, it will keep the fallback of 'tomorrow'
      break;
  }

  // This logic ensures we always move forward in time, preventing infinite loops.
  if (!isAfter(nextDate, startOfFromDate)) {
     return getNextOccurrence(rule, nextDate);
  }

  return nextDate;
}
