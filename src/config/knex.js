// src/config/knex.js — pick env block
const knexConfig = require('../../knexfile');
const env = process.env.NODE_ENV || 'development';
module.exports = knexConfig[env];
