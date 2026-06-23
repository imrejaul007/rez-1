import { Request, Response } from 'express';
import StorePayment from '../../models/StorePayment';
import { PosBill } from '../../models/PosBill';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('gstr1');

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** GET /api/merchant/gst/gstr1?storeId=&month= */
export const exportGSTR1 = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id || (req as any).user?._id?.toString();
    const { storeId, month, format = 'json' } = req.query;

    if (!storeId || !month) {
      res.status(400).json({ success: false, message: 'storeId and month are required' });
      return;
    }

    const [year, mon] = (month as string).split('-');
    const startDate = new Date(parseInt(year), parseInt(mon) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(mon), 0, 23, 59, 59);

    // BUG FIX (P2-C9): Previously only StorePayment records were queried.
    // PosBill records were entirely absent from GSTR-1 export, causing a
    // systematic understatement of taxable value for merchants who run
    // most of their sales via POS. Now we query both and merge into a
    // unified invoice list.
    const [payments, posBills] = await Promise.all([
      (StorePayment as any)
        .find({
          storeId,
          merchantId,
          createdAt: { $gte: startDate, $lte: endDate },
          'gstDetails.totalGst': { $gt: 0 },
        })
        .lean(),
      PosBill.find({
        storeId,
        merchantId,
        status: 'paid',
        paidAt: { $gte: startDate, $lte: endDate },
      })
        .select('billNumber createdAt paidAt customerPhone subtotal taxAmount totalAmount items')
        .lean(),
    ]);

    // Normalise StorePayments (online) into a common invoice row shape.
    const storeInvoices = payments.map((p: any) => ({
      source: 'online' as const,
      invoiceNumber: p.invoiceNumber || p._id,
      invoiceDate: p.createdAt,
      customerPhone: p.userPhone,
      taxableValue: round2((p.amount || 0) - (p.gstDetails?.totalGst || 0)),
      cgst: round2(p.gstDetails?.cgst || 0),
      sgst: round2(p.gstDetails?.sgst || 0),
      igst: round2(p.gstDetails?.igst || 0),
      totalGst: round2(p.gstDetails?.totalGst || 0),
      invoiceTotal: round2(p.amount || 0),
      gstRate: p.gstDetails?.gstRate || 18,
      // Online StorePayments don't currently track per-HSN lines.
      hsnLines: undefined as any[] | undefined,
    }));

    // Normalise PosBills into the same row shape. Per-line GST now
    // persists (see PosBillItem.gstRate/gstAmount/hsn from P2-C9) so we
    // can produce a genuine per-HSN breakdown when the merchant enters
    // HSN codes on their products.
    const posInvoices = posBills.map((b: any) => {
      const items = Array.isArray(b.items) ? b.items : [];
      const totalGst = items.reduce(
        (sum: number, it: any) => sum + (Number(it.gstAmount) || 0) * (Number(it.quantity) || 1),
        0,
      ) || Number(b.taxAmount) || 0;
      const taxableValue = round2((Number(b.totalAmount) || 0) - totalGst);
      const half = round2(totalGst / 2);
      const hsnLines = items
        .filter((it: any) => it.hsn || it.sac)
        .map((it: any) => ({
          hsn: it.hsn || it.sac,
          qty: Number(it.quantity) || 0,
          taxableValue: round2(
            (Number(it.price) || 0) * (Number(it.quantity) || 0) -
              (Number(it.gstAmount) || 0) * (Number(it.quantity) || 1),
          ),
          gstAmount: round2((Number(it.gstAmount) || 0) * (Number(it.quantity) || 1)),
          gstRate: Number(it.gstRate) || 0,
        }));
      return {
        source: 'pos' as const,
        invoiceNumber: b.billNumber || String(b._id),
        invoiceDate: b.paidAt || b.createdAt,
        customerPhone: b.customerPhone,
        taxableValue,
        // PosBill currently lumps total tax; approximate CGST/SGST 50/50
        // for intra-state sales (the common case) until the schema tracks
        // them separately.
        cgst: half,
        sgst: half,
        igst: 0,
        totalGst: round2(totalGst),
        invoiceTotal: round2(Number(b.totalAmount) || 0),
        gstRate:
          items.find((i: any) => typeof i.gstRate === 'number')?.gstRate ?? 0,
        hsnLines,
      };
    });

    const invoices = [...storeInvoices, ...posInvoices].sort(
      (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );

    const totalTaxableValue = round2(invoices.reduce((s, i) => s + i.taxableValue, 0));
    const totalCGST = round2(invoices.reduce((s, i) => s + i.cgst, 0));
    const totalSGST = round2(invoices.reduce((s, i) => s + i.sgst, 0));
    const totalIGST = round2(invoices.reduce((s, i) => s + i.igst, 0));

    const gstr1Data = {
      period: month as string,
      storeId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalInvoices: invoices.length,
        onlineInvoices: storeInvoices.length,
        posInvoices: posInvoices.length,
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax: round2(totalCGST + totalSGST + totalIGST),
        grandTotal: round2(invoices.reduce((s, i) => s + i.invoiceTotal, 0)),
      },
      invoices,
    };

    if (format === 'csv') {
      const csvRows = [
        'Source,Invoice Number,Invoice Date,Customer Phone,Taxable Value,CGST,SGST,IGST,Total GST,Invoice Total',
        ...gstr1Data.invoices.map(
          (inv: any) =>
            `${inv.source},${inv.invoiceNumber},${new Date(inv.invoiceDate).toLocaleDateString('en-IN')},${inv.customerPhone || ''},${inv.taxableValue},${inv.cgst},${inv.sgst},${inv.igst},${inv.totalGst},${inv.invoiceTotal}`,
        ),
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="GSTR1_${month}.csv"`);
      res.send(csvRows.join('\n'));
      return;
    }

    res.json({ success: true, data: gstr1Data });
  } catch (error: any) {
    logger.error('exportGSTR1 error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate GSTR-1' });
  }
};
