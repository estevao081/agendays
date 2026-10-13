import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';
import { appointmentService } from '../../services/appointmentService';
import { formatCurrencyBRL, formatDateBR } from '../../utils/formatters';
import type { Appointment } from '../../types';

interface DeleteAppointmentDialogProps {
  appointment: Appointment | null;
  onClose: () => void;
  /** chamado depois de excluir, para a tela recarregar a lista */
  onDeleted?: () => void;
}

/** Confirmação para excluir um agendamento (cliente avisou que não vai e não quer remarcar). */
export function DeleteAppointmentDialog({ appointment, onClose, onDeleted }: DeleteAppointmentDialogProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!appointment) return;
    setIsDeleting(true);
    try {
      await appointmentService.remove(appointment.id);
      showToast({ message: 'Agendamento excluído.', description: 'O horário voltou a ficar disponível.', variant: 'success' });
      onDeleted?.();
      onClose();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Não foi possível excluir.', variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      open={!!appointment}
      onClose={onClose}
      title="Excluir agendamento"
      description={
        appointment
          ? `${appointment.clientName} — ${appointment.serviceName}, ${formatDateBR(appointment.date)} às ${appointment.time}.`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isDeleting}>
            Excluir agendamento
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-500">
        Use quando o cliente avisar que não poderá comparecer e não quiser remarcar. O horário fica livre para outros
        clientes{appointment ? ` e o valor de ${formatCurrencyBRL(appointment.price)} deixa de entrar nos seus ganhos` : ''}.
        Essa ação não pode ser desfeita.
      </p>
    </Modal>
  );
}
