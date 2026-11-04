import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { Toaster } from 'sonner'

import { Provider } from "react-redux";
import { store } from "./redux/store";


ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        theme="light"
        offset="50px"
        duration={2000}
      />
    </BrowserRouter>
  </Provider>
)