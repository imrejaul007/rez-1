import mongoose, { Schema, Document } from 'mongoose';

export interface IProgramTask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'share' | 'review' | 'referral' | 'purchase' | 'attend' | 'create_content' | 'volunteer';
  coins: number;
  deadline?: Date;
  requirements: string[];
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submissionUrl?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface IProgramParticipant {
  user: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'suspended';
  joinedAt: Date;
  approvedAt?: Date;
  completedTasks: number;
  totalCoinsEarned: number;
  tasks: IProgramTask[];
  metadata?: {
    collegeName?: string;
    collegeId?: string;
    companyName?: string;
    employeeId?: string;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
  };
}

// Social impact event types
export type SocialImpactEventType =
  | 'blood-donation'
  | 'tree-plantation'
  | 'beach-cleanup'
  | 'digital-literacy'
  | 'food-drive'
  | 'health-camp'
  | 'skill-training'
  | 'women-empowerment'
  | 'education'
  | 'environment'
  | 'other';

// Social impact specific fields interface
export interface ISocialImpactFields {
  eventType?: SocialImpactEventType;
  sponsor?: mongoose.Types.ObjectId;
  merchant?: mongoose.Types.ObjectId;
  organizer?: {
    name: string;
    logo?: string;
  };
  location?: {
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  eventDate?: Date;
  eventTime?: {
    start: string;
    end: string;
  };
  rewards?: {
    rezCoins: number;
    brandCoins: number;
  };
  capacity?: {
    goal: number;
    enrolled: number;
  };
  impact?: {
    description: string;
    metric: string;
    targetValue: number;
    currentValue?: number;
  };
  eventRequirements?: Array<{
    text: string;
    isMandatory: boolean;
  }>;
  schedule?: Array<{
    time: string;
    activity: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
  };
  eventStatus?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isCsrActivity?: boolean;
  distance?: string;
}

export interface IProgram extends Document {
  name: string;
  type: 'college_ambassador' | 'corporate_employee' | 'social_impact';
  description: string;
  status: 'active' | 'inactive' | 'upcoming' | 'completed' | 'pending_approval' | 'rejected';
  startDate: Date;
  endDate?: Date;
  requirements: string[];
  benefits: string[];
  tasks: Array<{
    title: string;
    description: string;
    type: string;
    coins: number;
    deadline?: Date;
    requirements: string[];
  }>;
  maxParticipants?: number;
  participants: IProgramParticipant[];
  totalBudget: number;
  image?: string;
  featured: boolean;
  // Social impact specific fields
  eventType?: SocialImpactEventType;
  sponsor?: mongoose.Types.ObjectId;
  merchant?: mongoose.Types.ObjectId;
  organizer?: {
    name: string;
    logo?: string;
  };
  location?: {
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  eventDate?: Date;
  eventTime?: {
    start: string;
    end: string;
  };
  rewards?: {
    rezCoins: number;
    brandCoins: number;
  };
  capacity?: {
    goal: number;
    enrolled: number;
  };
  impact?: {
    description: string;
    metric: string;
    targetValue: number;
    currentValue?: number;
  };
  eventRequirements?: Array<{
    text: string;
    isMandatory: boolean;
  }>;
  schedule?: Array<{
    time: string;
    activity: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
  };
  eventStatus?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isCsrActivity?: boolean;
  distance?: string;
  verificationConfig?: {
    methods: Array<'manual' | 'qr' | 'otp' | 'geo'>;
    geoFenceRadiusMeters?: number;
    requireCheckInBeforeComplete?: boolean;
  };
  sponsorBudget?: {
    allocated: number;
    disbursed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProgramTaskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['share', 'review', 'referral', 'purchase', 'attend', 'create_content', 'volunteer'],
    required: true
  },
  coins: { type: Number, required: true, min: 0 },
  deadline: Date,
  requirements: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'],
    default: 'pending'
  },
  submissionUrl: String,
  submittedAt: Date,
  reviewedAt: Date,
  reviewNotes: String
});

const ProgramParticipantSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'completed', 'suspended'],
    default: 'pending'
  },
  joinedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  completedTasks: { type: Number, default: 0 },
  totalCoinsEarned: { type: Number, default: 0 },
  tasks: [ProgramTaskSchema],
  metadata: {
    collegeName: String,
    collegeId: String,
    companyName: String,
    employeeId: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }
});

const ProgramSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['college_ambassador', 'corporate_employee', 'social_impact'],
      required: true
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'upcoming', 'completed', 'pending_approval', 'rejected'],
      default: 'active'
    },
    startDate: { type: Date, required: true },
    endDate: Date,
    requirements: [{ type: String }],
    benefits: [{ type: String }],
    tasks: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      type: { type: String, required: true },
      coins: { type: Number, required: true },
      deadline: Date,
      requirements: [{ type: String }]
    }],
    maxParticipants: Number,
    participants: [ProgramParticipantSchema],
    totalBudget: { type: Number, default: 0 },
    image: String,
    featured: { type: Boolean, default: false },

    // Social impact specific fields
    eventType: {
      type: String,
      enum: [
        'blood-donation',
        'tree-plantation',
        'beach-cleanup',
        'digital-literacy',
        'food-drive',
        'health-camp',
        'skill-training',
        'women-empowerment',
        'education',
        'environment',
        'other'
      ]
    },
    sponsor: {
      type: Schema.Types.ObjectId,
      ref: 'Sponsor'
    },
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant'
    },
    organizer: {
      name: { type: String },
      logo: { type: String }
    },
    location: {
      address: { type: String },
      city: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },
    eventDate: { type: Date },
    eventTime: {
      start: { type: String },
      end: { type: String }
    },
    rewards: {
      rezCoins: { type: Number, default: 0 },
      brandCoins: { type: Number, default: 0 }
    },
    capacity: {
      goal: { type: Number, default: 0 },
      enrolled: { type: Number, default: 0 }
    },
    impact: {
      description: { type: String },
      metric: { type: String },
      targetValue: { type: Number, default: 0 },
      currentValue: { type: Number, default: 0 }
    },
    eventRequirements: [{
      text: { type: String },
      isMandatory: { type: Boolean, default: false }
    }],
    schedule: [{
      time: { type: String },
      activity: { type: String }
    }],
    contact: {
      phone: { type: String },
      email: { type: String }
    },
    eventStatus: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    isCsrActivity: { type: Boolean, default: false },
    distance: { type: String },
    verificationConfig: {
      methods: [{ type: String, enum: ['manual', 'qr', 'otp', 'geo'] }],
      geoFenceRadiusMeters: { type: Number, default: 500 },
      requireCheckInBeforeComplete: { type: Boolean, default: true }
    },
    sponsorBudget: {
      allocated: { type: Number, default: 0 },
      disbursed: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// Indexes
ProgramSchema.index({ type: 1, status: 1 });
ProgramSchema.index({ 'participants.user': 1 });
// Social impact specific indexes
ProgramSchema.index({ type: 1, eventStatus: 1, eventDate: 1 });
ProgramSchema.index({ sponsor: 1 });
ProgramSchema.index({ merchant: 1, type: 1 });
ProgramSchema.index({ eventType: 1 });

export default mongoose.model<IProgram>('Program', ProgramSchema);
