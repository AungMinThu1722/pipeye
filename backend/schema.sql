-- Enable Realtime subscriptions
-- Alter publication supabase_realtime add table detections;

CREATE TABLE pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(10) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE timeframes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(5) UNIQUE NOT NULL, -- e.g. 'H4', 'D1', 'W1'
  minutes INTEGER NOT NULL
);

CREATE TABLE detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id UUID REFERENCES pairs(id),
  timeframe_id UUID REFERENCES timeframes(id),
  pattern_type VARCHAR(50) NOT NULL,
  price DECIMAL(16, 8) NOT NULL,
  timestamp BIGINT NOT NULL, -- Chart data timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confidence FLOAT DEFAULT 0.0
);

-- Indexes for performance
CREATE INDEX idx_detections_pair ON detections(pair_id);
CREATE INDEX idx_detections_timestamp ON detections(timestamp DESC);

-- Enable Realtime
ALTER TABLE detections REPLICA IDENTITY FULL;