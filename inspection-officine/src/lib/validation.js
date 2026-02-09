/**
 * Data validation module
 */

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Nom d\'utilisateur requis' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Nom d\'utilisateur minimum 3 caractères' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Nom d\'utilisateur maximum 50 caractères' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return { valid: false, error: 'Caractères non autorisés' };
  }
  return { valid: true, value: trimmed };
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Mot de passe requis' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Mot de passe minimum 6 caractères' };
  }
  if (password.length > 100) {
    return { valid: false, error: 'Mot de passe trop long' };
  }
  return { valid: true, value: password };
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email requis' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email invalide' };
  }
  return { valid: true, value: email };
}

export function validateRole(role) {
  const validRoles = ['admin', 'lead_inspector', 'inspector', 'viewer'];
  if (!validRoles.includes(role)) {
    return { valid: false, error: 'Rôle invalide' };
  }
  return { valid: true, value: role };
}

export function validateInspectionStatus(status) {
  const validStatuses = ['draft', 'in_progress', 'completed', 'validated', 'archived'];
  if (!validStatuses.includes(status)) {
    return { valid: false, error: 'Statut invalide' };
  }
  return { valid: true, value: status };
}

export function validateEstablishment(establishment) {
  if (!establishment || typeof establishment !== 'string') {
    return { valid: false, error: 'Établissement requis' };
  }
  const trimmed = establishment.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Établissement minimum 2 caractères' };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: 'Établissement trop long' };
  }
  return { valid: true, value: trimmed };
}

export function validateDateInspection(date) {
  if (!date) {
    return { valid: false, error: 'Date inspection requise' };
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return { valid: false, error: 'Date invalide' };
  }
  return { valid: true, value: date };
}

export function validateInspectionType(type) {
  const validTypes = ['initiale', 'suivi', 'plainte', 'régulière'];
  if (!validTypes.includes(type)) {
    return { valid: false, error: 'Type d\'inspection invalide' };
  }
  return { valid: true, value: type };
}

export function validateCriterionResponse(criterionId, conforme, observation) {
  if (typeof criterionId !== 'number' && typeof criterionId !== 'string') {
    return { valid: false, error: 'Criterion ID invalide' };
  }
  if (conforme !== null && conforme !== true && conforme !== false) {
    return { valid: false, error: 'Réponse invalide (true/false/null)' };
  }
  if (observation && typeof observation !== 'string') {
    return { valid: false, error: 'Observation doit être une chaîne' };
  }
  if (observation && observation.length > 1000) {
    return { valid: false, error: 'Observation trop longue' };
  }
  return { valid: true, value: { criterionId, conforme, observation } };
}

export function validateInspectionCreate(req) {
  const errors = [];

  const gridId = req.grid_id;
  if (!gridId) errors.push('Grille requise');

  const estab = validateEstablishment(req.establishment);
  if (!estab.valid) errors.push(estab.error);

  const dateVal = validateDateInspection(req.date_inspection);
  if (!dateVal.valid) errors.push(dateVal.error);

  const typeVal = validateInspectionType(req.inspection_type);
  if (!typeVal.valid) errors.push(typeVal.error);

  if (!req.inspectors || !Array.isArray(req.inspectors) || req.inspectors.length === 0) {
    errors.push('Au moins un inspecteur requis');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
