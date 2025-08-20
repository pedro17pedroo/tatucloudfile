import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Code, Key, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Activity, Settings, Play, Copy, BookOpen,
  Upload, Download, Search, Trash2, Send, Eye
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Navigation } from '@/components/navigation';
import type { DeveloperApplication, ApiKey, DeveloperApiSettings } from '@shared/schema';

interface UnifiedDeveloperPortalProps {
  user: any;
}

export default function UnifiedDeveloperPortal({ user }: UnifiedDeveloperPortalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [applicationForm, setApplicationForm] = useState({
    systemName: '',
    systemDescription: '',
    websiteUrl: '',
    expectedUsage: ''
  });
  
  const [newApiKey, setNewApiKey] = useState<{
    key: string;
    expiresAt: string;
    systemName: string;
  } | null>(null);

  const [testEndpoint, setTestEndpoint] = useState({
    method: 'GET',
    endpoint: '/api/files',
    body: '',
    headers: { 'Authorization': 'Bearer your_api_key' }
  });

  const [testResponse, setTestResponse] = useState<any>(null);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);

  // Queries
  const { data: applications, isLoading: applicationsLoading } = useQuery<{
    applications: DeveloperApplication[];
  }>({
    queryKey: ['/api/portal/developer/applications'],
  });

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<{
    apiKeys: (ApiKey & { plainTextKey?: string })[];
  }>({
    queryKey: ['/api/portal/developer/api-keys'],
  });

  const { data: settings } = useQuery<DeveloperApiSettings>({
    queryKey: ['/api/portal/developer/settings'],
  });

  // Mutations
  const submitApplicationMutation = useMutation({
    mutationFn: async (application: typeof applicationForm) => {
      const response = await apiRequest('/api/portal/developer/applications', 'POST', application);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/developer/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portal/developer/api-keys'] });
      
      if (data.apiKey) {
        setNewApiKey({
          key: data.apiKey,
          expiresAt: data.trialExpiresAt,
          systemName: applicationForm.systemName
        });
        toast({ 
          title: 'Aplicação Aprovada!', 
          description: 'Chave API criada com sucesso. Período de teste ativo.' 
        });
      }
      
      setApplicationForm({
        systemName: '',
        systemDescription: '',
        websiteUrl: '',
        expectedUsage: ''
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao submeter aplicação',
        variant: 'destructive'
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado para área de transferência",
    });
  };

  const testApiEndpoint = async () => {
    setIsTestingEndpoint(true);
    try {
      const baseUrl = window.location.origin + '/api/v1';
      const response = await fetch(baseUrl + testEndpoint.endpoint, {
        method: testEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...testEndpoint.headers
        },
        body: testEndpoint.method !== 'GET' ? testEndpoint.body : undefined
      });
      
      const result = await response.json();
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        data: result
      });
    } catch (error: any) {
      setTestResponse({
        status: 'ERROR',
        statusText: 'Network Error',
        data: { error: error.message }
      });
    }
    setIsTestingEndpoint(false);
  };

  const hasApprovedApplication = applications?.applications?.some(app => app.status === 'approved');
  const hasActiveApiKey = apiKeys?.apiKeys?.some(key => key.isActive);

  const apiEndpoints = [
    {
      method: 'POST',
      path: '/api/files/upload',
      description: 'Upload de ficheiros',
      example: `{
  "file": "[binary_file_data]",
  "fileName": "document.pdf",
  "path": "/documents/report.pdf"
}`
    },
    {
      method: 'GET',
      path: '/api/files',
      description: 'Listar ficheiros',
      example: 'No body required'
    },
    {
      method: 'GET',
      path: '/api/files/{id}/download',
      description: 'Download de ficheiros',
      example: 'No body required'
    },
    {
      method: 'DELETE',
      path: '/api/files/{id}',
      description: 'Eliminar ficheiros',
      example: 'No body required'
    },
    {
      method: 'GET',
      path: '/api/files/search',
      description: 'Pesquisar ficheiros',
      example: 'Query params: ?q=search_term&type=pdf'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Portal do Desenvolvedor
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Acesso às APIs do MEGA File Manager - Solicite acesso, teste endpoints e integre facilmente
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="docs" data-testid="tab-docs">Documentação</TabsTrigger>
            <TabsTrigger value="credentials" data-testid="tab-credentials">Credenciais</TabsTrigger>
            <TabsTrigger value="testing" data-testid="tab-testing">Testar API</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Dias de Teste</h3>
                      <p className="text-3xl font-bold">{settings?.trialDurationDays || 14}</p>
                    </div>
                    <Clock className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Requests/Dia (Teste)</h3>
                      <p className="text-3xl font-bold">{settings?.freeRequestsPerDay || 100}</p>
                    </div>
                    <Activity className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Preço Mensal</h3>
                      <p className="text-3xl font-bold">€{settings?.monthlyPrice || '29.99'}</p>
                    </div>
                    <FileText className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {!hasApprovedApplication && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    Solicitar Acesso à API
                  </CardTitle>
                  <CardDescription>
                    Preencha os detalhes do seu sistema para solicitar acesso às APIs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="systemName">Nome do Sistema/Aplicação</Label>
                      <Input
                        id="systemName"
                        value={applicationForm.systemName}
                        onChange={(e) => setApplicationForm({ ...applicationForm, systemName: e.target.value })}
                        placeholder="Meu Sistema de Gestão"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="websiteUrl">Website/URL (Opcional)</Label>
                      <Input
                        id="websiteUrl"
                        value={applicationForm.websiteUrl}
                        onChange={(e) => setApplicationForm({ ...applicationForm, websiteUrl: e.target.value })}
                        placeholder="https://meusite.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="systemDescription">Descrição do Sistema</Label>
                    <Textarea
                      id="systemDescription"
                      value={applicationForm.systemDescription}
                      onChange={(e) => setApplicationForm({ ...applicationForm, systemDescription: e.target.value })}
                      placeholder="Descreva o que o seu sistema faz e como utilizará a API..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="expectedUsage">Uso Esperado da API</Label>
                    <Textarea
                      id="expectedUsage"
                      value={applicationForm.expectedUsage}
                      onChange={(e) => setApplicationForm({ ...applicationForm, expectedUsage: e.target.value })}
                      placeholder="Como planeia usar a API? Quantos ficheiros por dia? Que tipos de operações?"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => submitApplicationMutation.mutate(applicationForm)}
                    disabled={submitApplicationMutation.isPending}
                    className="w-full"
                    data-testid="submit-application"
                  >
                    {submitApplicationMutation.isPending ? 'Submetendo...' : 'Submeter Aplicação'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasApprovedApplication && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Aplicação Aprovada
                  </CardTitle>
                  <CardDescription>
                    Sua aplicação foi aprovada! Pode agora aceder às credenciais na aba "Credenciais"
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Documentação da API
                </CardTitle>
                <CardDescription>
                  Endpoints disponíveis e exemplos de uso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {apiEndpoints.map((endpoint, index) => (
                      <div key={index} className="border-b pb-6 last:border-b-0">
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge 
                            variant={endpoint.method === 'GET' ? 'secondary' : endpoint.method === 'POST' ? 'default' : 'destructive'}
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {endpoint.description}
                        </p>
                        
                        <div>
                          <Label className="text-xs font-medium">Exemplo de Request:</Label>
                          <div className="mt-1 bg-gray-100 dark:bg-gray-800 rounded p-3 relative">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-2 top-2"
                              onClick={() => copyToClipboard(endpoint.example)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <pre className="text-xs overflow-x-auto">
{endpoint.method === 'GET' ? 'No body required' : endpoint.example}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-6">
            {newApiKey && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700 dark:text-green-400">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Nova Chave API Criada
                  </CardTitle>
                  <CardDescription>
                    Guarde esta chave num local seguro - não será mostrada novamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Sistema: {newApiKey.systemName}</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono">
                        {newApiKey.key}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyToClipboard(newApiKey.key)}
                        data-testid="copy-new-api-key"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Expira: {new Date(newApiKey.expiresAt).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <Button onClick={() => setNewApiKey(null)} variant="outline" size="sm">
                    Ocultar
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração da API</CardTitle>
                  <CardDescription>Informações essenciais para integração</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Base URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm">
                        {window.location.origin}/api/v1
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyToClipboard(window.location.origin + '/api/v1')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Autenticação</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm">
                        Authorization: Bearer {
                          hasActiveApiKey && apiKeys?.apiKeys?.find(key => key.isActive && key.plainTextKey) 
                            ? apiKeys.apiKeys.find(key => key.isActive && key.plainTextKey)?.plainTextKey
                            : hasActiveApiKey ? 'sua_chave_api_aqui' : 'your_api_key'
                        }
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const activeKeyWithText = apiKeys?.apiKeys?.find(key => key.isActive && key.plainTextKey);
                          const keyText = activeKeyWithText?.plainTextKey || 'sua_chave_api_aqui';
                          copyToClipboard(`Authorization: Bearer ${keyText}`);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Rate Limit</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm">
                        {settings?.paidRequestsPerDay || 10000} requests/hora
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {hasActiveApiKey && (
                <Card>
                  <CardHeader>
                    <CardTitle>Chaves API Ativas</CardTitle>
                    <CardDescription>Gerencie as suas chaves de acesso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {apiKeys?.apiKeys?.filter(key => key.isActive).map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{key.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Sistema: {key.systemName}
                            </p>
                            {key.plainTextKey && (
                              <div className="mt-2">
                                <Label className="text-xs font-medium">Chave API:</Label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <code className="flex-1 bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs font-mono break-all">
                                    {key.plainTextKey}
                                  </code>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => copyToClipboard(key.plainTextKey!)}
                                    data-testid={`copy-api-key-${key.id}`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              Criada: {key.createdAt ? new Date(key.createdAt).toLocaleDateString('pt-PT') : 'Desconhecida'}
                              {key.isTrial && key.trialExpiresAt && ` • Expira: ${new Date(key.trialExpiresAt).toLocaleDateString('pt-PT')}`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {key.isTrial && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Teste
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Ativa
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="w-5 h-5 mr-2" />
                  Testar Endpoints
                </CardTitle>
                <CardDescription>
                  Teste os endpoints da API diretamente na interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Método</Label>
                    <select 
                      value={testEndpoint.method}
                      onChange={(e) => setTestEndpoint({ ...testEndpoint, method: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Endpoint</Label>
                    <select
                      value={testEndpoint.endpoint}
                      onChange={(e) => setTestEndpoint({ ...testEndpoint, endpoint: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="/api/files">GET /api/files</option>
                      <option value="/api/files/upload">POST /api/files/upload</option>
                      <option value="/api/files/search">GET /api/files/search</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label>Authorization Header</Label>
                  <Input
                    value={testEndpoint.headers.Authorization}
                    onChange={(e) => setTestEndpoint({ 
                      ...testEndpoint, 
                      headers: { ...testEndpoint.headers, Authorization: e.target.value }
                    })}
                    placeholder="Bearer your_api_key_here"
                    className="mt-1 font-mono"
                  />
                  {hasActiveApiKey && apiKeys?.apiKeys?.find(key => key.isActive && key.plainTextKey) && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        const activeKey = apiKeys.apiKeys.find(key => key.isActive && key.plainTextKey);
                        if (activeKey?.plainTextKey) {
                          setTestEndpoint({
                            ...testEndpoint,
                            headers: { ...testEndpoint.headers, Authorization: `Bearer ${activeKey.plainTextKey}` }
                          });
                          toast({ title: 'Chave API aplicada', description: 'A sua chave API foi aplicada no campo de autorização.' });
                        }
                      }}
                      data-testid="use-active-api-key"
                    >
                      Usar Chave API Ativa
                    </Button>
                  )}
                  {hasActiveApiKey && !apiKeys?.apiKeys?.find(key => key.isActive && key.plainTextKey) && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Substitua "your_api_key_here" pela sua chave API ativa das Credenciais
                    </p>
                  )}
                </div>
                
                {testEndpoint.method !== 'GET' && (
                  <div>
                    <Label>Request Body (JSON)</Label>
                    <Textarea
                      value={testEndpoint.body}
                      onChange={(e) => setTestEndpoint({ ...testEndpoint, body: e.target.value })}
                      placeholder='{"fileName": "test.pdf", "path": "/documents/"}'
                      className="mt-1 font-mono"
                      rows={4}
                    />
                  </div>
                )}
                
                <Button 
                  onClick={testApiEndpoint}
                  disabled={isTestingEndpoint}
                  className="w-full"
                  data-testid="test-endpoint"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isTestingEndpoint ? 'Testando...' : 'Testar Endpoint'}
                </Button>
                
                {testResponse && (
                  <div className="mt-6">
                    <Label>Resposta</Label>
                    <div className="mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${
                          testResponse.status >= 200 && testResponse.status < 300 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          Status: {testResponse.status} {testResponse.statusText}
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(JSON.stringify(testResponse, null, 2))}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(testResponse.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}