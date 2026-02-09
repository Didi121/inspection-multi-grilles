/**
 * KPI (Key Performance Indicator) calculations
 */

export function calculateComplianceRate(responses) {
  if (!responses || Object.keys(responses).length === 0) {
    return 0;
  }

  const answered = Object.values(responses).filter(r => r.conforme !== null);
  if (answered.length === 0) return 0;

  const conforme = answered.filter(r => r.conforme === true).length;
  return Math.round((conforme / answered.length) * 100);
}

export function calculateInspectionStats(inspection, responses = {}) {
  if (!inspection) return null;

  const progress = inspection.progress || { total: 0, answered: 0, conforme: 0, non_conforme: 0 };

  const complianceRate = progress.answered === 0 ? 0 :
    Math.round((progress.conforme / progress.answered) * 100);

  return {
    total_criteria: progress.total,
    answered: progress.answered,
    pending: progress.total - progress.answered,
    conforme: progress.conforme,
    non_conforme: progress.non_conforme,
    completion_rate: progress.total === 0 ? 0 :
      Math.round((progress.answered / progress.total) * 100),
    compliance_rate: complianceRate
  };
}

export function aggregateInspectionStats(inspections) {
  if (!inspections || inspections.length === 0) {
    return {
      total_inspections: 0,
      by_status: {},
      total_criteria: 0,
      total_conforme: 0,
      total_non_conforme: 0,
      average_compliance_rate: 0
    };
  }

  const byStatus = {};
  let totalCriteria = 0;
  let totalConforme = 0;
  let totalNonConforme = 0;
  let totalComplianceRates = [];

  inspections.forEach(insp => {
    // Count by status
    byStatus[insp.status] = (byStatus[insp.status] || 0) + 1;

    // Aggregate stats
    const stats = calculateInspectionStats(insp);
    if (stats) {
      totalCriteria += stats.total_criteria;
      totalConforme += stats.conforme;
      totalNonConforme += stats.non_conforme;
      if (stats.compliance_rate >= 0) {
        totalComplianceRates.push(stats.compliance_rate);
      }
    }
  });

  return {
    total_inspections: inspections.length,
    by_status: byStatus,
    total_criteria: totalCriteria,
    total_conforme: totalConforme,
    total_non_conforme: totalNonConforme,
    average_compliance_rate:
      totalComplianceRates.length > 0
        ? Math.round(
            totalComplianceRates.reduce((a, b) => a + b, 0) / totalComplianceRates.length
          )
        : 0
  };
}

export function getStatusLabel(status) {
  const labels = {
    draft: 'Brouillon',
    in_progress: 'En cours',
    completed: 'Terminée',
    validated: 'Validée',
    archived: 'Archivée'
  };
  return labels[status] || status;
}

export function getStatusColor(status) {
  const colors = {
    draft: '#A0A0A0',
    in_progress: '#FF9500',
    completed: '#34C759',
    validated: '#007AFF',
    archived: '#8E8E93'
  };
  return colors[status] || '#000000';
}

export function calculateTrendData(inspections) {
  if (!inspections || inspections.length === 0) {
    return [];
  }

  // Group inspections by date
  const byDate = {};
  inspections.forEach(insp => {
    const date = insp.date_inspection || insp.created_at;
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(insp);
  });

  // Calculate compliance rate per date
  return Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, insps]) => {
      const stats = aggregateInspectionStats(insps);
      return {
        date,
        compliance_rate: stats.average_compliance_rate,
        total_inspections: insps.length
      };
    });
}
