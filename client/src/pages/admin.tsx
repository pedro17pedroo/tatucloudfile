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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AlertTriangle, CheckCircle, Users, HardDrive, Activity, Plus, Edit2, Trash2, DollarSign } from "lucide-react";
import type { Plan, InsertPlan } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [megaEmail, setMegaEmail] = useState("");
  const [megaPassword, setMegaPassword] = useState("");
  
  // Plan management states
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    storageLimit: "",
    pricePerMonth: "",
    apiCallsPerHour: 100,
  });

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
      return apiRequest("/api/portal/admin/mega-credentials", "POST", {
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

  // Fetch plans
  const { data: plans = [], refetch: refetchPlans } = useQuery<Plan[]>({
    queryKey: ["/api/portal/plans"],
  });

  // Plan mutations
  const createPlanMutation = useMutation({
    mutationFn: async (data: InsertPlan) => {
      return apiRequest("/api/portal/admin/plans", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Plano criado com sucesso",
        description: "O novo plano foi adicionado ao sistema.",
      });
      setIsCreatePlanOpen(false);
      resetPlanForm();
      refetchPlans();
      queryClient.invalidateQueries({ queryKey: ["/api/portal/plans"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar plano",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: { id: string; plan: Partial<InsertPlan> }) => {
      return apiRequest(`/api/admin/plans/${data.id}`, "PUT", data.plan);
    },
    onSuccess: () => {
      toast({
        title: "Plano atualizado com sucesso",
        description: "As alterações foram guardadas.",
      });
      setEditingPlan(null);
      resetPlanForm();
      refetchPlans();
      queryClient.invalidateQueries({ queryKey: ["/api/portal/plans"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar plano",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest(`/api/admin/plans/${planId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Plano eliminado com sucesso",
        description: "O plano foi removido do sistema.",
      });
      refetchPlans();
      queryClient.invalidateQueries({ queryKey: ["/api/portal/plans"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao eliminar plano",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Plan form handlers
  const resetPlanForm = () => {
    setPlanForm({
      id: "",
      name: "",
      storageLimit: "",
      pricePerMonth: "",
      apiCallsPerHour: 100,
    });
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      storageLimit: plan.storageLimit,
      pricePerMonth: plan.pricePerMonth,
      apiCallsPerHour: plan.apiCallsPerHour,
    });
  };

  const handleCreatePlan = () => {
    createPlanMutation.mutate(planForm);
  };

  const handleUpdatePlan = () => {
    if (editingPlan) {
      updatePlanMutation.mutate({
        id: editingPlan.id,
        plan: planForm,
      });
    }
  };

  const formatStorageDisplay = (bytes: string) => {
    const size = parseInt(bytes);
    const gb = size / (1024 * 1024 * 1024);
    return `${gb}GB`;
  };

  const formatPriceDisplay = (price: string) => {
    const priceNum = parseFloat(price);
    return priceNum === 0 ? "Grátis" : `€${priceNum}/mês`;
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="admin-title">
            Painel de Administração
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerir credenciais MEGA, planos e configuração do sistema
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="mega">MEGA Config</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <Card data-testid="stat-users">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-[#D9272E]" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total de Utilizadores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="stat-storage">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <HardDrive className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">0 GB</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Armazenamento Usado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="stat-api-calls">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-[#D9272E]" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Chamadas API (24h)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="stat-status">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Operacional</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Estado do Sistema</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Plans Management Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Planos</h2>
              <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetPlanForm()} data-testid="button-create-plan">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Plano
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Plano</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="plan-id">ID do Plano</Label>
                      <Input
                        id="plan-id"
                        value={planForm.id}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, id: e.target.value }))}
                        placeholder="ex: starter, pro, enterprise"
                        data-testid="input-plan-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-name">Nome do Plano</Label>
                      <Input
                        id="plan-name"
                        value={planForm.name}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="ex: Starter, Pro, Enterprise"
                        data-testid="input-plan-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storage-limit">Limite de Armazenamento (bytes)</Label>
                      <Input
                        id="storage-limit"
                        value={planForm.storageLimit}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, storageLimit: e.target.value }))}
                        placeholder="ex: 2147483648 (2GB)"
                        data-testid="input-storage-limit"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Preço por Mês (€)</Label>
                      <Input
                        id="price"
                        value={planForm.pricePerMonth}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, pricePerMonth: e.target.value }))}
                        placeholder="ex: 9.99"
                        data-testid="input-price"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-calls">Chamadas API por Hora</Label>
                      <Input
                        id="api-calls"
                        type="number"
                        value={planForm.apiCallsPerHour}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, apiCallsPerHour: parseInt(e.target.value) || 100 }))}
                        placeholder="ex: 1000"
                        data-testid="input-api-calls"
                      />
                    </div>
                    <Button 
                      onClick={handleCreatePlan}
                      disabled={createPlanMutation.isPending}
                      className="w-full"
                      data-testid="button-save-plan"
                    >
                      {createPlanMutation.isPending ? "A criar..." : "Criar Plano"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative" data-testid={`card-plan-${plan.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">{plan.id}</Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditPlan(plan)}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePlanMutation.mutate(plan.id)}
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Preço:</span>
                      <span className="font-semibold">{formatPriceDisplay(plan.pricePerMonth)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Armazenamento:</span>
                      <span className="font-semibold">{formatStorageDisplay(plan.storageLimit)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">API/hora:</span>
                      <span className="font-semibold">{plan.apiCallsPerHour}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Edit Plan Dialog */}
            <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Plano: {editingPlan?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-plan-name">Nome do Plano</Label>
                    <Input
                      id="edit-plan-name"
                      value={planForm.name}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-edit-plan-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-storage-limit">Limite de Armazenamento (bytes)</Label>
                    <Input
                      id="edit-storage-limit"
                      value={planForm.storageLimit}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, storageLimit: e.target.value }))}
                      data-testid="input-edit-storage-limit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-price">Preço por Mês (€)</Label>
                    <Input
                      id="edit-price"
                      value={planForm.pricePerMonth}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, pricePerMonth: e.target.value }))}
                      data-testid="input-edit-price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-api-calls">Chamadas API por Hora</Label>
                    <Input
                      id="edit-api-calls"
                      type="number"
                      value={planForm.apiCallsPerHour}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, apiCallsPerHour: parseInt(e.target.value) || 100 }))}
                      data-testid="input-edit-api-calls"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdatePlan}
                    disabled={updatePlanMutation.isPending}
                    className="w-full"
                    data-testid="button-update-plan"
                  >
                    {updatePlanMutation.isPending ? "A guardar..." : "Guardar Alterações"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* MEGA Configuration Tab */}
          <TabsContent value="mega" className="space-y-6">
            <Card data-testid="mega-config-card">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Configuração da Conta MEGA</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    As credenciais de admin são necessárias para conectar todos os ficheiros dos utilizadores a uma conta MEGA centralizada
                  </AlertDescription>
                </Alert>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label htmlFor="mega-email" className="text-gray-900 dark:text-white">Email MEGA</Label>
                    <Input
                      id="mega-email"
                      type="email"
                      value={megaEmail}
                      onChange={(e) => setMegaEmail(e.target.value)}
                      placeholder="admin@empresa.com"
                      className="mt-1"
                      data-testid="mega-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mega-password" className="text-gray-900 dark:text-white">Password MEGA</Label>
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
                    className="bg-[#D9272E] hover:bg-[#B91C1C] text-white"
                    data-testid="save-credentials-button"
                  >
                    {updateMegaCredentialsMutation.isPending ? "A testar..." : "Testar e Guardar Credenciais"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card data-testid="system-health-card">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Estado do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Estado da Conexão MEGA</h4>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Pronto para Configuração</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Configure as credenciais acima</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Performance da API</h4>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Sistema Online</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">99.9% uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
