import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import achievementService from '../services/achievementService';
import gamificationEventBus from '../events/gamificationEventBus';
import { sendCreated } from '../utils/response';
import { escapeRegex } from '../utils/sanitize';
import earningsSocketService from '../services/earningsSocketService';

// Submit a project
export const submitProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { 
    projectId, 
    content, 
    contentType = 'text',
    description,
    metadata 
  } = req.body;

  try {
    logger.info('📋 [PROJECT] Submitting project for user:', userId);

    // Validate required fields
    if (!projectId) {
      return sendBadRequest(res, 'Project ID is required');
    }

    // Content is optional for "start" but required for actual submission
    const isStarting = !content;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return sendNotFound(res, 'Project not found');
    }

    // Check if project is still accepting submissions
    if (project.status !== 'active') {
      return sendBadRequest(res, 'Project is no longer accepting submissions');
    }

    // Check if user has already submitted to this project
    const existingSubmissionIndex = project.submissions.findIndex(
      sub => sub.user.toString() === userId.toString()
    );

    const existingSubmission = existingSubmissionIndex >= 0 
      ? project.submissions[existingSubmissionIndex] 
      : null;

    if (existingSubmission) {
      // If starting and already have a submission, return success (already started)
      if (isStarting) {
        return sendSuccess(res, {
          submission: {
            id: existingSubmission._id,
            projectId: project._id,
            projectTitle: project.title,
            status: existingSubmission.status,
            submittedAt: existingSubmission.submittedAt,
            contentType: existingSubmission.content?.type || 'text'
          }
        }, 'Project already started');
      }

      // Allow updating if submission is pending, under_review, or rejected
      // Block if approved (cannot edit approved submissions)
      if (existingSubmission.status === 'approved') {
        return sendBadRequest(res, 'Your submission has been approved. You cannot edit it.');
      }

      // Update existing submission
      const updatedSubmission = {
        user: new mongoose.Types.ObjectId(userId),
        submittedAt: existingSubmission.submittedAt, // Keep original submission date
        content: {
          type: contentType,
          data: content,
          metadata: metadata || {}
        },
        // If updating a rejected submission, change status to under_review
        // If updating pending/under_review, keep as under_review (since we're submitting with content)
        status: 'under_review' as const,
        paidAmount: 0, // Reset paid amount since it's being resubmitted
        // Clear review fields since it's being resubmitted
        reviewedBy: undefined,
        reviewedAt: undefined,
        reviewComments: undefined,
        qualityScore: undefined,
        rejectionReason: undefined
      };

      // Replace the existing submission
      project.submissions[existingSubmissionIndex] = updatedSubmission as any;
      await project.save();

      logger.info('✅ [PROJECT] Project submission updated successfully');

      // Emit real-time project status update
      try {
        const userIdStr = userId.toString();
        // Get updated project stats for this user
        const projectsWithSubmissions = await Project.find({
          'submissions.user': userId
        }).lean();

        let inReview = 0;
        let completed = 0;

        projectsWithSubmissions.forEach((proj: any) => {
          proj.submissions?.forEach((sub: any) => {
            if (sub.user && sub.user.toString() === userIdStr) {
              if (sub.status === 'pending' || sub.status === 'under_review') {
                inReview++;
              } else if (sub.status === 'approved') {
                completed++;
              }
            }
          });
        });

        const allActiveProjects = await Project.find({
          status: 'active'
        }).lean();

        let completeNow = 0;
        allActiveProjects.forEach((proj: any) => {
          const hasUserSubmission = proj.submissions?.some((sub: any) => 
            sub.user && sub.user.toString() === userIdStr
          );
          if (!hasUserSubmission) {
            completeNow++;
          }
        });

        earningsSocketService.emitProjectStatusUpdate(userIdStr, {
          completeNow,
          inReview,
          completed
        });
      } catch (socketError) {
        logger.error('❌ [PROJECT] Error emitting project status update:', socketError);
      }

      // Get the updated submission with its _id
      const savedSubmission = project.submissions[existingSubmissionIndex];
      
      return sendSuccess(res, {
        submission: {
          id: savedSubmission._id?.toString() || existingSubmission._id?.toString() || userId.toString(),
          projectId: project._id,
          projectTitle: project.title,
          status: updatedSubmission.status,
          submittedAt: updatedSubmission.submittedAt,
          contentType: updatedSubmission.content.type
        }
      }, existingSubmission.status === 'rejected' 
        ? 'Submission updated and resubmitted successfully' 
        : 'Submission updated successfully');
    }

    // Create submission with proper structure
    const submission = {
      user: new mongoose.Types.ObjectId(userId),
      submittedAt: new Date(),
      content: {
        type: contentType,
        data: isStarting ? 'Project started - work in progress' : content,
        metadata: metadata || {}
      },
      // If starting (no content), status is 'pending'. If submitting with content, status is 'under_review'
      status: isStarting ? 'pending' as const : 'under_review' as const,
      paidAmount: 0
    };

        // Add submission to project
        project.submissions.push(submission);
        await project.save();

        logger.info('✅ [PROJECT] Project submission created successfully');

        // Emit real-time project status update
        try {
          const userIdStr = userId.toString();
          // Get updated project stats for this user
          const projectsWithSubmissions = await Project.find({
            'submissions.user': userId
          }).lean();

          let inReview = 0;
          let completed = 0;

          projectsWithSubmissions.forEach((proj: any) => {
            proj.submissions?.forEach((sub: any) => {
              if (sub.user && sub.user.toString() === userIdStr) {
                if (sub.status === 'pending' || sub.status === 'under_review') {
                  inReview++;
                } else if (sub.status === 'approved') {
                  completed++;
                }
              }
            });
          });

          const allActiveProjects = await Project.find({
            status: 'active'
          }).lean();

          let completeNow = 0;
          allActiveProjects.forEach((proj: any) => {
            const hasUserSubmission = proj.submissions?.some((sub: any) => 
              sub.user && sub.user.toString() === userIdStr
            );
            if (!hasUserSubmission) {
              completeNow++;
            }
          });

          earningsSocketService.emitProjectStatusUpdate(userIdStr, {
            completeNow,
            inReview,
            completed
          });
        } catch (error) {
          logger.error('❌ [PROJECT] Error emitting project status update:', error);
        }

    // Emit gamification event for project submission
    gamificationEventBus.emit('project_completed', {
      userId,
      entityId: String(project._id),
      entityType: 'project',
      source: { controller: 'projectController', action: 'submitProject' }
    });

    // Get the created submission with its generated _id
    const createdSubmission = project.submissions[project.submissions.length - 1];

    sendCreated(res, {
      submission: {
        id: createdSubmission._id,
        projectId: project._id,
        projectTitle: project.title,
        status: createdSubmission.status,
        submittedAt: createdSubmission.submittedAt,
        contentType: createdSubmission.content.type
      }
    }, isStarting ? 'Project started successfully' : 'Project submitted successfully');

  } catch (error) {
    logger.error('❌ [PROJECT] Submit project error:', error);
    throw new AppError('Failed to submit project', 500);
  }
});

// Get all projects with filtering
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { 
    category, 
    difficulty, 
    creator, 
    status, 
    search, 
    sortBy = 'newest', 
    page = 1, 
    limit = 20,
    excludeUserSubmissions 
  } = req.query;

  const userId = req.userId; // May be undefined if not authenticated

  try {
    // Default filter - only show active projects
    const query: any = {};

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (creator) query.creator = creator;
    // If status is explicitly provided, use it, otherwise default to 'active'
    query.status = status || 'active';
    if (search) {
      const escaped = escapeRegex(search as string);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } }
      ];
    }

    logger.info('📊 Project Query:', JSON.stringify(query, null, 2));

    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.views'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagement'] = -1;
        break;
      case 'difficulty_easy':
        sortOptions.difficulty = 1;
        break;
      case 'difficulty_hard':
        sortOptions.difficulty = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    logger.info('🔍 Sort Options:', sortOptions);

    const skip = (Number(page) - 1) * Number(limit);
    logger.info(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);

    logger.info('🔎 Fetching projects from database...');
    let projects = await Project.find(query)
      .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
      .populate('sponsor', 'name logo')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Filter out projects where user has a submission with status 'pending' or 'under_review'
    // (if excludeUserSubmissions is true and user is authenticated)
    // Handle query parameter which can be string, boolean, or array
    const excludeUserSubmissionsValue = Array.isArray(excludeUserSubmissions) 
      ? excludeUserSubmissions[0] 
      : excludeUserSubmissions;
    // Convert to string for comparison (query params are always strings)
    const excludeUserSubmissionsStr = String(excludeUserSubmissionsValue || '');
    const shouldExclude = excludeUserSubmissionsStr === 'true' || excludeUserSubmissionsStr === '1';
    logger.info(`🔍 [PROJECTS] Filtering check: excludeUserSubmissions=${excludeUserSubmissionsStr}, userId=${userId}, shouldExclude=${shouldExclude}`);
    
    if (shouldExclude && userId) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const initialCount = projects.length;
      
      projects = projects.filter((project: any) => {
        if (!project.submissions || !Array.isArray(project.submissions)) {
          return true; // Show projects without submissions
        }
        
        // Check if user has a submission with status 'pending' or 'under_review'
        const hasPendingOrUnderReviewSubmission = project.submissions.some((sub: any) => {
          // Handle both ObjectId and string formats
          const subUserId = sub.user?.toString ? sub.user.toString() : String(sub.user);
          const subStatus = sub.status;
          const userObjectIdStr = userObjectId.toString();
          const matches = subUserId === userObjectIdStr && 
                         (subStatus === 'pending' || subStatus === 'under_review');
          
          if (matches) {
            logger.info(`🚫 [PROJECTS] Filtering out project ${project._id}: user ${userObjectIdStr} has ${subStatus} submission (sub.user: ${subUserId})`);
          } else if (subUserId === userObjectIdStr) {
            logger.info(`ℹ️ [PROJECTS] Project ${project._id}: user ${userObjectIdStr} has submission with status ${subStatus} (not filtering)`);
          }
          
          return matches;
        });
        
        // Filter out if user has a pending or under_review submission
        return !hasPendingOrUnderReviewSubmission;
      });
      
      const filteredCount = initialCount - projects.length;
      logger.info(`✅ [PROJECTS] Filtered ${filteredCount} projects. Showing ${projects.length} projects (excluded projects with pending/under_review submissions)`);
    } else {
      if (!shouldExclude) {
        logger.info(`ℹ️ [PROJECTS] excludeUserSubmissions is false, showing all ${projects.length} projects`);
      } else if (!userId) {
        logger.info(`ℹ️ [PROJECTS] No userId available, showing all ${projects.length} projects`);
      }
    }

    const total = await Project.countDocuments(query);
    logger.info(`📊 Total projects in DB matching query: ${total}`);

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      projects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Projects retrieved successfully');

  } catch (error) {
    logger.error('❌ Error fetching projects:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch projects', 500);
  }
});

// Get single project by ID
export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    // Fetch project document (not lean) to update analytics
    const projectDoc = await Project.findById(projectId)
      .populate('createdBy', 'profile.firstName profile.lastName profile.avatar profile.bio')
      .populate('sponsor', 'name logo slug');

    if (!projectDoc) {
      return sendNotFound(res, 'Project not found');
    }

    // Update analytics to ensure they're accurate (recalculate from actual submissions)
    await projectDoc.updateAnalytics();
    
    // Increment view count
    projectDoc.analytics.totalViews += 1;
    await projectDoc.save();

    // Convert to plain object for response
    const project = projectDoc.toObject();

    // Get similar projects
    const similarProjects = await Project.find({
      category: project.category,
      _id: { $ne: projectId },
      status: 'active'
    })
    .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
    .limit(6)
    .sort({ createdAt: -1 })
    .lean();

    sendSuccess(res, {
      project,
      similarProjects
    }, 'Project retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [PROJECT] Error fetching project by ID:', error);
    throw new AppError(
      error?.message || 'Failed to fetch project',
      error?.statusCode || 500
    );
  }
});

// Get projects by category
export const getProjectsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const query = { category, status: 'active' };
    const skip = (Number(page) - 1) * Number(limit);

    const projects = await Project.find(query)
      .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Project.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      projects,
      category,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Projects in category "${category}" retrieved successfully`);

  } catch (error) {
    throw new AppError('Failed to fetch projects by category', 500);
  }
});

// Get featured projects
export const getFeaturedProjects = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    const projects = await Project.find({ 
      status: 'active', 
      'metadata.featured': true 
    })
    .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
    .populate('products', 'name basePrice images')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

    sendSuccess(res, projects, 'Featured projects retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured projects', 500);
  }
});

// Like/Unlike project
export const toggleProjectLike = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check if user already liked this project
    const alreadyLiked = await Project.exists({ _id: projectId, likedBy: userObjectId });
    let updatedProject;

    if (alreadyLiked) {
      // Unlike: atomic pull + decrement
      updatedProject = await Project.findByIdAndUpdate(
        projectId,
        {
          $pull: { likedBy: userObjectId },
          $inc: { 'analytics.likes': -1 }
        },
        { new: true }
      );
    } else {
      // Like: atomic addToSet + increment
      updatedProject = await Project.findByIdAndUpdate(
        projectId,
        {
          $addToSet: { likedBy: userObjectId },
          $inc: { 'analytics.likes': 1 }
        },
        { new: true }
      );
    }

    if (!updatedProject) {
      return sendNotFound(res, 'Project not found');
    }

    // Fix engagement count and prevent negative likes
    const safeLikes = Math.max(0, updatedProject.analytics.likes);
    if (updatedProject.analytics.likes !== safeLikes || updatedProject.analytics.engagement !== safeLikes + updatedProject.analytics.comments) {
      await Project.findByIdAndUpdate(projectId, {
        $set: {
          'analytics.likes': safeLikes,
          'analytics.engagement': safeLikes + updatedProject.analytics.comments
        }
      });
    }

    const isLiked = !alreadyLiked;

    sendSuccess(res, {
      projectId: updatedProject._id,
      isLiked,
      totalLikes: safeLikes
    }, isLiked ? 'Project liked successfully' : 'Project unliked successfully');

  } catch (error) {
    throw new AppError('Failed to toggle project like', 500);
  }
});

// Add comment to project
export const addProjectComment = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { comment } = req.body;
  const userId = req.userId!;

  try {
    const project = await Project.findById(projectId);
    
    if (!project) {
      return sendNotFound(res, 'Project not found');
    }

    project.comments.push({
      user: new mongoose.Types.ObjectId(userId),
      content: comment,
      timestamp: new Date()
    });

    project.analytics.comments += 1;
    project.analytics.engagement = project.analytics.likes + project.analytics.comments;

    await project.save();

    const populatedProject = await Project.findById(projectId)
      .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
      .select('comments')
      .lean();

    const addedComment = (populatedProject as any).comments[(populatedProject as any).comments.length - 1];

    sendSuccess(res, {
      comment: addedComment,
      totalComments: project.analytics.comments
    }, 'Comment added successfully', 201);

  } catch (error) {
    throw new AppError('Failed to add comment', 500);
  }
});

// Get earning project categories with stats
export const getEarningCategories = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.userId || null;
    
    // Define all available categories with metadata
    const categoryDefinitions = [
      {
        name: 'Review',
        slug: 'review',
        description: 'Product and service review projects',
        icon: 'star',
        color: '#F59E0B',
        category: 'review'
      },
      {
        name: 'Social Share',
        slug: 'social_share',
        description: 'Social media sharing projects',
        icon: 'share-social',
        color: '#3B82F6',
        category: 'social_share'
      },
      {
        name: 'UGC Content',
        slug: 'ugc_content',
        description: 'User-generated content creation',
        icon: 'videocam',
        color: '#EC4899',
        category: 'ugc_content'
      },
      {
        name: 'Store Visit',
        slug: 'store_visit',
        description: 'Physical store visit projects',
        icon: 'storefront',
        color: '#10B981',
        category: 'store_visit'
      },
      {
        name: 'Survey',
        slug: 'survey',
        description: 'Survey and feedback projects',
        icon: 'clipboard',
        color: '#8B5CF6',
        category: 'survey'
      },
      {
        name: 'Photo',
        slug: 'photo',
        description: 'Photo capture projects',
        icon: 'camera',
        color: '#F59E0B',
        category: 'photo'
      },
      {
        name: 'Video',
        slug: 'video',
        description: 'Video creation projects',
        icon: 'film',
        color: '#EF4444',
        category: 'video'
      },
      {
        name: 'Data Collection',
        slug: 'data_collection',
        description: 'Data collection projects',
        icon: 'document-text',
        color: '#6366F1',
        category: 'data_collection'
      },
      {
        name: 'Mystery Shopping',
        slug: 'mystery_shopping',
        description: 'Mystery shopping projects',
        icon: 'eye',
        color: '#14B8A6',
        category: 'mystery_shopping'
      },
      {
        name: 'Referral',
        slug: 'referral',
        description: 'Referral program projects',
        icon: 'people',
        color: '#8B5CF6',
        category: 'referral'
      }
    ];

    // Get stats for each category
    const categoriesWithStats = await Promise.all(
      categoryDefinitions.map(async (catDef) => {
        // Count active projects in this category
        const projectCount = await Project.countDocuments({
          category: catDef.category,
          status: 'active'
        });

        // Calculate average payment for this category
        const projects = await Project.find({
          category: catDef.category,
          status: 'active'
        })
          .select('reward.amount')
          .lean();

        const totalPayment = projects.reduce((sum, p: any) => {
          return sum + (p.reward?.amount || 0);
        }, 0);

        const averagePayment = projectCount > 0 ? Math.round(totalPayment / projectCount) : 0;

        // Check if user has submissions in this category
        let userProjectCount = 0;
        if (userId) {
          userProjectCount = await Project.countDocuments({
            category: catDef.category,
            'submissions.user': userId
          });
        }

        return {
          _id: catDef.slug,
          name: catDef.name,
          slug: catDef.slug,
          description: catDef.description,
          icon: catDef.icon,
          color: catDef.color,
          projectCount,
          averagePayment,
          userProjectCount,
          isActive: projectCount > 0
        };
      })
    );

    // Filter out categories with no projects (optional - you can keep them if needed)
    const activeCategories = categoriesWithStats.filter(cat => cat.isActive);

    sendSuccess(res, activeCategories, 'Earning categories retrieved successfully');

  } catch (error) {
    logger.error('❌ [PROJECT] Error getting earning categories:', error);
    throw new AppError('Failed to fetch earning categories', 500);
  }
});

// Get user's project submissions
export const getMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, sortBy = 'newest', page = 1, limit = 20 } = req.query;

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all projects that have submissions from this user
    const projectsWithSubmissions = await Project.find({
      'submissions.user': userObjectId
    })
    .populate('sponsor', 'name logo')
    .lean();

    // Extract user's submissions from all projects
    let allSubmissions: any[] = [];

    for (const project of projectsWithSubmissions) {
      const userSubs = (project as any).submissions.filter((sub: any) =>
        sub.user.toString() === userObjectId.toString()
      );

      // Enrich submissions with project info
      userSubs.forEach((sub: any) => {
        allSubmissions.push({
          _id: sub._id || `${project._id}_${sub.submittedAt}`,
          project: {
            _id: project._id,
            title: project.title,
            description: project.description,
            category: project.category,
            reward: project.reward
          },
          user: sub.user,
          submittedAt: sub.submittedAt,
          content: sub.content,
          status: sub.status,
          qualityScore: sub.qualityScore,
          paidAmount: sub.paidAmount,
          paidAt: sub.paidAt,
          feedback: sub.feedback
        });
      });
    }

    // Filter by status if provided
    // If status is 'pending', include both 'pending' and 'under_review' submissions
    if (status) {
      if (status === 'pending') {
        allSubmissions = allSubmissions.filter(sub => 
          sub.status === 'pending' || sub.status === 'under_review'
        );
      } else {
        allSubmissions = allSubmissions.filter(sub => sub.status === status);
      }
    }

    // Sort based on sortBy parameter
    switch (sortBy) {
      case 'oldest':
        allSubmissions.sort((a, b) =>
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        );
        break;
      case 'status':
        // Sort by status: pending first, then approved, then rejected
        const statusOrder: { [key: string]: number } = { pending: 0, approved: 1, rejected: 2 };
        allSubmissions.sort((a, b) => {
          const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          if (statusDiff !== 0) return statusDiff;
          // If same status, sort by date (newest first)
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });
        break;
      case 'newest':
      default:
        // Sort by submission date (newest first)
        allSubmissions.sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        break;
    }

    // Pagination
    const total = allSubmissions.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedSubmissions = allSubmissions.slice(skip, skip + Number(limit));
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      submissions: paginatedSubmissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'User submissions retrieved successfully');

  } catch (error) {
    logger.error('Error fetching user submissions:', error);
    throw new AppError('Failed to fetch user submissions', 500);
  }
});