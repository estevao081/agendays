import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { AuthShell } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('fulano@barbearia.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      showToast({ message: 'Login realizado com sucesso.', variant: 'success' });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    }
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o painel do seu negócio."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="inline-flex min-h-11 items-center font-medium text-emerald-700 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
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
        <div className="space-y-1.5">
          <Input
            label="Senha"
            type="password"
            name="password"
            autoComplete="current-password"
            icon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            error={error ?? undefined}
            required
          />
          <div className="text-right">
            <Link
              to="/esqueci-senha"
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink-500 hover:text-emerald-700 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Entrar
        </Button>

        <p className="text-center text-xs text-ink-400">
          Demo: qualquer senha com 6+ caracteres funciona.
        </p>
      </form>
    </AuthShell>
  );
}
