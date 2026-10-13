import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Store, Gift, IdCard, Smartphone, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { OTP_LENGTH, OTP_RESEND_SECONDS, verificationService } from '../../services/verificationService';
import { formatDocument, isValidCnpj, isValidCpf } from '../../utils/document';
import { formatBrPhone, normalizeBrPhone } from '../../utils/phone';

type OtpStep = 'idle' | 'sent' | 'verified';

export function RegisterPage() {
  const { register, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // verificação do WhatsApp por código (OTP)
  const [otpStep, setOtpStep] = useState<OtpStep>('idle');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function handleWhatsappChange(value: string) {
    setWhatsapp(formatBrPhone(value));
    // trocar o número invalida a verificação anterior
    setOtpStep('idle');
    setCode('');
    setDemoCode(null);
    setOtpError(null);
    setSecondsLeft(0);
  }

  async function handleSendCode() {
    setOtpError(null);
    if (!normalizeBrPhone(whatsapp)) {
      setOtpError('Informe um celular válido com DDD, ex.: (81) 99123-4567.');
      return;
    }
    setOtpBusy(true);
    try {
      const result = await verificationService.sendCode(whatsapp);
      setDemoCode(result.demoCode);
      setCode('');
      setOtpStep('sent');
      setSecondsLeft(OTP_RESEND_SECONDS);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Não foi possível enviar o código.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function handleVerifyCode() {
    setOtpError(null);
    setOtpBusy(true);
    try {
      await verificationService.verifyCode(whatsapp, code);
      setOtpStep('verified');
      setDemoCode(null);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Não foi possível verificar o código.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('Informe o nome do estabelecimento.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!isValidCpf(taxId) && !isValidCnpj(taxId)) {
      setError('CPF ou CNPJ inválido. Confira os números.');
      return;
    }
    if (otpStep !== 'verified') {
      setError('Confirme seu WhatsApp com o código antes de criar a conta.');
      return;
    }

    try {
      await register({ name, businessName, document: taxId, whatsapp, email, password, confirmPassword, referralCode });
      showToast({
        message: 'Conta criada com sucesso.',
        description: 'Bem-vindo ao agendasys!',
        variant: 'success',
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    }
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a receber agendamentos em minutos."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link to="/login" className="inline-flex min-h-11 items-center font-medium text-emerald-700 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nome"
          name="name"
          autoComplete="name"
          icon={<User className="size-4" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          required
        />
        <Input
          label="Nome do estabelecimento"
          name="businessName"
          autoComplete="organization"
          icon={<Store className="size-4" />}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Ex.: Barbearia do João"
          required
        />
        <Input
          label="CPF ou CNPJ"
          name="document"
          autoComplete="off"
          icon={<IdCard className="size-4" />}
          value={taxId}
          onChange={(e) => setTaxId(formatDocument(e.target.value))}
          placeholder="000.000.000-00"
          hint="Usado só para evitar contas duplicadas. Guardamos apenas uma versão criptografada."
          required
        />

        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="WhatsApp"
                type="tel"
                name="whatsapp"
                autoComplete="tel-national"
                inputMode="tel"
                icon={<Smartphone className="size-4" />}
                value={whatsapp}
                onChange={(e) => handleWhatsappChange(e.target.value)}
                placeholder="(81) 99123-4567"
                required
              />
            </div>
            {otpStep !== 'verified' && (
              <Button type="button" variant="secondary" onClick={handleSendCode} isLoading={otpBusy && otpStep === 'idle'} disabled={otpStep === 'sent' && secondsLeft > 0}>
                {otpStep === 'sent' ? (secondsLeft > 0 ? `Reenviar (${secondsLeft}s)` : 'Reenviar') : 'Enviar código'}
              </Button>
            )}
          </div>

          {otpStep === 'verified' && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="size-4" /> WhatsApp confirmado
            </p>
          )}

          {otpStep === 'sent' && (
            <div className="space-y-2 rounded-[var(--radius-chip)] border border-ink-100 bg-paper-200/70 p-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="Código recebido no WhatsApp"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={OTP_LENGTH}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={handleVerifyCode} isLoading={otpBusy} disabled={code.length !== OTP_LENGTH}>
                  Verificar
                </Button>
              </div>
              {demoCode && (
                <p className="text-xs text-ink-500" data-testid="demo-otp">
                  Modo demonstração (nenhuma mensagem é enviada de verdade): o código é <strong>{demoCode}</strong>.
                </p>
              )}
            </div>
          )}

          {otpError && (
            <p role="alert" className="text-sm text-brick-600">
              {otpError}
            </p>
          )}
        </div>

        <Input
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          icon={<Mail className="size-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          required
        />
        <Input
          label="Senha"
          type="password"
          name="password"
          autoComplete="new-password"
          icon={<Lock className="size-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
        />
        <Input
          label="Confirmar senha"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          icon={<Lock className="size-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a senha"
          required
        />
        <Input
          label="Código de indicação (opcional)"
          name="referralCode"
          autoComplete="off"
          icon={<Gift className="size-4" />}
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder="Quem te indicou?"
        />

        <div className="flex gap-2.5 rounded-[var(--radius-chip)] border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            Você ganha <strong>1 mês grátis</strong> (um por CPF/CNPJ e por WhatsApp); depois, R$ 50/mês. Seu link, serviços
            e histórico ficam ligados a esta conta e não passam para outra.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-brick-600">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth isLoading={isLoading}>
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
