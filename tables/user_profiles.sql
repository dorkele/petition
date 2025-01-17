DROP TABLE IF EXISTS user_profiles;

CREATE TABLE user_profiles (
      id SERIAL PRIMARY KEY,
      age VARCHAR,
      city VARCHAR(255),
      url VARCHAR(255),
      user_id INT UNIQUE NOT NULL REFERENCES users(id)
  );
