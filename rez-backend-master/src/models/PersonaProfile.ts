/**
 * PersonaProfile Model
 *
 * Persists a user's resolved persona plus analytics signals and an
 * immutable history of every persona change (audit trail).
 *
 * One document per user (userId is unique-indexed).
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Sub-document types ───────────────────────────────────────────────────────

export interface IAnchorLocation {
  type: 'campus' | 'office' | 'home';
  lat: number;
  lng: number;
  radius: number; // metres
  label?: string; // e.g., "IIT Delhi", "ThoughtWorks Bangalore"
}

export interface IPersonaHistoryEntry {
  persona: 'student' | 'employee' | 'general';
  source: 'verified' | 'stated' | 'behaviour' | 'default';
  changedAt: Date;
  reason?: string;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface IPersonaProfile extends Document {
  userId: Types.ObjectId;
  primaryPersona: 'student' | 'employee' | 'general';
  personaConfidence: number;
  personaSource: 'verified' | 'stated' | 'behaviour' | 'default';
  anchorLocations: IAnchorLocation[];
  priceSensitivity: 'low' | 'medium' | 'high';
  visitFrequencyScore: number;
  avgTicketBucket: 'low' | 'mid' | 'high';
  history: IPersonaHistoryEntry[];
  lastResolvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const AnchorLocationSchema = new Schema<IAnchorLocation>(
  {
    type: {
      type: String,
      enum: ['campus', 'office', 'home'],
      required: true,
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radius: { type: Number, required: true, min: 50, max: 50000 },
    label: { type: String, trim: true },
  },
  { _id: false },
);

const PersonaHistorySchema = new Schema<IPersonaHistoryEntry>(
  {
    persona: {
      type: String,
      enum: ['student', 'employee', 'general'],
      required: true,
    },
    source: {
      type: String,
      enum: ['verified', 'stated', 'behaviour', 'default'],
      required: true,
    },
    changedAt: { type: Date, required: true, default: Date.now },
    reason: { type: String, trim: true },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const PersonaProfileSchema = new Schema<IPersonaProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    primaryPersona: {
      type: String,
      enum: ['student', 'employee', 'general'],
      required: true,
      default: 'general',
    },
    personaConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    personaSource: {
      type: String,
      enum: ['verified', 'stated', 'behaviour', 'default'],
      required: true,
      default: 'default',
    },
    anchorLocations: {
      type: [AnchorLocationSchema],
      default: [],
    },
    priceSensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    visitFrequencyScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    avgTicketBucket: {
      type: String,
      enum: ['low', 'mid', 'high'],
      default: 'mid',
    },
    history: {
      type: [PersonaHistorySchema],
      default: [],
    },
    lastResolvedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

PersonaProfileSchema.index({ primaryPersona: 1 });
PersonaProfileSchema.index({ lastResolvedAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const PersonaProfile = mongoose.model<IPersonaProfile>('PersonaProfile', PersonaProfileSchema);

export default PersonaProfile;
