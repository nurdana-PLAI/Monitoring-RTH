-- ============================================================================
-- METADATA TABLES (Relational Style)
-- These change rarely.
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
    loc_id SYMBOL, 
    loc_name STRING, 
    loc_lat DOUBLE, 
    loc_long DOUBLE, 
    loc_reg1 SYMBOL, 
    loc_reg2 SYMBOL, 
    loc_reg3 SYMBOL, 
    installation_date TIMESTAMP, 
    created_at TIMESTAMP, 
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensors (
    sensor_id SYMBOL, 
    loc_id SYMBOL, 
    sensor_type SYMBOL, 
    unit SYMBOL, 
    manufacturer STRING, 
    sn STRING, 
    is_active BOOLEAN, 
    calibrated_at TIMESTAMP, 
    created_at TIMESTAMP, 
    updated_at TIMESTAMP
);

-- ============================================================================
-- TELEMETRY & INFERENCE TABLES (Time-Series Style)
-- These are denormalized for maximum query performance.
-- ============================================================================

-- Main Telemetry Table
-- Denormalized: loc_id and sensor_type included to avoid JOINs in Grafana
CREATE TABLE IF NOT EXISTS sensor_readings (
    timestamp TIMESTAMP, 
    loc_id SYMBOL, 
    sensor_id SYMBOL, 
    sensor_type SYMBOL,
    unit SYMBOL,
    value DOUBLE
) timestamp(timestamp) PARTITION BY DAY;

-- Fuzzy Logic Inference Results
-- Denormalized: sensor_id included for fast filtering
CREATE TABLE IF NOT EXISTS inference_results (
    timestamp TIMESTAMP,
    model SYMBOL,
    sensor_id SYMBOL, 
    state_label SYMBOL, 
    confidence_score DOUBLE,
    reason STRING
) timestamp(timestamp) PARTITION BY DAY;

-- AI Predictions (Forecasts)
-- Note: prediction_timestamp is the 'event' time, forecast_time is the 'target' time
CREATE TABLE IF NOT EXISTS predictions (
    prediction_timestamp TIMESTAMP,
    model SYMBOL,
    sensor_id SYMBOL, 
    forecast_time TIMESTAMP, 
    predicted_value DOUBLE, 
    model_version SYMBOL
) timestamp(prediction_timestamp) PARTITION BY DAY;

-- Anomaly Detection
CREATE TABLE IF NOT EXISTS anomalies (
    timestamp TIMESTAMP, 
    sensor_id SYMBOL, 
    anomaly_type SYMBOL, 
    severity SYMBOL
) timestamp(timestamp) PARTITION BY DAY;
