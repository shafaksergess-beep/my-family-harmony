// Utility functions for exporting data to CSV format

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Format data for different export types
export const formatContributionsForExport = (contributions: any[]) => {
  return contributions.map(c => ({
    Date: new Date(c.contribution_date).toLocaleDateString(),
    Member: c.family_members?.profiles?.full_name || 'N/A',
    Type: c.type,
    Amount: parseFloat(c.amount.toString()).toLocaleString(),
    Status: c.status,
    'Late Fine': c.late_fine ? parseFloat(c.late_fine.toString()).toLocaleString() : '0',
    'Payment Date': c.payment_date ? new Date(c.payment_date).toLocaleDateString() : 'N/A',
  }));
};

export const formatLoansForExport = (loans: any[]) => {
  return loans.map(l => ({
    Member: l.family_members?.profiles?.full_name || 'N/A',
    Purpose: l.purpose,
    Amount: parseFloat(l.amount.toString()).toLocaleString(),
    'Interest Rate': `${l.interest_rate}%`,
    'Term (months)': l.term_months,
    Status: l.status,
    'Amount Paid': parseFloat(l.amount_paid.toString()).toLocaleString(),
    'Interest Paid': parseFloat(l.interest_paid.toString()).toLocaleString(),
    'Due Date': l.due_date ? new Date(l.due_date).toLocaleDateString() : 'N/A',
  }));
};

export const formatSavingsForExport = (savings: any[]) => {
  return savings.map(s => ({
    Member: s.family_members?.profiles?.full_name || 'N/A',
    Month: new Date(s.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    Amount: parseFloat(s.amount.toString()).toLocaleString(),
    Notes: s.notes || '',
  }));
};

export const formatAttendanceForExport = (attendance: any[]) => {
  return attendance.map(a => ({
    Meeting: new Date(a.meetings?.meeting_date).toLocaleDateString(),
    Member: a.family_members?.profiles?.full_name || 'N/A',
    Status: a.status,
    'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : 'N/A',
    'Lateness (min)': a.lateness_minutes || '0',
    'Fine Amount': parseFloat(a.fine_amount.toString()).toLocaleString(),
    'Excuse Reason': a.excuse_reason || '',
  }));
};

export const formatActivityLogsForExport = (logs: any[]) => {
  return logs.map(log => ({
    Date: new Date(log.created_at).toLocaleString(),
    Admin: log.admin_profile?.full_name || 'Unknown',
    Email: log.admin_profile?.email || 'N/A',
    Action: log.action_type,
    Entity: log.entity_type,
    'Entity ID': log.entity_id || 'N/A',
    Details: JSON.stringify(log.details || {}),
    'IP Address': log.ip_address || 'N/A',
  }));
};

export const formatFamiliesForExport = (families: any[]) => {
  return families.map(f => ({
    Name: f.name,
    Slug: f.slug,
    Description: f.description || '',
    Status: f.is_active ? 'Active' : 'Inactive',
    'Created At': new Date(f.created_at).toLocaleString(),
  }));
};

export const formatMembersForExport = (members: any[]) => {
  return members.map(m => ({
    Name: m.profiles?.full_name || 'Unknown',
    Email: m.profiles?.email || 'N/A',
    Role: m.role,
    House: m.house_name || 'N/A',
    'Joined At': new Date(m.joined_at || m.created_at).toLocaleString(),
  }));
};

export const exportMembersToCSV = (members: any[]) => {
  const exportData = members.map((member) => ({
    "Full Name": member.profiles?.full_name || member.profile?.full_name || "",
    "Email": member.profiles?.email || member.profile?.email || "",
    "Phone": member.profiles?.phone || member.profile?.phone || "",
    "Role": member.role,
    "House Name": member.house_name || "",
    "House Representative": member.is_house_representative ? "Yes" : "No",
    "Working": member.profiles?.is_working || member.profile?.is_working ? "Yes" : "No",
  }));

  exportToCSV(exportData, `family-members-${new Date().toISOString().split("T")[0]}`);
};

export const exportContributionsToCSV = (contributions: any[]) => {
  const exportData = contributions.map((contrib) => ({
    "Member": contrib.member?.profiles?.full_name || "",
    "Amount": contrib.amount,
    "Type": contrib.type,
    "Status": contrib.status,
    "Contribution Date": contrib.contribution_date,
    "Payment Date": contrib.payment_date || "",
    "Late Fine": contrib.late_fine || 0,
    "Notes": contrib.notes || "",
  }));

  exportToCSV(exportData, `contributions-${new Date().toISOString().split("T")[0]}`);
};

export const exportLoansToCSV = (loans: any[]) => {
  const exportData = loans.map((loan) => ({
    "Member": loan.member?.profiles?.full_name || "",
    "Amount": loan.amount,
    "Interest Rate": loan.interest_rate,
    "Term (Months)": loan.term_months,
    "Status": loan.status,
    "Amount Paid": loan.amount_paid || 0,
    "Interest Paid": loan.interest_paid || 0,
    "Purpose": loan.purpose,
    "Approved At": loan.approved_at || "",
    "Due Date": loan.due_date || "",
  }));

  exportToCSV(exportData, `loans-${new Date().toISOString().split("T")[0]}`);
};

export const exportSavingsToCSV = (savings: any[]) => {
  const exportData = savings.map((saving) => ({
    "Member": saving.member?.profiles?.full_name || "",
    "Amount": saving.amount,
    "Month": saving.month,
    "Notes": saving.notes || "",
  }));

  exportToCSV(exportData, `savings-${new Date().toISOString().split("T")[0]}`);
};

export const exportFinancialSummaryToCSV = (summary: any) => {
  const exportData = [
    {
      "Metric": "Total Contributions",
      "Value": summary.totalContributions || 0,
    },
    {
      "Metric": "Total Savings",
      "Value": summary.totalSavings || 0,
    },
    {
      "Metric": "Total Loans",
      "Value": summary.totalLoans || 0,
    },
    {
      "Metric": "Outstanding Loans",
      "Value": summary.outstandingLoans || 0,
    },
    {
      "Metric": "Total Shares Value",
      "Value": summary.totalSharesValue || 0,
    },
    {
      "Metric": "Total Dividends",
      "Value": summary.totalDividends || 0,
    },
  ];

  exportToCSV(exportData, `financial-summary-${new Date().toISOString().split("T")[0]}`);
};
