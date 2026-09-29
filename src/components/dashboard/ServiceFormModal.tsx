import { useState, type FormEvent } from 'react';
import type { Service, ServiceInput } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ServiceInput) => Promise<void>;
  editingService: Service | null;
}

function buildInitialForm(service: Service | null) {
  return {
    name: service?.name ?? '',
    description: service?.description ?? '',
    price: service ? String(service.price) : '',
    durationMinutes: service ? String(service.durationMinutes) : '30',
    active: service?.active ?? true,
  };
}

/**
 * O componente pai deve remontar este modal (via prop `key`) sempre que
 * `editingService` mudar, para que o estado do formulário nasça correto sem
 * precisar sincronizar props → state dentro de um efeito.
 */
export function ServiceFormModal({
  open,
  onClose,
  onSubmit,
  editingService,
}: ServiceFormModalProps) {
  const [form, setForm] = useState(() => buildInitialForm(editingService));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Informe o nome do serviço.';

    const price = Number(form.price.replace(',', '.'));
    if (!form.price || Number.isNaN(price) || price < 0) {
      nextErrors.price = 'Informe um preço válido.';
    }

    const duration = Number(form.durationMinutes);
    if (!form.durationMinutes || Number.isNaN(duration) || duration <= 0) {
      nextErrors.durationMinutes = 'Informe uma duração válida em minutos.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price.replace(',', '.')),
        durationMinutes: Number(form.durationMinutes),
        active: form.active,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingService ? 'Editar serviço' : 'Novo serviço'}
      description="Esses dados aparecem para o cliente na sua página pública."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            {editingService ? 'Salvar alterações' : 'Adicionar serviço'}
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nome do serviço"
          placeholder="Ex.: Corte masculino"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={errors.name}
        />
        <Textarea
          label="Descrição"
          placeholder="Ex.: Corte na tesoura e máquina, com acabamento na navalha."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Preço (R$)"
            inputMode="decimal"
            placeholder="35,00"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            error={errors.price}
          />
          <Input
            label="Duração (min)"
            inputMode="numeric"
            placeholder="30"
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            error={errors.durationMinutes}
          />
        </div>
        <Switch
          id="service-active"
          checked={form.active}
          onChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
          label={form.active ? 'Serviço ativo' : 'Serviço inativo'}
        />
      </form>
    </Modal>
  );
}
