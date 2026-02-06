import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ContributionReceipt {
  receiptNumber: string;
  familyName: string;
  memberName: string;
  amount: number;
  contributionDate: string;
  paymentDate: string;
  type: string;
  notes?: string;
}

interface LoanPaymentReceipt {
  receiptNumber: string;
  familyName: string;
  memberName: string;
  loanId: string;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  paymentDate: string;
  remainingBalance: number;
  paymentMethod?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const generateContributionReceipt = (data: ContributionReceipt): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [148, 210], // A5 size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.familyName, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('CONTRIBUTION RECEIPT', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Receipt #: ${data.receiptNumber}`, pageWidth / 2, 35, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Receipt details
  let yPos = 55;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt Details', 15, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const details = [
    ['Member Name:', data.memberName],
    ['Contribution Type:', data.type.charAt(0).toUpperCase() + data.type.slice(1)],
    ['Contribution Date:', format(new Date(data.contributionDate), 'MMMM d, yyyy')],
    ['Payment Date:', format(new Date(data.paymentDate), 'MMMM d, yyyy')],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, yPos);
    yPos += 7;
  });

  // Amount box
  yPos += 5;
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid:', 20, yPos + 10);
  
  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.text(formatCurrency(data.amount), pageWidth - 20, yPos + 10, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Status: PAID', pageWidth - 20, yPos + 20, { align: 'right' });

  // Notes
  if (data.notes) {
    yPos += 35;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.notes, 15, yPos + 6, { maxWidth: pageWidth - 30 });
  }

  // Footer
  const footerY = 185;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('This is an electronically generated receipt.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save
  doc.save(`receipt-${data.receiptNumber}.pdf`);
};

export const generateLoanPaymentReceipt = (data: LoanPaymentReceipt): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [148, 210], // A5 size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(231, 76, 60);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.familyName, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('LOAN PAYMENT RECEIPT', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Receipt #: ${data.receiptNumber}`, pageWidth / 2, 35, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Receipt details
  let yPos = 55;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', 15, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const details = [
    ['Member Name:', data.memberName],
    ['Payment Date:', format(new Date(data.paymentDate), 'MMMM d, yyyy')],
    ['Payment Method:', data.paymentMethod || 'Cash'],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 55, yPos);
    yPos += 7;
  });

  // Payment breakdown table
  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Principal Paid', formatCurrency(data.principalPaid)],
      ['Interest Paid', formatCurrency(data.interestPaid)],
      ['Total Payment', formatCurrency(data.amountPaid)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [231, 76, 60] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'right' },
    },
  });

  // Remaining balance
  const tableEndY = (doc as any).lastAutoTable.finalY || yPos + 40;
  
  doc.setFillColor(255, 243, 224);
  doc.roundedRect(15, tableEndY + 5, pageWidth - 30, 20, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Remaining Balance:', 20, tableEndY + 15);
  
  doc.setTextColor(231, 76, 60);
  doc.setFontSize(14);
  doc.text(formatCurrency(data.remainingBalance), pageWidth - 20, tableEndY + 15, { align: 'right' });

  // Footer
  doc.setTextColor(128, 128, 128);
  const footerY = 185;
  doc.setFontSize(8);
  doc.text('This is an electronically generated receipt.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save
  doc.save(`loan-payment-receipt-${data.receiptNumber}.pdf`);
};

// Generate receipt number
export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${timestamp}-${random}`;
};
