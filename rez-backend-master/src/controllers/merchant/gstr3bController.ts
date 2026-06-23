import { Request, Response } from 'express';
import StorePayment from '../../models/StorePayment';
import PurchaseOrder from '../../models/PurchaseOrder';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('gstr3b');

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** GET /api/merchant/gst/gstr3b?storeId=&month=&format= */
export const exportGSTR3B = async (req: Request, res: Response): Promise<void> => {
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

    // ── 3.1: Outward Supplies ──────────────────────────────────────
    const salesPayments = await (StorePayment as any)
      .find({ storeId, merchantId, createdAt: { $gte: startDate, $lte: endDate } })
      .lean();

    const taxablePayments = salesPayments.filter((p: any) => (p.gstDetails?.totalGst || 0) > 0);
    const exemptPayments = salesPayments.filter((p: any) => !p.gstDetails?.totalGst || p.gstDetails.totalGst === 0);

    const outTaxableValue = round(
      taxablePayments.reduce((s: number, p: any) => s + ((p.amount || 0) - (p.gstDetails?.totalGst || 0)), 0),
    );
    const outCGST = round(taxablePayments.reduce((s: number, p: any) => s + (p.gstDetails?.cgst || 0), 0));
    const outSGST = round(taxablePayments.reduce((s: number, p: any) => s + (p.gstDetails?.sgst || 0), 0));
    const outIGST = round(taxablePayments.reduce((s: number, p: any) => s + (p.gstDetails?.igst || 0), 0));
    const totalOutputTax = round(outCGST + outSGST + outIGST);
    const exemptValue = round(exemptPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0));
    const totalSales = round(salesPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0));

    // ── 4: ITC from received purchase orders ──────────────────────
    // ITC estimated as 18% GST inclusive on received PO totals.
    // Merchants should verify against actual purchase invoices.
    const receivedPOs = await (PurchaseOrder as any)
      .find({
        merchantId,
        status: { $in: ['received', 'partial'] },
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .lean();

    const totalPOValue = round(receivedPOs.reduce((s: number, po: any) => s + (po.totalAmount || 0), 0));
    const estimatedITC = round((totalPOValue * 18) / 118);
    const itcCGST = round(estimatedITC / 2);
    const itcSGST = round(estimatedITC / 2);

    // ── 6.1: Net Tax Payable ───────────────────────────────────────
    const cgstPayable = round(Math.max(0, outCGST - itcCGST));
    const sgstPayable = round(Math.max(0, outSGST - itcSGST));
    const igstPayable = Math.max(0, outIGST);
    const netTaxPayable = round(cgstPayable + sgstPayable + igstPayable);

    const gstr3bData = {
      period: month as string,
      storeId,
      generatedAt: new Date().toISOString(),
      section3_1: {
        taxableSupplies: {
          taxableValue: outTaxableValue,
          cgst: outCGST,
          sgst: outSGST,
          igst: outIGST,
          totalTax: totalOutputTax,
        },
        nilExemptSupplies: {
          taxableValue: exemptValue,
          cgst: 0,
          sgst: 0,
          igst: 0,
        },
        totalSales,
        totalInvoices: salesPayments.length,
      },
      section4: {
        eligibleITC: estimatedITC,
        itcCGST,
        itcSGST,
        itcIGST: 0,
        purchaseOrderCount: receivedPOs.length,
        totalPurchaseValue: totalPOValue,
        note: 'ITC estimated at 18% GST inclusive on received purchase orders. Verify with actual purchase invoices before filing.',
      },
      section6_1: {
        outputTax: totalOutputTax,
        itcClaimed: estimatedITC,
        cgstPayable,
        sgstPayable,
        igstPayable,
        netPayable: netTaxPayable,
      },
    };

    if (format === 'csv') {
      const rows = [
        'GSTR-3B Summary',
        `Period,${month}`,
        `Generated At,${gstr3bData.generatedAt}`,
        '',
        '3.1 Outward Supplies,Taxable Value,CGST,SGST,IGST,Total Tax',
        `Taxable Supplies,${outTaxableValue},${outCGST},${outSGST},${outIGST},${totalOutputTax}`,
        `Nil/Exempt Supplies,${exemptValue},0,0,0,0`,
        '',
        '4. ITC Available,Amount',
        `Eligible ITC (estimated),${estimatedITC}`,
        `CGST,${itcCGST}`,
        `SGST,${itcSGST}`,
        '',
        '6.1 Net Tax Payable,Amount',
        `CGST Payable,${cgstPayable}`,
        `SGST Payable,${sgstPayable}`,
        `IGST Payable,${igstPayable}`,
        `Net Total,${netTaxPayable}`,
        '',
        'Note: ITC is estimated. Verify against actual purchase invoices before filing.',
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="GSTR3B_${month}.csv"`);
      res.send(rows.join('\n'));
      return;
    }

    res.json({ success: true, data: gstr3bData });
  } catch (error: any) {
    logger.error('exportGSTR3B error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate GSTR-3B' });
  }
};
