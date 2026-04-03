import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import OrderDetails from './pages/OrderDetails';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminReports from './pages/admin/Reports';
import AdminNewOrder from './pages/admin/NewOrder';
import AdminClients from './pages/admin/AdminClients';

// Components
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import GlobalNav from './components/GlobalNav';

import { CartProvider } from './context/CartContext';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            // Auth account exists but no Firestore profile — treat as logged out
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <CartProvider>
        <BrowserRouter>
          <GlobalNav user={authLoading ? null : user} />
          <Routes>
            <Route path="/login" element={!authLoading && user ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={!authLoading && user ? <Navigate to="/" /> : <Register />} />

            <Route element={<Layout user={authLoading ? null : user} />}>
              <Route path="/" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />

              {/* Client Routes */}
              <Route element={<AuthGuard user={authLoading ? null : user} requiredRole="client" />}>
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/orders/:id" element={<OrderDetails />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<AuthGuard user={authLoading ? null : user} requiredRole="admin" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/new-order" element={<AdminNewOrder />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/clients" element={<AdminClients />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </ErrorBoundary>
  );
}
