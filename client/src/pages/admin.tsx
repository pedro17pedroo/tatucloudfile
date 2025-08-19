import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, XCircle, Users, CreditCard, Key, Database, Settings, Activity, Eye, FileText, Trash2, Shield, RefreshCw, Download } from 'lucide-react';
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

function formatBytes(bytes: string | number) {
  const num = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (num === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatCurrency(amount: string) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(parseFloat(amount));
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [megaCredentials, setMegaCredentials] = useState({ email: '', password: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['/api/portal/admin/dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[], total: number }>({
    queryKey: ['/api/portal/admin/users', searchQuery],
    queryFn: async () => {
      const response = await apiRequest(`/api/portal/admin/users?search=${encodeURIComponent(searchQuery)}`, 'GET');
      return await response.json();
    },
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
    enabled: activeTab === 'api',
  });

  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery<{ logs: AuditLog[], total: number }>({
    queryKey: ['/api/portal/admin/audit-logs'],
    enabled: activeTab === 'audit',
  });

  const { data: megaCredentialsData } = useQuery({
    queryKey: ['/api/portal/admin/mega-credentials'],
    enabled: activeTab === 'mega',
  });

  // Mutations
  const updatePaymentStatus = useMutation({
    mutationFn: ({ paymentId, action, notes, reason }: { paymentId: string; action: 'approve' | 'reject'; notes?: string; reason?: string }) =>
      apiRequest(`/api/portal/admin/payments/${paymentId}/status`, 'PUT', { action, notes, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/dashboard'] });
      toast({ title: 'Pagamento atualizado com sucesso' });
      setSelectedPayment(null);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar pagamento', variant: 'destructive' });
    }
  });

  const suspendUser = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/portal/admin/users/${userId}/suspend`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/users'] });
      toast({ title: 'Utilizador suspenso com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao suspender utilizador', variant: 'destructive' });
    }
  });

  const revokeApiKey = useMutation({
    mutationFn: (keyId: string) => apiRequest(`/api/portal/admin/api-keys/${keyId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/api-keys'] });
      toast({ title: 'Chave API revogada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao revogar chave API', variant: 'destructive' });
    }
  });

  const updateMegaCredentials = useMutation({
    mutationFn: () => apiRequest('/api/portal/admin/mega-credentials', 'POST', megaCredentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/mega-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/dashboard'] });
      toast({ title: 'Credenciais MEGA atualizadas com sucesso' });
      setMegaCredentials({ email: '', password: '' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar credenciais MEGA', variant: 'destructive' });
    }
  });

  const refreshMegaStatus = useMutation({
    mutationFn: () => apiRequest('/api/portal/admin/mega-status/refresh', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/dashboard'] });
      toast({ title: 'Estado MEGA atualizado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar estado MEGA', variant: 'destructive' });
    }
  });

  // Dashboard Statistics Cards
  const StatsCard = ({ title, value, icon: Icon, color, description }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    description?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

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

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="admin-panel">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Shield className="w-3 h-3 mr-1" />
          Administrador
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Activity className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Utilizadores
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">
            <Key className="w-4 h-4 mr-2" />
            API
          </TabsTrigger>
          <TabsTrigger value="mega" data-testid="tab-mega">
            <Database className="w-4 h-4 mr-2" />
            MEGA
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <FileText className="w-4 h-4 mr-2" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
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
                          {stats.megaAccountStatus.isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>

                      {stats.megaAccountStatus.isConnected && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Espaço Total</p>
                            <p className="font-semibold">{formatBytes(stats.megaAccountStatus.totalSpace || '0')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Espaço Usado</p>
                            <p className="font-semibold">{formatBytes(stats.megaAccountStatus.usedSpace || '0')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Espaço Disponível</p>
                            <p className="font-semibold">{formatBytes(stats.megaAccountStatus.availableSpace || '0')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Tipo de Conta</p>
                            <p className="font-semibold capitalize">{stats.megaAccountStatus.accountType}</p>
                          </div>
                        </div>
                      )}

                      {stats.megaAccountStatus.error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <div className="flex items-center">
                            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                            <p className="text-red-800 text-sm">{stats.megaAccountStatus.error}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Última verificação: {new Date(stats.megaAccountStatus.lastChecked || '').toLocaleString('pt-PT')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refreshMegaStatus.mutate()}
                          disabled={refreshMegaStatus.isPending}
                          data-testid="button-refresh-mega"
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${refreshMegaStatus.isPending ? 'animate-spin' : ''}`} />
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Estado MEGA não disponível</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Utilizadores</CardTitle>
              <CardDescription>
                Gerir contas de utilizadores, planos e atividade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  placeholder="Pesquisar utilizadores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-search-users"
                />
              </div>

              {usersLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Ficheiros</TableHead>
                      <TableHead>API Calls</TableHead>
                      <TableHead>Estado Pagamento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            {(user.firstName || user.lastName) && (
                              <p className="text-sm text-gray-500">
                                {user.firstName} {user.lastName}
                              </p>
                            )}
                            {user.isAdmin && (
                              <Badge variant="outline" className="text-xs mt-1">Admin</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.plan ? (
                            <Badge variant="outline">{user.plan.name}</Badge>
                          ) : (
                            <span className="text-gray-400">Sem plano</span>
                          )}
                        </TableCell>
                        <TableCell>{user.totalFiles}</TableCell>
                        <TableCell>{user.totalApiCalls}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={user.paymentStatus} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                              data-testid={`button-view-user-${user.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!user.isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => suspendUser.mutate(user.id)}
                                disabled={suspendUser.isPending}
                                data-testid={`button-suspend-user-${user.id}`}
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Pagamentos</CardTitle>
              <CardDescription>
                Aprovar ou rejeitar transferências bancárias (1-3 dias de processamento)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
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
                    {paymentsData?.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.user?.email}</p>
                            {(payment.user?.firstName || payment.user?.lastName) && (
                              <p className="text-sm text-gray-500">
                                {payment.user.firstName} {payment.user.lastName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.plan && (
                            <Badge variant="outline">{payment.plan.name}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPayment(payment)}
                              data-testid={`button-review-payment-${payment.id}`}
                            >
                              Revisar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Management Tab */}
        <TabsContent value="api" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* API Keys */}
            <Card>
              <CardHeader>
                <CardTitle>Chaves API</CardTitle>
                <CardDescription>Gestão de credenciais de desenvolvedor</CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeysData?.apiKeys.slice(0, 5).map((apiKey) => (
                      <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{apiKey.name}</p>
                          <p className="text-sm text-gray-500">{apiKey.user?.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                              {apiKey.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            {apiKey.lastUsed && (
                              <span className="text-xs text-gray-400">
                                Usado: {new Date(apiKey.lastUsed).toLocaleDateString('pt-PT')}
                              </span>
                            )}
                          </div>
                        </div>
                        {apiKey.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeApiKey.mutate(apiKey.id)}
                            disabled={revokeApiKey.isPending}
                            data-testid={`button-revoke-apikey-${apiKey.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Uso da API</CardTitle>
                <CardDescription>Monitorização de atividade</CardDescription>
              </CardHeader>
              <CardContent>
                {apiUsageLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiUsageData?.usage.slice(0, 5).map((usage) => (
                      <div key={usage.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{usage.endpoint}</p>
                            <p className="text-sm text-gray-500">{usage.user?.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={usage.statusCode < 400 ? 'default' : 'destructive'}>
                              {usage.statusCode}
                            </Badge>
                            <p className="text-xs text-gray-400 mt-1">
                              {usage.responseTime}ms
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(usage.createdAt).toLocaleString('pt-PT')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MEGA Management Tab */}
        <TabsContent value="mega" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração MEGA</CardTitle>
              <CardDescription>
                Gerir credenciais e monitorizar estado da conta MEGA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="mega-email">Email MEGA</Label>
                  <Input
                    id="mega-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={megaCredentials.email}
                    onChange={(e) => setMegaCredentials(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-mega-email"
                  />
                </div>
                <div>
                  <Label htmlFor="mega-password">Password MEGA</Label>
                  <Input
                    id="mega-password"
                    type="password"
                    placeholder="••••••••"
                    value={megaCredentials.password}
                    onChange={(e) => setMegaCredentials(prev => ({ ...prev, password: e.target.value }))}
                    data-testid="input-mega-password"
                  />
                </div>
                <Button
                  onClick={() => updateMegaCredentials.mutate()}
                  disabled={updateMegaCredentials.isPending || !megaCredentials.email || !megaCredentials.password}
                  data-testid="button-update-mega-credentials"
                >
                  {updateMegaCredentials.isPending ? 'A atualizar...' : 'Atualizar Credenciais'}
                </Button>
              </div>

              {(megaCredentialsData as any)?.credentials && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="font-medium text-green-800">Credenciais Configuradas</p>
                      <p className="text-sm text-green-600">Email: {(megaCredentialsData as any)?.credentials?.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                Histórico de ações administrativas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Administrador</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Alvo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogsData?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.admin?.email}</p>
                            {(log.admin?.firstName || log.admin?.lastName) && (
                              <p className="text-sm text-gray-500">
                                {log.admin.firstName} {log.admin.lastName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.action.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{log.targetType}</p>
                            <p className="text-xs text-gray-500">{log.targetId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(log.createdAt).toLocaleString('pt-PT')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.ipAddress || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Review Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent data-testid="dialog-payment-review">
          <DialogHeader>
            <DialogTitle>Revisar Pagamento</DialogTitle>
            <DialogDescription>
              Aprovar ou rejeitar transferência bancária
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Utilizador</Label>
                  <p className="font-medium">{selectedPayment.user?.email}</p>
                </div>
                <div>
                  <Label>Plano</Label>
                  <p className="font-medium">{selectedPayment.plan?.name}</p>
                </div>
                <div>
                  <Label>Valor</Label>
                  <p className="font-medium">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label>Método</Label>
                  <p className="font-medium capitalize">{selectedPayment.paymentMethod}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  className="flex-1"
                  onClick={() => updatePaymentStatus.mutate({
                    paymentId: selectedPayment.id,
                    action: 'approve',
                    notes: 'Transferência bancária verificada e aprovada'
                  })}
                  disabled={updatePaymentStatus.isPending}
                  data-testid="button-approve-payment"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => updatePaymentStatus.mutate({
                    paymentId: selectedPayment.id,
                    action: 'reject',
                    reason: 'Transferência bancária não verificada'
                  })}
                  disabled={updatePaymentStatus.isPending}
                  data-testid="button-reject-payment"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent data-testid="dialog-user-details">
          <DialogHeader>
            <DialogTitle>Detalhes do Utilizador</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Nome</Label>
                  <p className="font-medium">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <div>
                  <Label>Plano</Label>
                  <p className="font-medium">{selectedUser.plan?.name || 'Sem plano'}</p>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <p className="font-medium">{selectedUser.isAdmin ? 'Administrador' : 'Utilizador'}</p>
                </div>
                <div>
                  <Label>Ficheiros</Label>
                  <p className="font-medium">{selectedUser.totalFiles}</p>
                </div>
                <div>
                  <Label>Chamadas API</Label>
                  <p className="font-medium">{selectedUser.totalApiCalls}</p>
                </div>
              </div>
              
              <div>
                <Label>Estado do Pagamento</Label>
                <div className="mt-1">
                  <PaymentStatusBadge status={selectedUser.paymentStatus} />
                </div>
              </div>

              <div>
                <Label>Data de Registo</Label>
                <p className="font-medium">
                  {new Date(selectedUser.createdAt).toLocaleString('pt-PT')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}