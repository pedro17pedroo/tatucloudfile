import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import PlanSelection from "@/pages/plan-selection";
import Register from "@/pages/register";
import Profile from "@/pages/profile";
import Subscription from "@/pages/subscription";
import Billing from "@/pages/billing";
import UnifiedDeveloperPortal from "@/pages/unified-developer-portal";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading screen while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-mega-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mega-red mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/register" component={Register} />
          <Route path="/plans" component={PlanSelection} />
          <Route path="/admin-login" component={AdminLogin} />
        </>
      ) : (
        <>
          <Route path="/" component={user?.isAdmin ? Admin : Home} />
          <Route path="/dashboard" component={Home} />
          <Route path="/profile" component={Profile} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/billing" component={Billing} />
          <Route path="/developer" component={() => <UnifiedDeveloperPortal user={user} />} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin-login" component={AdminLogin} />
          <Route path="/plans" component={PlanSelection} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
