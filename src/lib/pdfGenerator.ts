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
  
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 38);
  
  // Summary Statistics
  const totalContributions = memberData.contributions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);
  
  const totalLoans = memberData.loans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
  const outstandingLoans = memberData.loans
    .filter(l => l.status !== 'paid')
    .reduce((sum, l) => sum + (parseFloat(l.amount) - parseFloat(l.amount_paid || 0)), 0);
  
  const totalSavings = memberData.savings.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  
  const attendanceRate = memberData.attendance.length > 0
    ? (memberData.attendance.filter(a => a.status === 'present').length / memberData.attendance.length * 100)
    : 0;
  
  doc.setFontSize(12);
  doc.text('Financial Summary', 14, 50);
  doc.setFontSize(10);
  doc.text(`Total Contributions: ${formatCurrency(totalContributions)}`, 20, 58);
  doc.text(`Total Loans: ${formatCurrency(totalLoans)}`, 20, 65);
  doc.text(`Outstanding Loans: ${formatCurrency(outstandingLoans)}`, 20, 72);
  doc.text(`Total Savings: ${formatCurrency(totalSavings)}`, 20, 79);
  doc.text(`Attendance Rate: ${attendanceRate.toFixed(1)}%`, 20, 86);
  
  // Contributions
  doc.setFontSize(12);
  doc.text('Contribution History', 14, 100);
  
  autoTable(doc, {
    startY: 105,
    head: [['Date', 'Type', 'Amount', 'Status', 'Fine']],
    body: memberData.contributions.map(c => [
      new Date(c.contribution_date).toLocaleDateString(),
      c.type,
      formatCurrency(parseFloat(c.amount)),
      c.status,
      formatCurrency(parseFloat(c.late_fine || 0))
    ]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });
  
  // Loans
  const lastY = (doc as any).lastAutoTable.finalY || 105;
  doc.setFontSize(12);
  doc.text('Loan History', 14, lastY + 15);
  
  autoTable(doc, {
    startY: lastY + 20,
    head: [['Date', 'Purpose', 'Amount', 'Paid', 'Status', 'Due Date']],
    body: memberData.loans.map(l => [
      new Date(l.created_at).toLocaleDateString(),
      l.purpose,
      formatCurrency(parseFloat(l.amount)),
      formatCurrency(parseFloat(l.amount_paid || 0)),
      l.status,
      l.due_date ? new Date(l.due_date).toLocaleDateString() : 'N/A'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [231, 76, 60] },
  });
  
  // Savings
  const lastY2 = (doc as any).lastAutoTable.finalY || lastY + 20;
  doc.setFontSize(12);
  doc.text('Savings History', 14, lastY2 + 15);
  
  autoTable(doc, {
    startY: lastY2 + 20,
    head: [['Month', 'Amount', 'Notes']],
    body: memberData.savings.map(s => [
      new Date(s.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      formatCurrency(parseFloat(s.amount)),
      s.notes || '-'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [46, 204, 113] },
  });
  
  // Attendance
  const lastY3 = (doc as any).lastAutoTable.finalY || lastY2 + 20;
  
  // Check if we need a new page
  if (lastY3 > 250) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Attendance History', 14, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [['Meeting Date', 'Type', 'Status', 'Check-in Time', 'Fine']],
      body: memberData.attendance.map((a: any) => [
        new Date(a.meetings?.meeting_date || a.created_at).toLocaleDateString(),
        a.meetings?.meeting_type || 'Regular',
        a.status,
        a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : '-',
        a.fine_amount ? formatCurrency(parseFloat(a.fine_amount)) : '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
    });
  } else {
    doc.setFontSize(12);
    doc.text('Attendance History', 14, lastY3 + 15);
    
    autoTable(doc, {
      startY: lastY3 + 20,
      head: [['Meeting Date', 'Type', 'Status', 'Check-in Time', 'Fine']],
      body: memberData.attendance.map((a: any) => [
        new Date(a.meetings?.meeting_date || a.created_at).toLocaleDateString(),
        a.meetings?.meeting_type || 'Regular',
        a.status,
        a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : '-',
        a.fine_amount ? formatCurrency(parseFloat(a.fine_amount)) : '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
    });
  }
  
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
