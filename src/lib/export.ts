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
