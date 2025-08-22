import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  Download, 
  Search, 
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";

interface PaymentRecord {
  id: string;
  amount: string;
  currency: string;
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  date: string;
  description: string;
  receiptUrl?: string;
  invoiceNumber: string;
}

export default function Billing() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Fetch billing history
  const { data: payments = [], isLoading } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/billing/history"],
  });

  // Fetch billing summary
  const { data: billingSummary } = useQuery<{
    totalSpent: string;
    currentMonth: string;
    nextPayment: string;
  }>({
    queryKey: ["/api/billing/summary"],
  });

  const handleDownloadReceipt = async (paymentId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/billing/receipt/${paymentId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to download receipt');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Recibo descarregado",
        description: "O recibo foi descarregado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao descarregar",
        description: "Não foi possível descarregar o recibo.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Falhado
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Reembolsado
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: string, currency: string) => {
    if (currency.toUpperCase() === 'AOA') {
      const numAmount = parseFloat(amount);
      return `${numAmount.toLocaleString('pt-AO')} Kz`;
    }
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(parseFloat(amount));
  };

  // Filter payments based on search and date
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = searchTerm === "" || 
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === "" || 
      payment.date.startsWith(dateFilter);

    return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen bg-tatu-light">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-mega-text">Histórico de Pagamentos</h1>
            <p className="text-gray-600 mt-2">Consulte o seu histórico de pagamentos e descarregue recibos</p>
          </div>

        {/* Billing Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-mega-text">
                {billingSummary?.totalSpent || '€0,00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Desde o início</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Este Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-mega-text">
                {billingSummary?.currentMonth || '€0,00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Pagamentos atuais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Próximo Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-mega-text">
                {billingSummary?.nextPayment || '--'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Data prevista</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Pesquisar por descrição ou número da fatura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="month"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10"
                  data-testid="date-filter"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mega-red mx-auto mb-4"></div>
                <p className="text-gray-600">A carregar histórico...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum pagamento encontrado</p>
                <p className="text-sm">
                  {searchTerm || dateFilter 
                    ? "Tente ajustar os filtros de pesquisa." 
                    : "Ainda não foram efetuados pagamentos nesta conta."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <CreditCard className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{payment.description}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-500">
                            Fatura #{payment.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(payment.date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      {payment.status === 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id, payment.invoiceNumber)}
                          data-testid={`download-receipt-${payment.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Recibo
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• Os recibos estão disponíveis apenas para pagamentos bem-sucedidos</p>
              <p>• Se não conseguir encontrar um pagamento, verifique os filtros de pesquisa</p>
              <p>• Para questões sobre faturação, contacte o nosso suporte</p>
              <p>• Os reembolsos podem demorar até 5-10 dias úteis a aparecer na sua conta</p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}