import mongoose, { Document, Schema } from 'mongoose';

export interface IFormSubmission extends Document {
  formId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  responses: { fieldId: string; value: string | string[] }[];
  submittedAt: Date;
  createdAt: Date;
}

const FormSubmissionSchema = new Schema<IFormSubmission>(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'ConsultationForm', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'ServiceAppointment' },
    responses: [
      {
        fieldId: { type: String, required: true },
        value: { type: Schema.Types.Mixed },
        _id: false,
      },
    ],
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

FormSubmissionSchema.index({ storeId: 1, clientId: 1 });
FormSubmissionSchema.index({ appointmentId: 1 });

export const FormSubmission = mongoose.model<IFormSubmission>('FormSubmission', FormSubmissionSchema);
