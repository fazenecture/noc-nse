-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create symbol_raw_data table
CREATE TABLE symbol_raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    expiry_date TEXT,
    instrument TEXT,
    option_type TEXT,
    strike_price TEXT,
    symbol_timestamp TIMESTAMPTZ,
    change_in_oi TEXT,
    closing_price TEXT,
    last_traded_price TEXT,
    market_lot TEXT,
    market_type TEXT,
    opening_price TEXT,
    open_int TEXT,
    prev_cls TEXT,
    settle_price TEXT,
    fh_timestamp TEXT,
    tot_traded_qty TEXT,
    tot_traded_val TEXT,
    trade_low_price TEXT,
    underlying_value TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint to prevent duplication
    CONSTRAINT unique_symbol_raw_data UNIQUE (name, expiry_date, instrument, fh_timestamp)
);

-- Create processed_data table
CREATE TABLE processed_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    expiry_date TEXT,
    instrument TEXT,
    previous_date TEXT,
    current_contracts TEXT,
    previous_contracts TEXT,
    change_in_oi TEXT,
    percentage_change_contracts TEXT,
    difference_in_contracts TEXT,
    occurrence_date TIMESTAMPTZ,
    meta_data JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint to prevent duplication
    CONSTRAINT unique_processed_data UNIQUE (name, expiry_date, instrument, occurrence_date)
);