-- Migration: Add JWT Authentication Fields to Users Table
-- Date: 2026-06-26
-- Description: Add fields required for JWT-based authentication

-- Add new columns for JWT authentication
ALTER TABLE users ADD COLUMN fullName VARCHAR(255) NOT NULL DEFAULT 'Unknown' AFTER id;
ALTER TABLE users ADD COLUMN passwordHash LONGTEXT AFTER email;
ALTER TABLE users ADD COLUMN avatar LONGTEXT AFTER phone;
ALTER TABLE users ADD COLUMN isVerified BOOLEAN NOT NULL DEFAULT FALSE AFTER isActive;
ALTER TABLE users ADD COLUMN lastLogin TIMESTAMP NULL AFTER lastSignedIn;

-- Make openId optional (for JWT users who don't have OAuth)
ALTER TABLE users MODIFY openId VARCHAR(64) UNIQUE NULL;

-- Make email required and unique
ALTER TABLE users MODIFY email VARCHAR(320) NOT NULL UNIQUE;

-- Add "patient" role to the enum
ALTER TABLE users MODIFY role ENUM('admin','doctor','nurse','receptionist','pharmacist','lab_technician','patient') NOT NULL DEFAULT 'patient';

-- Create composite index for faster authentication lookups
CREATE INDEX idx_email_password ON users(email, passwordHash(100));

-- Update existing records to have a fullName (use name or email as fallback)
UPDATE users SET fullName = COALESCE(name, email, 'Unknown') WHERE fullName = 'Unknown';
