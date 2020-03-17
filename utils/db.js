const spicedPg = require("spiced-pg");
const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

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
        WHERE id=$1`;
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

module.exports.getUserInfo = email => {
    const q = `SELECT id, password FROM users
    WHERE email=$1`;
    const params = [email];
    return db.query(q, params);
};