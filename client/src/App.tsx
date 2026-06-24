import { useState, useEffect, useMemo } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import CookieConsent from "./components/CookieConsent";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import api from '@/lib/api';
import Landing from "./pages/Landing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./pages/AppLayout";
import AdminLayout from "./pages/admin/AdminLayout";
import AcademiaLayout from './pages/academia/AcademiaLayout';import PublicPost from "./pages/public/PublicPost";
import PublicEvent from "./pages/public/PublicEvent";
import PublicChallenge from './pages/public/PublicChallenge';
import PublicTrial from './pages/public/PublicTrial';
import Pricing from './pages/Pricing';
import ResetPassword from './pages/ResetPassword';
import SubscriptionManager from './pages/SubscriptionManager';

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const userUid = user?.uid;
  const userRole = user?.role;
  const subscriptionExempt = user?.subscriptionExempt === true;
  const [checkingSub, setCheckingSub] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isPastDue, setIsPastDue] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!userUid) { setCheckingSub(false); return; }
    setCheckingSub(true);
    const check = async () => {
      try {
        if (userRole === 'superadmin' || subscriptionExempt) {
          setHasAccess(true);
          setCheckingSub(false);
          return;
        }
        const { subscription } = await api.subscriptions.getMy();
        if (subscription) {
          // Pagamento pendente — redireciona pro billing
          if (subscription.status === 'pending') {
            setHasAccess(false);
            setIsPastDue(false);
          } else if (subscription.status === 'past_due') {
            // Verifica período de carência
            try {
              const pubSettings = await api.settings.public();
              const graceDays = parseInt(pubSettings.past_due_grace_days || '3', 10);
              if (subscription.currentPeriodEnd) {
                const lockDate = new Date(subscription.currentPeriodEnd);
                lockDate.setDate(lockDate.getDate() + graceDays);
                if (new Date() < lockDate) {
                  // Dentro da carência — permite acesso
                  setIsGracePeriod(true);
                  setHasAccess(true);
                  setIsPastDue(false);
                } else {
                  // Fora da carência — bloqueia
                  setIsPastDue(true);
                  setHasAccess(false);
                  setIsGracePeriod(false);
                }
              } else {
                setIsPastDue(true);
                setHasAccess(false);
              }
            } catch {
              // Se não conseguir verificar, bloqueia por segurança
              setIsPastDue(true);
              setHasAccess(false);
            }
          } else {
            setHasAccess(true);
          }
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setCheckingSub(false);
      }
    };
    check();
  }, [userUid, userRole, subscriptionExempt, loading]);

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
  if (user.role === 'superadmin') return <Redirect to="/admin" />;
  if (user.role === 'admin' || user.role === 'academy') return <Redirect to="/academia" />;
  if (isPastDue) return <Redirect to="/app/subscription" />;
  if (!hasAccess) return <Redirect to="/pricing" />;
  // Durante período de carência, renderiza normalmente mas passa flag
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== 'superadmin') return <Redirect to="/app" />;
  return <Component />;
}

function AcademiaRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const userUid = user?.uid;
  const subscriptionExempt = user?.subscriptionExempt === true;
  const [checkingSub, setCheckingSub] = useState(true);
  const [isPastDue, setIsPastDue] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!userUid) { setCheckingSub(false); return; }
    if (subscriptionExempt) { setCheckingSub(false); return; }
    const check = async () => {
      try {
        const { subscription } = await api.subscriptions.getMy();
        if (subscription?.status === 'past_due') {
          // Verifica período de carência
          try {
            const pubSettings = await api.settings.public();
            const graceDays = parseInt(pubSettings.past_due_grace_days || '3', 10);
            if (subscription.currentPeriodEnd) {
              const lockDate = new Date(subscription.currentPeriodEnd);
              lockDate.setDate(lockDate.getDate() + graceDays);
              if (new Date() >= lockDate) {
                setIsPastDue(true);
              }
            } else {
              setIsPastDue(true);
            }
          } catch {
            setIsPastDue(true);
          }
        }
      } catch { /* ignora */ }
      setCheckingSub(false);
    };
    check();
  }, [userUid, subscriptionExempt, loading]);

  if (loading || checkingSub) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== 'academy' && user.role !== 'admin') return <Redirect to="/app" />;
  if (isPastDue) return <Redirect to="/app/subscription" />;
  return <Component />;
}

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to={user.role === 'superadmin' ? '/admin' : user.role === 'admin' || user.role === 'academy' ? '/academia' : '/app'} />;
  return <Component />;
}

function Router() {
  const AppRoute = useMemo(() => () => <ProtectedRoute component={AppLayout} />, []);
  const AdminRouteWrapped = useMemo(() => () => <AdminRoute component={AdminLayout} />, []);
  const AcademiaRouteWrapped = useMemo(() => () => <AcademiaRoute component={AcademiaLayout} />, []);
  const LoginRoute = useMemo(() => () => <PublicRoute component={Login} />, []);
  const RegisterRoute = useMemo(() => () => <PublicRoute component={Register} />, []);
  const TrialAcademiaRoute = useMemo(() => () => <PublicTrial targetKind="academy" />, []);
  const TrialProfessorRoute = useMemo(() => () => <PublicTrial targetKind="professor" />, []);
  const TrialRoute = useMemo(() => () => <PublicTrial />, []);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />
      <Route path="/support" component={Support} />
      <Route path="/login" component={LoginRoute} />
      <Route path="/register" component={RegisterRoute} />
      <Route path="/app"   component={AppRoute} />
      <Route path="/admin" component={AdminRouteWrapped} />
      <Route path="/academia" component={AcademiaRouteWrapped} />
      <Route path="/post/:postId" component={PublicPost} />
      <Route path="/evento/:eventId" component={PublicEvent} />
      <Route path="/desafio/:challengeId" component={PublicChallenge} />
      <Route path="/trial/academia/:targetId" component={TrialAcademiaRoute} />
      <Route path="/trial/professor/:targetId" component={TrialProfessorRoute} />
      <Route path="/trial/:academyId" component={TrialRoute} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/app/subscription" component={() => <AuthenticatedRoute component={SubscriptionManager} />} />
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
            <CookieConsent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
