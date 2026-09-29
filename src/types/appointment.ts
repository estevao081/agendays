export type AppointmentStatus = 'agendado' | 'confirmado' | 'concluido' | 'cancelado';

export interface Appointment {
  id: string;
  providerId: string;
  serviceId: string;
  clientName: string;
  /** formato "yyyy-MM-dd" */
  date: string;
  /** formato "HH:mm" */
  time: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AppointmentInput {
  providerId: string;
  serviceId: string;
  clientName: string;
  date: string;
  time: string;
}
