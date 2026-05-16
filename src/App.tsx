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
import MatchDiscovery from './pages/MatchDiscovery';
import AllProducts from './pages/AllProducts';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminReports from './pages/admin/Reports';
import AdminNewOrder from './pages/admin/NewOrder';
import AdminClients from './pages/admin/AdminClients';
import PersonProfile from './pages/admin/PersonProfile';
import CatalogPageAdmin from './pages/admin/CatalogPage';
import DesignVault from './pages/admin/DesignVault';
import PushDiagnostics from './pages/admin/PushDiagnostics';

// Components
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import GlobalNav from './components/GlobalNav';

import { CartProvider } from './context/CartContext';

import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import WelcomeModal from './components/WelcomeModal';

// Notifications
import { usePushNotifications } from './hooks/usePushNotifications';
import { pushService } from './services/notifications/pushService';
import { PermissionModal } from './components/Notifications/PermissionModal';
import { IOSInstallGuide } from './components/Notifications/IOSInstallGuide';
import { ForegroundNotification } from './components/Notifications/ForegroundNotification';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [foregroundMessage, setForegroundMessage] = useState<any>(null);

  const {
    permission,
    showPermissionModal,
    setShowPermissionModal,
    showIOSGuide,
    setShowIOSGuide,
    handleRequestPermission
  } = usePushNotifications();

  useEffect(() => {
    // Configura o listener de mensagens em foreground
    const unsubscribe = pushService.onForegroundMessage((payload) => {
      setForegroundMessage(payload);
    });

    // Mostra o modal de permissão após 8 segundos se for a primeira vez
    if (permission === 'default') {
      const timer = setTimeout(() => {
        setShowPermissionModal(true);
      }, 8000);
      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }

    return () => unsubscribe();
  }, [permission, setShowPermissionModal]);

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

  const handleFinishSplash = () => {
    setShowSplash(false);
    // Aguarda alguns segundos antes de mostrar o banner de boas-vindas
    setTimeout(() => {
      setShowWelcome(true);
    }, 2000); // 2 segundos de delay após o splash sumir
  };

  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen finishLoading={handleFinishSplash} />}
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      
      {/* Notifications UI */}
      <PermissionModal 
        isOpen={showPermissionModal} 
        onClose={() => setShowPermissionModal(false)} 
        onAccept={handleRequestPermission} 
      />
      <IOSInstallGuide 
        isOpen={showIOSGuide} 
        onClose={() => setShowIOSGuide(false)} 
      />
      <ForegroundNotification 
        payload={foregroundMessage} 
        onClose={() => setForegroundMessage(null)} 
      />

      <CartProvider>
        <BrowserRouter>
          <GlobalNav user={authLoading ? null : user} />
          <Routes>
            <Route path="/login" element={!authLoading && user ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={!authLoading && user ? <Navigate to="/" /> : <Register />} />

            <Route element={<Layout user={authLoading ? null : user} />}>
              <Route path="/" element={<Catalog />} />
              <Route path="/produtos" element={<AllProducts />} />
              <Route path="/descobrir" element={<MatchDiscovery />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/admin/push-diagnostics" element={<PushDiagnostics />} />

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
                <Route path="/admin/pessoas" element={<AdminClients />} />
                <Route path="/admin/pessoas/:id" element={<PersonProfile />} />
                <Route path="/admin/catalog" element={<CatalogPageAdmin />} />
                <Route path="/admin/product-performance/:id" element={<AdminDashboard />} />
                <Route path="/admin/design-vault" element={<DesignVault />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </ErrorBoundary>
  );
}
