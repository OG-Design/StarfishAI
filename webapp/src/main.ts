import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Browsers on iPad (Safari, Chrome, Firefox) all misreport viewport height
// due to browser chrome (address bar, tab bar). The visualViewport API is the
// cross-browser standard for the *actual* visible area. Falls back to innerHeight.
function setAppHeight() {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
  // Prevent the browser from scrolling the page when the virtual keyboard
  // opens — the app is position:fixed and handles its own layout.
  window.scrollTo(0, 0);
}
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);
window.visualViewport?.addEventListener('resize', setAppHeight);
setAppHeight();

createApp(App).mount('#app')
