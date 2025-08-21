import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Cloud, 
  Files, 
  HardDrive, 
  TrendingUp, 
  Users, 
  Crown,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import type { Plan } from "@shared/schema";

interface DashboardStats {
  files: any[];
}

interface EnhancedDashboardProps {
  files: any[];
  isLoading: boolean;
}

export function EnhancedDashboard({ files, isLoading }: EnhancedDashboardProps) {
  const { user } = useAuth();

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/auth/plans"],
  });

  if (!user || isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentPlan = plans.find((p) => p.id === user.planId);
  const storageUsed = parseInt(user.storageUsed || '0');
  const storageLimit = parseInt(currentPlan?.storageLimit || '0');
  const usagePercentage = storageLimit > 0 ? (storageUsed * 100) / storageLimit : 0;
  const filesCount = Array.isArray(files) ? files.length : 0;

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'premium':
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 'pro':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default:
        return <Users className="h-5 w-5 text-green-500" />;
    }
  };

  const getPlanBadgeColor = (planId: string) => {
    switch (planId) {
      case 'premium':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white';
      case 'pro':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };

  const getStorageStatus = () => {
    if (usagePercentage >= 90) {
      return { icon: AlertCircle, color: 'text-red-500', message: 'Armazenamento quase cheio' };
    } else if (usagePercentage >= 70) {
      return { icon: AlertCircle, color: 'text-yellow-500', message: 'Considera fazer upgrade' };
    } else {
      return { icon: CheckCircle, color: 'text-green-500', message: 'Espaço disponível' };
    }
  };

  const storageStatus = getStorageStatus();

  return (
    <div className="space-y-6">
      {/* Plan Information Header */}
      <Card className="bg-gradient-to-r from-tatu-green to-emerald-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-lg">
                {getPlanIcon(user.planId || 'basic')}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Bem-vindo, {user.firstName || 'Utilizador'}!
                </h2>
                <p className="text-white/80">
                  Gerir os seus ficheiros na nuvem
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`px-4 py-2 text-sm font-semibold ${getPlanBadgeColor(user.planId || 'basic')}`}>
                Plano {currentPlan?.name || 'Basic'}
              </Badge>
              <div className="text-white/80 text-sm mt-2">
                Desde {new Date(user.createdAt || '').toLocaleDateString('pt-PT')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Storage Usage */}
        <Card className="border-l-4 border-l-tatu-green">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Armazenamento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">
                {formatBytes(storageUsed)}
              </div>
              <div className="text-xs text-muted-foreground">
                de {formatBytes(storageLimit)} disponível
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <div className="flex items-center text-xs">
                <storageStatus.icon className={`h-3 w-3 mr-1 ${storageStatus.color}`} />
                <span className={storageStatus.color}>{storageStatus.message}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files Count */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ficheiros</CardTitle>
            <Files className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filesCount}</div>
            <p className="text-xs text-muted-foreground">
              {filesCount === 0 ? 'Nenhum ficheiro carregado' : 
               filesCount === 1 ? 'ficheiro armazenado' : 
               'ficheiros armazenados'}
            </p>
          </CardContent>
        </Card>

        {/* API Calls (if applicable) */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chamadas API/Hora</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPlan?.apiCallsPerHour || 100}
            </div>
            <p className="text-xs text-muted-foreground">
              Limite do seu plano
            </p>
          </CardContent>
        </Card>

        {/* Plan Price */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Mensal</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{currentPlan?.pricePerMonth || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPlan?.pricePerMonth === '0' ? 'Plano gratuito' : 'Por mês'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Capacidades do Seu Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Upload de Ficheiros</div>
                <div className="text-sm text-muted-foreground">
                  Máximo {formatBytes(Math.min(storageLimit, 1024 * 1024 * 1024))} por ficheiro
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Download de Ficheiros</div>
                <div className="text-sm text-muted-foreground">Ilimitado</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Acesso via API</div>
                <div className="text-sm text-muted-foreground">
                  {currentPlan?.apiCallsPerHour || 100} chamadas/hora
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Partilha de Ficheiros</div>
                <div className="text-sm text-muted-foreground">Links seguros</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Gestão de Pastas</div>
                <div className="text-sm text-muted-foreground">Organização completa</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Visualização</div>
                <div className="text-sm text-muted-foreground">Pré-visualização de ficheiros</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}