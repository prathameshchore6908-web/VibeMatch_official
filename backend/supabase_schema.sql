-- VibeMatch Database Schema Setup
-- Run these queries in your Supabase SQL Editor

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY,
  host_id VARCHAR(255) NOT NULL,
  host_ip VARCHAR(45) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'matched', 'expired')) NOT NULL DEFAULT 'active',
  final_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  consent_date TIMESTAMP WITH TIME ZONE,
  terms_version VARCHAR(20)
);

-- 2. Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  availability VARCHAR(20) CHECK (availability IN ('9AM-1PM', '1PM-5PM', '5PM-8PM', '8PM-11PM', 'AfterMidnight')),
  budget INTEGER CHECK (budget >= 1 AND budget <= 4),
  vibe_text VARCHAR(200),
  has_submitted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  consent_date TIMESTAMP WITH TIME ZONE,
  terms_version VARCHAR(20),
  UNIQUE(room_id, nickname)
);

-- 3. Enable Row Level Security (RLS) or add indices for optimization
CREATE INDEX IF NOT EXISTS idx_rooms_host_ip ON rooms(host_ip);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);

-- Disable Row Level Security (RLS) for simple public API access, or set up policies
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
