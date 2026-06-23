import Program, { IProgram } from '../models/Program';
import mongoose from 'mongoose';
import { awardCoins } from './coinService';
import type { Lean } from '../types/lean';
class ProgramService {
  // Get programs by type
  async getProgramsByType(
    type: 'college_ambassador' | 'corporate_employee' | 'social_impact'
  ): Promise<Lean<IProgram>[]> {
    return Program.find({
      type,
      status: { $in: ['active', 'upcoming'] }
    })
      .select('-participants')
      .sort({ featured: -1, startDate: 1 })
      .lean()
      .exec();
  }
  // Get program details
  async getProgramById(programId: string): Promise<Lean<IProgram> | null> {
    return Program.findById(programId)
      .populate('participants.user', 'name avatar email')
      .lean()
      .exec();
  }
  // Join college ambassador program
  async joinCollegeProgram(
    programId: string,
    userId: string,
    collegeName: string,
    collegeId: string
  ): Promise<void> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    if (program.type !== 'college_ambassador') {
      throw new Error('Invalid program type');
    }
    if (program.status !== 'active') {
      throw new Error('Program is not accepting applications');
    }
    // Check if already joined
    const existing = program.participants.find(
      p => p.user.toString() === userId
    );
    if (existing) {
      throw new Error('Already applied to this program');
    }
    // Check max participants
    if (program.maxParticipants && program.participants.length >= program.maxParticipants) {
      throw new Error('Program is full');
    }
    // Add participant with college info
    program.participants.push({
      user: new mongoose.Types.ObjectId(userId),
      status: 'pending',
      joinedAt: new Date(),
      completedTasks: 0,
      totalCoinsEarned: 0,
      tasks: program.tasks.map(t => ({
        title: t.title,
        description: t.description,
        type: t.type as any,
        coins: t.coins,
        deadline: t.deadline,
        requirements: t.requirements,
        status: 'pending' as const
      })),
      metadata: {
        collegeName,
        collegeId,
        verificationStatus: 'pending'
      }
    });
    await program.save();
  }
  // Join corporate program
  async joinCorporateProgram(
    programId: string,
    userId: string,
    companyName: string,
    employeeId: string
  ): Promise<void> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    if (program.type !== 'corporate_employee') {
      throw new Error('Invalid program type');
    }
    if (program.status !== 'active') {
      throw new Error('Program is not accepting applications');
    }
    const existing = program.participants.find(
      p => p.user.toString() === userId
    );
    if (existing) {
      throw new Error('Already applied to this program');
    }
    program.participants.push({
      user: new mongoose.Types.ObjectId(userId),
      status: 'pending',
      joinedAt: new Date(),
      completedTasks: 0,
      totalCoinsEarned: 0,
      tasks: program.tasks.map(t => ({
        title: t.title,
        description: t.description,
        type: t.type as any,
        coins: t.coins,
        deadline: t.deadline,
        requirements: t.requirements,
        status: 'pending' as const
      })),
      metadata: {
        companyName,
        employeeId,
        verificationStatus: 'pending'
      }
    });
    await program.save();
  }
  // Register for social impact event
  async registerForSocialImpact(programId: string, userId: string): Promise<void> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    if (program.type !== 'social_impact') {
      throw new Error('Invalid program type');
    }
    if (program.status !== 'active' && program.status !== 'upcoming') {
      throw new Error('Event is not accepting registrations');
    }
    const existing = program.participants.find(
      p => p.user.toString() === userId
    );
    if (existing) {
      throw new Error('Already registered for this event');
    }
    if (program.maxParticipants && program.participants.length >= program.maxParticipants) {
      throw new Error('Event is full');
    }
    program.participants.push({
      user: new mongoose.Types.ObjectId(userId),
      status: 'approved', // Auto-approve for social impact events
      joinedAt: new Date(),
      approvedAt: new Date(),
      completedTasks: 0,
      totalCoinsEarned: 0,
      tasks: program.tasks.map(t => ({
        title: t.title,
        description: t.description,
        type: t.type as any,
        coins: t.coins,
        deadline: t.deadline,
        requirements: t.requirements,
        status: 'pending' as const
      }))
    });
    await program.save();
  }
  // Submit task proof
  async submitTaskProof(
    programId: string,
    userId: string,
    taskId: string,
    submissionUrl: string
  ): Promise<void> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    const participant = program.participants.find(
      p => p.user.toString() === userId
    );
    if (!participant) {
      throw new Error('Not a participant in this program');
    }
    if (participant.status !== 'active' && participant.status !== 'approved') {
      throw new Error('Your participation is not active');
    }
    const task = participant.tasks.find(t => t._id?.toString() === taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.status === 'approved') {
      throw new Error('Task already completed');
    }
    if (task.deadline && new Date() > task.deadline) {
      throw new Error('Task deadline has passed');
    }
    task.status = 'submitted';
    task.submissionUrl = submissionUrl;
    task.submittedAt = new Date();
    await program.save();
  }
  // Get user's programs
  async getUserPrograms(userId: string): Promise<any[]> {
    const programs = await Program.find({
      'participants.user': userId
    }).select('name type status startDate endDate image participants')
      .lean().exec();
    return programs.map((p: any) => {
      const participant = p.participants.find(
        (pp: any) => pp.user.toString() === userId
      );
      return {
        _id: p._id,
        name: p.name,
        type: p.type,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        image: p.image,
        participantStatus: participant?.status,
        completedTasks: participant?.completedTasks || 0,
        totalTasks: participant?.tasks.length || 0,
        coinsEarned: participant?.totalCoinsEarned || 0
      };
    });
  }
  // Get user's tasks in a program
  async getUserProgramTasks(programId: string, userId: string): Promise<any> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    const participant = program.participants.find(
      p => p.user.toString() === userId
    );
    if (!participant) {
      throw new Error('Not a participant in this program');
    }
    return {
      participantStatus: participant.status,
      completedTasks: participant.completedTasks,
      totalCoinsEarned: participant.totalCoinsEarned,
      tasks: participant.tasks
    };
  }
  // Get social impact events
  async getSocialImpactEvents(): Promise<Lean<IProgram>[]> {
    return Program.find({
      type: 'social_impact',
      status: { $in: ['active', 'upcoming'] }
    })
      .select('-participants')
      .sort({ startDate: 1 })
      .lean()
      .exec();
  }
  // Get social impact event details
  async getSocialImpactEventById(eventId: string): Promise<Lean<IProgram> | null> {
    return Program.findOne({
      _id: eventId,
      type: 'social_impact'
    })
      .populate('participants.user', 'name avatar')
      .lean()
      .exec();
  }
  // Admin: Approve participant
  async approveParticipant(programId: string, participantUserId: string): Promise<void> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    const participant = program.participants.find(
      p => p.user.toString() === participantUserId
    );
    if (!participant) {
      throw new Error('Participant not found');
    }
    participant.status = 'active';
    participant.approvedAt = new Date();
    if (participant.metadata) {
      participant.metadata.verificationStatus = 'verified';
    }
    await program.save();
  }
  // Admin: Review task submission
  async reviewTaskSubmission(
    programId: string,
    userId: string,
    taskId: string,
    approved: boolean,
    notes?: string
  ): Promise<void> {
    const program = await Program.findById(programId).lean();
    if (!program) {
      throw new Error('Program not found');
    }
    const participant = program.participants.find(
      p => p.user.toString() === userId
    );
    if (!participant) {
      throw new Error('Participant not found');
    }
    const task = participant.tasks.find(t => t._id?.toString() === taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    task.status = approved ? 'approved' : 'rejected';
    task.reviewedAt = new Date();
    task.reviewNotes = notes;
    if (approved) {
      participant.completedTasks += 1;
      participant.totalCoinsEarned += task.coins;
      // Credit coins to user's wallet
      await awardCoins(
        participant.user.toString(),
        task.coins,
        'program_task_reward',
        `Task completed: ${task.title || 'Program task'}`,
        { programId: programId, taskId: taskId }
      );
    }
    await program.save();
  }
}
export default new ProgramService();