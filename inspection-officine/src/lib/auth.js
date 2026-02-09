/**
 * Authentication module
 */

import { invoke } from './api.js';

export async function login(username, password, useTauri = false) {
  if (!username || !username.trim()) {
    throw new Error('Nom d\'utilisateur requis');
  }
  if (!password) {
    throw new Error('Mot de passe requis');
  }

  const session = await invoke('cmd_login', { username, password }, useTauri);
  return session;
}

export async function logout(token, useTauri = false) {
  if (!token) {
    throw new Error('Token requis');
  }
  await invoke('cmd_logout', { token }, useTauri);
}

export async function validateSession(token, useTauri = false) {
  if (!token) {
    throw new Error('Token requis');
  }
  const user = await invoke('cmd_validate_session', { token }, useTauri);
  return user;
}

export function getRoleLabel(role) {
  const labels = {
    admin: 'Admin',
    lead_inspector: 'Inspecteur en chef',
    inspector: 'Inspecteur',
    viewer: 'Lecteur'
  };
  return labels[role] || role;
}

export function isAdmin(role) {
  return ['admin', 'lead_inspector'].includes(role);
}

export function canManageUsers(role) {
  return ['admin', 'lead_inspector'].includes(role);
}

export function canValidateInspections(role) {
  return ['admin', 'lead_inspector'].includes(role);
}

export function canCreateInspections(role) {
  return ['admin', 'lead_inspector', 'inspector'].includes(role);
}
