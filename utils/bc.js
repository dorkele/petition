const bcrypt = require("bcryptjs");

// let { genSalt, hash, compare } = bcrypt;
const { promisify } = require("util");

const genSalt = promisify(bcrypt.genSalt);
const hash = promisify(bcrypt.hash);
const compare = promisify(bcrypt.compare);

module.exports.compare = compare;

module.exports.hash = password => genSalt().then(salt => hash(password, salt));
