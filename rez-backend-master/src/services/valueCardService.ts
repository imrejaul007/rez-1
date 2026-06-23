import ValueCard, { IValueCard } from '../models/ValueCard';
import mongoose from 'mongoose';
import type { Lean } from '../types/lean';

class ValueCardService {
  /**
   * Get all active value cards, sorted by sortOrder ASC
   */
  async getAll(): Promise<Lean<IValueCard>[]> {
    return ValueCard.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
  }

  /**
   * Get a single value card by ID
   */
  async getById(id: string): Promise<Lean<IValueCard> | null> {
    return ValueCard.findById(id).lean()
  }

  /**
   * Create a new value card
   */
  async create(data: Partial<IValueCard>, createdBy: string): Promise<IValueCard> {
    const valueCard = new ValueCard({
      ...data,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
    return valueCard.save();
  }

  /**
   * Update a value card
   */
  async update(id: string, data: Partial<IValueCard>): Promise<IValueCard | null> {
    return ValueCard.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
  }

  /**
   * Delete a value card
   */
  async remove(id: string): Promise<IValueCard | null> {
    return ValueCard.findByIdAndDelete(id);
  }

  /**
   * Toggle isActive for a value card
   */
  async toggleActive(id: string): Promise<IValueCard | null> {
    const valueCard = await ValueCard.findById(id);
    if (!valueCard) return null;

    valueCard.isActive = !valueCard.isActive;
    return valueCard.save();
  }
}

export default new ValueCardService();
