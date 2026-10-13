export interface Appointment {
  id: string;
  providerId: string;
  serviceId: string;
  clientName: string;
  /** formato "yyyy-MM-dd" */
  date: string;
  /** formato "HH:mm" */
  time: string;
  /** preço do serviço no momento do agendamento (não muda se o serviço for editado depois) */
  price: number;
  /** nome do serviço no momento do agendamento (o serviço pode ser excluído depois) */
  serviceName: string;
  createdAt: string;
}

export interface AppointmentInput {
  providerId: string;
  serviceId: string;
  clientName: string;
  date: string;
  time: string;
}
