import { describe, it, expect } from 'vitest';
import {
  calculateComplianceRate,
  calculateInspectionStats,
  aggregateInspectionStats,
  getStatusLabel,
  getStatusColor,
  calculateTrendData
} from '../src/lib/kpi.js';

describe('KPI Calculations', () => {
  describe('calculateComplianceRate', () => {
    it('should return 0 for empty responses', () => {
      expect(calculateComplianceRate({})).toBe(0);
      expect(calculateComplianceRate(null)).toBe(0);
    });

    it('should calculate compliance rate correctly', () => {
      const responses = {
        1: { conforme: true, observation: '' },
        2: { conforme: true, observation: '' },
        3: { conforme: false, observation: '' }
      };
      expect(calculateComplianceRate(responses)).toBe(67);
    });

    it('should handle all conforme responses', () => {
      const responses = {
        1: { conforme: true, observation: '' },
        2: { conforme: true, observation: '' }
      };
      expect(calculateComplianceRate(responses)).toBe(100);
    });

    it('should handle all non-conforme responses', () => {
      const responses = {
        1: { conforme: false, observation: '' },
        2: { conforme: false, observation: '' }
      };
      expect(calculateComplianceRate(responses)).toBe(0);
    });

    it('should ignore unanswered questions', () => {
      const responses = {
        1: { conforme: true, observation: '' },
        2: { conforme: null, observation: '' },
        3: { conforme: false, observation: '' }
      };
      // Only 1 and 3 answered: 1/2 = 50%
      expect(calculateComplianceRate(responses)).toBe(50);
    });
  });

  describe('calculateInspectionStats', () => {
    it('should return null for null inspection', () => {
      expect(calculateInspectionStats(null)).toBeNull();
    });

    it('should calculate stats from inspection progress', () => {
      const inspection = {
        id: '1',
        progress: {
          total: 100,
          answered: 80,
          conforme: 60,
          non_conforme: 20
        }
      };
      const stats = calculateInspectionStats(inspection);
      expect(stats.total_criteria).toBe(100);
      expect(stats.answered).toBe(80);
      expect(stats.conforme).toBe(60);
      expect(stats.non_conforme).toBe(20);
      expect(stats.compliance_rate).toBe(75); // 60/80
      expect(stats.completion_rate).toBe(80); // 80/100
    });

    it('should handle zero answered questions', () => {
      const inspection = {
        id: '1',
        progress: {
          total: 100,
          answered: 0,
          conforme: 0,
          non_conforme: 0
        }
      };
      const stats = calculateInspectionStats(inspection);
      expect(stats.compliance_rate).toBe(0);
      expect(stats.completion_rate).toBe(0);
    });

    it('should handle missing progress field', () => {
      const inspection = { id: '1' };
      const stats = calculateInspectionStats(inspection);
      expect(stats.total_criteria).toBe(0);
      expect(stats.compliance_rate).toBe(0);
    });
  });

  describe('aggregateInspectionStats', () => {
    it('should return zeros for empty inspections', () => {
      const stats = aggregateInspectionStats([]);
      expect(stats.total_inspections).toBe(0);
      expect(stats.total_criteria).toBe(0);
      expect(stats.average_compliance_rate).toBe(0);
    });

    it('should aggregate multiple inspections', () => {
      const inspections = [
        {
          id: '1',
          status: 'completed',
          progress: {
            total: 100,
            answered: 100,
            conforme: 80,
            non_conforme: 20
          }
        },
        {
          id: '2',
          status: 'completed',
          progress: {
            total: 100,
            answered: 100,
            conforme: 90,
            non_conforme: 10
          }
        }
      ];
      const stats = aggregateInspectionStats(inspections);
      expect(stats.total_inspections).toBe(2);
      expect(stats.by_status.completed).toBe(2);
      expect(stats.total_criteria).toBe(200);
      expect(stats.total_conforme).toBe(170);
      expect(stats.total_non_conforme).toBe(30);
      expect(stats.average_compliance_rate).toBe(85); // (80+90)/2
    });

    it('should count inspections by status', () => {
      const inspections = [
        { id: '1', status: 'draft', progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 } },
        { id: '2', status: 'in_progress', progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 } },
        { id: '3', status: 'completed', progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 } },
        { id: '4', status: 'completed', progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 } }
      ];
      const stats = aggregateInspectionStats(inspections);
      expect(stats.by_status.draft).toBe(1);
      expect(stats.by_status.in_progress).toBe(1);
      expect(stats.by_status.completed).toBe(2);
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getStatusLabel('draft')).toBe('Brouillon');
      expect(getStatusLabel('in_progress')).toBe('En cours');
      expect(getStatusLabel('completed')).toBe('Terminée');
      expect(getStatusLabel('validated')).toBe('Validée');
      expect(getStatusLabel('archived')).toBe('Archivée');
    });

    it('should return status as-is for unknown status', () => {
      expect(getStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors', () => {
      expect(getStatusColor('draft')).toBe('#A0A0A0');
      expect(getStatusColor('in_progress')).toBe('#FF9500');
      expect(getStatusColor('completed')).toBe('#34C759');
      expect(getStatusColor('validated')).toBe('#007AFF');
      expect(getStatusColor('archived')).toBe('#8E8E93');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#000000');
    });
  });

  describe('calculateTrendData', () => {
    it('should return empty array for no inspections', () => {
      expect(calculateTrendData([])).toEqual([]);
      expect(calculateTrendData(null)).toEqual([]);
    });

    it('should group inspections by date', () => {
      const inspections = [
        {
          id: '1',
          date_inspection: '2024-01-15',
          progress: { total: 100, answered: 100, conforme: 80, non_conforme: 20 }
        },
        {
          id: '2',
          date_inspection: '2024-01-15',
          progress: { total: 100, answered: 100, conforme: 90, non_conforme: 10 }
        },
        {
          id: '3',
          date_inspection: '2024-01-16',
          progress: { total: 100, answered: 100, conforme: 70, non_conforme: 30 }
        }
      ];
      const trend = calculateTrendData(inspections);
      expect(trend.length).toBe(2);
      expect(trend[0].date).toBe('2024-01-15');
      expect(trend[0].compliance_rate).toBe(85); // (80+90)/2
      expect(trend[0].total_inspections).toBe(2);
      expect(trend[1].date).toBe('2024-01-16');
      expect(trend[1].compliance_rate).toBe(70);
    });

    it('should sort by date ascending', () => {
      const inspections = [
        {
          id: '1',
          date_inspection: '2024-01-20',
          progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 }
        },
        {
          id: '2',
          date_inspection: '2024-01-10',
          progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 }
        }
      ];
      const trend = calculateTrendData(inspections);
      expect(trend[0].date).toBe('2024-01-10');
      expect(trend[1].date).toBe('2024-01-20');
    });
  });
});
