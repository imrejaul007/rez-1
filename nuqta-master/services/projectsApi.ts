// Projects API Service
// Handles project tracking, collaboration, and management

import apiClient, { ApiResponse } from './apiClient';

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    username: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled';
  visibility: 'public' | 'private' | 'team';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: {
    percentage: number;
    tasksTotal: number;
    tasksCompleted: number;
    milestonesTotal: number;
    milestonesCompleted: number;
  };
  dates: {
    startDate: string;
    endDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    deadline?: string;
  };
  team: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
      email: string;
    };
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: string;
    permissions: string[];
  }>;
  tags: string[];
  budget?: {
    allocated: number;
    spent: number;
    currency: string;
  };
  metrics: {
    totalHours: number;
    estimatedHours: number;
    efficiency: number;
  };
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  relatedProducts?: Array<{
    id: string;
    name: string;
    price: number;
    thumbnail: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  completedAt?: string;
  dependencies: string[]; // task IDs
  tags: string[];
  checklist: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  comments: Array<{
    id: string;
    content: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate: string;
  completedAt?: string;
  progress: number;
  tasks: string[]; // task IDs
  deliverables: Array<{
    name: string;
    description?: string;
    completed: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsQuery {
  page?: number;
  limit?: number;
  status?: Project['status'];
  priority?: Project['priority'];
  category?: string;
  owner?: string;
  member?: string;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'deadline' | 'progress' | 'title' | 'priority';
  order?: 'asc' | 'desc';
  visibility?: Project['visibility'];
}

export interface ProjectsResponse {
  projects: Project[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  summary: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
  };
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  categoryId: string;
  visibility: Project['visibility'];
  priority?: Project['priority'];
  startDate: string;
  endDate?: string;
  deadline?: string;
  budget?: {
    allocated: number;
    currency: string;
  };
  tags: string[];
  teamMembers?: Array<{
    userId: string;
    role: 'admin' | 'member' | 'viewer';
  }>;
}

export interface ProjectAnalytics {
  overview: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    overallProgress: number;
    totalBudget: number;
    spentBudget: number;
  };
  productivity: {
    tasksPerDay: Array<{ date: string; count: number }>;
    hoursLogged: Array<{ date: string; hours: number }>;
    efficiency: number;
    burndownChart: Array<{ date: string; remaining: number }>;
  };
  team: {
    memberContribution: Array<{
      userId: string;
      userName: string;
      tasksCompleted: number;
      hoursLogged: number;
      efficiency: number;
    }>;
    collaborationMetrics: {
      communicationFrequency: number;
      responseTime: number;
    };
  };
}

class ProjectsService {
  // Get projects with filtering and pagination
  async getProjects(query: ProjectsQuery = {}): Promise<ApiResponse<ProjectsResponse>> {
    const r: any = await apiClient.get('/projects', query);
    return r?.data ?? r;
  }

  // Get single project by ID
  async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
    const r: any = await apiClient.get(`/projects/${projectId}`);
    return r?.data ?? r;
  }

  // Create new project
  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return apiClient.post('/projects', data);
  }

  // Update project
  async updateProject(
    projectId: string,
    updates: Partial<CreateProjectRequest>
  ): Promise<ApiResponse<Project>> {
    return apiClient.patch(`/projects/${projectId}`, updates);
  }

  // Delete project
  async deleteProject(projectId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/projects/${projectId}`);
  }

  // Update project status
  async updateProjectStatus(
    projectId: string,
    status: Project['status']
  ): Promise<ApiResponse<Project>> {
    return apiClient.patch(`/projects/${projectId}/status`, { status });
  }

  // Get project tasks
  async getProjectTasks(
    projectId: string,
    query: {
      status?: ProjectTask['status'];
      assignee?: string;
      priority?: ProjectTask['priority'];
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<{
    tasks: ProjectTask[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get(`/projects/${projectId}/tasks`, query);
  }

  // Create project task
  async createTask(
    projectId: string,
    task: {
      title: string;
      description?: string;
      priority?: ProjectTask['priority'];
      assigneeId?: string;
      estimatedHours?: number;
      dueDate?: string;
      tags?: string[];
      dependencies?: string[];
    }
  ): Promise<ApiResponse<ProjectTask>> {
    return apiClient.post(`/projects/${projectId}/tasks`, task);
  }

  // Update task
  async updateTask(
    taskId: string,
    updates: Partial<{
      title: string;
      description: string;
      status: ProjectTask['status'];
      priority: ProjectTask['priority'];
      assigneeId: string;
      estimatedHours: number;
      actualHours: number;
      dueDate: string;
    }>
  ): Promise<ApiResponse<ProjectTask>> {
    return apiClient.patch(`/tasks/${taskId}`, updates);
  }

  // Delete task
  async deleteTask(taskId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/tasks/${taskId}`);
  }

  // Add task comment
  async addTaskComment(
    taskId: string,
    content: string
  ): Promise<ApiResponse<ProjectTask['comments'][0]>> {
    return apiClient.post(`/tasks/${taskId}/comments`, { content });
  }

  // Log time to task
  async logTime(
    taskId: string,
    hours: number,
    description?: string,
    date?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/tasks/${taskId}/time`, {
      hours,
      description,
      date
    });
  }

  // Get project milestones
  async getProjectMilestones(
    projectId: string
  ): Promise<ApiResponse<ProjectMilestone[]>> {
    return apiClient.get(`/projects/${projectId}/milestones`);
  }

  // Create project milestone
  async createMilestone(
    projectId: string,
    milestone: {
      title: string;
      description?: string;
      dueDate: string;
      taskIds?: string[];
      deliverables?: Array<{ name: string; description?: string }>;
    }
  ): Promise<ApiResponse<ProjectMilestone>> {
    return apiClient.post(`/projects/${projectId}/milestones`, milestone);
  }

  // Update milestone
  async updateMilestone(
    milestoneId: string,
    updates: Partial<{
      title: string;
      description: string;
      dueDate: string;
      status: ProjectMilestone['status'];
    }>
  ): Promise<ApiResponse<ProjectMilestone>> {
    return apiClient.patch(`/milestones/${milestoneId}`, updates);
  }

  // Add team member to project
  async addTeamMember(
    projectId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/projects/${projectId}/team`, {
      userId,
      role
    });
  }

  // Remove team member from project
  async removeTeamMember(
    projectId: string,
    userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/projects/${projectId}/team/${userId}`);
  }

  // Update team member role
  async updateTeamMemberRole(
    projectId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.patch(`/projects/${projectId}/team/${userId}`, {
      role
    });
  }

  // Upload project attachment
  async uploadAttachment(
    projectId: string,
    file: File,
    description?: string
  ): Promise<ApiResponse<Project['attachments'][0]>> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    return apiClient.uploadFile(`/projects/${projectId}/attachments`, formData);
  }

  // Delete project attachment
  async deleteAttachment(
    attachmentId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/attachments/${attachmentId}`);
  }

  // Get project analytics
  async getProjectAnalytics(
    projectId: string,
    dateRange?: {
      from: string;
      to: string;
    }
  ): Promise<ApiResponse<ProjectAnalytics>> {
    return apiClient.get(`/projects/${projectId}/analytics`, dateRange);
  }

  // Get project categories
  async getProjectCategories(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    projectCount: number;
  }>>> {
    return apiClient.get('/projects/categories');
  }

  // Duplicate project
  async duplicateProject(
    projectId: string,
    newTitle: string,
    includeTeam: boolean = false
  ): Promise<ApiResponse<Project>> {
    return apiClient.post(`/projects/${projectId}/duplicate`, {
      title: newTitle,
      includeTeam
    });
  }

  // Archive project
  async archiveProject(projectId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.patch(`/projects/${projectId}/archive`);
  }

  // Restore archived project
  async restoreProject(projectId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.patch(`/projects/${projectId}/restore`);
  }

  // Get project templates
  async getProjectTemplates(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    tasks: number;
    estimatedDuration: string;
    thumbnail?: string;
  }>>> {
    return apiClient.get('/projects/templates');
  }

  // Create project from template
  async createFromTemplate(
    templateId: string,
    projectData: {
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<Project>> {
    return apiClient.post(`/projects/templates/${templateId}/create`, projectData);
  }

  // Earning flow test compatibility methods (unwrap data for tests)
  async startProject(projectId: string): Promise<ApiResponse<any>> {
    const r: any = await apiClient.post(`/projects/${projectId}/start`, {});
    return r?.data ?? r;
  }
  async submitProject(projectId: string, data: any): Promise<ApiResponse<any>> {
    const r: any = await apiClient.post(`/projects/${projectId}/submit`, data);
    return r?.data ?? r;
  }
  async uploadProjectContent(projectId: string, data: any): Promise<ApiResponse<any>> {
    const r: any = await apiClient.post(`/projects/${projectId}/upload`, data);
    return r?.data ?? r;
  }
  async getSubmissionStatus(submissionId: string): Promise<ApiResponse<any>> {
    const r: any = await apiClient.get(`/projects/submissions/${submissionId}`);
    return r?.data ?? r;
  }
  async connectSocialAccount(data: any): Promise<ApiResponse<any>> {
    const r: any = await apiClient.post(`/projects/connect-social`, data);
    return r?.data ?? r;
  }
  async verifyLocation(data: any): Promise<ApiResponse<any>> {
    const r: any = await apiClient.post(`/projects/verify-location`, data);
    return r?.data ?? r;
  }
  async getReferralCode(): Promise<ApiResponse<any>> {
    const r: any = await apiClient.get(`/projects/referral-code`);
    return r?.data ?? r;
  }
}

// Import real API
import realProjectsApi from './realProjectsApi';

// Feature toggle: use real API or mock API
const USE_REAL_API = process.env.EXPO_PUBLIC_MOCK_API !== 'true';

// Create singleton instance
const projectsService = new ProjectsService();

// Export real API if enabled, otherwise mock
export default USE_REAL_API ? realProjectsApi : projectsService;

// Named export for tests
export { projectsService as projectsApi };