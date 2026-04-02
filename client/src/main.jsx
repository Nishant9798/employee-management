import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            gutter={8}
            toastOptions={{
              className: 'dark:bg-slate-800 dark:text-white',
              style: {
                borderRadius: '14px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.04)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ecfdf5',
                },
                style: {
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#fff1f2',
                },
                style: {
                  background: '#fff1f2',
                  color: '#9f1239',
                  border: '1px solid #fecdd3',
                },
              },
              duration: 3000,
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
