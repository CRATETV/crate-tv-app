import React from 'react';
import ReactDOM from 'react-dom/client';
import ClassicsPage from './components/ClassicsPage.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// The main application router. For this request, we are directly rendering
// the ClassicsPage to allow the user to preview it.
const AppRouter: React.FC = () => {
  return <ClassicsPage />;
};

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
