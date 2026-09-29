import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '../../components/layout';
import { Button, Input } from '../../components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    // simula o envio — nenhuma chamada real é feita
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsLoading(false);
    setSent(true);
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Enviaremos um link de redefinição para o seu e-mail."
      footer={
        <Link to="/login" className="inline-flex min-h-11 items-center font-medium text-emerald-700 hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-sm text-ink-600">
            Se existir uma conta para <strong className="text-ink-800">{email}</strong>, você
            vai receber um link de redefinição em instantes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          <Button type="submit" fullWidth isLoading={isLoading}>
            Enviar link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
