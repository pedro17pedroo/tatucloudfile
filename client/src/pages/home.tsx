import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/navigation";
import { EnhancedDashboard } from "@/components/enhanced-dashboard";
import { AdvancedFileManager } from "@/components/advanced-file-manager";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: files, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ["/api/portal/files"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-tatu-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tatu-green mx-auto mb-4"></div>
          <p className="text-tatu-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tatu-light">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <EnhancedDashboard files={Array.isArray(files) ? files : []} isLoading={filesLoading} />
        </div>
        
        <AdvancedFileManager 
          files={Array.isArray(files) ? files : []} 
          onFileChange={refetchFiles} 
          isLoading={filesLoading} 
        />
      </div>
    </div>
  );
}
