import { useEffect, useState, type FormEvent } from 'react';
import { Save, MapPin, Phone, MessageCircle, AtSign as InstagramIcon } from 'lucide-react';
import { AvatarUploader, ProfilePreviewCard } from '../../components/dashboard';
import { Button, Input, Textarea, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { providerService } from '../../services/providerService';
import type { Provider, ProviderProfileInput } from '../../types';

type FormState = ProviderProfileInput;

export function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.providerId) return;
    providerService.getById(user.providerId).then((data) => {
      if (data) {
        setProvider(data);
        setForm({
          slug: data.slug,
          name: data.name,
          businessName: data.businessName,
          avatarUrl: data.avatarUrl,
          description: data.description,
          address: data.address,
          phone: data.phone,
          whatsapp: data.whatsapp,
          instagram: data.instagram,
        });
      }
      setIsLoading(false);
    });
  }, [user?.providerId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!provider || !form) return;

    setIsSaving(true);
    try {
      const updated = await providerService.updateProfile(provider.id, form);
      setProvider(updated);
      showToast({ message: 'Perfil atualizado com sucesso.', variant: 'success' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !provider || !form) return <Spinner label="Carregando perfil…" />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">Perfil do prestador</h2>
        <p className="text-sm text-ink-500">
          Esses dados aparecem na sua página pública de agendamento.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[var(--radius-card)] border border-ink-100 bg-white p-5 sm:p-6" noValidate>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Foto</p>
            <AvatarUploader
              avatarUrl={form.avatarUrl}
              onChange={(dataUrl) => updateField('avatarUrl', dataUrl)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Seu nome"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
            <Input
              label="Nome do estabelecimento"
              value={form.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
            />
          </div>

          <Textarea
            label="Descrição / apresentação"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Conte um pouco sobre o seu trabalho para os clientes."
          />

          <Input
            label="Endereço"
            icon={<MapPin className="size-4" />}
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Telefone"
              icon={<Phone className="size-4" />}
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="WhatsApp"
              icon={<MessageCircle className="size-4" />}
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
              placeholder="Somente números, com DDI"
              hint="Ex.: 5581999998888"
            />
          </div>

          <Input
            label="Instagram (opcional)"
            icon={<InstagramIcon className="size-4" />}
            value={form.instagram ?? ''}
            onChange={(e) => updateField('instagram', e.target.value)}
            placeholder="@seuusuario"
          />

          <div className="flex justify-end border-t border-ink-100 pt-4">
            <Button type="submit" isLoading={isSaving}>
              <Save className="size-4" />
              Salvar alterações
            </Button>
          </div>
        </form>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-sm font-medium text-ink-500">Prévia da página pública</p>
          <ProfilePreviewCard
            avatarUrl={form.avatarUrl}
            name={form.name}
            businessName={form.businessName}
            description={form.description}
            address={form.address}
            phone={form.phone}
            whatsapp={form.whatsapp}
            instagram={form.instagram}
          />
        </div>
      </div>
    </div>
  );
}
