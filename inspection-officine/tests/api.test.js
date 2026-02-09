import { describe, it, expect, beforeEach } from 'vitest';
import { invoke, fallbackInvoke, initDB, DB, now } from '../src/lib/api.js';

describe('API - Fallback Database', () => {
  beforeEach(() => {
    DB.users = [];
    DB.inspections = [];
    DB.responses = {};
    DB.audit = [];
    DB.sessions = {};
  });

  describe('initDB', () => {
    it('should create default admin user', () => {
      initDB();
      expect(DB.users.length).toBeGreaterThan(0);
      const admin = DB.users.find(u => u.username === 'admin');
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
    });

    it('should not duplicate users on multiple calls', () => {
      initDB();
      const count1 = DB.users.length;
      initDB();
      const count2 = DB.users.length;
      expect(count1).toBe(count2);
    });
  });

  describe('now', () => {
    it('should return ISO datetime string', () => {
      const timestamp = now();
      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Login command', () => {
    beforeEach(() => initDB());

    it('should return session info on valid login', () => {
      const result = fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('admin');
    });

    it('should reject invalid credentials', () => {
      expect(() => {
        fallbackInvoke('cmd_login', { username: 'admin', password: 'wrong' });
      }).toThrow('Identifiants incorrects');
    });

    it('should add audit log on login', () => {
      const auditCount = DB.audit.length;
      fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
      expect(DB.audit.length).toBe(auditCount + 1);
      expect(DB.audit[0].action).toBe('LOGIN');
    });
  });

  describe('Session management', () => {
    beforeEach(() => initDB());

    it('should validate valid session', () => {
      const session = fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
      const user = fallbackInvoke('cmd_validate_session', { token: session.token });
      expect(user.username).toBe('admin');
    });

    it('should reject invalid session', () => {
      expect(() => {
        fallbackInvoke('cmd_validate_session', { token: 'invalid-token' });
      }).toThrow('Session invalide');
    });

    it('should logout session', () => {
      const session = fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
      fallbackInvoke('cmd_logout', { token: session.token });
      expect(() => {
        fallbackInvoke('cmd_validate_session', { token: session.token });
      }).toThrow('Session invalide');
    });
  });

  describe('User management', () => {
    let session;

    beforeEach(() => {
      initDB();
      session = fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
    });

    it('should list users', () => {
      const users = fallbackInvoke('cmd_list_users', { token: session.token });
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should create user', () => {
      const req = {
        username: 'newuser',
        full_name: 'New User',
        role: 'inspector',
        password: 'password123'
      };
      const user = fallbackInvoke('cmd_create_user', { token: session.token, req });
      expect(user.id).toBeDefined();
      expect(user.username).toBe('newuser');
      expect(user.role).toBe('inspector');
    });

    it('should update user', () => {
      const req = {
        username: 'updateuser',
        full_name: 'Update User',
        role: 'inspector',
        password: 'pass'
      };
      const newUser = fallbackInvoke('cmd_create_user', { token: session.token, req });
      fallbackInvoke('cmd_update_user', {
        token: session.token,
        userId: newUser.id,
        req: { full_name: 'Updated Name', role: 'lead_inspector' }
      });
      const updated = DB.users.find(u => u.id === newUser.id);
      expect(updated.full_name).toBe('Updated Name');
      expect(updated.role).toBe('lead_inspector');
    });

    it('should deactivate user', () => {
      const req = {
        username: 'deluser',
        full_name: 'Delete User',
        role: 'inspector',
        password: 'pass'
      };
      const user = fallbackInvoke('cmd_create_user', { token: session.token, req });
      fallbackInvoke('cmd_delete_user', { token: session.token, userId: user.id });
      const deleted = DB.users.find(u => u.id === user.id);
      expect(deleted.active).toBe(false);
    });
  });

  describe('Inspections', () => {
    let session;

    beforeEach(() => {
      initDB();
      session = fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
    });

    it('should create inspection', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Test Pharmacy',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = fallbackInvoke('cmd_create_inspection', { token: session.token, req, session });
      expect(typeof id).toBe('string');
      expect(DB.inspections.find(i => i.id === id)).toBeDefined();
    });

    it('should list inspections', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Test Pharmacy',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      fallbackInvoke('cmd_create_inspection', { token: session.token, req, session });
      const list = fallbackInvoke('cmd_list_inspections', { token: session.token, myOnly: false, session });
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('should get inspection', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Test Pharmacy',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = fallbackInvoke('cmd_create_inspection', { token: session.token, req, session });
      const insp = fallbackInvoke('cmd_get_inspection', { token: session.token, inspectionId: id });
      expect(insp.id).toBe(id);
      expect(insp.establishment).toBe('Test Pharmacy');
    });

    it('should save response', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Test Pharmacy',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = fallbackInvoke('cmd_create_inspection', { token: session.token, req, session });
      fallbackInvoke('cmd_save_response', {
        token: session.token,
        inspectionId: id,
        criterionId: 1,
        conforme: true,
        observation: 'OK',
        session
      });
      const responses = fallbackInvoke('cmd_get_responses', { token: session.token, inspectionId: id });
      expect(responses.length).toBeGreaterThan(0);
      expect(responses[0].conforme).toBe(true);
    });

    it('should set inspection status', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Test Pharmacy',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = fallbackInvoke('cmd_create_inspection', { token: session.token, req, session });
      fallbackInvoke('cmd_set_inspection_status', {
        token: session.token,
        inspectionId: id,
        status: 'completed',
        session
      });
      const insp = fallbackInvoke('cmd_get_inspection', { token: session.token, inspectionId: id });
      expect(insp.status).toBe('completed');
    });

    it('should delete inspection', () => {
      const req = {
        grid_id: 'officine',
        establishment: 'Test Pharmacy',
        date_inspection: '2024-01-15',
        inspection_type: 'initiale',
        inspectors: ['Inspector 1']
      };
      const id = fallbackInvoke('cmd_create_inspection', { token: session.token, req, session });
      fallbackInvoke('cmd_delete_inspection', { token: session.token, inspectionId: id });
      expect(DB.inspections.find(i => i.id === id)).toBeUndefined();
    });
  });

  describe('Audit trail', () => {
    let session;

    beforeEach(() => {
      initDB();
      session = fallbackInvoke('cmd_login', { username: 'admin', password: 'admin123' });
    });

    it('should query audit logs', () => {
      const logs = fallbackInvoke('cmd_query_audit', {
        token: session.token,
        filter: { limit: 100, offset: 0 }
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should count audit logs', () => {
      const count = fallbackInvoke('cmd_count_audit', { token: session.token, filter: {} });
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Grids', () => {
    it('should list grids', () => {
      const grids = fallbackInvoke('list_grids', {});
      expect(Array.isArray(grids)).toBe(true);
      expect(grids.length).toBeGreaterThan(0);
      expect(grids[0]).toHaveProperty('id');
      expect(grids[0]).toHaveProperty('sections');
    });

    it('should get grid', () => {
      const grids = fallbackInvoke('list_grids', {});
      const gridId = grids[0].id;
      const grid = fallbackInvoke('get_grid', { gridId });
      expect(grid).toBeDefined();
      expect(grid.id).toBe(gridId);
    });
  });

  describe('invoke function', () => {
    beforeEach(() => initDB());

    it('should use fallback when no Tauri', async () => {
      const result = await invoke('cmd_login', { username: 'admin', password: 'admin123' }, false);
      expect(result.token).toBeDefined();
    });
  });
});
