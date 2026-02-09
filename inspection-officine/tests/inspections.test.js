import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInspection,
  listInspections,
  getInspection,
  getResponses,
  saveResponse,
  setInspectionStatus,
  deleteInspection,
  filterInspectionsByStatus,
  filterInspectionsByGrid,
  filterInspectionsByEstablishment,
  sortInspectionsByDate,
  sortInspectionsByStatus
} from '../src/lib/inspections.js';
import { initDB, DB } from '../src/lib/api.js';
import { login } from '../src/lib/auth.js';

describe('Inspections', () => {
  let session;

  beforeEach(async () => {
    initDB();
    session = await login('admin', 'admin123');
  });

  describe('createInspection', () => {
    it('should create new inspection', async () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = await createInspection(req, session);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should set correct status to draft', async () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = await createInspection(req, session);
      const insp = DB.inspections.find(i => i.id === id);
      expect(insp.status).toBe('draft');
    });

    it('should set creator information', async () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = await createInspection(req, session);
      const insp = DB.inspections.find(i => i.id === id);
      expect(insp.created_by).toBe(session.user.id);
      expect(insp.created_by_name).toBe(session.user.full_name);
    });
  });

  describe('listInspections', () => {
    beforeEach(async () => {
      // Create test inspections
      await createInspection({
        grid_id: 'officine',
        establishment: 'Pharmacy 1',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      }, session);

      await createInspection({
        grid_id: 'grossiste',
        establishment: 'Pharmacy 2',
        date_inspection: '2024-01-16',
        inspection_type: 'suivi',
        inspectors: ['Inspector 2']
      }, session);
    });

    it('should list all inspections', async () => {
      const inspections = await listInspections(session, false);
      expect(inspections.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const inspections = await listInspections(session, false, 'draft');
      expect(inspections.every(i => i.status === 'draft')).toBe(true);
    });

    it('should filter myOnly', async () => {
      const inspections = await listInspections(session, true);
      expect(inspections.every(i => i.created_by === session.user.id)).toBe(true);
    });
  });

  describe('getInspection', () => {
    let inspectionId;

    beforeEach(async () => {
      inspectionId = await createInspection({
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      }, session);
    });

    it('should retrieve inspection by id', async () => {
      const insp = await getInspection(inspectionId, session);
      expect(insp).toBeDefined();
      expect(insp.id).toBe(inspectionId);
    });

    it('should return undefined for non-existent id', async () => {
      const insp = await getInspection('non-existent', session);
      expect(insp).toBeUndefined();
    });
  });

  describe('getResponses', () => {
    let inspectionId;

    beforeEach(async () => {
      inspectionId = await createInspection({
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      }, session);
    });

    it('should return empty array for new inspection', async () => {
      const responses = await getResponses(inspectionId, session);
      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBe(0);
    });

    it('should return saved responses', async () => {
      await saveResponse(inspectionId, 1, true, 'OK', session);
      const responses = await getResponses(inspectionId, session);
      expect(responses.length).toBe(1);
      expect(responses[0].criterion_id).toBe(1);
      expect(responses[0].conforme).toBe(true);
    });
  });

  describe('saveResponse', () => {
    let inspectionId;

    beforeEach(async () => {
      inspectionId = await createInspection({
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      }, session);
    });

    it('should save conforme response', async () => {
      await saveResponse(inspectionId, 1, true, 'Observation', session);
      const responses = await getResponses(inspectionId, session);
      const response = responses.find(r => r.criterion_id === 1);
      expect(response.conforme).toBe(true);
      expect(response.observation).toBe('Observation');
    });

    it('should save non-conforme response', async () => {
      await saveResponse(inspectionId, 1, false, 'Non conforme', session);
      const responses = await getResponses(inspectionId, session);
      const response = responses.find(r => r.criterion_id === 1);
      expect(response.conforme).toBe(false);
    });

    it('should transition status to in_progress', async () => {
      let insp = await getInspection(inspectionId, session);
      expect(insp.status).toBe('draft');

      await saveResponse(inspectionId, 1, true, '', session);
      insp = await getInspection(inspectionId, session);
      expect(insp.status).toBe('in_progress');
    });

    it('should update existing response', async () => {
      await saveResponse(inspectionId, 1, true, 'First', session);
      await saveResponse(inspectionId, 1, false, 'Updated', session);
      const responses = await getResponses(inspectionId, session);
      const response = responses.find(r => r.criterion_id === 1);
      expect(response.conforme).toBe(false);
      expect(response.observation).toBe('Updated');
    });
  });

  describe('setInspectionStatus', () => {
    let inspectionId;

    beforeEach(async () => {
      inspectionId = await createInspection({
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      }, session);
    });

    it('should set status to completed', async () => {
      await setInspectionStatus(inspectionId, 'completed', session);
      const insp = await getInspection(inspectionId, session);
      expect(insp.status).toBe('completed');
    });

    it('should set status to validated', async () => {
      await setInspectionStatus(inspectionId, 'validated', session);
      const insp = await getInspection(inspectionId, session);
      expect(insp.status).toBe('validated');
      expect(insp.validated_by).toBe(session.user.id);
      expect(insp.validated_by_name).toBe(session.user.full_name);
    });

    it('should set status to archived', async () => {
      await setInspectionStatus(inspectionId, 'archived', session);
      const insp = await getInspection(inspectionId, session);
      expect(insp.status).toBe('archived');
    });
  });

  describe('deleteInspection', () => {
    let inspectionId;

    beforeEach(async () => {
      inspectionId = await createInspection({
        grid_id: 'officine',
        establishment: 'Pharmacy Test',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      }, session);
    });

    it('should delete inspection', async () => {
      await deleteInspection(inspectionId, session);
      const insp = await getInspection(inspectionId, session);
      expect(insp).toBeUndefined();
    });

    it('should delete responses', async () => {
      await saveResponse(inspectionId, 1, true, '', session);
      await deleteInspection(inspectionId, session);
      expect(DB.responses[inspectionId]).toBeUndefined();
    });
  });

  describe('Filtering', () => {
    const mockInspections = [
      {
        id: '1',
        grid_id: 'officine',
        status: 'draft',
        establishment: 'Pharmacy ABC',
        date_inspection: '2024-01-15'
      },
      {
        id: '2',
        grid_id: 'grossiste',
        status: 'in_progress',
        establishment: 'Grossiste XYZ',
        date_inspection: '2024-01-16'
      },
      {
        id: '3',
        grid_id: 'officine',
        status: 'completed',
        establishment: 'Pharmacy DEF',
        date_inspection: '2024-01-17'
      }
    ];

    it('should filter by status', () => {
      const filtered = filterInspectionsByStatus(mockInspections, 'draft');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should return all if no status filter', () => {
      const filtered = filterInspectionsByStatus(mockInspections, null);
      expect(filtered.length).toBe(3);
    });

    it('should filter by grid', () => {
      const filtered = filterInspectionsByGrid(mockInspections, 'officine');
      expect(filtered.length).toBe(2);
      expect(filtered.every(i => i.grid_id === 'officine')).toBe(true);
    });

    it('should filter by establishment', () => {
      const filtered = filterInspectionsByEstablishment(mockInspections, 'ABC');
      expect(filtered.length).toBe(1);
      expect(filtered[0].establishment).toContain('ABC');
    });

    it('should filter case-insensitive', () => {
      const filtered = filterInspectionsByEstablishment(mockInspections, 'pharmacy');
      expect(filtered.length).toBe(2);
    });
  });

  describe('Sorting', () => {
    const mockInspections = [
      { id: '1', status: 'draft', date_inspection: '2024-01-17' },
      { id: '2', status: 'in_progress', date_inspection: '2024-01-15' },
      { id: '3', status: 'completed', date_inspection: '2024-01-16' }
    ];

    it('should sort by date descending', () => {
      const sorted = sortInspectionsByDate(mockInspections, false);
      expect(sorted[0].id).toBe('1');
      expect(sorted[2].id).toBe('2');
    });

    it('should sort by date ascending', () => {
      const sorted = sortInspectionsByDate(mockInspections, true);
      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });

    it('should sort by status', () => {
      const sorted = sortInspectionsByStatus(mockInspections);
      expect(sorted[0].status).toBe('draft');
      expect(sorted[1].status).toBe('in_progress');
      expect(sorted[2].status).toBe('completed');
    });
  });
});
