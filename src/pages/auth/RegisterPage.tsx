import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { AuthShell } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export function RegisterPage() {
  const { register, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      await register({ name, email, password, confirmPassword });
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
          error={error ?? undefined}
          required
        />

        <Button type="submit" fullWidth isLoading={isLoading}>
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
