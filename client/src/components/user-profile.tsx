import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  Settings, 
  CreditCard, 
  Key, 
  Download,
  Calendar,
  TrendingUp,
  Shield,
  Mail,
  Phone,
  Edit
} from "lucide-react";
import type { User as UserType, Plan, Payment, UserSubscription } from "@shared/schema";

interface UserProfileProps {
  user: UserType;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const { toast } = useToast();

  // Fetch user's current plan
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/auth/plans"],
  });

  // Fetch user's subscription history
  const { data: subscriptions = [] } = useQuery<UserSubscription[]>({
    queryKey: ["/api/portal/user/subscriptions"],
  });

  // Fetch user's payment history
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/portal/user/payments"],
  });

  const currentPlan = plans.find(p => p.id === user.planId);
  const currentSubscription = subscriptions.find(s => s.status === 'active');

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/portal/user/change-password", "POST", passwordForm);
    },
    onSuccess: () => {
      toast({
        title: "Palavra-passe alterada",
        description: "A sua palavra-passe foi alterada com sucesso",
      });
      setIsChangePasswordOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar palavra-passe",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("/api/portal/user/change-plan", "POST", { planId });
    },
    onSuccess: () => {
      toast({
        title: "Plano alterado",
        description: "O seu plano foi alterado com sucesso",
      });
      setIsChangePlanOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/user/subscriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar plano",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const formatStorageSize = (bytes: string) => {
    const size = parseInt(bytes) || 0;
    if (size === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const unitIndex = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, unitIndex)).toFixed(1)} ${units[unitIndex]}`;
  };

  const formatPlanStorageLimit = (bytes: string) => {
    const size = parseInt(bytes) || 0;
    const gb = size / (1024 * 1024 * 1024);
    return `${gb.toFixed(0)} GB`;
  };

  const getStoragePercentage = () => {
    if (!currentPlan) return 0;
    const used = parseInt(user.storageUsed || '0');
    const limit = parseInt(currentPlan.storageLimit);
    return Math.min((used / limit) * 100, 100);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "As palavras-passe não coincidem",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {user.firstName} {user.lastName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {user.email ? (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {user.phone}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.isAdmin ? "destructive" : "secondary"}>
                  {user.isAdmin ? "Administrador" : "Usuário"}
                </Badge>
                <Badge variant="outline">
                  Membro desde {new Date(user.createdAt!).toLocaleDateString('pt-PT')}
                </Badge>
              </div>
            </div>
            
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Alterar Palavra-passe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Palavra-passe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Palavra-passe atual</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">Nova palavra-passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirmar nova palavra-passe</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={changePasswordMutation.isPending}
                    className="w-full"
                  >
                    {changePasswordMutation.isPending ? "A alterar..." : "Alterar Palavra-passe"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plano Atual
            </div>
            <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Alterar Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Escolher Novo Plano</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={`cursor-pointer transition-all ${
                      plan.id === user.planId ? 'border-mega-green bg-mega-green/5' : 'hover:border-gray-300'
                    }`}>
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <div className="text-2xl font-bold">
                          €{parseInt(plan.pricePerMonth || '0').toFixed(0)}
                          <span className="text-sm text-gray-600">/mês</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm text-gray-600">
                          • {formatPlanStorageLimit(plan.storageLimit)} de armazenamento
                        </div>
                        <div className="text-sm text-gray-600">
                          • {plan.apiCallsPerHour} chamadas API/hora
                        </div>
                        {plan.id !== user.planId && (
                          <Button
                            onClick={() => changePlanMutation.mutate(plan.id)}
                            disabled={changePlanMutation.isPending}
                            className="w-full mt-4"
                          >
                            {changePlanMutation.isPending ? "A alterar..." : "Selecionar"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{currentPlan.name}</h3>
                  <p className="text-gray-600">€{parseInt(currentPlan.pricePerMonth || '0').toFixed(0)}/mês</p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Ativo
                </Badge>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Armazenamento Usado</p>
                  <p className="text-lg font-semibold">
                    {formatStorageSize(user.storageUsed || '0')} / {formatPlanStorageLimit(currentPlan.storageLimit)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-mega-green h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getStoragePercentage()}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getStoragePercentage().toFixed(1)}% utilizado
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Limite API</p>
                  <p className="text-lg font-semibold">
                    {currentPlan.apiCallsPerHour} chamadas/hora
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    Sem limitações adicionais
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Plano não encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Payment History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {plans.find(p => p.id === payment.planId)?.name || 'Plano Desconhecido'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.createdAt!).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">€{parseInt(payment.amount).toFixed(2)}</p>
                    <Badge variant={
                      payment.status === 'completed' ? 'default' : 
                      payment.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {payment.status === 'completed' ? 'Pago' :
                       payment.status === 'pending' ? 'Pendente' : 'Falhado'}
                    </Badge>
                  </div>
                  {payment.receiptUrl && payment.status === 'completed' && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
              {payments.length > 5 && (
                <Button variant="outline" className="w-full">
                  Ver Todos os Pagamentos ({payments.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem histórico de pagamentos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}