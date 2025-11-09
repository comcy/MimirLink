import dayjs from 'dayjs';
import { createSignal, For } from 'solid-js';

export function Calendar() {
  const [currentDate, setCurrentDate] = createSignal(dayjs());

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

  return (
    <div class="p-4 text-sm"> {/* Reduced font size */}
      <div class="flex justify-between items-center mb-2">
        <button onClick={() => setCurrentDate(currentDate().subtract(1, 'month'))}>&lt;</button>
        <h2 class="text-lg font-semibold">{currentDate().format('MMMM YYYY')}</h2>
        <button onClick={() => setCurrentDate(currentDate().add(1, 'month'))}>&gt;</button>
      </div>
      <div class="grid grid-cols-7 gap-2 text-center text-sm">
        <For each={weekDays}>{(day) => <div class="font-semibold">{day}</div>}</For>
        <For each={daysInMonth()}>
          {(day) => (
            <div class="p-1 rounded-full hover:bg-blue-100 cursor-pointer"
                 classList={{
                   'bg-blue-500 text-white': day === dayjs().date() && currentDate().month() === dayjs().month() && currentDate().year() === dayjs().year(),
                   'opacity-50': day === null
                 }}>
              {day}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
