import { apiClient } from './apiClient';

export interface CheckoutResponse {
  checkout_url?: string;
  session_id?: string;
  publishable_key?: string;
  transaction?: {
    id: string;
    amount_paid: string;
    platform_fee: string;
    instructor_earning: string;
    status: string;
  };
}

export interface CheckoutStatusResponse {
  paid: boolean;
  status?: string;
  payment_status?: string;
  enrollment_id?: string;
  transaction?: CheckoutResponse['transaction'] | null;
}

export interface InstructorEarningsSummary {
  total_earned?: string | null;
  total_revenue?: string | null;
  total_platform_fee?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  price_monthly: string;
  features: string[];
  badge: string;
  audience: 'STUDENT' | 'INSTRUCTOR';
  has_unlimited_ai: boolean;
  has_unlimited_streams: boolean;
  ai_monthly_limit: number;
  is_active: boolean;
}

export interface InstructorEarningsResponse {
  summary: InstructorEarningsSummary;
  transactions: Array<{
    id: string;
    amount_paid: string;
    platform_fee: string;
    instructor_earning: string;
    status: string;
    created_at: string;
    course_title?: string;
  }>;
}

export const billingService = {
  async listPlans(): Promise<Plan[]> {
    const { data } = await apiClient.get<Plan[]>('/billing/plans/');
    return data;
  },
  async checkoutCourse(courseId: string): Promise<CheckoutResponse> {
    const { data } = await apiClient.post<CheckoutResponse>(`/billing/checkout/${courseId}/`);
    return data;
  },
  async getCheckoutSessionStatus(sessionId: string): Promise<CheckoutStatusResponse> {
    const { data } = await apiClient.get<CheckoutStatusResponse>('/billing/checkout/session/', {
      params: { session_id: sessionId },
    });
    return data;
  },
  async getInstructorEarnings(): Promise<InstructorEarningsResponse> {
    const { data } = await apiClient.get<InstructorEarningsResponse>('/billing/instructor/earnings/');
    return data;
  },
};
