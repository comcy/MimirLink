/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App.tsx';
import { ThemeProvider } from './components/ThemeContext.tsx';
import './index.scss';

const root = document.getElementById('root')

render(() => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
), root!)
