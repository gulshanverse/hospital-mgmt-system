CREATE TABLE `admissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`bedId` int NOT NULL,
	`departmentId` int NOT NULL,
	`admittedBy` int NOT NULL,
	`admissionDate` datetime NOT NULL,
	`dischargeDate` datetime,
	`reason` text,
	`notes` text,
	`status` enum('active','discharged') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`departmentId` int NOT NULL,
	`appointmentDate` date NOT NULL,
	`appointmentTime` varchar(10) NOT NULL,
	`reason` text,
	`notes` text,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`changes` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bedCode` varchar(20) NOT NULL,
	`wardId` int NOT NULL,
	`roomNumber` varchar(20),
	`status` enum('available','occupied','cleaning','maintenance') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beds_id` PRIMARY KEY(`id`),
	CONSTRAINT `beds_bedCode_unique` UNIQUE(`bedCode`),
	CONSTRAINT `idx_bedCode` UNIQUE(`bedCode`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`headDoctorId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int NOT NULL,
	`specialty` varchar(100) NOT NULL,
	`qualification` text,
	`experience` int,
	`licenseNumber` varchar(50),
	`profilePhoto` varchar(500),
	`availabilitySchedule` json,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctors_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `doctors_licenseNumber_unique` UNIQUE(`licenseNumber`)
);
--> statement-breakpoint
CREATE TABLE `invoiceItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`itemType` enum('consultation','procedure','medication','room_charge','lab_charge') NOT NULL,
	`description` text NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoiceItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`patientId` int NOT NULL,
	`admissionId` int,
	`appointmentId` int,
	`invoiceDate` datetime NOT NULL,
	`dueDate` date,
	`totalAmount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`status` enum('paid','pending','overdue') NOT NULL DEFAULT 'pending',
	`invoicePdfUrl` varchar(500),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`),
	CONSTRAINT `idx_invoiceNumber` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `labOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderCode` varchar(50) NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`testType` enum('blood_test','urine_test','mri','ct_scan','xray','ultrasound') NOT NULL,
	`orderedBy` int NOT NULL,
	`assignedTo` int,
	`orderDate` datetime NOT NULL,
	`expectedDate` datetime,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `labOrders_orderCode_unique` UNIQUE(`orderCode`),
	CONSTRAINT `idx_orderCode` UNIQUE(`orderCode`)
);
--> statement-breakpoint
CREATE TABLE `labReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`labOrderId` int NOT NULL,
	`patientId` int NOT NULL,
	`reportDate` datetime NOT NULL,
	`results` text,
	`reportUrl` varchar(500),
	`reportPdfUrl` varchar(500),
	`normalRange` text,
	`status` enum('pending','completed','reviewed') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `labReports_labOrderId_unique` UNIQUE(`labOrderId`)
);
--> statement-breakpoint
CREATE TABLE `medicalRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`recordType` enum('diagnosis','prescription','lab_result','doctor_note','attachment') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`createdBy` int NOT NULL,
	`recordDate` datetime NOT NULL,
	`attachmentUrl` varchar(500),
	`attachmentType` varchar(50),
	`isConfidential` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('appointment_reminder','low_inventory','overdue_invoice','discharge_alert','lab_result','bed_available','general') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`relatedEntityId` int,
	`relatedEntityType` varchar(50),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientCode` varchar(20) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`gender` enum('male','female','other') NOT NULL,
	`dateOfBirth` date NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`zipCode` varchar(10),
	`bloodGroup` enum('O+','O-','A+','A-','B+','B-','AB+','AB-'),
	`emergencyContactName` varchar(100),
	`emergencyContactPhone` varchar(20),
	`insuranceProvider` varchar(100),
	`insuranceNumber` varchar(50),
	`status` enum('active','admitted','discharged') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patientCode_unique` UNIQUE(`patientCode`),
	CONSTRAINT `idx_patientCode` UNIQUE(`patientCode`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyDispensing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prescriptionItemId` int NOT NULL,
	`inventoryId` int NOT NULL,
	`quantityDispensed` int NOT NULL,
	`dispensedBy` int NOT NULL,
	`dispensedDate` datetime NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pharmacyDispensing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyInventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drugCode` varchar(50) NOT NULL,
	`drugName` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`manufacturer` varchar(100),
	`batchNumber` varchar(50),
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`reorderLevel` int NOT NULL,
	`expiryDate` date,
	`storageLocation` varchar(100),
	`status` enum('available','low_stock','expired','discontinued') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pharmacyInventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacyInventory_drugCode_unique` UNIQUE(`drugCode`),
	CONSTRAINT `idx_drugCode` UNIQUE(`drugCode`)
);
--> statement-breakpoint
CREATE TABLE `prescriptionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prescriptionId` int NOT NULL,
	`medicationName` varchar(255) NOT NULL,
	`dosage` varchar(100) NOT NULL,
	`frequency` varchar(100) NOT NULL,
	`duration` varchar(100) NOT NULL,
	`instructions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescriptionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`medicalRecordId` int,
	`prescribedBy` int NOT NULL,
	`prescriptionDate` datetime NOT NULL,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refreshTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(500) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refreshTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refreshTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int NOT NULL,
	`position` varchar(100) NOT NULL,
	`qualifications` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `uploadedFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int,
	`uploadedBy` int NOT NULL,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`fileUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploadedFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uploadedFiles_fileKey_unique` UNIQUE(`fileKey`)
);
--> statement-breakpoint
CREATE TABLE `wards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('general','icu','pediatric','maternity') NOT NULL,
	`totalBeds` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wards_id` PRIMARY KEY(`id`),
	CONSTRAINT `wards_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','doctor','nurse','receptionist','pharmacist','lab_technician') NOT NULL DEFAULT 'receptionist';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_bedId_beds_id_fk` FOREIGN KEY (`bedId`) REFERENCES `beds`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_admittedBy_users_id_fk` FOREIGN KEY (`admittedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctorId_doctors_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beds` ADD CONSTRAINT `beds_wardId_wards_id_fk` FOREIGN KEY (`wardId`) REFERENCES `wards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoiceItems` ADD CONSTRAINT `invoiceItems_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_admissionId_admissions_id_fk` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labOrders` ADD CONSTRAINT `labOrders_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labOrders` ADD CONSTRAINT `labOrders_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labOrders` ADD CONSTRAINT `labOrders_orderedBy_users_id_fk` FOREIGN KEY (`orderedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labOrders` ADD CONSTRAINT `labOrders_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labReports` ADD CONSTRAINT `labReports_labOrderId_labOrders_id_fk` FOREIGN KEY (`labOrderId`) REFERENCES `labOrders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labReports` ADD CONSTRAINT `labReports_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labReports` ADD CONSTRAINT `labReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicalRecords` ADD CONSTRAINT `medicalRecords_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicalRecords` ADD CONSTRAINT `medicalRecords_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacyDispensing` ADD CONSTRAINT `pharmacyDispensing_prescriptionItemId_prescriptionItems_id_fk` FOREIGN KEY (`prescriptionItemId`) REFERENCES `prescriptionItems`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacyDispensing` ADD CONSTRAINT `pharmacyDispensing_inventoryId_pharmacyInventory_id_fk` FOREIGN KEY (`inventoryId`) REFERENCES `pharmacyInventory`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacyDispensing` ADD CONSTRAINT `pharmacyDispensing_dispensedBy_users_id_fk` FOREIGN KEY (`dispensedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptionItems` ADD CONSTRAINT `prescriptionItems_prescriptionId_prescriptions_id_fk` FOREIGN KEY (`prescriptionId`) REFERENCES `prescriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_medicalRecordId_medicalRecords_id_fk` FOREIGN KEY (`medicalRecordId`) REFERENCES `medicalRecords`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_prescribedBy_doctors_id_fk` FOREIGN KEY (`prescribedBy`) REFERENCES `doctors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refreshTokens` ADD CONSTRAINT `refreshTokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploadedFiles` ADD CONSTRAINT `uploadedFiles_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `admissions` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_bedId` ON `admissions` (`bedId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `admissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `appointments` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_doctorId` ON `appointments` (`doctorId`);--> statement-breakpoint
CREATE INDEX `idx_appointmentDate` ON `appointments` (`appointmentDate`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_entityType` ON `auditLogs` (`entityType`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_wardId` ON `beds` (`wardId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `beds` (`status`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `departments` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_departmentId` ON `doctors` (`departmentId`);--> statement-breakpoint
CREATE INDEX `idx_isAvailable` ON `doctors` (`isAvailable`);--> statement-breakpoint
CREATE INDEX `idx_invoiceId` ON `invoiceItems` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `invoices` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `idx_invoiceDate` ON `invoices` (`invoiceDate`);--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `labOrders` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `labOrders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `labReports` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `labReports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `medicalRecords` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_recordType` ON `medicalRecords` (`recordType`);--> statement-breakpoint
CREATE INDEX `idx_recordDate` ON `medicalRecords` (`recordDate`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_isRead` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_phone` ON `patients` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `patients` (`email`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `patients` (`status`);--> statement-breakpoint
CREATE INDEX `idx_inventoryId` ON `pharmacyDispensing` (`inventoryId`);--> statement-breakpoint
CREATE INDEX `idx_dispensedDate` ON `pharmacyDispensing` (`dispensedDate`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `pharmacyInventory` (`category`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `pharmacyInventory` (`status`);--> statement-breakpoint
CREATE INDEX `idx_expiryDate` ON `pharmacyInventory` (`expiryDate`);--> statement-breakpoint
CREATE INDEX `idx_prescriptionId` ON `prescriptionItems` (`prescriptionId`);--> statement-breakpoint
CREATE INDEX `idx_patientId` ON `prescriptions` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `prescriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `refreshTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_expiresAt` ON `refreshTokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_departmentId` ON `staff` (`departmentId`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `staff` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_relatedEntity` ON `uploadedFiles` (`relatedEntityType`,`relatedEntityId`);--> statement-breakpoint
CREATE INDEX `idx_uploadedBy` ON `uploadedFiles` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `wards` (`type`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `users` (`isActive`);