/**
 * Export utilities (CSV, JSON)
 */

export function exportToCSV(inspections, gridMap = {}) {
  if (!inspections || inspections.length === 0) {
    return '';
  }

  const headers = [
    'Établissement',
    'Grille',
    'Inspecteur(s)',
    'Date',
    'Statut',
    'Total critères',
    'Réponses',
    'Conforme',
    'Non-conforme',
    '% Conformité'
  ];

  const rows = inspections.map(insp => {
    const grid = gridMap[insp.grid_id];
    const gridName = grid ? grid.name : insp.grid_id;
    const progress = insp.progress || { total: 0, answered: 0, conforme: 0, non_conforme: 0 };
    const complianceRate =
      progress.answered === 0
        ? 0
        : Math.round((progress.conforme / progress.answered) * 100);

    return [
      escapeCSV(insp.establishment),
      escapeCSV(gridName),
      escapeCSV(insp.inspectors.join(', ')),
      insp.date_inspection,
      getStatusLabel(insp.status),
      progress.total,
      progress.answered,
      progress.conforme,
      progress.non_conforme,
      complianceRate + '%'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

export function exportToJSON(inspections, responses = {}) {
  if (!inspections || inspections.length === 0) {
    return JSON.stringify([]);
  }

  const data = inspections.map(insp => {
    const progress = insp.progress || { total: 0, answered: 0, conforme: 0, non_conforme: 0 };
    const complianceRate =
      progress.answered === 0
        ? 0
        : Math.round((progress.conforme / progress.answered) * 100);

    const inspecResponses = responses[insp.id] || [];

    return {
      id: insp.id,
      establishment: insp.establishment,
      grid_id: insp.grid_id,
      inspection_type: insp.inspection_type,
      date_inspection: insp.date_inspection,
      status: insp.status,
      inspectors: insp.inspectors,
      created_by: insp.created_by,
      created_by_name: insp.created_by_name,
      created_at: insp.created_at,
      validated_by: insp.validated_by,
      validated_by_name: insp.validated_by_name,
      validated_at: insp.validated_at,
      progress: {
        total_criteria: progress.total,
        answered: progress.answered,
        conforme: progress.conforme,
        non_conforme: progress.non_conforme,
        completion_rate: progress.total === 0 ? 0 :
          Math.round((progress.answered / progress.total) * 100),
        compliance_rate: complianceRate
      },
      responses: inspecResponses
    };
  });

  return JSON.stringify(data, null, 2);
}

export function exportInspectionReport(inspection, responses = []) {
  if (!inspection) {
    return JSON.stringify({});
  }

  const progress = inspection.progress || { total: 0, answered: 0, conforme: 0, non_conforme: 0 };
  const complianceRate =
    progress.answered === 0
      ? 0
      : Math.round((progress.conforme / progress.answered) * 100);

  return JSON.stringify(
    {
      inspection: {
        id: inspection.id,
        establishment: inspection.establishment,
        grid_id: inspection.grid_id,
        inspection_type: inspection.inspection_type,
        date_inspection: inspection.date_inspection,
        status: inspection.status,
        inspectors: inspection.inspectors,
        created_by: inspection.created_by,
        created_by_name: inspection.created_by_name,
        created_at: inspection.created_at,
        validated_by: inspection.validated_by,
        validated_by_name: inspection.validated_by_name,
        validated_at: inspection.validated_at
      },
      summary: {
        total_criteria: progress.total,
        answered: progress.answered,
        pending: progress.total - progress.answered,
        conforme: progress.conforme,
        non_conforme: progress.non_conforme,
        completion_rate: progress.total === 0 ? 0 :
          Math.round((progress.answered / progress.total) * 100),
        compliance_rate: complianceRate
      },
      responses: responses
    },
    null,
    2
  );
}

function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function getStatusLabel(status) {
  const labels = {
    draft: 'Brouillon',
    in_progress: 'En cours',
    completed: 'Terminée',
    validated: 'Validée',
    archived: 'Archivée'
  };
  return labels[status] || status;
}
