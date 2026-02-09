import { describe, it, expect } from 'vitest';
import { exportToCSV, exportToJSON, exportInspectionReport } from '../src/lib/export.js';

describe('Export Utilities', () => {
  const mockGridMap = {
    officine: { id: 'officine', name: 'Pharmacie' },
    grossiste: { id: 'grossiste', name: 'Grossiste' }
  };

  const mockInspection = {
    id: 'insp-1',
    establishment: 'Pharmacy ABC',
    grid_id: 'officine',
    inspection_type: 'initiale',
    date_inspection: '2024-01-15',
    status: 'completed',
    inspectors: ['Inspector 1', 'Inspector 2'],
    created_by: 'user-1',
    created_by_name: 'John Doe',
    created_at: '2024-01-15 10:00:00',
    validated_by: null,
    validated_by_name: null,
    validated_at: null,
    progress: {
      total: 100,
      answered: 80,
      conforme: 60,
      non_conforme: 20
    }
  };

  describe('exportToCSV', () => {
    it('should return empty string for no inspections', () => {
      expect(exportToCSV([])).toBe('');
      expect(exportToCSV(null)).toBe('');
    });

    it('should export single inspection to CSV', () => {
      const csv = exportToCSV([mockInspection], mockGridMap);
      expect(csv).toContain('Établissement');
      expect(csv).toContain('Pharmacy ABC');
      expect(csv).toContain('Pharmacie');
      expect(csv).toContain('2024-01-15');
      expect(csv).toContain('Terminée');
      expect(csv).toContain('75%'); // compliance rate: 60/80
    });

    it('should include all headers', () => {
      const csv = exportToCSV([mockInspection], mockGridMap);
      const headers = csv.split('\n')[0];
      expect(headers).toContain('Établissement');
      expect(headers).toContain('Grille');
      expect(headers).toContain('Inspecteur(s)');
      expect(headers).toContain('Date');
      expect(headers).toContain('Statut');
      expect(headers).toContain('Total critères');
      expect(headers).toContain('Réponses');
      expect(headers).toContain('Conforme');
      expect(headers).toContain('Non-conforme');
      expect(headers).toContain('% Conformité');
    });

    it('should escape CSV special characters', () => {
      const inspection = {
        ...mockInspection,
        establishment: 'Pharmacy "ABC" & Co'
      };
      const csv = exportToCSV([inspection], mockGridMap);
      expect(csv).toContain('"Pharmacy ""ABC"" & Co"');
    });

    it('should handle multiple inspections', () => {
      const inspections = [
        mockInspection,
        { ...mockInspection, id: 'insp-2', establishment: 'Pharmacy XYZ' }
      ];
      const csv = exportToCSV(inspections, mockGridMap);
      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // header + 2 rows
      expect(csv).toContain('Pharmacy ABC');
      expect(csv).toContain('Pharmacy XYZ');
    });

    it('should use grid id if grid not in map', () => {
      const csv = exportToCSV([mockInspection], {});
      expect(csv).toContain('officine');
    });

    it('should calculate compliance rate correctly', () => {
      const inspection = {
        ...mockInspection,
        progress: {
          total: 10,
          answered: 10,
          conforme: 5,
          non_conforme: 5
        }
      };
      const csv = exportToCSV([inspection], mockGridMap);
      expect(csv).toContain('50%');
    });

    it('should handle 0% compliance rate', () => {
      const inspection = {
        ...mockInspection,
        progress: {
          total: 10,
          answered: 10,
          conforme: 0,
          non_conforme: 10
        }
      };
      const csv = exportToCSV([inspection], mockGridMap);
      expect(csv).toContain('0%');
    });
  });

  describe('exportToJSON', () => {
    it('should return empty array JSON for no inspections', () => {
      expect(exportToJSON([])).toBe('[]');
      expect(exportToJSON(null)).toBe('[]');
    });

    it('should export single inspection to JSON', () => {
      const json = exportToJSON([mockInspection]);
      const data = JSON.parse(json);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].id).toBe('insp-1');
      expect(data[0].establishment).toBe('Pharmacy ABC');
    });

    it('should include all inspection fields', () => {
      const json = exportToJSON([mockInspection]);
      const data = JSON.parse(json);
      const insp = data[0];
      expect(insp.id).toBeDefined();
      expect(insp.establishment).toBeDefined();
      expect(insp.grid_id).toBeDefined();
      expect(insp.inspection_type).toBeDefined();
      expect(insp.date_inspection).toBeDefined();
      expect(insp.status).toBeDefined();
      expect(insp.inspectors).toBeDefined();
      expect(insp.created_by).toBeDefined();
    });

    it('should include progress stats', () => {
      const json = exportToJSON([mockInspection]);
      const data = JSON.parse(json);
      const insp = data[0];
      expect(insp.progress).toBeDefined();
      expect(insp.progress.total_criteria).toBe(100);
      expect(insp.progress.compliance_rate).toBe(75);
      expect(insp.progress.completion_rate).toBe(80);
    });

    it('should include responses array', () => {
      const json = exportToJSON([mockInspection], { 'insp-1': [] });
      const data = JSON.parse(json);
      expect(data[0].responses).toBeDefined();
      expect(Array.isArray(data[0].responses)).toBe(true);
    });

    it('should export multiple inspections', () => {
      const inspections = [
        mockInspection,
        { ...mockInspection, id: 'insp-2' }
      ];
      const json = exportToJSON(inspections);
      const data = JSON.parse(json);
      expect(data.length).toBe(2);
    });
  });

  describe('exportInspectionReport', () => {
    it('should return empty object JSON for null inspection', () => {
      const json = exportInspectionReport(null);
      expect(JSON.parse(json)).toEqual({});
    });

    it('should export complete inspection report', () => {
      const json = exportInspectionReport(mockInspection);
      const data = JSON.parse(json);
      expect(data.inspection).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.responses).toBeDefined();
    });

    it('should include all inspection metadata', () => {
      const json = exportInspectionReport(mockInspection);
      const data = JSON.parse(json);
      const insp = data.inspection;
      expect(insp.id).toBe('insp-1');
      expect(insp.establishment).toBe('Pharmacy ABC');
      expect(insp.grid_id).toBe('officine');
      expect(insp.status).toBe('completed');
    });

    it('should calculate summary correctly', () => {
      const json = exportInspectionReport(mockInspection);
      const data = JSON.parse(json);
      const summary = data.summary;
      expect(summary.total_criteria).toBe(100);
      expect(summary.answered).toBe(80);
      expect(summary.pending).toBe(20);
      expect(summary.conforme).toBe(60);
      expect(summary.non_conforme).toBe(20);
      expect(summary.compliance_rate).toBe(75);
      expect(summary.completion_rate).toBe(80);
    });

    it('should include responses array', () => {
      const responses = [
        { criterion_id: 1, conforme: true, observation: 'OK' }
      ];
      const json = exportInspectionReport(mockInspection, responses);
      const data = JSON.parse(json);
      expect(data.responses).toEqual(responses);
    });

    it('should handle 0% compliance', () => {
      const inspection = {
        ...mockInspection,
        progress: {
          total: 10,
          answered: 10,
          conforme: 0,
          non_conforme: 10
        }
      };
      const json = exportInspectionReport(inspection);
      const data = JSON.parse(json);
      expect(data.summary.compliance_rate).toBe(0);
    });

    it('should format JSON with indentation', () => {
      const json = exportInspectionReport(mockInspection);
      expect(json).toContain('\n'); // Check for formatting
      expect(json.startsWith('{\n')).toBe(true);
    });
  });
});
