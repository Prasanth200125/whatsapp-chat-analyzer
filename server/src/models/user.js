const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const UserModel = {
  /**
   * Create a new user (registration)
   * @param {string} username
   * @param {string} email
   * @param {string} password - Plain text password (will be hashed)
   * @returns {Promise<{id: string, username: string, email: string, created_at: Date}>}
   */
  async create(username, email, password) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );
    return result.rows[0];
  },

  /**
   * Find user by email (for login)
   * @param {string} email
   * @returns {Promise<{id: string, username: string, email: string, password_hash: string} | null>}
   */
  async findByEmail(email) {
    const result = await query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by ID (for JWT verification)
   * @param {string} id - UUID
   * @returns {Promise<{id: string, username: string, email: string, created_at: Date} | null>}
   */
  async findById(id) {
    const result = await query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Check if email already exists
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    const result = await query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    return result.rowCount > 0;
  },

  /**
   * Check if username already exists
   * @param {string} username
   * @returns {Promise<boolean>}
   */
  async usernameExists(username) {
    const result = await query(
      'SELECT 1 FROM users WHERE username = $1',
      [username]
    );
    return result.rowCount > 0;
  },

  /**
   * Compare a plain text password with a hash
   * @param {string} password - Plain text
   * @param {string} hash - bcrypt hash
   * @returns {Promise<boolean>}
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },
};

module.exports = UserModel;
