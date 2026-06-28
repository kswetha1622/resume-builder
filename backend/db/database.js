/**
 * db/database.js
 * JSON file-based database using lowdb (pure JS, no native bindings needed).
 * Stores users, resumes, and OTPs.
 */

const low  = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs   = require('fs');

const DB_DIR  = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'resume_builder.json');

let db;

function initDB() {
  const adapter = new FileSync(DB_PATH);
  db = low(adapter);

  // Set default structure
  db.defaults({
    users:   [],
    resumes: [],
    otps:    []
  }).write();

  console.log('📦  JSON database ready at', DB_PATH);
}

function getDB() {
  if (!db) throw new Error('Database not initialised. Call initDB() first.');
  return db;
}

module.exports = { initDB, getDB };
