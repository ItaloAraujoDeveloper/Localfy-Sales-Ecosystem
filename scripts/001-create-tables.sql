-- Localfy Database Schema
-- Script to create all necessary tables

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('admin', 'manager', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'distributed', 'negotiating', 'won', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE business_category AS ENUM ('gastronomy', 'health_beauty', 'services', 'retail', 'generic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('status_change', 'call', 'note', 'site_generated', 'assignment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sessions table for express-session
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    is_admin BOOLEAN DEFAULT false,
    role user_role_type DEFAULT 'seller',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sellers table
CREATE TABLE IF NOT EXISTS sellers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR NOT NULL,
    manager_id VARCHAR,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    neighborhood TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5, 2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_name TEXT NOT NULL,
    category business_category DEFAULT 'generic',
    business_type TEXT,
    address TEXT,
    city TEXT,
    phone TEXT,
    rating DECIMAL(2, 1),
    review_count INTEGER DEFAULT 0,
    status lead_status DEFAULT 'new',
    seller_id VARCHAR,
    created_by_user_id VARCHAR,
    monthly_value DECIMAL(10, 2) DEFAULT 99.90,
    notes TEXT,
    preview_slug TEXT,
    due_date TIMESTAMP,
    image_prompt TEXT,
    hero_image_url TEXT,
    product_images TEXT[],
    site_generated BOOLEAN DEFAULT false,
    site_headline TEXT,
    site_description TEXT,
    site_services TEXT[],
    site_service_descriptions TEXT[],
    site_schedule TEXT,
    site_testimonials TEXT,
    site_features TEXT,
    site_about TEXT,
    site_menu TEXT,
    site_events TEXT,
    site_pricing TEXT,
    site_team TEXT,
    site_faq TEXT,
    site_gallery TEXT[],
    site_primary_color TEXT,
    site_secondary_color TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    category business_category NOT NULL,
    description TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    seller_id VARCHAR NOT NULL,
    lead_id VARCHAR NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lead Activities table
CREATE TABLE IF NOT EXISTS lead_activities (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id VARCHAR NOT NULL,
    seller_id VARCHAR,
    activity_type activity_type NOT NULL,
    description TEXT NOT NULL,
    previous_status lead_status,
    new_status lead_status,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt with 10 rounds
INSERT INTO users (email, password_hash, first_name, last_name, is_admin, role)
VALUES ('admin@localfy.com', '$2a$10$rQZ7Y8GXq5FCXN3.xqYq7e3K8NQGzV6sKjH5mYxR4aL0cN7zT9W2e', 'Administrador', 'Localfy', true, 'admin')
ON CONFLICT (email) DO NOTHING;
