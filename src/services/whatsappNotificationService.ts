import type { Appointment } from '../types';
import { notificationService } from './notificationService';
import { formatDateBR } from '../utils/formatters';

export interface WhatsAppNotificationPayload {
  appointment: Appointment;
  providerWhatsapp: string;
  serviceName: string;
}

export interface WhatsAppNotificationResult {
  sent: boolean;
  simulatedMessage: string;
}

/**
 * Camada isolada de notificação. Hoje apenas simula visualmente o envio
 * (sem chamada externa): registra uma notificação interna para o prestador
 * (visível no sino do dashboard, via `notificationService`) e devolve a
 * mensagem que "seria" enviada ao WhatsApp do prestador.
 *
 * No futuro, o corpo desta função pode ser substituído por uma chamada real
 * a uma API de WhatsApp (ex.: Meta Cloud API / Twilio), sem que os
 * componentes que a consomem precisem ser alterados — a assinatura
 * (Promise<WhatsAppNotificationResult>) permanece a mesma.
 */
export const whatsappNotificationService = {
  async simulateNotification(
    payload: WhatsAppNotificationPayload
  ): Promise<WhatsAppNotificationResult> {
    const { appointment, serviceName } = payload;
    const message = `Novo agendamento\nCliente: ${appointment.clientName}\nServiço: ${serviceName}\nData: ${formatDateBR(appointment.date)}\nHorário: ${appointment.time}`;

    // simula latência de envio
    await new Promise((resolve) => setTimeout(resolve, 700));

    // registra a notificação visual para o prestador (sino do dashboard)
    notificationService.create({
      providerId: appointment.providerId,
      clientName: appointment.clientName,
      serviceName,
      date: appointment.date,
      time: appointment.time,
    });

    return {
      sent: true,
      simulatedMessage: message,
    };
  },
};
