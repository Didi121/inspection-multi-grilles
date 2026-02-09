#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod grid;
mod grids;
mod db;
mod users;
mod audit;
mod storage;

use grid::{GridInfo, Section};
use db::Database;
use users::{CreateUserRequest, UpdateUserRequest, SessionInfo, User};
use audit::{AuditEntry, AuditFilter};
use storage::{SavedInspection, SavedResponse, CreateInspectionRequest};
use serde::{Deserialize, Serialize};
use tauri::State;

// ── Grid summary (pour la sélection) ──
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridSummary {
    pub id: String, pub name: String, pub code: String, pub description: String,
    pub icon: String, pub color: String, pub criteria_count: usize, pub section_count: usize,
}

// ════════════════════ GRILLES ════════════════════

#[tauri::command]
fn list_grids() -> Vec<GridSummary> {
    grids::all().iter().map(|g| GridSummary {
        id: g.id.clone(), name: g.name.clone(), code: g.code.clone(),
        description: g.description.clone(), icon: g.icon.clone(), color: g.color.clone(),
        criteria_count: g.sections.iter().map(|s| s.items.len()).sum(),
        section_count: g.sections.len(),
    }).collect()
}

#[tauri::command]
fn get_grid(grid_id: String) -> Option<GridInfo> { grids::find(&grid_id) }

#[tauri::command]
fn get_sections(grid_id: String) -> Vec<Section> {
    grids::find(&grid_id).map(|g| g.sections).unwrap_or_default()
}

// ════════════════════ AUTH ════════════════════

#[tauri::command]
fn cmd_login(database: State<Database>, username: String, password: String) -> Result<SessionInfo, String> {
    let result = users::login(&database, &username, &password)?;
    audit::log_action(&database, Some(&result.user.id), Some(&result.user.username),
        "LOGIN", Some("session"), Some(&result.token), None);
    Ok(result)
}

#[tauri::command]
fn cmd_logout(database: State<Database>, token: String) -> Result<(), String> {
    if let Ok(user) = users::validate_session(&database, &token) {
        audit::log_user_action(&database, &user.id, &user.username,
            "LOGOUT", "session", &token, "");
    }
    users::logout(&database, &token)
}

#[tauri::command]
fn cmd_validate_session(database: State<Database>, token: String) -> Result<User, String> {
    users::validate_session(&database, &token)
}

// ════════════════════ UTILISATEURS ════════════════════

fn require_role(db: &Database, token: &str, roles: &[&str]) -> Result<User, String> {
    let user = users::validate_session(db, token)?;
    if roles.contains(&user.role.as_str()) { Ok(user) }
    else { Err(format!("Accès refusé. Rôle requis : {}", roles.join(" ou "))) }
}

#[tauri::command]
fn cmd_list_users(database: State<Database>, token: String) -> Result<Vec<User>, String> {
    require_role(&database, &token, &["admin", "lead_inspector"])?;
    users::list_users(&database)
}

#[tauri::command]
fn cmd_create_user(database: State<Database>, token: String, req: CreateUserRequest) -> Result<User, String> {
    let admin = require_role(&database, &token, &["admin"])?;
    let user = users::create_user(&database, &req)?;
    audit::log_user_action(&database, &admin.id, &admin.username,
        "CREATE_USER", "user", &user.id,
        &format!("{{\"username\":\"{}\",\"role\":\"{}\"}}", user.username, user.role));
    Ok(user)
}

#[tauri::command]
fn cmd_update_user(database: State<Database>, token: String, user_id: String, req: UpdateUserRequest) -> Result<(), String> {
    let admin = require_role(&database, &token, &["admin"])?;
    users::update_user(&database, &user_id, &req)?;
    audit::log_user_action(&database, &admin.id, &admin.username,
        "UPDATE_USER", "user", &user_id,
        &serde_json::to_string(&req).unwrap_or_default());
    Ok(())
}

#[tauri::command]
fn cmd_change_password(database: State<Database>, token: String, user_id: String, new_password: String) -> Result<(), String> {
    let admin = require_role(&database, &token, &["admin"])?;
    users::change_password(&database, &user_id, &new_password)?;
    audit::log_user_action(&database, &admin.id, &admin.username,
        "CHANGE_PASSWORD", "user", &user_id, "");
    Ok(())
}

#[tauri::command]
fn cmd_delete_user(database: State<Database>, token: String, user_id: String) -> Result<(), String> {
    let admin = require_role(&database, &token, &["admin"])?;
    users::delete_user(&database, &user_id)?;
    audit::log_user_action(&database, &admin.id, &admin.username,
        "DEACTIVATE_USER", "user", &user_id, "");
    Ok(())
}

// ════════════════════ INSPECTIONS PERSISTANTES ════════════════════

#[tauri::command]
fn cmd_create_inspection(database: State<Database>, token: String, req: CreateInspectionRequest) -> Result<String, String> {
    let user = users::validate_session(&database, &token)?;
    let id = storage::create_inspection(&database, &req, &user.id)?;
    audit::log_user_action(&database, &user.id, &user.username,
        "CREATE_INSPECTION", "inspection", &id,
        &format!("{{\"grid\":\"{}\",\"establishment\":\"{}\"}}", req.grid_id, req.establishment));
    Ok(id)
}

#[tauri::command]
fn cmd_list_inspections(database: State<Database>, token: String, my_only: bool, status: Option<String>) -> Result<Vec<SavedInspection>, String> {
    let user = users::validate_session(&database, &token)?;
    let user_filter = if my_only || user.role == "inspector" { Some(user.id.as_str()) } else { None };
    storage::list_inspections(&database, user_filter, status.as_deref())
}

#[tauri::command]
fn cmd_get_inspection(database: State<Database>, token: String, inspection_id: String) -> Result<SavedInspection, String> {
    users::validate_session(&database, &token)?;
    storage::get_inspection(&database, &inspection_id)
}

#[tauri::command]
fn cmd_get_responses(database: State<Database>, token: String, inspection_id: String) -> Result<Vec<SavedResponse>, String> {
    users::validate_session(&database, &token)?;
    storage::get_responses(&database, &inspection_id)
}

#[tauri::command]
fn cmd_save_response(database: State<Database>, token: String, inspection_id: String,
    criterion_id: u32, conforme: Option<bool>, observation: String) -> Result<(), String> {
    let user = users::validate_session(&database, &token)?;
    storage::save_response(&database, &inspection_id, criterion_id, conforme, &observation, &user.id)?;
    audit::log_user_action(&database, &user.id, &user.username,
        "SAVE_RESPONSE", "response", &format!("{}:{}", inspection_id, criterion_id),
        &format!("{{\"conforme\":{},\"has_obs\":{}}}", conforme.map(|b|b.to_string()).unwrap_or("null".into()), !observation.is_empty()));
    Ok(())
}

#[tauri::command]
fn cmd_update_inspection_meta(database: State<Database>, token: String, inspection_id: String, req: CreateInspectionRequest) -> Result<(), String> {
    let user = users::validate_session(&database, &token)?;
    storage::update_inspection_meta(&database, &inspection_id, &req)?;
    audit::log_user_action(&database, &user.id, &user.username,
        "UPDATE_META", "inspection", &inspection_id, "");
    Ok(())
}

#[tauri::command]
fn cmd_set_inspection_status(database: State<Database>, token: String, inspection_id: String, status: String) -> Result<(), String> {
    let user = if status == "validated" {
        require_role(&database, &token, &["admin", "lead_inspector"])?
    } else {
        users::validate_session(&database, &token)?
    };
    storage::set_status(&database, &inspection_id, &status, Some(&user.id))?;
    audit::log_user_action(&database, &user.id, &user.username,
        &format!("SET_STATUS_{}", status.to_uppercase()), "inspection", &inspection_id, "");
    Ok(())
}

#[tauri::command]
fn cmd_delete_inspection(database: State<Database>, token: String, inspection_id: String) -> Result<(), String> {
    let user = require_role(&database, &token, &["admin", "lead_inspector"])?;
    storage::delete_inspection(&database, &inspection_id)?;
    audit::log_user_action(&database, &user.id, &user.username,
        "DELETE_INSPECTION", "inspection", &inspection_id, "");
    Ok(())
}

// ════════════════════ AUDIT ════════════════════

#[tauri::command]
fn cmd_query_audit(database: State<Database>, token: String, filter: AuditFilter) -> Result<Vec<AuditEntry>, String> {
    require_role(&database, &token, &["admin", "lead_inspector"])?;
    audit::query_audit(&database, &filter)
}

#[tauri::command]
fn cmd_count_audit(database: State<Database>, token: String, filter: AuditFilter) -> Result<u32, String> {
    require_role(&database, &token, &["admin", "lead_inspector"])?;
    audit::count_audit(&database, &filter)
}

// ════════════════════ MAIN ════════════════════

fn main() {
    let app_dir = dirs_next::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("abmed-inspections");

    let database = Database::new(app_dir);

    // Log démarrage
    audit::log_action(&database, None, None, "APP_START", Some("system"), None, None);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(database)
        .invoke_handler(tauri::generate_handler![
            // Grilles
            list_grids, get_grid, get_sections,
            // Auth
            cmd_login, cmd_logout, cmd_validate_session,
            // Utilisateurs
            cmd_list_users, cmd_create_user, cmd_update_user,
            cmd_change_password, cmd_delete_user,
            // Inspections
            cmd_create_inspection, cmd_list_inspections, cmd_get_inspection,
            cmd_get_responses, cmd_save_response, cmd_update_inspection_meta,
            cmd_set_inspection_status, cmd_delete_inspection,
            // Audit
            cmd_query_audit, cmd_count_audit,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application");
}
