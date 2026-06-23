/**
 * Recharge API service
 */

import apiClient from './apiClient';

export interface Operator {
  _id: string;
  name: string;
  code: string;
  type: string;
  logo: string;
  color: string;
  countryCode?: string;
  currency?: string;
  region?: string;
}

export interface Plan {
  _id: string;
  name: string;
  amount: number;
  validity: string;
  data?: string;
  calls?: string;
  sms?: string;
  cashbackPercent: number;
  popular: boolean;
}

export interface RechargeResult {
  transactionId: string;
  operatorName: string;
  operatorCode: string;
  phoneNumber: string;
  amount: number;
  cashbackPercent: number;
  status: string;
}

export async function getOperators(type: string = 'mobile', limit: number = 20) {
  return apiClient.get<Operator[]>(`/recharge/operators?type=${type}&limit=${limit}`);
}

export async function getPlans(operatorCode: string, page: number = 1, limit: number = 10, sort: string = 'amount') {
  return apiClient.get<Plan[]>(
    `/recharge/operators/${operatorCode}/plans?sort=${sort}&page=${page}&limit=${limit}`
  );
}

export async function initiateRecharge(operatorCode: string, amount: number, phoneNumber: string, planId?: string) {
  return apiClient.post<RechargeResult>('/recharge', {
    operatorCode,
    amount,
    phoneNumber,
    planId,
  });
}
