import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Mail, Phone, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegisterStep3Props {
  contactMethod: 'email' | 'phone';
  contactValue: string;
  onBack: () => void;
  onNext: () => void;
}

export default function RegisterStep3({ contactMethod, contactValue, onBack, onNext }: RegisterStep3Props) {
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const { toast } = useToast();

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/send-otp', 'POST', {
        [contactMethod]: contactValue
      });
    },
    onSuccess: () => {
      toast({
        title: "Código enviado",
        description: `Código de verificação enviado para ${contactValue}`,
      });
      setTimeLeft(300); // Reset timer
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar código",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/verify-otp', 'POST', {
        [contactMethod]: contactValue,
        otp
      });
    },
    onSuccess: () => {
      toast({
        title: "Código verificado",
        description: "Prosseguindo com a criação da conta...",
      });
      onNext();
    },
    onError: (error: any) => {
      toast({
        title: "Código inválido",
        description: error.message || "Verifique o código e tente novamente",
        variant: "destructive",
      });
      setOtp("");
    }
  });

  const handleVerify = () => {
    if (otp.length === 6) {
      verifyOtpMutation.mutate();
    }
  };

  const handleResend = () => {
    if (timeLeft === 0) {
      sendOtpMutation.mutate();
    }
  };

  // Send OTP when component mounts
  useEffect(() => {
    sendOtpMutation.mutate();
  }, []);

  return (
    <div className="min-h-screen bg-mega-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute left-4 top-4"
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-2xl font-bold text-mega-text">
            Verificar {contactMethod === 'email' ? 'Email' : 'Telemóvel'}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enviámos um código de 6 dígitos para
          </p>
          <div className="flex items-center justify-center mt-2 p-2 bg-gray-100 rounded-lg">
            {contactMethod === 'email' ? (
              <Mail className="h-4 w-4 text-gray-600 mr-2" />
            ) : (
              <Phone className="h-4 w-4 text-gray-600 mr-2" />
            )}
            <span className="font-medium text-gray-800">{contactValue}</span>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-3">
                Introduza o código de verificação
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  data-testid="otp-input"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {timeLeft > 0 ? (
              <p className="text-center text-sm text-gray-600">
                O código expira em <span className="font-medium text-mega-red">{formatTime(timeLeft)}</span>
              </p>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Código expirado</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={sendOtpMutation.isPending}
                  className="text-mega-red border-mega-red hover:bg-mega-red/5"
                  data-testid="resend-button"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {sendOtpMutation.isPending ? "A enviar..." : "Reenviar código"}
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || verifyOtpMutation.isPending}
            className="w-full bg-mega-red hover:bg-red-600 text-white"
            data-testid="verify-button"
          >
            {verifyOtpMutation.isPending ? "A verificar..." : "Verificar código"}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Não recebeu o código?{" "}
            <Button
              variant="link"
              size="sm"
              onClick={handleResend}
              disabled={timeLeft > 0 || sendOtpMutation.isPending}
              className="text-mega-red p-0 h-auto"
              data-testid="resend-link"
            >
              Clique para reenviar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}