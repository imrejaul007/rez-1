import mongoose, { Document, Schema } from 'mongoose';

export interface IFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'phone';
  options?: string[]; // for select/multiselect
  required: boolean;
  placeholder?: string;
  order: number;
}

export interface IConsultationForm extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  fields: IFormField[];
  isDefault: boolean; // sent to all new clients
  serviceIds: mongoose.Types.ObjectId[]; // attach to specific services (empty = all)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldSchema = new Schema<IFormField>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'textarea', 'select', 'multiselect', 'checkbox', 'date', 'phone'],
      required: true,
    },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const ConsultationFormSchema = new Schema<IConsultationForm>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true },
    description: { type: String },
    fields: [FormFieldSchema],
    isDefault: { type: Boolean, default: false },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ConsultationFormSchema.index({ storeId: 1 });

export const ConsultationForm = mongoose.model<IConsultationForm>('ConsultationForm', ConsultationFormSchema);
