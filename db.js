const spicedPg = require("spiced-pg");
const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

module.exports.addSignatures = (first, last, signature) => {
    // INSERT the user's signature and name
    const q = `
        INSERT INTO signatures (first, last, signature)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const params = [first, last, signature];
    return db.query(q, params);
};

module.exports.getSignatures = () => {
    // SELECT first and last names of every signer
    const q = `
    SELECT first, last FROM signatures
`;
    return db.query(q);
};
