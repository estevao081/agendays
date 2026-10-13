export interface AuthUser {
  id: string;
  name: string;
  email: string;
  providerId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  /** Nome do estabelecimento (vira parte do link público, junto de um identificador único). */
  businessName: string;
  /** CPF ou CNPJ (numérico ou alfanumérico). Só a impressão digital (hash) é guardada. */
  document: string;
  /** Celular com DDD. Precisa ter sido verificado por código (OTP). */
  whatsapp: string;
  /** Código de indicação de quem apresentou o app (opcional). */
  referralCode?: string;
  email: string;
  password: string;
  confirmPassword: string;
}
