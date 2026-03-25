import { apiClient } from './apiClient';

export interface CheckoutResponse {
  checkout_url?: string;
  transaction?: {
    id: string;
    amount_paid: string;
    platform_fee: string;
    instructor_earning: string;
    status: string;
  };
}

export interface InstructorEarningsSummary {
  total_earned?: string | null;
  total_revenue?: string | null;
  total_platform_fee?: string | null;
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
  async checkoutCourse(courseId: string): Promise<CheckoutResponse> {
    const { data } = await apiClient.post<CheckoutResponse>(`/billing/checkout/${courseId}/`);
    return data;
  },
  async getInstructorEarnings(): Promise<InstructorEarningsResponse> {
    const { data } = await apiClient.get<InstructorEarningsResponse>('/billing/instructor/earnings/');
    return data;
  },
};
