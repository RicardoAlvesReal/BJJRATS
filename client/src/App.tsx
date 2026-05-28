import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import api from '@/lib/api';
import Landing from "./pages/Landing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Support from "./pages/Support";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./pages/AppLayout";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import PublicPost from "./pages/public/PublicPost";
import PublicEvent from "./pages/public/PublicEvent";
import PublicChallenge from './pages/public/PublicChallenge';
import PublicTrial from './pages/public/PublicTrial';
import Pricing from './pages/Pricing';
import SubscriptionManager from './pages/SubscriptionManager';

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [checkingSub, setCheckingSub] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (loading || !user) { setCheckingSub(false); return; }
    const check = async () => {
      try {
        if (user.role === 'superadmin' || user.subscriptionExempt) {
          setHasAccess(true);
          setCheckingSub(false);
          return;
        }
        const { subscription } = await api.subscriptions.getMy();
        setHasAccess(!!subscription);
      } catch {
        setHasAccess(false);
      } finally {
        setCheckingSub(false);
      }
    };
    check();
  }, [user, loading]);

  if (loading || checkingSub) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/favicon.png"
            alt="BJJRats"
            style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(204,0,0,0.5))' }}
          />
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#CC0000' }}>
            CARREGANDO...
          </p>
        </div>
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  if (user.role === 'superadmin' || user.role === 'admin') return <Redirect to="/admin" />;
  if (!hasAccess) return <Redirect to="/pricing" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/admin/login" />;
  if (user.role !== 'superadmin' && user.role !== 'admin') return <Redirect to="/app" />;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to={user.role === 'superadmin' || user.role === 'admin' ? '/admin' : '/app'} />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/support" component={Support} />
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />
      <Route path="/app"   component={() => <ProtectedRoute component={AppLayout} />} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={() => <AdminRoute     component={AdminLayout} />} />
      <Route path="/post/:postId" component={PublicPost} />
      <Route path="/evento/:eventId" component={PublicEvent} />
      <Route path="/desafio/:challengeId" component={PublicChallenge} />
      <Route path="/trial/:academyId" component={PublicTrial} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/app/subscription" component={() => <ProtectedRoute component={SubscriptionManager} />} />
      <Route component={() => <Redirect to="/" />} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="top-center" />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
