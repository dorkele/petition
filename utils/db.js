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

module.exports.getSignatures = sigid => {
    const q = `
    SELECT signature FROM signatures
    WHERE users_id=$1 
`;
    const params = [sigid];
    return db.query(q, params);
};
///jesu li gornja i donja query iste??, je li mi gornja uopce potrebna???????
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
    const q = `SELECT * FROM users
    JOIN signatures ON users.id = signatures.user_id
    LEFT OUTER JOIN user_profiles ON users.id = user_profiles.user_id;
    `;
    return db.query(q);
};

module.exports.insertProfile = (age, city, url, user_id) => {
    const q = `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *`;
    const params = [age, city, url, user_id];
    return db.query(q, params);
};

module.exports.getSignersFromCity = city => {
    const q = `SELECT * FROM users
    JOIN signatures ON users.id = signatures.user_id
    LEFT OUTER JOIN user_profiles ON users.id = user_profiles.user_id
    WHERE user_profiles.city=$1 
    `;
    const params = [city];
    return db.query(q, params);
};

module.exports.getUserInfoForEdit = userId => {
    const q = `SELECT * FROM users
    LEFT JOIN user_profiles ON users.id = user_profiles.user_id
    WHERE user_profiles.user_id=$1`;
    const params = [userId];
    return db.query(q, params);
};
