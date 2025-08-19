import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, CheckCircle, XCircle, Users, CreditCard, Key, Database, Settings, 
  Activity, Eye, FileText, Trash2, Shield, RefreshCw, Download, Package, Wallet, 
  Plus, Edit, Save, BarChart3, MonitorSpeaker, UserCheck, Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: string;
  totalPayments: number;
  pendingPayments: number;
  apiCallsToday: number;
  activeApiKeys: number;
  megaAccountStatus?: {
    isConnected: boolean;
    totalSpace?: string;
    usedSpace?: string;
    availableSpace?: string;
    accountType?: string;
    lastChecked?: string;
    error?: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  planId?: string;
  plan?: { id: string; name: string; };
  isAdmin: boolean;
  totalFiles: number;
  totalApiCalls: number;
  paymentStatus: string;
  createdAt: string;
}

interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: string;
  paymentMethod: string;
  status: string;
  notes?: string;
  user?: { email: string; firstName?: string; lastName?: string; };
  plan?: { name: string; };
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface ApiKey {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  lastUsed?: string;
  user?: { email: string; firstName?: string; lastName?: string; };
  createdAt: string;
}

interface ApiUsage {
  id: string;
  userId: string;
  apiKeyId: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  user?: { email: string; };
  apiKey?: { name: string; };
  createdAt: string;
}

interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  admin?: { email: string; firstName?: string; lastName?: string; };
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  storageLimit: string;
  pricePerMonth: string;
  apiCallsPerHour: number;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'stripe' | 'bank_transfer' | 'paypal' | 'mbway';
  isActive: boolean;
  configuration: {
    processingTime?: string;
    fees?: string;
    description?: string;
  };
  createdAt: string;
}

function formatBytes(bytes: string | number) {
  const num = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (num === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

const StatsCard = ({ title, value, icon: Icon, color }: StatsCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export function AdminPanelWithSidebar() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [megaCredentials, setMegaCredentials] = useState({ email: '', password: '' });
  const [planForm, setPlanForm] = useState({ name: '', storageLimit: '', pricePerMonth: '', apiCallsPerHour: '' });
  const [paymentMethodForm, setPaymentMethodForm] = useState({ 
    name: '', 
    type: 'stripe' as const,
    isActive: true,
    configuration: { processingTime: '', fees: '', description: '' }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['/api/portal/admin/dashboard'],
    enabled: activeTab === 'dashboard',
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[], total: number }>({
    queryKey: ['/api/portal/admin/users'],
    enabled: activeTab === 'users',
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ payments: Payment[], total: number }>({
    queryKey: ['/api/portal/admin/payments'],
    enabled: activeTab === 'payments',
  });

  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery<{ apiKeys: ApiKey[], total: number }>({
    queryKey: ['/api/portal/admin/api-keys'],
    enabled: activeTab === 'api',
  });

  const { data: apiUsageData, isLoading: apiUsageLoading } = useQuery<{ usage: ApiUsage[], total: number }>({
    queryKey: ['/api/portal/admin/api-usage'],
    enabled: activeTab === 'api-usage',
  });

  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery<{ logs: AuditLog[], total: number }>({
    queryKey: ['/api/portal/admin/audit-logs'],
    enabled: activeTab === 'logs',
  });

  const { data: megaCredentialsData } = useQuery({
    queryKey: ['/api/portal/admin/mega-credentials'],
    enabled: activeTab === 'mega',
  });

  const { data: plansData, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/portal/admin/plans'],
    queryFn: async () => {
      const response = await apiRequest('/api/portal/admin/plans', 'GET');
      const data = await response.json();
      // Handle both array format and object with plans property
      return Array.isArray(data) ? data : data.plans || [];
    },
    enabled: activeTab === 'plans',
  });

  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery<{ paymentMethods: PaymentMethod[], total: number }>({
    queryKey: ['/api/portal/admin/payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('/api/portal/admin/payment-methods', 'GET');
      return await response.json();
    },
    enabled: activeTab === 'payment-methods',
  });

  // Payment Status Badge
  const PaymentStatusBadge = ({ status }: { status: string }) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status === 'pending' ? 'Pendente' : status === 'approved' ? 'Aprovado' : 'Rejeitado'}
      </Badge>
    );
  };

  // Sidebar navigation items organized by categories
  const sidebarSections = [
    {
      title: "Visão Geral",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Estatísticas gerais' }
      ]
    },
    {
      title: "Gestão de Utilizadores",
      items: [
        { id: 'users', label: 'Utilizadores', icon: Users, description: 'Gerir utilizadores' },
        { id: 'plans', label: 'Planos', icon: Package, description: 'Gerir planos de subscrição' }
      ]
    },
    {
      title: "Sistema Financeiro", 
      items: [
        { id: 'payments', label: 'Pagamentos', icon: CreditCard, description: 'Aprovar/rejeitar pagamentos' },
        { id: 'payment-methods', label: 'Métodos de Pagamento', icon: Wallet, description: 'Configurar métodos de pagamento' }
      ]
    },
    {
      title: "Desenvolvimento & API",
      items: [
        { id: 'api', label: 'Chaves API', icon: Key, description: 'Gerir chaves de API' },
        { id: 'api-usage', label: 'Uso da API', icon: Zap, description: 'Monitorizar uso da API' }
      ]
    },
    {
      title: "Infraestrutura",
      items: [
        { id: 'mega', label: 'Configuração MEGA', icon: Database, description: 'Configurar credenciais MEGA' },
        { id: 'system', label: 'Sistema', icon: MonitorSpeaker, description: 'Configurações do sistema' }
      ]
    },
    {
      title: "Auditoria & Segurança",
      items: [
        { id: 'logs', label: 'Logs de Auditoria', icon: FileText, description: 'Histórico de ações' },
        { id: 'security', label: 'Segurança', icon: Shield, description: 'Configurações de segurança' }
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-0 pb-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    title="Total de Utilizadores"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    color="text-blue-600"
                  />
                  <StatsCard
                    title="Ficheiros Armazenados"
                    value={stats?.totalFiles || 0}
                    icon={FileText}
                    color="text-green-600"
                  />
                  <StatsCard
                    title="Pagamentos Pendentes"
                    value={stats?.pendingPayments || 0}
                    icon={CreditCard}
                    color="text-yellow-600"
                  />
                  <StatsCard
                    title="Chaves API Ativas"
                    value={stats?.activeApiKeys || 0}
                    icon={Key}
                    color="text-purple-600"
                  />
                </div>

                {/* MEGA Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="w-5 h-5 mr-2 text-green-600" />
                      Estado da Conta MEGA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats?.megaAccountStatus ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          {stats.megaAccountStatus.isConnected ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className={stats.megaAccountStatus.isConnected ? 'text-green-600' : 'text-red-600'}>
                            {stats.megaAccountStatus.isConnected ? 'Conectado' : 'Não conectado'}
                          </span>
                        </div>

                        {stats.megaAccountStatus.error && (
                          <div className="flex items-center space-x-2 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">{stats.megaAccountStatus.error}</span>
                          </div>
                        )}

                        {stats.megaAccountStatus.isConnected && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Tipo de Conta:</span>
                              <span className="ml-2 font-medium">{stats.megaAccountStatus.accountType || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Espaço Total:</span>
                              <span className="ml-2 font-medium">{stats.megaAccountStatus.totalSpace || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Espaço Usado:</span>
                              <span className="ml-2 font-medium">{stats.megaAccountStatus.usedSpace || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Espaço Disponível:</span>
                              <span className="ml-2 font-medium">{stats.megaAccountStatus.availableSpace || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Estado MEGA não disponível</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      case 'users':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Utilizadores Registados</CardTitle>
              <CardDescription>
                Gerir utilizadores e as suas subscrições
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">A carregar utilizadores...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Ficheiros</TableHead>
                      <TableHead>API Calls</TableHead>
                      <TableHead>Estado Pagamento</TableHead>
                      <TableHead>Registado</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">{user.email}</span>
                              {user.isAdmin && <Shield className="w-4 h-4 ml-2 text-green-600" />}
                            </div>
                            {user.firstName && user.lastName && (
                              <span className="text-sm text-gray-500">
                                {user.firstName} {user.lastName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.plan?.name || user.planId || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.totalFiles}</TableCell>
                        <TableCell>{user.totalApiCalls}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={user.paymentStatus} />
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'plans':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Gestão de Planos</h3>
                <p className="text-sm text-gray-500">Gerir planos de subscrição disponíveis</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Plano</DialogTitle>
                    <DialogDescription>
                      Adicionar um novo plano de subscrição ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="plan-name">Nome do Plano</Label>
                      <Input
                        id="plan-name"
                        value={planForm.name}
                        onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                        placeholder="ex: Enterprise"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storage-limit">Limite de Armazenamento (bytes)</Label>
                      <Input
                        id="storage-limit"
                        value={planForm.storageLimit}
                        onChange={(e) => setPlanForm({...planForm, storageLimit: e.target.value})}
                        placeholder="ex: 21474836480 (20GB)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price-month">Preço por Mês (€)</Label>
                      <Input
                        id="price-month"
                        value={planForm.pricePerMonth}
                        onChange={(e) => setPlanForm({...planForm, pricePerMonth: e.target.value})}
                        placeholder="ex: 29.99"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-calls">Chamadas API por Hora</Label>
                      <Input
                        id="api-calls"
                        value={planForm.apiCallsPerHour}
                        onChange={(e) => setPlanForm({...planForm, apiCallsPerHour: e.target.value})}
                        placeholder="ex: 10000"
                      />
                    </div>
                    <Button className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Criar Plano
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {plansLoading ? (
                  <div className="text-center py-8">A carregar planos...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Armazenamento</TableHead>
                        <TableHead>Preço/Mês</TableHead>
                        <TableHead>API Calls/Hora</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plansData?.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{plan.name}</span>
                              <div className="text-sm text-gray-500">ID: {plan.id}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{formatBytes(plan.storageLimit)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">€{parseFloat(plan.pricePerMonth).toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <span>{plan.apiCallsPerHour.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(plan.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedPlan(plan)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Editar Plano</DialogTitle>
                                    <DialogDescription>
                                      Modificar detalhes do plano {plan.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Nome do Plano</Label>
                                      <Input defaultValue={plan.name} />
                                    </div>
                                    <div>
                                      <Label>Limite de Armazenamento</Label>
                                      <Input defaultValue={plan.storageLimit} />
                                    </div>
                                    <div>
                                      <Label>Preço por Mês</Label>
                                      <Input defaultValue={plan.pricePerMonth} />
                                    </div>
                                    <div>
                                      <Label>Chamadas API por Hora</Label>
                                      <Input defaultValue={plan.apiCallsPerHour} />
                                    </div>
                                    <Button className="w-full">
                                      <Save className="w-4 h-4 mr-2" />
                                      Guardar Alterações
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) || []}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'payments':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Pagamentos</CardTitle>
              <CardDescription>
                Aprovar ou rejeitar pagamentos pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="text-center py-8">A carregar pagamentos...</div>
              ) : paymentsData?.payments?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum pagamento registado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsData?.payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{payment.user?.email}</span>
                            {payment.user?.firstName && payment.user?.lastName && (
                              <div className="text-sm text-gray-500">
                                {payment.user.firstName} {payment.user.lastName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.plan?.name}</Badge>
                        </TableCell>
                        <TableCell>€{parseFloat(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" className="text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'api':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Chaves API</CardTitle>
              <CardDescription>
                Monitorizar e gerir chaves API dos utilizadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <div className="text-center py-8">A carregar chaves API...</div>
              ) : apiKeysData?.apiKeys?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma chave API registada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Uso</TableHead>
                      <TableHead>Criada</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeysData?.apiKeys?.map((apiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell>
                          <span className="font-medium">{apiKey.name}</span>
                        </TableCell>
                        <TableCell>{apiKey.user?.email}</TableCell>
                        <TableCell>
                          <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                            {apiKey.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Nunca'}
                        </TableCell>
                        <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Revogar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'mega':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração MEGA</CardTitle>
                <CardDescription>
                  Configurar credenciais da conta MEGA para armazenamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mega-email">Email MEGA</Label>
                  <Input
                    id="mega-email"
                    type="email"
                    value={megaCredentials.email}
                    onChange={(e) => setMegaCredentials({...megaCredentials, email: e.target.value})}
                    placeholder="seu-email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="mega-password">Password MEGA</Label>
                  <Input
                    id="mega-password"
                    type="password"
                    value={megaCredentials.password}
                    onChange={(e) => setMegaCredentials({...megaCredentials, password: e.target.value})}
                    placeholder="Sua password MEGA"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Credenciais
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Testar Ligação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {sidebarSections.find(s => s.items.some(i => i.id === activeTab))?.items.find(i => i.id === activeTab)?.label || 'Página'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Esta secção está em desenvolvimento
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900" data-testid="admin-panel">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-6">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        data-testid={`nav-${item.id}`}
                        className={`w-full flex items-start p-3 rounded-lg transition-colors group ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mt-0.5 mr-3 shrink-0 ${
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                        }`} />
                        <div className="text-left">
                          <div className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-400' : ''}`}>
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
          {(() => {
            const currentSection = sidebarSections.find(section => 
              section.items.some(item => item.id === activeTab)
            );
            const currentItem = currentSection?.items.find(item => item.id === activeTab);
            const Icon = currentItem?.icon || Activity;
            
            return (
              <div className="flex items-center">
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentItem?.label || 'Dashboard'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {currentItem?.description || 'Visão geral do sistema'}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-8">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}