CREATE TABLE IF NOT EXISTS inference_results (
  timestamp TIMESTAMP,
  model SYMBOL,
  sensor_id SYMBOL,
  state_label SYMBOL,
  confidence_score DOUBLE,
  reason SYMBOL
) timestamp(timestamp) PARTITION BY DAY WAL;

CREATE TABLE IF NOT EXISTS sensor_readings (
  timestamp TIMESTAMP,
  loc_id SYMBOL,
  sensor_id SYMBOL,
  sensor_type SYMBOL,
  unit SYMBOL,
  value DOUBLE
) timestamp(timestamp) PARTITION BY DAY WAL;

CREATE TABLE IF NOT EXISTS predictions (
  prediction_timestamp TIMESTAMP,
  model SYMBOL,
  sensor_id SYMBOL,
  forecast_time TIMESTAMP,
  predicted_value DOUBLE,
  model_version SYMBOL
) timestamp(prediction_timestamp) PARTITION BY DAY WAL;

CREATE TABLE IF NOT EXISTS anomalies (
  timestamp TIMESTAMP,
  sensor_id SYMBOL,
  anomaly_type SYMBOL,
  severity SYMBOL
) timestamp(timestamp) PARTITION BY DAY WAL;