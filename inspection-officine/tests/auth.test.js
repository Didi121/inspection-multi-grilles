import { describe, it, expect, beforeEach } from 'vitest';
import { login, logout, validateSession, getRoleLabel, isAdmin, canManageUsers, canValidateInspections, canCreateInspections } from '../src/lib/auth.js';
import { initDB, DB } from '../src/lib/api.js';

describe('Authentication', () => {
  beforeEach(() => {
    initDB();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const session = await login('admin', 'admin123');
      expect(session).toBeDefined();
      expect(session.token).toBeDefined();
      expect(session.user.username).toBe('admin');
      expect(session.user.role).toBe('admin');
    });

    it('should throw error with invalid username', async () => {
      await expect(async () => {
        await login('', 'admin123');
      }).rejects.toThrow('Nom d\'utilisateur requis');
    });

    it('should throw error with invalid password', async () => {
      await expect(async () => {
        await login('admin', '');
      }).rejects.toThrow('Mot de passe requis');
    });

    it('should throw error with wrong credentials', async () => {
      await expect(async () => {
        await login('admin', 'wrongpass');
      }).rejects.toThrow('Identifiants incorrects');
    });

    it('should throw error with non-existent user', async () => {
      await expect(async () => {
        await login('nonexistent', 'password');
      }).rejects.toThrow('Identifiants incorrects');
    });
  });

  describe('logout', () => {
    it('should throw error without token', async () => {
      await expect(async () => {
        await logout(null);
      }).rejects.toThrow('Token requis');
    });

    it('should logout successfully', async () => {
      const session = await login('admin', 'admin123');
      await expect(logout(session.token)).resolves.toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('should validate valid session', async () => {
      const session = await login('admin', 'admin123');
      const user = await validateSession(session.token);
      expect(user).toBeDefined();
      expect(user.username).toBe('admin');
      expect(user.role).toBe('admin');
    });

    it('should throw error with invalid token', async () => {
      await expect(async () => {
        await validateSession('invalid-token');
      }).rejects.toThrow('Session invalide');
    });

    it('should throw error without token', async () => {
      await expect(async () => {
        await validateSession(null);
      }).rejects.toThrow('Token requis');
    });

    it('should invalidate session after logout', async () => {
      const session = await login('admin', 'admin123');
      await logout(session.token);
      await expect(async () => {
        await validateSession(session.token);
      }).rejects.toThrow('Session invalide');
    });
  });

  describe('roleLabel', () => {
    it('should return correct label for admin', () => {
      expect(getRoleLabel('admin')).toBe('Admin');
    });

    it('should return correct label for lead_inspector', () => {
      expect(getRoleLabel('lead_inspector')).toBe('Inspecteur en chef');
    });

    it('should return correct label for inspector', () => {
      expect(getRoleLabel('inspector')).toBe('Inspecteur');
    });

    it('should return correct label for viewer', () => {
      expect(getRoleLabel('viewer')).toBe('Lecteur');
    });

    it('should return role as-is for unknown role', () => {
      expect(getRoleLabel('custom')).toBe('custom');
    });
  });

  describe('role permissions', () => {
    it('should identify admin correctly', () => {
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('lead_inspector')).toBe(true);
      expect(isAdmin('inspector')).toBe(false);
      expect(isAdmin('viewer')).toBe(false);
    });

    it('should check user management permissions', () => {
      expect(canManageUsers('admin')).toBe(true);
      expect(canManageUsers('lead_inspector')).toBe(true);
      expect(canManageUsers('inspector')).toBe(false);
      expect(canManageUsers('viewer')).toBe(false);
    });

    it('should check inspection validation permissions', () => {
      expect(canValidateInspections('admin')).toBe(true);
      expect(canValidateInspections('lead_inspector')).toBe(true);
      expect(canValidateInspections('inspector')).toBe(false);
      expect(canValidateInspections('viewer')).toBe(false);
    });

    it('should check inspection creation permissions', () => {
      expect(canCreateInspections('admin')).toBe(true);
      expect(canCreateInspections('lead_inspector')).toBe(true);
      expect(canCreateInspections('inspector')).toBe(true);
      expect(canCreateInspections('viewer')).toBe(false);
    });
  });
});
