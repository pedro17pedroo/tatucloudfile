import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AlertTriangle, CheckCircle, Users, HardDrive, Activity } from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [megaEmail, setMegaEmail] = useState("");
  const [megaPassword, setMegaPassword] = useState("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Check if user is admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const updateMegaCredentialsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/mega-credentials", {
        email: megaEmail,
        password: megaPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MEGA credentials updated successfully",
      });
      setMegaPassword(""); // Clear password for security
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update MEGA credentials",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-mega-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mega-red mx-auto mb-4"></div>
          <p className="text-mega-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-mega-light">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Admin access required to view this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mega-light">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mega-text mb-2" data-testid="admin-title">Admin Panel</h1>
          <p className="text-gray-600">Manage MEGA credentials and system configuration</p>
        </div>

        {/* System Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-users">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-mega-accent" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-mega-text">0</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-storage">
            <CardContent className="p-6">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-mega-success" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-mega-text">0 GB</p>
                  <p className="text-sm text-gray-500">Storage Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-api-calls">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-mega-red" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-mega-text">0</p>
                  <p className="text-sm text-gray-500">API Calls (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-status">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-mega-success" />
                <div className="ml-4">
                  <p className="text-lg font-bold text-mega-text">Healthy</p>
                  <p className="text-sm text-gray-500">System Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MEGA Configuration */}
        <Card className="mb-8" data-testid="mega-config-card">
          <CardHeader>
            <CardTitle className="text-mega-text">MEGA Account Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Admin credentials are required to connect all user files to a centralized MEGA account
              </AlertDescription>
            </Alert>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="mega-email" className="text-mega-text">MEGA Email</Label>
                <Input
                  id="mega-email"
                  type="email"
                  value={megaEmail}
                  onChange={(e) => setMegaEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="mt-1"
                  data-testid="mega-email-input"
                />
              </div>
              <div>
                <Label htmlFor="mega-password" className="text-mega-text">MEGA Password</Label>
                <Input
                  id="mega-password"
                  type="password"
                  value={megaPassword}
                  onChange={(e) => setMegaPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="mt-1"
                  data-testid="mega-password-input"
                />
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Button
                onClick={() => updateMegaCredentialsMutation.mutate()}
                disabled={!megaEmail || !megaPassword || updateMegaCredentialsMutation.isPending}
                className="bg-mega-red hover:bg-red-600 text-white"
                data-testid="save-credentials-button"
              >
                {updateMegaCredentialsMutation.isPending ? "Testing..." : "Test & Save Credentials"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card data-testid="system-health-card">
          <CardHeader>
            <CardTitle className="text-mega-text">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-mega-text mb-3">MEGA Connection Status</h4>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-mega-success rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Ready for Configuration</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">Configure credentials above</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-mega-text mb-3">API Performance</h4>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-mega-success rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">System Online</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">99.9% uptime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
