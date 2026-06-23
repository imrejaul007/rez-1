// Menu Model - Restaurant/Store Menu System
import mongoose, { Schema, Document, Model } from 'mongoose';

// MenuItem Sub-schema
export interface IMenuItem {
  _id?: any;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category: string;
  isAvailable: boolean;
  preparationTime?: string;
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  dietaryInfo?: {
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    isNutFree?: boolean;
  };
  spicyLevel?: number; // 0-5
  allergens?: string[];
  tags?: string[];
}

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  image: { type: String },
  category: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  preparationTime: { type: String },
  nutritionalInfo: {
    calories: { type: Number },
    protein: { type: Number },
    carbs: { type: Number },
    fat: { type: Number },
  },
  dietaryInfo: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isNutFree: { type: Boolean, default: false },
  },
  spicyLevel: { type: Number, min: 0, max: 5, default: 0 },
  allergens: [{ type: String }],
  tags: [{ type: String }],
}, { _id: true });

// MenuCategory Sub-schema
export interface IMenuCategory {
  _id?: any;
  name: string;
  description?: string;
  displayOrder: number;
  items: IMenuItem[];
}

const MenuCategorySchema = new Schema<IMenuCategory>({
  name: { type: String, required: true },
  description: { type: String },
  displayOrder: { type: Number, default: 0 },
  items: [MenuItemSchema],
}, { _id: true });

// Main Menu Document
export interface IMenu extends Document {
  storeId: mongoose.Types.ObjectId;
  categories: IMenuCategory[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  getMenuItem(categoryId: string, itemId: string): IMenuItem | null;
  addMenuItem(categoryId: string, itemData: IMenuItem): Promise<this>;
  updateMenuItem(categoryId: string, itemId: string, updateData: Partial<IMenuItem>): Promise<this>;
  deleteMenuItem(categoryId: string, itemId: string): Promise<this>;
}

// Menu Model with static methods
export interface IMenuModel extends Model<IMenu> {
  findByStoreId(storeId: string): Promise<IMenu | null>;
}

const MenuSchema = new Schema<IMenu>({
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    unique: true,
    index: true,
  },
  categories: [MenuCategorySchema],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
MenuSchema.index({ storeId: 1, isActive: 1 });
MenuSchema.index({ 'categories.items.category': 1 });
MenuSchema.index({ 'categories.items.name': 'text' });

// Virtual for total items count
MenuSchema.virtual('totalItems').get(function() {
  return this.categories.reduce((total, category) => total + category.items.length, 0);
});

// Method to get menu item by ID
MenuSchema.methods.getMenuItem = function(categoryId: string, itemId: string) {
  const category = this.categories.find((c: any) => c._id?.toString() === categoryId);
  if (!category) return null;
  return category.items.find((i: any) => i._id?.toString() === itemId) || null;
};

// Method to add menu item
MenuSchema.methods.addMenuItem = function(categoryId: string, itemData: IMenuItem) {
  const category = this.categories.find((c: any) => c._id?.toString() === categoryId);
  if (!category) throw new Error('Category not found');
  category.items.push(itemData);
  return this.save();
};

// Method to update menu item
MenuSchema.methods.updateMenuItem = function(categoryId: string, itemId: string, updateData: Partial<IMenuItem>) {
  const category = this.categories.find((c: any) => c._id?.toString() === categoryId);
  if (!category) throw new Error('Category not found');

  const item = category.items.find((i: any) => i._id?.toString() === itemId);
  if (!item) throw new Error('Menu item not found');

  Object.assign(item, updateData);
  return this.save();
};

// Method to delete menu item
MenuSchema.methods.deleteMenuItem = function(categoryId: string, itemId: string) {
  const category = this.categories.find((c: any) => c._id?.toString() === categoryId);
  if (!category) throw new Error('Category not found');

  const itemIndex = category.items.findIndex((item: any) => item._id?.toString() === itemId);
  if (itemIndex === -1) throw new Error('Menu item not found');

  category.items.splice(itemIndex, 1);
  return this.save();
};

// Static method to find menu by store ID
MenuSchema.statics.findByStoreId = function(storeId: string) {
  return this.findOne({ storeId, isActive: true });
};

const Menu = mongoose.model<IMenu, IMenuModel>('Menu', MenuSchema);

export default Menu;
