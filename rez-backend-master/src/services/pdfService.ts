import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { pct, add } from '../utils/currency';

interface InvoiceData {
  _id?: any;
  tier?: string;
  price?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  createdAt?: Date;
  user?: any;
  amount?: number;
  paymentId?: string;
  method?: string;
  metadata?: any;
}

interface InvoiceAddress {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export class PDFService {
  /**
   * Generate invoice PDF and stream to response
   */
  static async generateInvoicePDF(
    res: Response,
    invoiceData: InvoiceData,
    userInfo: InvoiceAddress
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice-${invoiceData._id || invoiceData.paymentId}`,
            Author: 'Rez App',
            Subject: 'Invoice'
          }
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=invoice-${invoiceData._id || invoiceData.paymentId}.pdf`
        );

        // Pipe PDF to response
        doc.pipe(res);

        // --- HEADER ---
        this.addHeader(doc);

        // --- INVOICE DETAILS ---
        doc.moveDown(2);
        this.addInvoiceDetails(doc, invoiceData);

        // --- BILLING TO ---
        doc.moveDown();
        this.addBillingInfo(doc, userInfo);

        // --- ITEMS TABLE ---
        doc.moveDown();
        this.addItemsTable(doc, invoiceData);

        // --- TOTALS ---
        this.addTotals(doc, invoiceData);

        // --- FOOTER ---
        this.addFooter(doc);

        // Finalize PDF
        doc.end();

        doc.on('finish', () => resolve());
        doc.on('error', (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header with logo and company info
   */
  private static addHeader(doc: PDFKit.PDFDocument): void {
    // Company name/logo
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('REZ APP', 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Bangalore, Karnataka, India', 50, 80)
      .text('Email: support@rezapp.com', 50, 95)
      .text('Phone: +91 99999 99999', 50, 110);

    // Invoice title
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });
  }

  /**
   * Add invoice details (number, date, etc.)
   */
  private static addInvoiceDetails(
    doc: PDFKit.PDFDocument,
    invoiceData: InvoiceData
  ): void {
    const invoiceNumber = invoiceData._id?.toString().slice(-8).toUpperCase() ||
      invoiceData.paymentId?.slice(-8).toUpperCase() || 'N/A';

    const invoiceDate = invoiceData.createdAt
      ? new Date(invoiceData.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Invoice Number:', 400, 150, { align: 'right' })
      .font('Helvetica')
      .text(`#INV-${invoiceNumber}`, 400, 165, { align: 'right' });

    doc
      .font('Helvetica-Bold')
      .text('Invoice Date:', 400, 185, { align: 'right' })
      .font('Helvetica')
      .text(invoiceDate, 400, 200, { align: 'right' });

    if (invoiceData.status) {
      doc
        .font('Helvetica-Bold')
        .text('Status:', 400, 220, { align: 'right' })
        .font('Helvetica')
        .fillColor(invoiceData.status === 'active' || invoiceData.status === 'completed' ? '#10b981' : '#ef4444')
        .text(invoiceData.status.toUpperCase(), 400, 235, { align: 'right' })
        .fillColor('#000000');
    }
  }

  /**
   * Add billing information
   */
  private static addBillingInfo(
    doc: PDFKit.PDFDocument,
    userInfo: InvoiceAddress
  ): void {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, 270);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(userInfo.name || 'N/A', 50, 290)
      .text(userInfo.email || 'N/A', 50, 305);

    if (userInfo.phone) {
      doc.text(userInfo.phone, 50, 320);
    }

    if (userInfo.address) {
      doc.text(userInfo.address, 50, 335, { width: 200 });
    }
  }

  /**
   * Add items table
   */
  private static addItemsTable(
    doc: PDFKit.PDFDocument,
    invoiceData: InvoiceData
  ): void {
    const tableTop = 380;
    const itemHeight = 30;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('DESCRIPTION', 50, tableTop)
      .text('QTY', 300, tableTop, { width: 50, align: 'center' })
      .text('PRICE', 370, tableTop, { width: 80, align: 'right' })
      .text('AMOUNT', 470, tableTop, { width: 80, align: 'right' });

    // Draw line under header
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table row
    let yPos = tableTop + itemHeight;

    // Determine description based on data type
    let description = 'Service';
    if (invoiceData.tier) {
      description = `${invoiceData.tier.charAt(0).toUpperCase() + invoiceData.tier.slice(1)} Subscription`;
      if (invoiceData.startDate && invoiceData.endDate) {
        const start = new Date(invoiceData.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const end = new Date(invoiceData.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        description += `\n(${start} - ${end})`;
      }
    } else if (invoiceData.metadata?.type) {
      description = invoiceData.metadata.type;
    }

    const amount = invoiceData.price || invoiceData.amount || 0;
    const quantity = 1;

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(description, 50, yPos, { width: 230 })
      .text(quantity.toString(), 300, yPos, { width: 50, align: 'center' })
      .text(`₹${amount.toFixed(2)}`, 370, yPos, { width: 80, align: 'right' })
      .text(`₹${amount.toFixed(2)}`, 470, yPos, { width: 80, align: 'right' });
  }

  /**
   * Add totals section
   */
  private static addTotals(
    doc: PDFKit.PDFDocument,
    invoiceData: InvoiceData
  ): void {
    const amount = invoiceData.price || invoiceData.amount || 0;
    const subtotal = amount;
    const tax = pct(subtotal, 18); // 18% GST
    const total = add(subtotal, tax);

    const totalsY = 480;

    // Draw line above totals
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(350, totalsY)
      .lineTo(550, totalsY)
      .stroke();

    // Subtotal
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', 370, totalsY + 15, { width: 80, align: 'right' })
      .text(`₹${subtotal.toFixed(2)}`, 470, totalsY + 15, { width: 80, align: 'right' });

    // Tax
    doc
      .text('GST (18%):', 370, totalsY + 35, { width: 80, align: 'right' })
      .text(`₹${tax.toFixed(2)}`, 470, totalsY + 35, { width: 80, align: 'right' });

    // Draw line above total
    doc
      .strokeColor('#000000')
      .lineWidth(2)
      .moveTo(350, totalsY + 55)
      .lineTo(550, totalsY + 55)
      .stroke();

    // Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', 370, totalsY + 65, { width: 80, align: 'right' })
      .text(`₹${total.toFixed(2)}`, 470, totalsY + 65, { width: 80, align: 'right' });
  }

  /**
   * Add footer with notes and thank you
   */
  private static addFooter(doc: PDFKit.PDFDocument): void {
    const footerY = 650;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Notes:', 50, footerY);

    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Thank you for your business!', 50, footerY + 15)
      .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 30);

    // Bottom border
    doc
      .strokeColor('#10b981')
      .lineWidth(3)
      .moveTo(50, 750)
      .lineTo(550, 750)
      .stroke();

    doc
      .fontSize(8)
      .fillColor('#666666')
      .text(
        'REZ APP - Your Shopping Companion | www.rezapp.com',
        50,
        760,
        { align: 'center', width: 500 }
      );
  }
}
