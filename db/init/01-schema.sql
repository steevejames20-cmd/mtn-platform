CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('data', 'voix', 'combo')),
    price_xaf INTEGER NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions(phone);

INSERT INTO plans (name, type, price_xaf, description) VALUES
    ('Data 1 Go', 'data', 500, '1 Go valable 24h'),
    ('Data 5 Go', 'data', 2000, '5 Go valable 7 jours'),
    ('Appels 30 min', 'voix', 300, '30 minutes vers tous réseaux'),
    ('Combo Pro', 'combo', 3000, '10 Go + 100 min valable 30 jours');
