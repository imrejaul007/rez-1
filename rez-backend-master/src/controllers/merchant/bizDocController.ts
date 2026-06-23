import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('bizdoc');

type BizDocType = 'quotation' | 'delivery_challan' | 'credit_note' | 'debit_note';

const TYPE_PREFIXES: Record<BizDocType, string> = {
  quotation: 'QUO',
  delivery_challan: 'CHN',
  credit_note: 'CRN',
  debit_note: 'DBN',
};

// ── Inline schema (single collection for all trade document types) ─────────
const BizDocSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.keys(TYPE_PREFIXES), required: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    docNumber: { type: String, required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    toAddress: { type: String, trim: true },
    originalInvoice: { type: String, trim: true },
    items: [mongoose.Schema.Types.Mixed],
    subtotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    validUntil: { type: Date },
    dispatchDate: { type: Date },
    vehicleNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'dispatched', 'delivered', 'issued'],
      default: 'draft',
    },
  },
  { timestamps: true },
);

BizDocSchema.index({ merchantId: 1, type: 1, createdAt: -1 });

// Lazy model registration to avoid duplicate model error on hot-reload
const BizDoc = (mongoose.models.BizDoc as mongoose.Model<any>) || mongoose.model('BizDoc', BizDocSchema);

// ── Counter for sequential numbering ─────────────────────────────────────
const CounterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter =
  (mongoose.models.BizDocCounter as mongoose.Model<any>) || mongoose.model('BizDocCounter', CounterSchema);

async function nextDocNumber(type: BizDocType, merchantId: string): Promise<string> {
  const key = `${type}:${merchantId}`;
  const counter = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true });
  const year = new Date().getFullYear();
  return `${TYPE_PREFIXES[type]}-${year}-${String(counter.seq).padStart(4, '0')}`;
}

// ── List ──────────────────────────────────────────────────────────────────
export const listBizDocs = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id || (req as any).user?._id?.toString();
    const { type, storeId, status, limit = '50', page = '1' } = req.query as Record<string, string>;

    if (!type || !Object.keys(TYPE_PREFIXES).includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Valid type is required (quotation|delivery_challan|credit_note|debit_note)',
      });
      return;
    }

    const filter: Record<string, any> = { merchantId, type };
    if (storeId) filter.storeId = storeId;
    if (status) filter.status = status;

    const limitN = Math.min(parseInt(limit) || 50, 100);
    const skip = (parseInt(page, 10) - 1) * limitN;

    const [docs, total] = await Promise.all([
      BizDoc.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitN).lean(),
      BizDoc.countDocuments(filter),
    ]);

    // Normalize id field
    const normalized = docs.map((d: any) => ({ ...d, id: d._id.toString() }));

    res.json({ success: true, data: { docs: normalized, total, page: parseInt(page, 10), limit: limitN } });
  } catch (err: any) {
    logger.error('listBizDocs error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
};

// ── Create ────────────────────────────────────────────────────────────────
export const createBizDoc = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id || (req as any).user?._id?.toString();
    const { type, storeId, customerName, ...rest } = req.body;

    if (!type || !Object.keys(TYPE_PREFIXES).includes(type)) {
      res.status(400).json({ success: false, message: 'Valid type is required' });
      return;
    }
    if (!storeId) {
      res.status(400).json({ success: false, message: 'storeId is required' });
      return;
    }
    if (!customerName?.trim()) {
      res.status(400).json({ success: false, message: 'customerName is required' });
      return;
    }

    const docNumber = await nextDocNumber(type as BizDocType, merchantId);

    const doc = await BizDoc.create({
      type,
      merchantId,
      storeId,
      customerName: customerName.trim(),
      docNumber,
      ...rest,
    });

    // Expose docNumber under the type-specific alias in the response
    const alias =
      type === 'quotation'
        ? 'quotationNumber'
        : type === 'delivery_challan'
          ? 'challanNumber'
          : type === 'credit_note'
            ? 'noteNumber'
            : 'noteNumber';

    res.status(201).json({
      success: true,
      data: { ...doc.toObject(), id: doc._id.toString(), [alias]: docNumber },
    });
  } catch (err: any) {
    logger.error('createBizDoc error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to create document' });
  }
};

// ── Patch (status update) ─────────────────────────────────────────────────
export const patchBizDoc = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id || (req as any).user?._id?.toString();
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid document id' });
      return;
    }

    const allowed = ['status', 'dispatchDate', 'notes', 'vehicleNumber'];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const doc = await BizDoc.findOneAndUpdate({ _id: id, merchantId }, { $set: update }, { new: true });

    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    res.json({ success: true, data: { ...doc.toObject(), id: doc._id.toString() } });
  } catch (err: any) {
    logger.error('patchBizDoc error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to update document' });
  }
};
