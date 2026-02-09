# 🧪 Test Suite Documentation

## Overview

Comprehensive test suite with **146 unit and integration tests** covering all critical business logic using **Vitest**.

### Test Statistics
- **Total Tests**: 146 ✅
- **Test Files**: 6
- **Modules Tested**: 6
- **Success Rate**: 100%
- **Runtime**: ~2 seconds

## Test Coverage

### 1. **Authentication & Authorization** (`auth.test.js`)
- 20 tests covering login, logout, session management, and role-based permissions

**Topics Covered:**
- ✅ Login with valid/invalid credentials
- ✅ Session validation and invalidation
- ✅ Role labels and permissions (admin, lead_inspector, inspector, viewer)
- ✅ Permission checks (manage users, validate inspections, create inspections)

### 2. **Data Validation** (`validation.test.js`)
- 35 tests for user input validation across the entire application

**Topics Covered:**
- ✅ Username/password validation
- ✅ Email format validation
- ✅ Role and status validation
- ✅ Establishment and date validation
- ✅ Inspection type and response validation
- ✅ Form request validation (multi-field)
- ✅ Edge cases (empty, too long, invalid formats)

### 3. **KPI Calculations** (`kpi.test.js`)
- 19 tests for key performance indicator calculations and analytics

**Topics Covered:**
- ✅ Compliance rate calculations (0%, 50%, 100%)
- ✅ Inspection statistics aggregation
- ✅ Status distribution analysis
- ✅ Trend data generation and grouping
- ✅ Status labels and color coding
- ✅ Average compliance across multiple inspections

### 4. **Export Utilities** (`export.test.js`)
- 21 tests for CSV and JSON export functionality

**Topics Covered:**
- ✅ CSV export with proper escaping
- ✅ JSON export with complete metadata
- ✅ Individual inspection report generation
- ✅ Compliance rate formatting
- ✅ Multi-inspection aggregation
- ✅ Special character handling

### 5. **Inspections CRUD & Filtering** (`inspections.test.js`)
- 27 tests for inspection management operations

**Topics Covered:**
- ✅ Create, read, update, delete operations
- ✅ Status transitions (draft → in_progress → completed → validated)
- ✅ Response saving and updates
- ✅ Filtering by status, grid, establishment
- ✅ Sorting by date and status
- ✅ Pagination and query operations

### 6. **API & Fallback Database** (`api.test.js`)
- 24 tests for API abstraction layer and mock database

**Topics Covered:**
- ✅ Tauri command invocation fallback
- ✅ In-memory database operations
- ✅ User CRUD operations
- ✅ Inspection lifecycle management
- ✅ Response persistence
- ✅ Audit trail logging
- ✅ Grid data retrieval

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run specific test file
```bash
npm test -- tests/auth.test.js
```

### Generate coverage report
```bash
npm run test:coverage
```

### View test UI
```bash
npm run test:ui
```
(Opens interactive dashboard at `http://localhost:51204`)

## Test Structure

### Modules (`src/lib/`)

#### **auth.js** - Authentication & Permissions
- `login(username, password)` - Authenticate user
- `logout(token)` - End session
- `validateSession(token)` - Verify active session
- `getRoleLabel(role)` - Get human-readable role name
- `isAdmin(role)` - Check admin privileges
- `canManageUsers(role)` - Check user management permission
- `canValidateInspections(role)` - Check validation permission
- `canCreateInspections(role)` - Check creation permission

#### **api.js** - API Abstraction & Fallback DB
- `invoke(cmd, args, useTauri)` - Command dispatcher
- `fallbackInvoke(cmd, args)` - In-memory database implementation
- `initDB()` - Initialize test database
- Mock commands: login, logout, list/create/update/delete users, inspections, responses, audit logs

#### **validation.js** - Data Validation
- `validateUsername(value)` - Check username format (3-50 chars, alphanumeric + ._-)
- `validatePassword(value)` - Check password (6-100 chars)
- `validateEmail(value)` - Email format validation
- `validateRole(value)` - Check valid role
- `validateEstablishment(value)` - Check establishment name (2-200 chars)
- `validateInspectionStatus(value)` - Check status (draft, in_progress, completed, validated, archived)
- `validateCriterionResponse(id, conforme, observation)` - Check response validity
- `validateInspectionCreate(req)` - Multi-field request validation

#### **kpi.js** - KPI & Analytics
- `calculateComplianceRate(responses)` - Compliance percentage
- `calculateInspectionStats(inspection)` - Individual inspection metrics
- `aggregateInspectionStats(inspections)` - Multi-inspection aggregation
- `getStatusLabel(status)` - Human-readable status
- `getStatusColor(status)` - Status color code
- `calculateTrendData(inspections)` - Compliance trends over time

#### **export.js** - Export Utilities
- `exportToCSV(inspections, gridMap)` - Generate CSV with headers
- `exportToJSON(inspections, responses)` - Export complete JSON structure
- `exportInspectionReport(inspection, responses)` - Single inspection report

#### **inspections.js** - Inspection Management
- `createInspection(req, session)` - Create new inspection
- `listInspections(session, myOnly, status)` - List with filters
- `getInspection(id, session)` - Retrieve by ID
- `getResponses(id, session)` - Get all responses
- `saveResponse(id, criterionId, conforme, observation, session)` - Save/update response
- `setInspectionStatus(id, status, session)` - Change status
- `deleteInspection(id, session)` - Delete inspection
- Filtering: `filterByStatus`, `filterByGrid`, `filterByEstablishment`
- Sorting: `sortByDate`, `sortByStatus`

## Test Coverage Goals

✅ **Happy Path**: Normal workflows and expected behavior
✅ **Edge Cases**: Boundary conditions, empty data, max values
✅ **Error Handling**: Invalid inputs, missing data, permission denials
✅ **Data Integrity**: Multi-step operations maintain consistency
✅ **Performance**: Large datasets handled efficiently

## Integration with CI/CD

The test suite is designed to run in continuous integration pipelines:

```bash
# Pre-commit: Run tests
npm test

# Pre-push: Run tests with coverage
npm run test:coverage
```

## Test Data

Tests use mock data fixtures including:
- **Users**: admin, inspectors with different roles
- **Inspections**: Multiple status states, dates, grids
- **Responses**: Various compliance states and observations
- **Grids**: Officine (pharmacies) and Grossiste (wholesalers)

## Notes

- Tests run with `happy-dom` environment (lightweight DOM simulation)
- No external API calls in tests (all mocked)
- Database state isolated between tests via `beforeEach`
- Tests are deterministic and can run in parallel
- ~2 second total runtime

## Future Enhancements

- [ ] End-to-end tests with actual Tauri backend
- [ ] Performance benchmarks for large datasets
- [ ] Visual regression testing for UI
- [ ] API endpoint integration tests
- [ ] Database migration testing
