/**
 * API wrapper - abstracts Tauri/Fallback DB calls
 */

// Mock/in-memory fallback database for testing
export const DB = {
  users: [],
  inspections: [],
  responses: {},
  audit: [],
  sessions: {}
};

export function initDB() {
  if (!DB.users.length) {
    const adminId = crypto.randomUUID?.() || 'admin-' + Math.random();
    DB.users.push({
      id: adminId,
      username: 'admin',
      full_name: 'Administrateur',
      role: 'admin',
      active: true,
      password: 'admin123',
      created_at: now(),
      updated_at: now()
    });
  }
}

export function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export function addAuditLog(userId, username, action, entityType, entityId, details) {
  DB.audit.unshift({
    id: DB.audit.length + 1,
    timestamp: now(),
    user_id: userId,
    username,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
}

export async function invoke(cmd, args = {}, useTauri = false) {
  if (useTauri && window.__TAURI__) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  return fallbackInvoke(cmd, args);
}

export function fallbackInvoke(cmd, args = {}) {
  initDB();

  switch (cmd) {
    case 'list_grids':
      return buildAllGridsJS().map(g => ({
        ...g,
        criteria_count: g.sections.reduce((s, sec) => s + sec.items.length, 0),
        section_count: g.sections.length
      }));

    case 'get_grid':
      return buildAllGridsJS().find(g => g.id === args.gridId) || null;

    case 'cmd_login': {
      const u = DB.users.find(
        x => x.username === args.username && x.password === args.password && x.active
      );
      if (!u) throw new Error('Identifiants incorrects');
      const tok = crypto.randomUUID?.() || 'token-' + Math.random();
      DB.sessions[tok] = u.id;
      addAuditLog(u.id, u.username, 'LOGIN', 'session', tok, '');
      return {
        token: tok,
        user: {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          active: u.active,
          created_at: u.created_at,
          updated_at: u.updated_at
        }
      };
    }

    case 'cmd_logout':
      delete DB.sessions[args.token];
      return null;

    case 'cmd_validate_session': {
      const uid = DB.sessions[args.token];
      if (!uid) throw new Error('Session invalide');
      const u = DB.users.find(x => x.id === uid);
      if (!u || !u.active) throw new Error('Session invalide');
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        active: u.active,
        created_at: u.created_at,
        updated_at: u.updated_at
      };
    }

    case 'cmd_list_users':
      return DB.users
        .filter(u => u.active)
        .map(u => ({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          active: u.active,
          created_at: u.created_at,
          updated_at: u.updated_at
        }));

    case 'cmd_create_user': {
      const nu = {
        id: crypto.randomUUID?.() || 'user-' + Math.random(),
        username: args.req.username,
        full_name: args.req.full_name,
        role: args.req.role,
        password: args.req.password,
        active: true,
        created_at: now(),
        updated_at: now()
      };
      DB.users.push(nu);
      addAuditLog(null, null, 'CREATE_USER', 'user', nu.id, nu.username);
      return {
        id: nu.id,
        username: nu.username,
        full_name: nu.full_name,
        role: nu.role,
        active: true,
        created_at: nu.created_at,
        updated_at: nu.updated_at
      };
    }

    case 'cmd_update_user': {
      const u = DB.users.find(x => x.id === args.userId);
      if (u) {
        if (args.req.full_name) u.full_name = args.req.full_name;
        if (args.req.role) u.role = args.req.role;
        if (args.req.active !== undefined) u.active = args.req.active;
        u.updated_at = now();
      }
      return null;
    }

    case 'cmd_change_password': {
      const u = DB.users.find(x => x.id === args.userId);
      if (u) u.password = args.newPassword;
      return null;
    }

    case 'cmd_delete_user': {
      const u = DB.users.find(x => x.id === args.userId);
      if (u) u.active = false;
      return null;
    }

    case 'cmd_create_inspection': {
      const id = crypto.randomUUID?.() || 'insp-' + Math.random();
      const createdBy = args.session?.user?.id || null;
      const createdByName = args.session?.user?.full_name || null;

      DB.inspections.push({
        id,
        grid_id: args.req.grid_id,
        status: 'draft',
        date_inspection: args.req.date_inspection,
        establishment: args.req.establishment,
        inspection_type: args.req.inspection_type,
        inspectors: args.req.inspectors,
        created_by: createdBy,
        created_by_name: createdByName,
        validated_by: null,
        validated_by_name: null,
        validated_at: null,
        created_at: now(),
        updated_at: now(),
        progress: { total: 0, answered: 0, conforme: 0, non_conforme: 0 }
      });
      DB.responses[id] = {};
      addAuditLog(createdBy, createdByName, 'CREATE_INSPECTION', 'inspection', id, args.req.establishment);
      return id;
    }

    case 'cmd_list_inspections': {
      return DB.inspections
        .filter(i => {
          if (args.myOnly && i.created_by !== args.session?.user?.id) return false;
          if (args.status && i.status !== args.status) return false;
          return true;
        })
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }

    case 'cmd_get_inspection':
      return DB.inspections.find(i => i.id === args.inspectionId);

    case 'cmd_get_responses': {
      const r = DB.responses[args.inspectionId] || {};
      return Object.entries(r).map(([cid, v]) => ({
        criterion_id: parseInt(cid),
        conforme: v.conforme,
        observation: v.observation || '',
        updated_by: v.updated_by,
        updated_at: v.updated_at || now()
      }));
    }

    case 'cmd_save_response': {
      if (!DB.responses[args.inspectionId]) DB.responses[args.inspectionId] = {};
      DB.responses[args.inspectionId][args.criterionId] = {
        conforme: args.conforme,
        observation: args.observation,
        updated_by: args.session?.user?.id,
        updated_at: now()
      };

      const insp = DB.inspections.find(i => i.id === args.inspectionId);
      if (insp) {
        insp.status = insp.status === 'draft' ? 'in_progress' : insp.status;
        insp.updated_at = now();

        const r = DB.responses[args.inspectionId];
        const vals = Object.values(r);
        insp.progress = {
          total: Object.keys(r).length,
          answered: vals.filter(v => v.conforme !== null).length,
          conforme: vals.filter(v => v.conforme === true).length,
          non_conforme: vals.filter(v => v.conforme === false).length
        };
      }
      return null;
    }

    case 'cmd_set_inspection_status': {
      const insp = DB.inspections.find(i => i.id === args.inspectionId);
      if (insp) {
        insp.status = args.status;
        insp.updated_at = now();
        if (args.status === 'validated') {
          insp.validated_by = args.session?.user?.id;
          insp.validated_by_name = args.session?.user?.full_name;
          insp.validated_at = now();
        }
      }
      addAuditLog(
        args.session?.user?.id,
        args.session?.user?.username,
        'SET_STATUS_' + args.status.toUpperCase(),
        'inspection',
        args.inspectionId,
        ''
      );
      return null;
    }

    case 'cmd_delete_inspection':
      DB.inspections = DB.inspections.filter(i => i.id !== args.inspectionId);
      delete DB.responses[args.inspectionId];
      return null;

    case 'cmd_query_audit': {
      let logs = [...DB.audit];
      if (args.filter.user_id) logs = logs.filter(l => l.user_id === args.filter.user_id);
      if (args.filter.action) logs = logs.filter(l => l.action === args.filter.action);
      if (args.filter.entity_type) logs = logs.filter(l => l.entity_type === args.filter.entity_type);
      const limit = args.filter.limit || 100;
      const offset = args.filter.offset || 0;
      return logs.slice(offset, offset + limit);
    }

    case 'cmd_count_audit':
      return DB.audit.length;

    default:
      return null;
  }
}

// Helper to build grid data (minimal - used in tests)
function buildAllGridsJS() {
  return [
    {
      id: 'officine',
      name: 'Pharmacie',
      code: 'IP-F-0018',
      version: '1.0',
      icon: '💊',
      color: '#2D5F8D',
      sections: [
        {
          id: 1,
          title: 'Renseignements généraux',
          items: [
            { id: 1, reference: 'REF 1.01', description: 'Prénom et Nom du propriétaire', pre_opening: false }
          ]
        }
      ]
    },
    {
      id: 'grossiste',
      name: 'Grossiste',
      code: 'IP-FO-0002',
      version: '1.0',
      icon: '📦',
      color: '#C74E1C',
      sections: [
        {
          id: 1,
          title: 'Organisation',
          items: [
            { id: 1, reference: 'REF 1.01', description: 'Structure organisationnelle', pre_opening: false }
          ]
        }
      ]
    }
  ];
}
