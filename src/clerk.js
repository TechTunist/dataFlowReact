import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './index.css'


// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.REACT_APP_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)