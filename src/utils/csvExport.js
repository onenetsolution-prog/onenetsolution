/**
 * CSV Export utility
 * Converts array of objects to CSV and triggers download
 */

export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get all unique keys from all objects
  const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];

  // Create CSV header
  const header = keys.map(key => `"${key.replace(/"/g, '""')}"`).join(',');

  // Create CSV rows
  const rows = data.map(obj =>
    keys.map(key => {
      const value = obj[key];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      return strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')
        ? `"${strValue.replace(/"/g, '""')}"`
        : strValue;
    }).join(',')
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export service entries to CSV
 */
export function exportEntriesToCSV(entries, services, filename = 'entries.csv') {
  const exportData = entries.map(entry => {
    // Resolve custom field labels
    const customFields = {};
    if (entry.custom_field_values) {
      Object.entries(entry.custom_field_values).forEach(([key, value]) => {
        let label = 'Custom Field';
        for (const svc of (services || [])) {
          const field = (svc.fields || []).find(f => f.field_id === key);
          if (field) { label = field.field_label; break; }
        }
        customFields[label] = value;
      });
    }

    return {
      'Customer Name': entry.customer_name,
      'Mobile': entry.mobile,
      "Father's Name": entry.fathers_name,
      'Service': entry.service_name,
      'Date': entry.entry_date,
      'Work Status': entry.work_status,
      'Payment Status': entry.payment_status,
      'Total Cost': entry.total_cost,
      'Received': entry.received_payment,
      'Pending': entry.pending_payment,
      'Profit': entry.profit,
      'Remark': entry.remark,
      ...customFields
    };
  });

  exportToCSV(exportData, filename);
}

/**
 * Export reports/analytics to CSV
 */
export function exportReportsToCSV(dailyData, serviceData, summaryStats, filename = 'reports.csv') {
  // Build summary section
  const summary = [
    ['SERVICE SUMMARY'],
    ['Metric', 'Value'],
    ['Total Entries', summaryStats.totalEntries],
    ['Total Revenue', summaryStats.totalRevenue],
    ['Total Received', summaryStats.totalReceived],
    ['Total Pending', summaryStats.totalPending],
    ['Total Profit', summaryStats.totalProfit],
    [''],
    ['DAILY BREAKDOWN'],
    ['Date', 'Entries', 'Revenue'],
    ...dailyData.map(d => [d.date, d.entries, d.revenue]),
    [''],
    ['SERVICE DISTRIBUTION'],
    ['Service', 'Count', 'Revenue'],
    ...serviceData.map(s => [s.name, s.value, s.revenue || 0])
  ];

  const csv = summary.map(row =>
    row.map(cell => {
      const strVal = String(cell || '');
      return strVal.includes(',') || strVal.includes('\n') || strVal.includes('"')
        ? `"${strVal.replace(/"/g, '""')}"`
        : strVal;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
