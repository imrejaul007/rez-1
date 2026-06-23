/**
 * Campus Model
 *
 * Represents a university, college, or other institutional campus used for
 * campus-scoped leaderboards and verified student programs.
 * Uses a Point + radius approach (rather than a polygon) for simplicity.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface ICampus extends Document {
  name: string; // e.g., "IIT Delhi", "BITS Pilani"
  institution: string; // Full institution name
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  radius: number; // Effective campus radius in meters (e.g., 800 for large campus)
  isActive: boolean;
  verifiedStudents: number; // Count of verified student accounts on REZ
  city?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const CampusSchema = new Schema<ICampus>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) => v.length === 2,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
    },
    radius: {
      type: Number,
      required: true,
      min: 50, // Minimum 50m radius
      max: 10000, // Maximum 10km radius
      default: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verifiedStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    city: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

CampusSchema.index({ location: '2dsphere' }); // Enables $nearSphere / $geoWithin queries
CampusSchema.index({ isActive: 1 });
CampusSchema.index({ name: 1, institution: 1 }, { unique: true });

// ─── Model ───────────────────────────────────────────────────────────────────

export const Campus = mongoose.model<ICampus>('Campus', CampusSchema);
export default Campus;
