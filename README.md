# Hospital Management System (HMS)

A comprehensive, full-stack Hospital Management System built with React 19, Node.js, Express, tRPC, and MySQL. The system provides complete operational coverage for hospitals including patient management, appointments, electronic health records, laboratory management, pharmacy inventory, bed management, and billing.

## Features

### 1. Role-Based Access Control
- **6 Hospital Roles**: Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Technician
- **API-Level RBAC**: All endpoints enforce role-based permissions
- **Frontend Guards**: Route protection based on user roles
- **Permission Matrix**: Granular control over who can perform which operations

### 2. Patient Management
- Patient registration with comprehensive demographics
- Advanced search by name, email, phone
- Pagination and filtering
- Status tracking (active, admitted, discharged)
- Emergency contact and insurance information

### 3. Appointment Management
- Calendar-based scheduling (day, week, month, list views)
- Doctor and department assignment
- Status tracking (scheduled, in progress, completed, cancelled)
- Appointment history and trends

### 4. Electronic Health Records (EHR)
- Comprehensive medical timeline per patient
- Record types: diagnoses, prescriptions, lab results, doctor notes, attachments
- Role-based read/write permissions
- Automatic linking of lab reports and prescriptions

### 5. Prescription Management
- Linked to appointments and medical records
- Multiple medications per prescription
- Dosage, frequency, duration, and instructions
- Automatic EHR attachment

### 6. Laboratory Management
- Lab order creation and tracking
- Technician assignment and workflow
- Result upload with PDF generation
- Supported tests: Blood Test, Urine, MRI, CT Scan, X-Ray, Ultrasound
- Automatic EHR integration

### 7. Bed Management
- Ward and ICU bed tracking
- Real-time availability status
- Bed statuses: Available, Occupied, Cleaning, Maintenance
- Occupancy visualization

### 8. Admission Management
- Patient admission workflow
- Bed assignment
- Discharge management
- Status tracking

### 9. Pharmacy Inventory
- Medicine stock management
- Reorder level tracking
- Expiry date alerts
- Low stock notifications
- Batch and storage location tracking

### 10. Billing & Invoicing
- Invoice creation with line items
- Item types: consultation, procedures, medications, room charges, lab charges
- Status tracking: Paid, Pending, Overdue
- PDF export capability
- Payment tracking

### 11. Analytics Dashboard
- KPI cards: total patients, today's appointments, available beds, occupied beds, total doctors, revenue, pending bills, low stock items
- Charts: weekly admissions, monthly revenue, appointment trends, bed occupancy
- Department performance analysis
- Real-time alerts for low stock and pending bills

### 12. System Features
- Global search functionality
- Notification system
- Audit logging
- User management
- Department management

## Technology Stack

### Frontend
- **React 19** - Modern UI framework
- **Tailwind CSS 4** - Utility-first styling
- **TypeScript** - Type-safe development
- **shadcn/ui** - Pre-built UI components
- **Recharts** - Data visualization
- **tRPC Client** - Type-safe API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express 4** - Web framework
- **tRPC 11** - Type-safe RPC framework
- **Drizzle ORM** - Type-safe database access
- **MySQL** - Relational database

### Authentication
- **Manus OAuth** - Secure authentication
- **JWT** - Session management
- **SuperJSON** - Complex type serialization

## Database Schema

The system uses 22 normalized tables:

1. **users** - User accounts with 6 roles
2. **patients** - Patient demographics and contact info
3. **doctors** - Doctor profiles and specialties
4. **staff** - Hospital staff information
5. **departments** - Hospital departments
6. **appointments** - Appointment scheduling
7. **admissions** - Patient admissions and discharges
8. **beds** - Bed management and status
9. **wards** - Hospital wards
10. **medicalRecords** - EHR entries
11. **prescriptions** - Prescription management
12. **prescriptionItems** - Individual medications
13. **labOrders** - Lab test orders
14. **labReports** - Lab test results
15. **pharmacyInventory** - Pharmacy stock
16. **pharmacyDispensing** - Medication dispensing
17. **invoices** - Billing invoices
18. **invoiceItems** - Invoice line items
19. **notifications** - User notifications
20. **auditLogs** - System audit trail
21. **uploadedFiles** - File storage metadata
22. **refreshTokens** - Session management

## API Endpoints

All endpoints are accessible via tRPC at `/api/trpc/`:

### Patient Operations
- `patient.create` - Create new patient
- `patient.getById` - Get patient by ID
- `patient.search` - Search patients
- `patient.list` - List all patients
- `patient.update` - Update patient

### Doctor Operations
- `doctor.create` - Create doctor profile
- `doctor.getById` - Get doctor by ID
- `doctor.getByUserId` - Get doctor by user ID
- `doctor.getByDepartment` - Get doctors by department
- `doctor.list` - List all doctors
- `doctor.update` - Update doctor

### Department Operations
- `department.create` - Create department
- `department.getById` - Get department
- `department.list` - List departments
- `department.update` - Update department

### Appointment Operations
- `appointment.create` - Create appointment
- `appointment.getById` - Get appointment
- `appointment.getByPatient` - Get patient appointments
- `appointment.getByDoctor` - Get doctor appointments
- `appointment.getByDate` - Get appointments by date
- `appointment.update` - Update appointment

### EHR Operations
- `ehr.create` - Create medical record
- `ehr.getByPatient` - Get patient medical records

### Prescription Operations
- `prescription.create` - Create prescription
- `prescription.getByPatient` - Get patient prescriptions

### Lab Operations
- `lab.createOrder` - Create lab order
- `lab.assignOrder` - Assign order to technician
- `lab.uploadReport` - Upload lab report
- `lab.getOrders` - Get lab orders
- `lab.getReports` - Get lab reports

### Bed Operations
- `bed.getAvailable` - Get available beds
- `bed.getByWard` - Get beds by ward
- `bed.updateStatus` - Update bed status

### Admission Operations
- `admission.create` - Create admission
- `admission.discharge` - Discharge patient
- `admission.getByPatient` - Get patient admissions

### Pharmacy Operations
- `pharmacy.getInventory` - Get inventory
- `pharmacy.getLowStock` - Get low stock items
- `pharmacy.updateStock` - Update stock
- `pharmacy.addMedicine` - Add medicine

### Billing Operations
- `billing.createInvoice` - Create invoice
- `billing.getByPatient` - Get patient invoices
- `billing.getPending` - Get pending invoices
- `billing.updateStatus` - Update invoice status

### Analytics Operations
- `analytics.getDashboardKPIs` - Get dashboard KPIs
- `analytics.getWeeklyAdmissions` - Get weekly admissions data
- `analytics.getMonthlyRevenue` - Get monthly revenue
- `analytics.getAppointmentTrends` - Get appointment trends
- `analytics.getBedOccupancy` - Get bed occupancy
- `analytics.getDepartmentPerformance` - Get department performance
- `analytics.getNotifications` - Get user notifications
- `analytics.markNotificationRead` - Mark notification as read

### Search Operations
- `search.global` - Global search
- `search.patients` - Search patients

## Frontend Pages

### Authenticated Users
- **Dashboard** (`/dashboard`) - Analytics and KPIs
- **Patients** (`/patients`) - Patient management
- **Appointments** (`/appointments`) - Appointment scheduling
- **EHR** (`/ehr`) - Electronic health records
- **Beds** (`/beds`) - Bed management
- **Pharmacy** (`/pharmacy`) - Pharmacy inventory
- **Billing** (`/billing`) - Billing and invoicing
- **Lab** (`/lab`) - Laboratory management

### Public
- **Home** (`/`) - Landing page (redirects to dashboard if authenticated)

## Getting Started

### Prerequisites
- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL 8.0+

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd hospital-management-system
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
# Create .env file with required variables
# DATABASE_URL, JWT_SECRET, VITE_APP_ID, etc.
```

4. Run database migrations
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

5. Start development server
```bash
pnpm dev
```

6. Access the application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Development Workflow

### Adding a New Feature

1. **Update Database Schema** (if needed)
   - Edit `drizzle/schema.ts`
   - Run `pnpm drizzle-kit generate`
   - Apply migration via `webdev_execute_sql`

2. **Create Database Helpers**
   - Add query functions to `server/db.ts`

3. **Create tRPC Procedures**
   - Add procedures to appropriate router in `server/routers/`

4. **Create Frontend Component**
   - Build UI in `client/src/pages/` or `client/src/components/`
   - Call tRPC procedures using hooks

5. **Add Tests**
   - Create tests in `server/*.test.ts`
   - Run `pnpm test`

### Testing

Run all tests:
```bash
pnpm test
```

Run specific test file:
```bash
pnpm test server/auth.logout.test.ts
```

## Deployment

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Variables for Production
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session signing secret
- `VITE_APP_ID` - OAuth application ID
- `OAUTH_SERVER_URL` - OAuth server URL
- `VITE_OAUTH_PORTAL_URL` - OAuth portal URL
- `NODE_ENV` - Set to "production"

## Security Considerations

1. **Authentication**: All users must authenticate via Manus OAuth
2. **Authorization**: Role-based access control enforced at API level
3. **Data Validation**: All inputs validated with Zod
4. **HTTPS**: Always use HTTPS in production
5. **Secrets**: Never commit secrets to version control
6. **SQL Injection**: Protected by Drizzle ORM parameterized queries
7. **CORS**: Configure appropriately for production

## Performance Optimization

1. **Database Indexes**: Created on frequently queried columns
2. **Query Optimization**: Use database helpers to avoid N+1 queries
3. **Caching**: Implement Redis for frequently accessed data
4. **Pagination**: All list endpoints support pagination
5. **Lazy Loading**: Frontend components use code splitting

## Known Limitations

1. Real-time features require WebSocket implementation
2. File uploads limited to configured storage
3. Batch operations not yet implemented
4. Multi-language support not yet available
5. Advanced reporting features in development

## Future Enhancements

1. Real-time notifications via WebSockets
2. Advanced reporting and analytics
3. Mobile app (React Native)
4. Telemedicine integration
5. AI-powered diagnostics
6. Multi-language support
7. Advanced scheduling algorithms
8. Integration with external EHR systems

## Support & Documentation

- **API Documentation**: Available at `/api/docs` (when Swagger is enabled)
- **User Guide**: See `docs/USER_GUIDE.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Database Schema**: See `docs/DATABASE.md`

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Contributors

Built by the Manus team.

## Changelog

### Version 1.0.0 (Initial Release)
- Complete backend infrastructure with 22 database tables
- Role-based access control with 6 hospital roles
- 13 tRPC routers covering all major modules
- Analytics dashboard with KPI cards and charts
- 8 frontend management pages
- Comprehensive API endpoints
- Authentication and authorization system
