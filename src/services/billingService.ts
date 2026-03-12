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

export const billingService = {
  async checkoutCourse(courseId: string): Promise<CheckoutResponse> {
    const { data } = await apiClient.post<CheckoutResponse>(`/billing/checkout/${courseId}/`);
    return data;
  },
};
