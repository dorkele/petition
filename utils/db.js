const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

module.exports.addSignatures = (signature, user_id) => {
    const q = `
        INSERT INTO signatures (signature, user_id)
        VALUES ($1, $2)
        RETURNING *
    `;
    const params = [signature, user_id];
    return db.query(q, params);
};

module.exports.getSignatures = () => {
    const q = `
    SELECT signature FROM signatures  
`;
    return db.query(q);
};

module.exports.getSignature = id => {
    const q = `SELECT signature FROM SIGNATURES
        WHERE user_id=$1`;
    const params = [id];
    return db.query(q, params);
};

module.exports.insertUsers = (first, last, email, password) => {
    const q = `INSERT INTO users (first, last, email, password)
    VALUES ($1, $2, $3, $4)
    RETURNING *`;
    const params = [first, last, email, password];
    return db.query(q, params);
};

module.exports.getPass = email => {
    const q = `SELECT id, password FROM users
    WHERE email=$1`;
    const params = [email];
    return db.query(q, params);
};

module.exports.getUserInfo = () => {
    const q = `SELECT first, last FROM users
    JOIN signatures WHERE users.id = signatures.user_id
    JOIN user_profiles WHERE users.id = user_profiles.user_id`;
    return db.query(q);
};

module.exports.insertProfile = (age, city, url, user_id) => {
    const q = `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *`;
    const params = [age, city, url, user_id];
    return db.query(q, params);
};
