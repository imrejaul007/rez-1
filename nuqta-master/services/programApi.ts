// Program API Service
// Handles all program-related API calls (College Ambassador, Corporate, Social Impact)

import apiClient from './apiClient';

export interface ProgramTask {
  _id: string;
  title: string;
  description: string;
  type: 'share' | 'review' | 'referral' | 'purchase' | 'attend' | 'create_content' | 'volunteer';
  coins: number;
  deadline?: string;
  requirements: string[];
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submissionUrl?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface Program {
  _id: string;
  name: string;
  type: 'college_ambassador' | 'corporate_employee' | 'social_impact';
  description: string;
  status: 'active' | 'inactive' | 'upcoming' | 'completed';
  startDate: string;
  endDate?: string;
  requirements: string[];
  benefits: string[];
  tasks: Array<{
    title: string;
    description: string;
    type: string;
    coins: number;
    deadline?: string;
    requirements: string[];
  }>;
  maxParticipants?: number;
  totalBudget: number;
  image?: string;
  featured: boolean;
}

export interface UserProgram {
  _id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  image?: string;
  participantStatus: string;
  completedTasks: number;
  totalTasks: number;
  coinsEarned: number;
}

export interface UserProgramTasks {
  participantStatus: string;
  completedTasks: number;
  totalCoinsEarned: number;
  tasks: ProgramTask[];
}

class ProgramApi {
  // ======== COLLEGE AMBASSADOR ========
  async getCollegePrograms() {
    return apiClient.get<Program[]>('/programs/college');
  }

  async joinCollegeProgram(programId: string, collegeName: string, collegeId: string) {
    return apiClient.post<void>('/programs/college/join', {
      programId,
      collegeName,
      collegeId
    });
  }

  async submitCollegeTask(programId: string, taskId: string, submissionUrl: string) {
    return apiClient.post<void>('/programs/college/submit', {
      programId,
      taskId,
      submissionUrl
    });
  }

  // ======== CORPORATE EMPLOYEE ========
  async getCorporatePrograms() {
    return apiClient.get<Program[]>('/programs/corporate');
  }

  async joinCorporateProgram(programId: string, companyName: string, employeeId: string) {
    return apiClient.post<void>('/programs/corporate/join', {
      programId,
      companyName,
      employeeId
    });
  }

  // ======== SOCIAL IMPACT ========
  async getSocialImpactEvents() {
    return apiClient.get<Program[]>('/programs/social-impact');
  }

  async getSocialImpactEventById(eventId: string) {
    return apiClient.get<Program>(`/programs/social-impact/${eventId}`);
  }

  async registerForSocialImpact(programId: string) {
    return apiClient.post<void>('/programs/social-impact/register', { programId });
  }

  // ======== GENERAL ========
  async getMyPrograms() {
    return apiClient.get<UserProgram[]>('/programs/my-programs');
  }

  async getProgramById(programId: string) {
    return apiClient.get<Program>(`/programs/${programId}`);
  }

  async getMyProgramTasks(programId: string) {
    return apiClient.get<UserProgramTasks>(`/programs/${programId}/tasks`);
  }
}

export default new ProgramApi();
