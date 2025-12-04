-- SESAI MySQL Database Initialization Script
-- Run this script to create the database and tables

-- Create database
CREATE DATABASE IF NOT EXISTS sesai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sesai;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture_url TEXT,
    drive_folder_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    drive_file_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500),
    file_type VARCHAR(50),
    summary TEXT,
    drive_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_materials (user_id, created_at DESC),
    INDEX idx_drive_file (drive_file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Smart notes table
CREATE TABLE IF NOT EXISTS smart_notes (
    id CHAR(36) PRIMARY KEY,
    material_id CHAR(36) NOT NULL,
    drive_file_id VARCHAR(255),
    notes_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    INDEX idx_material_notes (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    material_id CHAR(36),
    score INT,
    total_questions INT,
    difficulty VARCHAR(50),
    quiz_type VARCHAR(50),
    questions JSON,
    user_answers JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    INDEX idx_user_quizzes (user_id, created_at DESC),
    INDEX idx_material_quizzes (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id CHAR(36) PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    auto_sync BOOLEAN DEFAULT TRUE,
    notifications BOOLEAN DEFAULT TRUE,
    settings JSON,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    event_type VARCHAR(100),
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_analytics (user_id, created_at DESC),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Display created tables
SHOW TABLES;

SELECT 'Database setup completed successfully!' AS Status;
