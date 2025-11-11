import dayjs from 'dayjs';
import { createSignal, For } from 'solid-js';
import styles from './Calendar.module.scss';

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
    <div class={styles.calendar}>
      <div class={styles.header}>
        <button onClick={() => setCurrentDate(currentDate().subtract(1, 'month'))}>&lt;</button>
        <h2>{currentDate().format('MMMM YYYY')}</h2>
        <button onClick={() => setCurrentDate(currentDate().add(1, 'month'))}>&gt;</button>
      </div>
      <div class={styles.weekDays}>
        <For each={weekDays}>{(day) => <div>{day}</div>}</For>
      </div>
      <div class={styles.days}>
        <For each={daysInMonth()}>
          {(day) => (
            <div
              class={styles.day}
              classList={{
                [styles.today]: day === dayjs().date() && currentDate().month() === dayjs().month() && currentDate().year() === dayjs().year(),
                [styles.empty]: day === null
              }}
            >
              {day}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
