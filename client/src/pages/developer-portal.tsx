import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Code, Key, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Activity, Settings, Play, Copy, BookOpen
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { DeveloperApplication, ApiKey, DeveloperApiSettings } from '@shared/schema';

interface DeveloperPortalProps {
  user: any;
}

export default function DeveloperPortal({ user }: DeveloperPortalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [applicationForm, setApplicationForm] = useState({
    systemName: '',
    systemDescription: '',
    websiteUrl: '',
    expectedUsage: ''
  });

  // Queries
  const { data: applications, isLoading: applicationsLoading } = useQuery<{
    applications: DeveloperApplication[];
  }>({
    queryKey: ['/api/portal/developer/applications'],
  });

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<{
    apiKeys: ApiKey[];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/developer/applications'] });
      toast({ title: 'Aplicação submetida com sucesso!' });
      setApplicationForm({ systemName: '', systemDescription: '', websiteUrl: '', expectedUsage: '' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao submeter aplicação', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Portal do Desenvolvedor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acesso às APIs do MEGA File Manager para integração nos seus sistemas
        </p>
      </div>

      {/* API Settings Info */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Condições de Acesso à API</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{settings.trialDurationDays}</div>
                <div className="text-sm text-gray-600">Dias de Teste Grátis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{settings.freeRequestsPerDay}</div>
                <div className="text-sm text-gray-600">Requests/Dia (Teste)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">€{settings.monthlyPrice}</div>
                <div className="text-sm text-gray-600">Preço Mensal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{settings.paidRequestsPerDay}</div>
                <div className="text-sm text-gray-600">Requests/Dia (Pago)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5" />
            <span>Solicitar Acesso à API</span>
          </CardTitle>
          <CardDescription>
            Preencha os detalhes do seu sistema para solicitar acesso às APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="system-name">Nome do Sistema/Aplicação</Label>
              <Input
                id="system-name"
                value={applicationForm.systemName}
                onChange={(e) => setApplicationForm({...applicationForm, systemName: e.target.value})}
                placeholder="Ex: Sistema de Gestão de Documentos"
              />
            </div>
            <div>
              <Label htmlFor="website-url">Website/URL (Opcional)</Label>
              <Input
                id="website-url"
                value={applicationForm.websiteUrl}
                onChange={(e) => setApplicationForm({...applicationForm, websiteUrl: e.target.value})}
                placeholder="https://meusite.com"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="system-description">Descrição do Sistema</Label>
            <Textarea
              id="system-description"
              value={applicationForm.systemDescription}
              onChange={(e) => setApplicationForm({...applicationForm, systemDescription: e.target.value})}
              placeholder="Descreva o que faz o seu sistema e como pretende usar a API..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="expected-usage">Uso Esperado da API</Label>
            <Textarea
              id="expected-usage"
              value={applicationForm.expectedUsage}
              onChange={(e) => setApplicationForm({...applicationForm, expectedUsage: e.target.value})}
              placeholder="Ex: Upload de 100 ficheiros por dia, download de relatórios, gestão de utilizadores..."
              rows={3}
            />
          </div>

          <Button 
            onClick={() => submitApplicationMutation.mutate(applicationForm)}
            disabled={submitApplicationMutation.isPending || !applicationForm.systemName || !applicationForm.systemDescription}
            className="w-full"
          >
            {submitApplicationMutation.isPending ? 'Enviando...' : 'Submeter Aplicação'}
          </Button>
        </CardContent>
      </Card>

      {/* Applications Status */}
      {applications && applications.applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Minhas Aplicações</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.applications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{app.systemName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{app.systemDescription}</p>
                      {app.websiteUrl && (
                        <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer" 
                           className="text-sm text-blue-600 hover:underline">
                          {app.websiteUrl}
                        </a>
                      )}
                    </div>
                    <Badge variant={
                      app.status === 'approved' ? 'default' :
                      app.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {app.status === 'approved' ? 'Aprovada' :
                       app.status === 'rejected' ? 'Rejeitada' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  {app.status === 'rejected' && app.rejectionReason && (
                    <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>Motivo da rejeição:</strong> {app.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      {apiKeys && apiKeys.apiKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>Minhas Chaves API</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apiKeys.apiKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{key.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sistema: {key.systemName}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span>
                          Estado: 
                          <Badge variant={key.isActive ? 'default' : 'secondary'} className="ml-1">
                            {key.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </span>
                        {key.isTrial && (
                          <span>
                            <Badge variant="outline" className="text-orange-600">
                              {key.trialExpiresAt ? 
                                `Teste até ${new Date(key.trialExpiresAt).toLocaleDateString()}` : 
                                'Período de Teste'
                              }
                            </Badge>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(key.keyHash.slice(-8))}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Documentação da API</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>A documentação completa da API inclui todos os endpoints disponíveis:</p>
            <ul className="space-y-2">
              <li>• <strong>POST /api/files/upload</strong> - Upload de ficheiros</li>
              <li>• <strong>GET /api/files</strong> - Listar ficheiros</li>
              <li>• <strong>GET /api/files/:id/download</strong> - Download de ficheiros</li>
              <li>• <strong>DELETE /api/files/:id</strong> - Eliminar ficheiros</li>
              <li>• <strong>GET /api/files/search</strong> - Pesquisar ficheiros</li>
            </ul>
            <Button variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Ver Documentação Completa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}