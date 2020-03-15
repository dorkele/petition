DROP TABLE IF EXISTS signatures;

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY, --put it into a hashed cookie - 2cookies, hmac
    first VARCHAR(255) NOT NULL CHECK (first !=''),
    last VARCHAR(255) NOT NULL CHECK (last !=''),
    signature TEXT NOT NULL CHECK (signature !='')
);