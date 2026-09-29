export interface AppNotification {
  id: string;
  providerId: string;
  clientName: string;
  serviceName: string;
  /** formato "yyyy-MM-dd" */
  date: string;
  /** formato "HH:mm" */
  time: string;
  createdAt: string;
  read: boolean;
}
