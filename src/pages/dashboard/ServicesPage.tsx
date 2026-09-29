import { useEffect, useState } from 'react';
import { Plus, Scissors } from 'lucide-react';
import { ServiceFormModal, ServiceRow } from '../../components/dashboard';
import { Button, EmptyState, Modal, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { serviceService } from '../../services/serviceService';
import type { Service, ServiceInput } from '../../types';

export function ServicesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user?.providerId) return;
    serviceService.listByProvider(user.providerId).then((data) => {
      setServices(data);
      setIsLoading(false);
    });
  }, [user?.providerId]);

  function openCreateForm() {
    setEditingService(null);
    setFormOpen(true);
  }

  function openEditForm(service: Service) {
    setEditingService(service);
    setFormOpen(true);
  }

  async function handleSubmit(input: ServiceInput) {
    if (!user?.providerId) return;

    if (editingService) {
      const updated = await serviceService.update(editingService.id, input);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast({ message: 'Serviço atualizado.', variant: 'success' });
    } else {
      const created = await serviceService.create(user.providerId, input);
      setServices((prev) => [...prev, created]);
      showToast({ message: 'Serviço adicionado.', variant: 'success' });
    }
  }

  async function handleToggleActive(service: Service) {
    setTogglingId(service.id);
    try {
      const updated = await serviceService.toggleActive(service.id);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingService) return;
    setIsDeleting(true);
    try {
      await serviceService.remove(deletingService.id);
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
      showToast({ message: 'Serviço excluído.', variant: 'info' });
      setDeletingService(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <Spinner label="Carregando serviços…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-900">Serviços</h2>
          <p className="text-sm text-ink-500">
            {services.length} {services.length === 1 ? 'serviço cadastrado' : 'serviços cadastrados'}
          </p>
        </div>
        <Button onClick={openCreateForm} size="md">
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={<Scissors className="size-8" />}
          title="Nenhum serviço cadastrado"
          description="Adicione o primeiro serviço para começar a receber agendamentos."
          action={
            <Button onClick={openCreateForm} size="sm" className="mt-1">
              <Plus className="size-4" />
              Adicionar serviço
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onEdit={() => openEditForm(service)}
              onDelete={() => setDeletingService(service)}
              onToggleActive={() => handleToggleActive(service)}
              isToggling={togglingId === service.id}
            />
          ))}
        </div>
      )}

      <ServiceFormModal
        key={formOpen ? (editingService?.id ?? 'new') : 'closed'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        editingService={editingService}
      />

      <Modal
        open={!!deletingService}
        onClose={() => setDeletingService(null)}
        title="Excluir serviço"
        description={
          deletingService
            ? `Tem certeza que deseja excluir "${deletingService.name}"? Essa ação não pode ser desfeita.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingService(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-500">
          O serviço deixará de aparecer na sua página pública imediatamente.
        </p>
      </Modal>
    </div>
  );
}
