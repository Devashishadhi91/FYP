const PDFDocument = require('pdfkit');
const Sale = require('../models/Salesmodel');
const logger = require('../libs/appLogger');

module.exports.generateInvoice = async (req, res) => {
  try {
    const { saleId } = req.params;
    const sale = await Sale.findById(saleId).populate('products.product');

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${saleId}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(25).text('INVENTORY MANAGEMENT SYSTEM', { align: 'center' });
    doc.fontSize(10).text('New Road, Kathmandu, Nepal', { align: 'center' });
    doc.text('Phone: +977-9843971636 | Email: ims@gmail.com', { align: 'center' });
    doc.moveDown();
    doc.rect(50, 110, 500, 2).fill('#3b82f6');
    doc.moveDown();

    // Invoice Details
    doc.fillColor('#000').fontSize(18).text('SALES INVOICE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Invoice No: ${sale._id}`);
    doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${sale.customerName}`);
    doc.text(`Payment Status: ${sale.paymentStatus.toUpperCase()}`, {
      color: sale.paymentStatus === 'paid' ? '#059669' : '#dc2626'
    });
    doc.moveDown();

    // Table Header
    const tableTop = 260;
    doc.font('Helvetica-Bold');
    doc.text('Product Name', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Price', 380, tableTop);
    doc.text('Subtotal', 480, tableTop);

    doc.moveDown();
    doc.rect(50, tableTop + 15, 500, 1).fill('#cccccc');
    doc.font('Helvetica');

    // Table Rows
    let rowTop = tableTop + 25;
    sale.products.forEach(item => {
      const productName = item.product?.name || "Unknown Product";
      const subtotal = item.quantity * item.price;

      doc.fontSize(10).text(productName, 50, rowTop, { width: 240 });
      doc.text(item.quantity.toString(), 300, rowTop);
      doc.text(`Rs. ${item.price.toLocaleString()}`, 380, rowTop);
      doc.text(`Rs. ${subtotal.toLocaleString()}`, 480, rowTop);

      rowTop += 20;
    });

    // Footer
    doc.rect(50, rowTop + 10, 500, 1).fill('#cccccc');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000');
    doc.text('GRAND TOTAL:', 380, rowTop + 25);
    doc.text(`Rs. ${sale.totalAmount.toLocaleString()}`, 480, rowTop + 25);

    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#999999');
    doc.text('Thank you for your business!', 50, rowTop + 60, { align: 'center' });

    // Save invoice URL to the sale record
    await Sale.findByIdAndUpdate(saleId, { invoiceUrl: `/api/invoice/${saleId}` });

    doc.end();

  } catch (error) {
    logger.error("Invoice Generation Error:", error);
    res.status(500).json({ message: "Failed to generate invoice", error: error.message });
  }
};
