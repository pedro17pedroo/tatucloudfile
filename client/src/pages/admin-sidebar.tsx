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
  Plus, Edit, Save, BarChart3, MonitorSpeaker, UserCheck, Zap, Building2, Globe,
  User, LogOut, ChevronDown
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  
  // User management states
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    planId: 'basic',
    isAdmin: false
  });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    userId: '',
    description: ''
  });
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<{ key: string; name: string } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', 'POST');
      window.location.href = '/';
    } catch (error) {
      toast({ title: 'Erro ao fazer logout', description: 'Tente novamente', variant: 'destructive' });
    }
  };

  // Initialize profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Profile management mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const response = await apiRequest('/api/auth/profile', 'PUT', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setEditingProfile(false);
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar perfil", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('/api/auth/change-password', 'PUT', data);
      return response.json();
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: "Password alterada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao alterar password", 
        description: error.message || "Verifique a password atual",
        variant: "destructive" 
      });
    },
  });

  const handleProfileSave = () => {
    if (!profileForm.firstName.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim()
    });
  };

  const handlePasswordChange = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "As passwords não coincidem", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "A nova password deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  // API Key mutations
  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { name: string; userId: string; description?: string }) => {
      const response = await apiRequest('/api/portal/admin/api-keys', 'POST', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/api-keys'] });
      toast({ title: 'Chave API criada com sucesso!' });
      setCreatedApiKey({ key: data.key, name: data.name });
      setApiKeyForm({ name: '', userId: '', description: '' });
      setShowApiKeyDialog(false);
    },
    onError: () => {
      toast({ title: 'Erro ao criar chave API', variant: 'destructive' });
    }
  });

  const toggleApiKeyMutation = useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      const response = await apiRequest(`/api/portal/admin/api-keys/${keyId}/toggle`, 'PATCH', { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/api-keys'] });
      toast({ title: 'Estado da chave API atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar chave API', variant: 'destructive' });
    }
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest(`/api/portal/admin/api-keys/${keyId}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/api-keys'] });
      toast({ title: 'Chave API revogada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao revogar chave API', variant: 'destructive' });
    }
  });

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
    queryFn: () => apiRequest('/api/portal/admin/mega-credentials').then(r => r.json()),
    enabled: activeTab === 'mega',
  });

  const { data: megaAccountStatus, refetch: refetchMegaStatus } = useQuery({
    queryKey: ['/api/portal/admin/mega-account-status'],
    queryFn: async () => {
      const response = await apiRequest('/api/portal/admin/mega-account-status');
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      console.log('[MEGA Status Frontend] Received data:', data);
      return data;
    },
    enabled: activeTab === 'mega',
    retry: false,
  });

  // MEGA mutations
  const updateMegaCredentialsMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('/api/portal/admin/mega-credentials', 'PUT', credentials);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/mega-credentials'] });
      toast({ title: 'Credenciais MEGA guardadas com sucesso!' });
      setMegaCredentials({ email: '', password: '' });
      
      // Wait a moment then refresh account status
      setTimeout(async () => {
        try {
          await refreshMegaStatusMutation.mutateAsync();
        } catch (error) {
          console.error('Failed to auto-refresh MEGA status:', error);
        }
      }, 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao guardar credenciais MEGA', 
        description: error.message || 'Credenciais inválidas',
        variant: 'destructive' 
      });
    }
  });

  const testMegaConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/portal/admin/mega-test-connection', 'POST', megaCredentials);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Conexão MEGA testada com sucesso!' });
      refetchMegaStatus();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro na conexão MEGA', 
        description: error.message || 'Falha na conexão',
        variant: 'destructive' 
      });
    }
  });

  const refreshMegaStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/portal/admin/mega-account-status/refresh', 'POST');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/mega-account-status'] });
      toast({ title: 'Estado da conta MEGA atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar estado MEGA', variant: 'destructive' });
    }
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

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof userForm) => {
      const response = await apiRequest('/api/portal/admin/users', 'POST', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/users'] });
      setUserForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        planId: 'basic',
        isAdmin: false
      });
      toast({ title: "Utilizador criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar utilizador", description: error.message, variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: Partial<typeof userForm> }) => {
      const response = await apiRequest(`/api/portal/admin/users/${userId}`, 'PUT', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/users'] });
      setSelectedUser(null);
      toast({ title: "Utilizador atualizado com sucesso!" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/portal/admin/users/${userId}/reset-password`, 'POST');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Password resetada!", 
        description: `Nova password: ${data.temporaryPassword}` 
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/portal/admin/users/${userId}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/admin/users'] });
      toast({ title: "Utilizador eliminado com sucesso!" });
    },
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
      title: "Portal de Desenvolvedores",
      items: [
        { id: 'dev-applications', label: 'Aplicações', icon: FileText, description: 'Aplicações de acesso à API' },
        { id: 'dev-settings', label: 'Configurações API', icon: Settings, description: 'Período de teste e preços' },
        { id: 'api-keys', label: 'Chaves API', icon: Key, description: 'Gerir chaves API dos desenvolvedores' },
        { id: 'api-usage', label: 'Uso da API', icon: Activity, description: 'Monitorizar uso das APIs' }
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

      case 'profile':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Perfil do Administrador
                </CardTitle>
                <CardDescription>
                  Gerir as informações do seu perfil administrativo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || ''} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold">
                      {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Administrador'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Administrador
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="profile-firstName">Nome</Label>
                    <Input
                      id="profile-firstName"
                      value={editingProfile ? profileForm.firstName : (user?.firstName || '')}
                      onChange={(e) => editingProfile && setProfileForm({ ...profileForm, firstName: e.target.value })}
                      disabled={!editingProfile}
                      className={`mt-1 ${!editingProfile ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                      placeholder="Nome"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="profile-lastName">Sobrenome</Label>
                    <Input
                      id="profile-lastName"
                      value={editingProfile ? profileForm.lastName : (user?.lastName || '')}
                      onChange={(e) => editingProfile && setProfileForm({ ...profileForm, lastName: e.target.value })}
                      disabled={!editingProfile}
                      className={`mt-1 ${!editingProfile ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                      placeholder="Sobrenome"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="profile-role">Função</Label>
                    <Input
                      id="profile-role"
                      value="Administrador do Sistema"
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="profile-created">Membro desde</Label>
                    <Input
                      id="profile-created"
                      value={user?.createdAt ? formatDate(user.createdAt.toString()) : 'N/A'}
                      disabled
                      className="mt-1 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex space-x-4">
                  {editingProfile ? (
                    <>
                      <Button 
                        onClick={handleProfileSave} 
                        disabled={updateProfileMutation.isPending}
                        data-testid="save-profile"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            email: user?.email || ''
                          });
                        }}
                        data-testid="cancel-profile-edit"
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingProfile(true)}
                      data-testid="edit-profile"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Perfil
                    </Button>
                  )}
                  
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="change-password">
                        <Key className="w-4 h-4 mr-2" />
                        Alterar Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar Password</DialogTitle>
                        <DialogDescription>
                          Introduza a sua password atual e a nova password
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="current-password">Password Atual</Label>
                          <Input
                            id="current-password"
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-password">Nova Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm-password">Confirmar Nova Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={handlePasswordChange}
                            disabled={changePasswordMutation.isPending}
                            data-testid="confirm-password-change"
                          >
                            {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Password'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowPasswordDialog(false);
                              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p><strong>Nota:</strong> Para alterar as informações do perfil, contacte o administrador do sistema ou utilize as configurações do Replit OAuth.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Gestão de Utilizadores</h3>
                <p className="text-sm text-gray-500">Gerir utilizadores e as suas subscrições</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Utilizador
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Utilizador</DialogTitle>
                    <DialogDescription>
                      Adicionar um novo utilizador ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="user-email">Email *</Label>
                      <Input
                        id="user-email"
                        type="email"
                        placeholder="utilizador@exemplo.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-password">Password *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        placeholder="Password segura"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="user-firstname">Primeiro Nome</Label>
                        <Input
                          id="user-firstname"
                          placeholder="João"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-lastname">Último Nome</Label>
                        <Input
                          id="user-lastname"
                          placeholder="Silva"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="user-plan">Plano</Label>
                      <Select value={userForm.planId} onValueChange={(value) => setUserForm({...userForm, planId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {plansData?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - €{parseFloat(plan.pricePerMonth).toFixed(2)}/mês
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="user-admin"
                        className="rounded"
                      />
                      <Label htmlFor="user-admin" className="flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-green-600" />
                        Privilégios de Administrador
                      </Label>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        const email = (document.getElementById('user-email') as HTMLInputElement).value;
                        const password = (document.getElementById('user-password') as HTMLInputElement).value;
                        const firstName = (document.getElementById('user-firstname') as HTMLInputElement).value;
                        const lastName = (document.getElementById('user-lastname') as HTMLInputElement).value;
                        const planSelect = document.querySelector('div[role="combobox"]') as HTMLElement;
                        const planId = userForm.planId;
                        const isAdmin = (document.getElementById('user-admin') as HTMLInputElement).checked;
                        
                        if (email && password) {
                          createUserMutation.mutate({
                            email, password, firstName, lastName, planId, isAdmin
                          });
                        }
                      }}
                      disabled={createUserMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createUserMutation.isPending ? 'A criar...' : 'Criar Utilizador'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
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
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Editar Utilizador</DialogTitle>
                                    <DialogDescription>
                                      Modificar dados de {user.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Email</Label>
                                      <Input defaultValue={user.email} disabled className="bg-gray-50" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Primeiro Nome</Label>
                                        <Input defaultValue={user.firstName || ''} />
                                      </div>
                                      <div>
                                        <Label>Último Nome</Label>
                                        <Input defaultValue={user.lastName || ''} />
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Plano</Label>
                                      <Select defaultValue={user.planId || 'basic'}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {plansData?.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                              {plan.name} - €{parseFloat(plan.pricePerMonth).toFixed(2)}/mês
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`admin-${user.id}`}
                                        defaultChecked={user.isAdmin}
                                        className="rounded"
                                      />
                                      <Label htmlFor={`admin-${user.id}`} className="flex items-center">
                                        <Shield className="w-4 h-4 mr-2 text-green-600" />
                                        Privilégios de Administrador
                                      </Label>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button 
                                        className="flex-1"
                                        onClick={() => {
                                          const firstName = (document.querySelector(`input[defaultValue="${user.firstName || ''}"]`) as HTMLInputElement)?.value;
                                          const lastName = (document.querySelector(`input[defaultValue="${user.lastName || ''}"]`) as HTMLInputElement)?.value;
                                          const planSelect = document.querySelector(`select[defaultValue="${user.planId || 'basic'}"]`) as HTMLSelectElement;
                                          const isAdminCheck = document.getElementById(`admin-${user.id}`) as HTMLInputElement;
                                          
                                          updateUserMutation.mutate({
                                            userId: user.id,
                                            userData: {
                                              firstName,
                                              lastName,
                                              planId: planSelect?.value,
                                              isAdmin: isAdminCheck?.checked
                                            }
                                          });
                                        }}
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        className="flex-1"
                                        onClick={() => {
                                          if (confirm('Tem a certeza que quer resetar a password deste utilizador?')) {
                                            resetPasswordMutation.mutate(user.id);
                                          }
                                        }}
                                      >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reset Password
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                disabled={user.isAdmin}
                                onClick={() => {
                                  if (confirm(`Tem a certeza que quer eliminar o utilizador ${user.email}? Esta acção não pode ser desfeita.`)) {
                                    deleteUserMutation.mutate(user.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
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
          <div className="space-y-6">
            {/* API Keys Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center">
                  <Key className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total de Chaves</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {apiKeysData?.total || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Chaves Ativas</p>
                    <p className="text-2xl font-bold text-green-700">
                      {apiKeysData?.apiKeys?.filter(k => k.isActive).length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Usadas Hoje</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {apiKeysData?.apiKeys?.filter(k => k.lastUsed && new Date(k.lastUsed).toDateString() === new Date().toDateString()).length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Chamadas Hoje</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {stats?.apiCallsToday || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* API Keys Management */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gestão de Chaves API</CardTitle>
                    <CardDescription>
                      Monitorizar e gerir chaves API dos utilizadores
                    </CardDescription>
                  </div>
                  <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        data-testid="button-create-api-key"
                        onClick={() => setShowApiKeyDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Chave API
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Criar Nova Chave API</DialogTitle>
                        <DialogDescription>
                          Criar uma chave API para um utilizador específico
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="api-key-name">Nome da Chave</Label>
                          <Input 
                            id="api-key-name" 
                            placeholder="Ex: Integração Mobile" 
                            data-testid="input-api-key-name"
                            value={apiKeyForm.name}
                            onChange={(e) => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="api-key-user">Utilizador</Label>
                          <Select 
                            value={apiKeyForm.userId}
                            onValueChange={(value) => setApiKeyForm(prev => ({ ...prev, userId: value }))}
                          >
                            <SelectTrigger data-testid="select-api-key-user">
                              <SelectValue placeholder="Selecionar utilizador" />
                            </SelectTrigger>
                            <SelectContent>
                              {usersData?.users?.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.email} ({user.plan?.name || 'Sem plano'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="api-key-description">Descrição (Opcional)</Label>
                          <Textarea 
                            id="api-key-description" 
                            placeholder="Descrição da finalidade desta chave API..."
                            rows={3}
                            data-testid="textarea-api-key-description"
                            value={apiKeyForm.description}
                            onChange={(e) => setApiKeyForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button 
                          variant="outline" 
                          data-testid="button-cancel-api-key"
                          onClick={() => {
                            setShowApiKeyDialog(false);
                            setApiKeyForm({ name: '', userId: '', description: '' });
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          data-testid="button-create-api-key-confirm"
                          disabled={createApiKeyMutation.isPending || !apiKeyForm.name || !apiKeyForm.userId}
                          onClick={() => {
                            if (apiKeyForm.name && apiKeyForm.userId) {
                              createApiKeyMutation.mutate({
                                name: apiKeyForm.name,
                                userId: apiKeyForm.userId,
                                description: apiKeyForm.description || undefined
                              });
                            }
                          }}
                        >
                          {createApiKeyMutation.isPending ? 'Criando...' : 'Criar Chave'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : apiKeysData?.apiKeys?.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Nenhuma chave API registada
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Crie chaves API para permitir que utilizadores acedam aos serviços programaticamente.
                    </p>
                    <Button 
                      data-testid="button-create-first-api-key"
                      onClick={() => setShowApiKeyDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Chave API
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Input 
                          placeholder="Pesquisar chaves API..." 
                          className="w-80"
                          data-testid="input-search-api-keys"
                        />
                        <Select defaultValue="all">
                          <SelectTrigger className="w-40" data-testid="select-filter-api-keys">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="active">Ativas</SelectItem>
                            <SelectItem value="inactive">Inativas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="sm" data-testid="button-refresh-api-keys">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                      </Button>
                    </div>
                    
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
                          <TableRow key={apiKey.id} data-testid={`api-key-row-${apiKey.id}`}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                  <Key className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <span className="font-medium" data-testid={`api-key-name-${apiKey.id}`}>{apiKey.name}</span>
                                  <p className="text-xs text-gray-500">
                                    {apiKey.keyHash ? `***${apiKey.keyHash.slice(-8)}` : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{apiKey.user?.email || 'Utilizador removido'}</span>
                                {apiKey.user?.plan && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {apiKey.user.plan.name}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={apiKey.isActive ? "default" : "secondary"}
                                data-testid={`api-key-status-${apiKey.id}`}
                              >
                                {apiKey.isActive ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span data-testid={`api-key-last-used-${apiKey.id}`}>
                                {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Nunca'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span data-testid={`api-key-created-${apiKey.id}`}>
                                {formatDate(apiKey.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-view-api-key-${apiKey.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className={apiKey.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                                  data-testid={`button-toggle-api-key-${apiKey.id}`}
                                  disabled={toggleApiKeyMutation.isPending}
                                  onClick={() => toggleApiKeyMutation.mutate({ keyId: apiKey.id, isActive: !apiKey.isActive })}
                                >
                                  {apiKey.isActive ? (
                                    <>
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Ativar
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-api-key-${apiKey.id}`}
                                  disabled={revokeApiKeyMutation.isPending}
                                  onClick={() => {
                                    if (confirm(`Tem a certeza que quer revogar a chave "${apiKey.name}"? Esta ação não pode ser desfeita.`)) {
                                      revokeApiKeyMutation.mutate(apiKey.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Revogar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) || []}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Success Dialog for Created API Key */}
            <Dialog open={!!createdApiKey} onOpenChange={() => setCreatedApiKey(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span>Chave API Criada com Sucesso!</span>
                  </DialogTitle>
                  <DialogDescription>
                    A sua nova chave API foi gerada. Esta é a única vez que poderá visualizar a chave completa.
                  </DialogDescription>
                </DialogHeader>
                
                {createdApiKey && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Nome da Chave</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <span className="font-mono text-sm">{createdApiKey.name}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Chave API</Label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm break-all">{createdApiKey.key}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(createdApiKey.key);
                              toast({ title: 'Chave copiada para área de transferência!' });
                            }}
                            data-testid="button-copy-api-key"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-amber-800 dark:text-amber-200 font-medium">Importante!</p>
                          <p className="text-amber-700 dark:text-amber-300 mt-1">
                            Guarde esta chave em local seguro. Por motivos de segurança, não será possível visualizá-la novamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setCreatedApiKey(null)}
                    data-testid="button-close-api-key-success"
                  >
                    Entendi
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'dev-applications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Aplicações de Desenvolvedores</h3>
              <p className="text-sm text-gray-500">Gerir solicitações de acesso à API</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Aplicações Pendentes</CardTitle>
                <CardDescription>
                  Solicitações de acesso que requerem aprovação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Placeholder para aplicações - será implementado após queries funcionarem */}
                  <div className="text-center p-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhuma aplicação pendente</p>
                    <p className="text-sm">As solicitações de acesso à API aparecerão aqui</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'dev-settings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Configurações da API</h3>
              <p className="text-sm text-gray-500">Configurar períodos de teste, preços e limites</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Configurações do Portal de Desenvolvedores</CardTitle>
                <CardDescription>
                  Definir duração de teste, preços e limites de requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Duração do Teste (Dias)</Label>
                    <Input 
                      type="number" 
                      defaultValue="14"
                      placeholder="14"
                    />
                    <p className="text-xs text-gray-500 mt-1">Quantos dias de acesso grátis para novos desenvolvedores</p>
                  </div>
                  <div>
                    <Label>Requests por Dia (Teste)</Label>
                    <Input 
                      type="number" 
                      defaultValue="100"
                      placeholder="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Limite de requests diários durante o período de teste</p>
                  </div>
                  <div>
                    <Label>Preço Mensal (€)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      defaultValue="29.99"
                      placeholder="29.99"
                    />
                    <p className="text-xs text-gray-500 mt-1">Custo mensal após o período de teste</p>
                  </div>
                  <div>
                    <Label>Requests por Dia (Pago)</Label>
                    <Input 
                      type="number" 
                      defaultValue="10000"
                      placeholder="10000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Limite de requests para utilizadores pagos</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="auto-approve" />
                    <Label htmlFor="auto-approve">Aprovação Automática</Label>
                  </div>
                  <p className="text-sm text-gray-500">Se ativado, novas aplicações são aprovadas automaticamente</p>
                </div>
                <Button className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configurações
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'mega':
        return (
          <div className="space-y-6">
            {/* MEGA Account Status - Always show if status exists */}
            {megaAccountStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Estado da Conta MEGA</span>
                  </CardTitle>
                  <CardDescription>
                    Informações sobre a conta MEGA conectada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2">
                        {megaAccountStatus.isConnected ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {megaAccountStatus.isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Estado da Conexão
                      </p>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-lg font-bold text-green-700">
                        {megaAccountStatus.totalSpace ? formatBytes(parseInt(megaAccountStatus.totalSpace)) : 'N/A'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">Espaço Total</p>
                    </div>
                    
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-lg font-bold text-orange-700">
                        {megaAccountStatus.usedSpace ? formatBytes(parseInt(megaAccountStatus.usedSpace)) : 'N/A'}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">Espaço Usado</p>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-lg font-bold text-purple-700">
                        {megaAccountStatus.availableSpace ? formatBytes(parseInt(megaAccountStatus.availableSpace)) : 'N/A'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">Espaço Disponível</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>Tipo de conta: </span>
                      <Badge variant={megaAccountStatus.accountType === 'pro' ? 'default' : 'secondary'}>
                        {megaAccountStatus.accountType?.toUpperCase() || 'Free'}
                      </Badge>
                      {megaAccountStatus.lastChecked && (
                        <span className="ml-4">
                          Última verificação: {formatDate(megaAccountStatus.lastChecked)}
                        </span>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refreshMegaStatusMutation.mutate()}
                      disabled={refreshMegaStatusMutation.isPending}
                      data-testid="button-refresh-mega-status"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshMegaStatusMutation.isPending ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>
                  
                  {megaAccountStatus.error && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-red-800 dark:text-red-200 font-medium">Erro na conexão MEGA</p>
                          <p className="text-red-700 dark:text-red-300 mt-1">{megaAccountStatus.error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* MEGA Credentials Configuration */}
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
                    placeholder={megaCredentialsData?.credentials?.email || "seu-email@exemplo.com"}
                    data-testid="input-mega-email"
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
                    data-testid="input-mega-password"
                  />
                </div>
                
                {megaCredentialsData?.credentials && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <div className="text-sm">
                        <p className="text-blue-800 dark:text-blue-200 font-medium">Credenciais Atuais</p>
                        <p className="text-blue-700 dark:text-blue-300">
                          Email: {megaCredentialsData.credentials.email}
                          {megaCredentialsData.credentials.hasPassword && ' • Password configurada'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    onClick={() => updateMegaCredentialsMutation.mutate(megaCredentials)}
                    disabled={updateMegaCredentialsMutation.isPending || !megaCredentials.email || !megaCredentials.password}
                    data-testid="button-save-mega-credentials"
                  >
                    <Save className={`w-4 h-4 mr-2 ${updateMegaCredentialsMutation.isPending ? 'animate-spin' : ''}`} />
                    {updateMegaCredentialsMutation.isPending ? 'Guardando...' : 'Guardar Credenciais'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => testMegaConnectionMutation.mutate()}
                    disabled={testMegaConnectionMutation.isPending || !megaCredentials.email || !megaCredentials.password}
                    data-testid="button-test-mega-connection"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${testMegaConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                    {testMegaConnectionMutation.isPending ? 'Testando...' : 'Testar Ligação'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'payment-methods':
        return (
          <div className="space-y-6">
            {/* Payment Methods Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center">
                  <Building2 className="w-8 h-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Métodos Angola</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {paymentMethodsData?.paymentMethods?.filter(m => m.country === 'AO').length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center">
                  <Globe className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Métodos Internacionais</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {paymentMethodsData?.paymentMethods?.filter(m => m.country === 'INT').length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Métodos Ativos</p>
                    <p className="text-2xl font-bold text-green-700">
                      {paymentMethodsData?.paymentMethods?.filter(m => m.isActive).length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Métodos de Pagamento Configurados</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-payment-method">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Método
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Adicionar Método de Pagamento</DialogTitle>
                        <DialogDescription>
                          Configure um novo método de pagamento para os utilizadores
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="method-name">Nome do Método</Label>
                          <Input id="method-name" placeholder="Ex: Transferência BAI" data-testid="input-method-name" />
                        </div>
                        <div>
                          <Label htmlFor="method-type">Tipo</Label>
                          <Select defaultValue="bank_transfer_bai">
                            <SelectTrigger data-testid="select-method-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank_transfer_bai">Transferência BAI</SelectItem>
                              <SelectItem value="bank_transfer_bfa">Transferência BFA</SelectItem>
                              <SelectItem value="bank_transfer_bic">Transferência BIC</SelectItem>
                              <SelectItem value="multicaixa">Multicaixa</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="wise">Wise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="method-country">País</Label>
                          <Select defaultValue="AO">
                            <SelectTrigger data-testid="select-method-country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AO">🇦🇴 Angola</SelectItem>
                              <SelectItem value="INT">🌍 Internacional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="method-processing">Tempo de Processamento</Label>
                          <Input id="method-processing" placeholder="Ex: 24-48 horas" data-testid="input-method-processing" />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="method-description">Descrição</Label>
                          <Input id="method-description" placeholder="Descrição do método de pagamento" data-testid="input-method-description" />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="method-instructions">Instruções para o Utilizador</Label>
                          <textarea 
                            id="method-instructions" 
                            className="w-full p-3 border rounded-md"
                            rows={3}
                            placeholder="Instruções detalhadas sobre como usar este método..."
                            data-testid="textarea-method-instructions"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" data-testid="button-cancel-method">Cancelar</Button>
                        <Button data-testid="button-create-method">Criar Método</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="p-6">
                {paymentMethodsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : paymentMethodsData?.paymentMethods?.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Nenhum método configurado
                    </h3>
                    <p className="text-gray-500">
                      Configure métodos de pagamento para permitir que utilizadores façam pagamentos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethodsData?.paymentMethods?.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg" data-testid={`payment-method-${method.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            {method.country === 'AO' ? (
                              <Building2 className="w-6 h-6 text-orange-600" />
                            ) : (
                              <Globe className="w-6 h-6 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium" data-testid={`text-method-name-${method.id}`}>{method.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                method.country === 'AO' 
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {method.country === 'AO' ? 'Angola' : 'Internacional'}
                              </span>
                              {method.isActive ? (
                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  Ativo
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{method.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-400">
                                ⏱️ {method.processingTime || 'N/A'}
                              </span>
                              <span className="text-xs text-gray-400">
                                💰 {method.fees || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" data-testid={`button-edit-method-${method.id}`}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid={`button-delete-method-${method.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
          
          {/* User Profile Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || ''} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="admin-profile-menu">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab('profile')} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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