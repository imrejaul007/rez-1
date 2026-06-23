/**
 * Area Model
 *
 * Represents a geographic area (neighbourhood/locality) used for
 * scoped leaderboards and area-based analytics.
 * The polygon field enables $geoWithin queries to check whether a user's
 * location falls within an area.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IArea extends Document {
  name: string; // e.g., "Koramangala", "HSR Layout"
  city: string; // e.g., "Bangalore"
  neighborhood: string; // Sub-area or ward name (can match name for leaf areas)
  polygon: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON Polygon ring(s)
  };
  isActive: boolean;
  userCount?: number; // Approximate number of REZ users in this area (denormalised)
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const AreaSchema = new Schema<IArea>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    neighborhood: {
      type: String,
      required: true,
      trim: true,
    },
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    userCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

AreaSchema.index({ polygon: '2dsphere' }); // Enables $geoWithin / $geoIntersects queries
AreaSchema.index({ city: 1, isActive: 1 });
AreaSchema.index({ name: 1, city: 1 }, { unique: true });

// ─── Model ───────────────────────────────────────────────────────────────────

export const Area = mongoose.model<IArea>('Area', AreaSchema);
export default Area;
