import dayjs from 'dayjs';
import { createSignal, For, onMount, onCleanup } from 'solid-js';
import { useTheme } from './ThemeContext';

interface DatePickerProps {
  onSelect: (date: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function DatePicker(props: DatePickerProps) {
  const [currentDate, setCurrentDate] = createSignal(dayjs());
  const { theme } = useTheme();

  const startOfMonth = () => currentDate().startOf('month');
  const endOfMonth = () => currentDate().endOf('month');
  const startDay = () => startOfMonth().day();

  const daysInMonth = () => {
    const days = [];
    for (let i = 0; i < startDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= endOfMonth().date(); i++) {
      days.push(i);
    }
    return days;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSelectDate = (day: number) => {
    const selectedDate = currentDate().date(day).format('YYYY-MM-DD');
    props.onSelect(`[[${selectedDate}]]`);
  };

  let datePickerRef: HTMLDivElement | undefined;

  const handleClickOutside = (event: MouseEvent) => {
    if (datePickerRef && !datePickerRef.contains(event.target as Node)) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  return (
    <div
      ref={datePickerRef}
      class="absolute z-10 rounded-lg shadow-lg p-4 text-sm"
      classList={{
        'bg-white border-gray-200 text-gray-900': theme() === 'light',
        'bg-gray-800 border-gray-700 text-white': theme() === 'dark',
      }}
      style={{ top: `${props.position.top}px`, left: `${props.position.left}px` }}
    >
      <div class="flex justify-between items-center mb-2">
        <button onClick={() => setCurrentDate(currentDate().subtract(1, 'month'))}
                classList={{
                  'text-gray-900': theme() === 'light',
                  'text-white': theme() === 'dark',
                }}
        >&lt;</button>
        <h2 class="text-lg font-semibold">{currentDate().format('MMMM YYYY')}</h2>
        <button onClick={() => setCurrentDate(currentDate().add(1, 'month'))}
                classList={{
                  'text-gray-900': theme() === 'light',
                  'text-white': theme() === 'dark',
                }}
        >&gt;</button>
      </div>
      <div class="grid grid-cols-7 gap-2 text-center text-sm">
        <For each={weekDays}>{(day) => <div class="font-semibold">{day}</div>}</For>
        <For each={daysInMonth()}>
          {(day) => (
            <div
              class="p-1 rounded-full cursor-pointer"
              classList={{
                'hover:bg-blue-100': theme() === 'light',
                'hover:bg-blue-800': theme() === 'dark',
                'bg-blue-500 text-white': day === dayjs().date() && currentDate().month() === dayjs().month(),
                'opacity-50': day === null
              }}
              onClick={() => day && handleSelectDate(day)}
            >
              {day}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
