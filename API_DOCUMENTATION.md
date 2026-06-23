# Hospital Management System - API Documentation

Complete API reference for the Hospital Management System (HMS).

## Base URL

```
http://localhost:3000/api/trpc
```

## Authentication

All API requests require authentication via Manus OAuth. Include the session cookie with each request.

## Response Format

All responses use tRPC's standard format:

```json
{
  "result": {
    "data": { /* response data */ }
  }
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes and error messages:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User not authenticated"
  }
}
```

## Patient Management

### Create Patient
**Endpoint:** `POST /api/trpc/patient.create`

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "gender": "male",
  "dateOfBirth": "1990-01-15",
  "phone": "555-1234",
  "email": "john@example.com",
  "bloodGroup": "O+",
  "emergencyContact": "Jane Doe",
  "emergencyPhone": "555-5678"
}
```

**Response:**
```json
{
  "id": 1,
  "patientCode": "PAT-001",
  "firstName": "John",
  "lastName": "Doe",
  "status": "active"
}
```

### Get Patient
**Endpoint:** `GET /api/trpc/patient.getById`

**Query Parameters:**
- `id` (number) - Patient ID

**Response:**
```json
{
  "id": 1,
  "patientCode": "PAT-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "bloodGroup": "O+",
  "status": "active"
}
```

### Search Patients
**Endpoint:** `POST /api/trpc/patient.search`

**Request:**
```json
{
  "query": "John",
  "limit": 20
}
```

**Response:**
```json
[
  {
    "id": 1,
    "patientCode": "PAT-001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
]
```

### List Patients
**Endpoint:** `GET /api/trpc/patient.list`

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20)

**Response:**
```json
[
  {
    "id": 1,
    "patientCode": "PAT-001",
    "firstName": "John",
    "lastName": "Doe"
  }
]
```

### Update Patient
**Endpoint:** `PUT /api/trpc/patient.update`

**Request:**
```json
{
  "id": 1,
  "firstName": "Jonathan",
  "phone": "555-9999"
}
```

**Response:**
```json
{
  "id": 1,
  "firstName": "Jonathan",
  "phone": "555-9999"
}
```

## Appointment Management

### Create Appointment
**Endpoint:** `POST /api/trpc/appointment.create`

**Request:**
```json
{
  "patientId": 1,
  "doctorId": 1,
  "departmentId": 1,
  "appointmentDate": "2026-06-30",
  "appointmentTime": "10:00",
  "reason": "Checkup"
}
```

**Response:**
```json
{
  "id": 1,
  "patientId": 1,
  "doctorId": 1,
  "appointmentDate": "2026-06-30",
  "appointmentTime": "10:00",
  "status": "scheduled"
}
```

### Get Appointments by Date
**Endpoint:** `GET /api/trpc/appointment.getByDate`

**Query Parameters:**
- `date` (string) - Date in YYYY-MM-DD format

**Response:**
```json
[
  {
    "id": 1,
    "patientId": 1,
    "patientName": "John Doe",
    "doctorId": 1,
    "doctorName": "Dr. Smith",
    "appointmentTime": "10:00",
    "status": "scheduled"
  }
]
```

### Get Patient Appointments
**Endpoint:** `GET /api/trpc/appointment.getByPatient`

**Query Parameters:**
- `patientId` (number) - Patient ID

**Response:**
```json
[
  {
    "id": 1,
    "appointmentDate": "2026-06-30",
    "appointmentTime": "10:00",
    "doctorName": "Dr. Smith",
    "status": "scheduled"
  }
]
```

### Update Appointment
**Endpoint:** `PUT /api/trpc/appointment.update`

**Request:**
```json
{
  "id": 1,
  "status": "completed"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "completed"
}
```

## Electronic Health Records

### Create Medical Record
**Endpoint:** `POST /api/trpc/ehr.create`

**Request:**
```json
{
  "patientId": 1,
  "recordType": "diagnosis",
  "title": "Hypertension",
  "content": "Patient diagnosed with stage 2 hypertension",
  "createdBy": 1
}
```

**Response:**
```json
{
  "id": 1,
  "patientId": 1,
  "recordType": "diagnosis",
  "title": "Hypertension",
  "recordDate": "2026-06-23T10:00:00Z"
}
```

### Get Patient Medical Records
**Endpoint:** `GET /api/trpc/ehr.getByPatient`

**Query Parameters:**
- `patientId` (number) - Patient ID

**Response:**
```json
[
  {
    "id": 1,
    "recordType": "diagnosis",
    "title": "Hypertension",
    "content": "Patient diagnosed with stage 2 hypertension",
    "recordDate": "2026-06-23T10:00:00Z",
    "createdByName": "Dr. Smith"
  }
]
```

## Prescription Management

### Create Prescription
**Endpoint:** `POST /api/trpc/prescription.create`

**Request:**
```json
{
  "patientId": 1,
  "appointmentId": 1,
  "medications": [
    {
      "medicationName": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "Take in the morning"
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "patientId": 1,
  "prescriptionDate": "2026-06-23T10:00:00Z",
  "medications": [
    {
      "medicationName": "Lisinopril",
      "dosage": "10mg"
    }
  ]
}
```

## Laboratory Management

### Create Lab Order
**Endpoint:** `POST /api/trpc/lab.createOrder`

**Request:**
```json
{
  "patientId": 1,
  "testType": "blood_test",
  "notes": "Fasting required"
}
```

**Response:**
```json
{
  "id": 1,
  "orderCode": "LAB-001",
  "patientId": 1,
  "testType": "blood_test",
  "status": "pending",
  "orderDate": "2026-06-23T10:00:00Z"
}
```

### Assign Lab Order
**Endpoint:** `PUT /api/trpc/lab.assignOrder`

**Request:**
```json
{
  "orderId": 1,
  "technicianId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "status": "in_progress",
  "assignedTo": 1
}
```

### Upload Lab Report
**Endpoint:** `POST /api/trpc/lab.uploadReport`

**Request:**
```json
{
  "labOrderId": 1,
  "results": "All values within normal range",
  "reportUrl": "/manus-storage/lab-report-123.pdf"
}
```

**Response:**
```json
{
  "id": 1,
  "labOrderId": 1,
  "reportDate": "2026-06-23T10:00:00Z",
  "results": "All values within normal range"
}
```

## Bed Management

### Get Available Beds
**Endpoint:** `GET /api/trpc/bed.getAvailable`

**Response:**
```json
[
  {
    "id": 1,
    "bedNumber": "ICU-01",
    "wardName": "ICU",
    "status": "available"
  }
]
```

### Get Beds by Ward
**Endpoint:** `GET /api/trpc/bed.getByWard`

**Query Parameters:**
- `wardId` (number) - Ward ID

**Response:**
```json
[
  {
    "id": 1,
    "bedNumber": "ICU-01",
    "status": "available"
  }
]
```

### Update Bed Status
**Endpoint:** `PUT /api/trpc/bed.updateStatus`

**Request:**
```json
{
  "bedId": 1,
  "status": "occupied"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "occupied"
}
```

## Pharmacy Inventory

### Get Inventory
**Endpoint:** `GET /api/trpc/pharmacy.getInventory`

**Response:**
```json
[
  {
    "id": 1,
    "drugCode": "DRUG-001",
    "drugName": "Aspirin",
    "quantity": 100,
    "unitPrice": 5.00,
    "status": "available"
  }
]
```

### Get Low Stock Items
**Endpoint:** `GET /api/trpc/pharmacy.getLowStock`

**Response:**
```json
[
  {
    "id": 1,
    "drugName": "Ibuprofen",
    "quantity": 15,
    "reorderLevel": 20
  }
]
```

### Update Stock
**Endpoint:** `PUT /api/trpc/pharmacy.updateStock`

**Request:**
```json
{
  "medicineId": 1,
  "quantity": 50
}
```

**Response:**
```json
{
  "id": 1,
  "quantity": 150
}
```

## Billing

### Create Invoice
**Endpoint:** `POST /api/trpc/billing.createInvoice`

**Request:**
```json
{
  "patientId": 1,
  "items": [
    {
      "description": "Consultation",
      "amount": 100
    },
    {
      "description": "Procedure",
      "amount": 500
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "invoiceNumber": "INV-001",
  "patientId": 1,
  "totalAmount": 600,
  "status": "pending"
}
```

### Get Pending Invoices
**Endpoint:** `GET /api/trpc/billing.getPending`

**Response:**
```json
[
  {
    "id": 1,
    "invoiceNumber": "INV-001",
    "patientName": "John Doe",
    "totalAmount": 600,
    "paidAmount": 0,
    "status": "pending"
  }
]
```

## Analytics

### Get Dashboard KPIs
**Endpoint:** `GET /api/trpc/analytics.getDashboardKPIs`

**Response:**
```json
{
  "totalPatients": 500,
  "todayAppointments": 25,
  "availableBeds": 30,
  "occupiedBeds": 70,
  "totalDoctors": 15,
  "revenue": 50000,
  "pendingBills": 10,
  "lowStockItems": 5
}
```

### Get Weekly Admissions
**Endpoint:** `GET /api/trpc/analytics.getWeeklyAdmissions`

**Response:**
```json
[
  { "day": "Monday", "count": 10 },
  { "day": "Tuesday", "count": 12 },
  { "day": "Wednesday", "count": 8 }
]
```

### Get Monthly Revenue
**Endpoint:** `GET /api/trpc/analytics.getMonthlyRevenue`

**Response:**
```json
[
  { "month": "January", "revenue": 45000 },
  { "month": "February", "revenue": 52000 }
]
```

## Search

### Global Search
**Endpoint:** `POST /api/trpc/search.global`

**Request:**
```json
{
  "query": "John",
  "limit": 20
}
```

**Response:**
```json
{
  "patients": [
    { "id": 1, "name": "John Doe", "type": "patient" }
  ],
  "doctors": [
    { "id": 1, "name": "Dr. John Smith", "type": "doctor" }
  ],
  "appointments": []
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per minute per user
- 1000 requests per hour per user

## Pagination

List endpoints support pagination:

```json
{
  "page": 1,
  "limit": 20,
  "total": 500,
  "data": []
}
```

## Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | User not authenticated |
| FORBIDDEN | User lacks required permissions |
| NOT_FOUND | Resource not found |
| BAD_REQUEST | Invalid request parameters |
| CONFLICT | Resource already exists |
| INTERNAL_SERVER_ERROR | Server error |

## Examples

### cURL Example

```bash
curl -X POST http://localhost:3000/api/trpc/patient.create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<session-cookie>" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "555-1234",
    "email": "john@example.com"
  }'
```

### JavaScript/Fetch Example

```javascript
const response = await fetch('http://localhost:3000/api/trpc/patient.create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-1234',
    email: 'john@example.com'
  })
});

const data = await response.json();
console.log(data);
```

### TypeScript/tRPC Client Example

```typescript
import { trpc } from '@/lib/trpc';

const newPatient = await trpc.patient.create.mutate({
  firstName: 'John',
  lastName: 'Doe',
  phone: '555-1234',
  email: 'john@example.com'
});
```

## Support

For API issues or questions, refer to:
- [README.md](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Documentation](./docs/ARCHITECTURE.md)
