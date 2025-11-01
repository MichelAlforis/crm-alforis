-- Initialize base tables required by migrations
-- These tables are referenced by many migrations but never created by Alembic
-- This script should be run BEFORE running alembic upgrade head

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS ix_teams_is_active ON teams(is_active);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_roles_name ON roles(name);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(80) NOT NULL,
    action VARCHAR(80) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(resource, action)
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_permissions_resource_action ON permissions(resource, action);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(150) UNIQUE,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_superuser BOOLEAN DEFAULT false NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,

    -- Outlook/O365/Gmail integration fields
    outlook_connected BOOLEAN DEFAULT false NOT NULL,
    encrypted_outlook_access_token TEXT,
    encrypted_outlook_refresh_token TEXT,
    outlook_token_expires_at TIMESTAMP WITH TIME ZONE,
    outlook_consent_given BOOLEAN DEFAULT false NOT NULL,
    outlook_consent_date TIMESTAMP WITH TIME ZONE,

    o365_connected BOOLEAN DEFAULT false NOT NULL,
    encrypted_o365_access_token TEXT,
    encrypted_o365_refresh_token TEXT,
    o365_token_expires_at TIMESTAMP WITH TIME ZONE,
    o365_tenant_id VARCHAR(255),
    o365_email VARCHAR(255),

    gmail_connected BOOLEAN DEFAULT false NOT NULL,
    encrypted_gmail_access_token TEXT,
    encrypted_gmail_refresh_token TEXT,
    gmail_token_expires_at TIMESTAMP WITH TIME ZONE,
    gmail_email VARCHAR(255),

    imap_connected BOOLEAN DEFAULT false NOT NULL,
    encrypted_imap_server TEXT,
    encrypted_imap_port TEXT,
    encrypted_imap_username TEXT,
    encrypted_imap_password TEXT,

    smtp_server VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    encrypted_smtp_password TEXT,
    use_tls BOOLEAN DEFAULT true NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS ix_users_is_superuser ON users(is_superuser);
CREATE INDEX IF NOT EXISTS ix_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS ix_users_team_id ON users(team_id);

-- Role permissions association table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User roles association table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Organisations table
CREATE TABLE IF NOT EXISTS organisations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    industry VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    description TEXT,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_organisations_name ON organisations(name);
CREATE INDEX IF NOT EXISTS ix_organisations_owner_id ON organisations(owner_id);
CREATE INDEX IF NOT EXISTS ix_organisations_assigned_to ON organisations(assigned_to);
CREATE INDEX IF NOT EXISTS ix_organisations_is_active ON organisations(is_active);

-- People table
CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    job_title VARCHAR(100),
    organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_people_first_name ON people(first_name);
CREATE INDEX IF NOT EXISTS ix_people_last_name ON people(last_name);
CREATE INDEX IF NOT EXISTS ix_people_email ON people(email);
CREATE INDEX IF NOT EXISTS ix_people_organisation_id ON people(organisation_id);
CREATE INDEX IF NOT EXISTS ix_people_owner_id ON people(owner_id);
CREATE INDEX IF NOT EXISTS ix_people_assigned_to ON people(assigned_to);
CREATE INDEX IF NOT EXISTS ix_people_is_active ON people(is_active);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);
