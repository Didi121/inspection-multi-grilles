/**
 * Inspections module - CRUD and state management
 */

import { invoke } from './api.js';

export async function createInspection(req, session, useTauri = false) {
  const id = await invoke('cmd_create_inspection', { req, session }, useTauri);
  return id;
}

export async function listInspections(session, myOnly = false, status = null, useTauri = false) {
  const inspections = await invoke(
    'cmd_list_inspections',
    { token: session?.token, myOnly, status, session },
    useTauri
  );
  return inspections;
}

export async function getInspection(inspectionId, session, useTauri = false) {
  const inspection = await invoke(
    'cmd_get_inspection',
    { inspectionId, token: session?.token },
    useTauri
  );
  return inspection;
}

export async function getResponses(inspectionId, session, useTauri = false) {
  const responses = await invoke(
    'cmd_get_responses',
    { inspectionId, token: session?.token },
    useTauri
  );
  return responses;
}

export async function saveResponse(
  inspectionId,
  criterionId,
  conforme,
  observation,
  session,
  useTauri = false
) {
  await invoke(
    'cmd_save_response',
    {
      inspectionId,
      criterionId,
      conforme,
      observation,
      token: session?.token,
      session
    },
    useTauri
  );
}

export async function setInspectionStatus(inspectionId, status, session, useTauri = false) {
  await invoke(
    'cmd_set_inspection_status',
    { inspectionId, status, token: session?.token, session },
    useTauri
  );
}

export async function deleteInspection(inspectionId, session, useTauri = false) {
  await invoke(
    'cmd_delete_inspection',
    { inspectionId, token: session?.token },
    useTauri
  );
}

export async function updateInspectionMeta(inspectionId, metadata, session, useTauri = false) {
  // Note: This is a simplified version. The actual Tauri backend supports:
  // cmd_update_inspection_meta
  await invoke(
    'cmd_update_inspection_meta',
    { inspectionId, req: metadata, token: session?.token },
    useTauri
  );
}

export function filterInspectionsByStatus(inspections, status) {
  if (!status) return inspections;
  return inspections.filter(i => i.status === status);
}

export function filterInspectionsByGrid(inspections, gridId) {
  if (!gridId) return inspections;
  return inspections.filter(i => i.grid_id === gridId);
}

export function filterInspectionsByEstablishment(inspections, searchTerm) {
  if (!searchTerm) return inspections;
  const term = searchTerm.toLowerCase();
  return inspections.filter(i => i.establishment.toLowerCase().includes(term));
}

export function sortInspectionsByDate(inspections, ascending = false) {
  const sorted = [...inspections];
  return sorted.sort((a, b) => {
    const dateA = new Date(a.date_inspection || a.created_at);
    const dateB = new Date(b.date_inspection || b.created_at);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

export function sortInspectionsByStatus(inspections) {
  const statusOrder = { draft: 1, in_progress: 2, completed: 3, validated: 4, archived: 5 };
  const sorted = [...inspections];
  return sorted.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
}
