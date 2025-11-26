import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyReportData {
  familyName: string;
  month: string;
  year: number;
  totalContributions: number;
  totalLoans: number;
  totalSavings: number;
  loansOutstanding: number;
  contributions: Array<{
    member: string;
    amount: number;
    status: string;
    date: string;
  }>;
  loans: Array<{
    member: string;
    amount: number;
    status: string;
    outstanding: number;
  }>;
  savings: Array<{
    member: string;
    amount: number;
  }>;
}

export const generateMonthlyReport = (data: MonthlyReportData) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text(data.familyName, 14, 20);
  
  doc.setFontSize(16);
  doc.text(`Monthly Financial Report - ${data.month} ${data.year}`, 14, 30);
  
  // Summary Section
  doc.setFontSize(14);
  doc.text('Financial Summary', 14, 45);
  
  doc.setFontSize(10);
  doc.text(`Total Contributions: ${formatCurrency(data.totalContributions)}`, 14, 55);
  doc.text(`Total Loans: ${formatCurrency(data.totalLoans)}`, 14, 62);
  doc.text(`Loans Outstanding: ${formatCurrency(data.loansOutstanding)}`, 14, 69);
  doc.text(`Total Savings: ${formatCurrency(data.totalSavings)}`, 14, 76);
  
  // Contributions Table
  doc.setFontSize(14);
  doc.text('Contributions', 14, 90);
  
  autoTable(doc, {
    startY: 95,
    head: [['Member', 'Amount', 'Status', 'Date']],
    body: data.contributions.map(c => [
      c.member,
      formatCurrency(c.amount),
      c.status,
      c.date
    ]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });
  
  // Loans Table
  const lastY = (doc as any).lastAutoTable.finalY || 95;
  doc.setFontSize(14);
  doc.text('Loans', 14, lastY + 15);
  
  autoTable(doc, {
    startY: lastY + 20,
    head: [['Member', 'Amount', 'Outstanding', 'Status']],
    body: data.loans.map(l => [
      l.member,
      formatCurrency(l.amount),
      formatCurrency(l.outstanding),
      l.status
    ]),
    theme: 'striped',
    headStyles: { fillColor: [231, 76, 60] },
  });
  
  // Savings Table
  const lastY2 = (doc as any).lastAutoTable.finalY || lastY + 20;
  doc.setFontSize(14);
  doc.text('Savings', 14, lastY2 + 15);
  
  autoTable(doc, {
    startY: lastY2 + 20,
    head: [['Member', 'Amount']],
    body: data.savings.map(s => [
      s.member,
      formatCurrency(s.amount)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [46, 204, 113] },
  });
  
  // Footer
  const lastY3 = (doc as any).lastAutoTable.finalY || lastY2 + 20;
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, lastY3 + 15);
  
  // Save the PDF
  doc.save(`${data.familyName}-${data.month}-${data.year}.pdf`);
};

export const generateMemberReport = (memberData: {
  memberName: string;
  familyName: string;
  contributions: any[];
  loans: any[];
  savings: any[];
  attendance: any[];
}) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text(memberData.familyName, 14, 20);
  
  doc.setFontSize(16);
  doc.text(`Member Profile: ${memberData.memberName}`, 14, 30);
  
  // Contributions
  doc.setFontSize(14);
  doc.text('Contribution History', 14, 45);
  
  autoTable(doc, {
    startY: 50,
    head: [['Date', 'Amount', 'Status', 'Fine']],
    body: memberData.contributions.map(c => [
      new Date(c.contribution_date).toLocaleDateString(),
      formatCurrency(parseFloat(c.amount)),
      c.status,
      formatCurrency(parseFloat(c.late_fine || 0))
    ]),
    theme: 'striped',
  });
  
  // Loans
  const lastY = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(14);
  doc.text('Loan History', 14, lastY + 15);
  
  autoTable(doc, {
    startY: lastY + 20,
    head: [['Purpose', 'Amount', 'Paid', 'Status']],
    body: memberData.loans.map(l => [
      l.purpose,
      formatCurrency(parseFloat(l.amount)),
      formatCurrency(parseFloat(l.amount_paid || 0)),
      l.status
    ]),
    theme: 'striped',
  });
  
  // Savings
  const lastY2 = (doc as any).lastAutoTable.finalY || lastY + 20;
  doc.setFontSize(14);
  doc.text('Savings History', 14, lastY2 + 15);
  
  autoTable(doc, {
    startY: lastY2 + 20,
    head: [['Month', 'Amount']],
    body: memberData.savings.map(s => [
      new Date(s.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      formatCurrency(parseFloat(s.amount))
    ]),
    theme: 'striped',
  });
  
  // Save
  doc.save(`${memberData.memberName}-profile.pdf`);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};
