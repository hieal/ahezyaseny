-- Run this in your Supabase SQL Editor to create the game_logs table

CREATE TABLE IF NOT EXISTS game_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id TEXT NOT NULL,
  player1_name TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  winner_id TEXT,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (since players log their own games)
CREATE POLICY "Allow anyone to insert game logs" ON game_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read (for admin dashboard and stats)
CREATE POLICY "Allow anyone to read game logs" ON game_logs
  FOR SELECT
  USING (true);
