CREATE TABLE baseball_fans (
    id UUID PRIMARY KEY,
    user_id TEXT,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_team TEXT NOT NULL,
    player_position TEXT NOT NULL,
    player_age TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);