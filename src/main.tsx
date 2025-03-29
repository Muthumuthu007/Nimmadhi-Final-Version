import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ProductProvider } from './contexts/ProductContext';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { router } from './routes';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PermissionProvider>
        <ProductProvider>
          <RouterProvider router={router} />
        </ProductProvider>
      </PermissionProvider>
    </AuthProvider>
  </StrictMode>
);