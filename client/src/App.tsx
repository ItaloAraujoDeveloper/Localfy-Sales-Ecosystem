import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CRMPage from "@/pages/crm";
import RadarPage from "@/pages/radar";
import PartnerPage from "@/pages/partner";
import SellersPage from "@/pages/sellers";
import LeadsPage from "@/pages/leads";
import ManagersPage from "@/pages/managers";
import PreviewPage from "@/pages/preview";
import SellerLeadsPage from "@/pages/seller-leads";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function SafeRedirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return <LoadingScreen />;
}

function Router() {
  const { user, isLoading, isAdmin, isManager } = useAuth();
  const [location] = useLocation();

  // Preview pages are public
  if (location.startsWith("/ver/")) {
    return <PreviewPage />;
  }

  // Login page
  if (location === "/login") {
    if (user) {
      const redirectTo = isAdmin ? "/dashboard" : isManager ? "/radar" : "/partner";
      return <SafeRedirect to={redirectTo} />;
    }
    return <LoginPage />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated - show landing
  if (!user) {
    return <LandingPage />;
  }

  // Dashboard and Managers are admin-only
  const adminOnlyPages = ["/", "/dashboard", "/managers"];
  if (!isAdmin && adminOnlyPages.includes(location)) {
    const redirectTo = isManager ? "/radar" : "/partner";
    return <SafeRedirect to={redirectTo} />;
  }

  // Manager can access: /radar, /leads, /sellers, /crm
  // Seller can only access: /crm, /partner
  const managerPages = ["/radar", "/leads", "/sellers"];
  if (!isAdmin && !isManager && managerPages.includes(location)) {
    return <SafeRedirect to="/partner" />;
  }

  // Authenticated - show app
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/crm" component={CRMPage} />
        <Route path="/radar" component={RadarPage} />
        <Route path="/leads" component={LeadsPage} />
        <Route path="/partner" component={PartnerPage} />
        <Route path="/my-leads" component={SellerLeadsPage} />
        <Route path="/sellers" component={SellersPage} />
        <Route path="/managers" component={ManagersPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
