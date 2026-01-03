CREATE TABLE IF NOT EXISTS market_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    state TEXT NOT NULL,
    district TEXT NOT NULL,
    market TEXT NOT NULL,

    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT,

    arrival_date DATE NOT NULL,

    min_price REAL,
    max_price REAL,
    modal_price REAL,

    commodity_code INTEGER,

    source TEXT DEFAULT 'kaggle',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
        state,
        district,
        market,
        commodity,
        arrival_date
    )
);

CREATE INDEX IF NOT EXISTS idx_prices_crop_date
ON market_prices (commodity, arrival_date);

CREATE INDEX IF NOT EXISTS idx_prices_location
ON market_prices (state, district, market);

CREATE TABLE IF NOT EXISTS market_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    state TEXT NOT NULL,
    district TEXT NOT NULL,
    commodity TEXT NOT NULL,

    avg_modal_price_7d REAL,
    avg_modal_price_30d REAL,

    price_volatility_30d REAL,

    min_price_30d REAL,
    max_price_30d REAL,

    last_updated DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aggregates_lookup
ON market_aggregates (state, district, commodity);

CREATE TABLE IF NOT EXISTS market_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    state TEXT NOT NULL,
    commodity TEXT NOT NULL,

    horizon_days INTEGER NOT NULL, -- 30 or 60

    forecast_mean_price REAL,
    forecast_lower_price REAL,
    forecast_upper_price REAL,

    trend TEXT CHECK (trend IN ('up', 'down', 'stable')),

    confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),

    model_version TEXT,
    trained_on DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (state, commodity, horizon_days)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_lookup
ON market_forecasts (state, commodity, horizon_days);

CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);
