import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  validatePassword,
  validateEmail,
  validateRole,
  validateInspectionStatus,
  validateEstablishment,
  validateDateInspection,
  validateInspectionType,
  validateCriterionResponse,
  validateInspectionCreate
} from '../src/lib/validation.js';

describe('Validation', () => {
  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toEqual({ valid: true, value: 'john_doe' });
      expect(validateUsername('user123')).toEqual({ valid: true, value: 'user123' });
      expect(validateUsername('admin-user')).toEqual({ valid: true, value: 'admin-user' });
    });

    it('should reject empty username', () => {
      const result = validateUsername('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject null/undefined username', () => {
      expect(validateUsername(null).valid).toBe(false);
      expect(validateUsername(undefined).valid).toBe(false);
    });

    it('should reject too short username', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum 3');
    });

    it('should reject too long username', () => {
      const longName = 'a'.repeat(51);
      const result = validateUsername(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum 50');
    });

    it('should reject invalid characters', () => {
      const result = validateUsername('user@name');
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateUsername('  admin  ')).toEqual({ valid: true, value: 'admin' });
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(validatePassword('password123')).toEqual({ valid: true, value: 'password123' });
      expect(validatePassword('MyPassword!')).toEqual({ valid: true, value: 'MyPassword!' });
    });

    it('should reject empty password', () => {
      expect(validatePassword('').valid).toBe(false);
    });

    it('should reject null/undefined password', () => {
      expect(validatePassword(null).valid).toBe(false);
      expect(validatePassword(undefined).valid).toBe(false);
    });

    it('should reject too short password', () => {
      const result = validatePassword('pass');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum 6');
    });

    it('should reject too long password', () => {
      const longPass = 'a'.repeat(101);
      const result = validatePassword(longPass);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toEqual({
        valid: true,
        value: 'user@example.com'
      });
      expect(validateEmail('john.doe@test.co.uk')).toEqual({
        valid: true,
        value: 'john.doe@test.co.uk'
      });
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('notanemail').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
    });

    it('should reject empty/null email', () => {
      expect(validateEmail('').valid).toBe(false);
      expect(validateEmail(null).valid).toBe(false);
    });
  });

  describe('validateRole', () => {
    it('should accept valid roles', () => {
      expect(validateRole('admin')).toEqual({ valid: true, value: 'admin' });
      expect(validateRole('lead_inspector')).toEqual({ valid: true, value: 'lead_inspector' });
      expect(validateRole('inspector')).toEqual({ valid: true, value: 'inspector' });
      expect(validateRole('viewer')).toEqual({ valid: true, value: 'viewer' });
    });

    it('should reject invalid roles', () => {
      const result = validateRole('superadmin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalide');
    });
  });

  describe('validateInspectionStatus', () => {
    it('should accept valid statuses', () => {
      expect(validateInspectionStatus('draft')).toEqual({ valid: true, value: 'draft' });
      expect(validateInspectionStatus('in_progress')).toEqual({ valid: true, value: 'in_progress' });
      expect(validateInspectionStatus('completed')).toEqual({ valid: true, value: 'completed' });
      expect(validateInspectionStatus('validated')).toEqual({ valid: true, value: 'validated' });
      expect(validateInspectionStatus('archived')).toEqual({ valid: true, value: 'archived' });
    });

    it('should reject invalid statuses', () => {
      const result = validateInspectionStatus('pending');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEstablishment', () => {
    it('should accept valid establishments', () => {
      expect(validateEstablishment('Pharmacie Centrale')).toEqual({
        valid: true,
        value: 'Pharmacie Centrale'
      });
    });

    it('should trim whitespace', () => {
      expect(validateEstablishment('  Pharmacy  ')).toEqual({
        valid: true,
        value: 'Pharmacy'
      });
    });

    it('should reject empty/null', () => {
      expect(validateEstablishment('').valid).toBe(false);
      expect(validateEstablishment(null).valid).toBe(false);
    });

    it('should reject too short', () => {
      const result = validateEstablishment('A');
      expect(result.valid).toBe(false);
    });

    it('should reject too long', () => {
      const longName = 'a'.repeat(201);
      const result = validateEstablishment(longName);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDateInspection', () => {
    it('should accept valid dates', () => {
      expect(validateDateInspection('2024-01-15')).toEqual({
        valid: true,
        value: '2024-01-15'
      });
      expect(validateDateInspection('2024-12-31T23:59:59')).toEqual({
        valid: true,
        value: '2024-12-31T23:59:59'
      });
    });

    it('should reject invalid dates', () => {
      expect(validateDateInspection('not-a-date').valid).toBe(false);
      expect(validateDateInspection(null).valid).toBe(false);
    });
  });

  describe('validateInspectionType', () => {
    it('should accept valid types', () => {
      expect(validateInspectionType('initiale')).toEqual({ valid: true, value: 'initiale' });
      expect(validateInspectionType('suivi')).toEqual({ valid: true, value: 'suivi' });
      expect(validateInspectionType('plainte')).toEqual({ valid: true, value: 'plainte' });
      expect(validateInspectionType('régulière')).toEqual({ valid: true, value: 'régulière' });
    });

    it('should reject invalid types', () => {
      expect(validateInspectionType('custom').valid).toBe(false);
    });
  });

  describe('validateCriterionResponse', () => {
    it('should accept valid responses', () => {
      const result1 = validateCriterionResponse(1, true, 'Observation 1');
      expect(result1.valid).toBe(true);
      expect(result1.value.conforme).toBe(true);

      const result2 = validateCriterionResponse(1, false, '');
      expect(result2.valid).toBe(true);
      expect(result2.value.conforme).toBe(false);

      const result3 = validateCriterionResponse(1, null, '');
      expect(result3.valid).toBe(true);
      expect(result3.value.conforme).toBe(null);
    });

    it('should reject invalid conforme values', () => {
      const result = validateCriterionResponse(1, 'yes', '');
      expect(result.valid).toBe(false);
    });

    it('should reject too long observation', () => {
      const longObs = 'a'.repeat(1001);
      const result = validateCriterionResponse(1, true, longObs);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateInspectionCreate', () => {
    it('should accept valid inspection request', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Pharmacy ABC',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['inspector1', 'inspector2']
      };
      const result = validateInspectionCreate(req);
      expect(result.valid).toBe(true);
    });

    it('should reject missing grid_id', () => {
      const req = {
        establishment: 'Pharmacy ABC',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['inspector1']
      };
      const result = validateInspectionCreate(req);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Grille requise');
    });

    it('should reject missing establishment', () => {
      const req = {
        grid_id: 'officine',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['inspector1']
      };
      const result = validateInspectionCreate(req);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject missing inspectors', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Pharmacy ABC',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: []
      };
      const result = validateInspectionCreate(req);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Au moins un inspecteur requis');
    });
  });
});
