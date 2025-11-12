




import { createEffect, createSignal, Show } from 'solid-js';



import { Calendar } from './components/Calendar';



import { DatePicker } from './components/DatePicker';



import { FileList } from './components/FileList';



import { HybridEditor } from './components/HybridEditor';



import { IconSidebar } from './components/IconSidebar';



import { MenuBar } from './components/MenuBar';

import { ApplicationMenuBar } from './components/ApplicationMenuBar';



import { useTheme } from './components/ThemeContext';



import { store } from './store';



import styles from './App.module.scss';







function App() {



  const { theme } = useTheme();







  const [isDatePickerVisible, setDatePickerVisible] = createSignal(false);



  const [datePickerPosition, setDatePickerPosition] = createSignal({ top: 0, left: 0 });



  const [datePickerCallback, setDatePickerCallback] = createSignal<(date: string) => void>(() => {});



  const [isSidebarOpen, setSidebarOpen] = createSignal(true);







  createEffect(() => {



    document.body.className = theme();



  });







  const showDatePicker = (pos: { top: number, left: number }, callback: (date: string) => void) => {



    setDatePickerPosition(pos);



    setDatePickerCallback(() => callback);



    setDatePickerVisible(true);



  };







  const onDateSelect = (date: string) => {



    datePickerCallback()(date);



    setDatePickerVisible(false);



  };







  const toggleSidebar = () => {



    setSidebarOpen(!isSidebarOpen());



  };







  return (



    <main class={styles.main}>



      <IconSidebar onFileIconClick={toggleSidebar} />



      <div class={styles.sidebarContainer} classList={{ [styles.closed]: !isSidebarOpen() }}>



        <Calendar />



        <FileList />



      </div>



      <div class={styles.contentContainer}>

        <ApplicationMenuBar />

        <MenuBar />



        <div class={styles.editorWrapper}>



          <HybridEditor



            value={store.activeContent}



            setValue={store.updateActiveContent}



            onShowDatePicker={showDatePicker}



          />



          <Show when={isDatePickerVisible()}>



            <DatePicker



              position={datePickerPosition()}



              onSelect={onDateSelect}



              onClose={() => setDatePickerVisible(false)}



            />



          </Show>



        </div>



      </div>



    </main>



  );



}







export default App;




