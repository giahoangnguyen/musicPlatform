const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const SALT_ROUNDS = 12;

class UserModel {
  /**
   * Shape note:
   * - id (uuid v4)
   * - email (unique, lowercase)
   * - username (unique)
   * - display_name
   * - password_hash
   * - avatar_url?
   * - bio?
   * - date_of_birth?
   * - country? (ISO-2)
   * - created_at / updated_at (ISO strings)
   */

  /** Return a single user row by id (or null). */
  static async findById(id) {
    return db('users').where({ id }).first();
  }

  /** Return a single user row by email (or null). */
  static async findByEmail(email) {
    if (!email) return null;
    return db('users').where({ email: email.toLowerCase() }).first();
  }

  /** Does an email already exist? (boolean) */
  static async emailExists(email) {
    const row = await this.findByEmail(email);
    return !!row;
  }

  /** Does a username already exist? (boolean) */
  static async usernameExists(username) {
    if (!username) return false;
    const row = await db('users').where({ username }).first();
    return !!row;
  }

  /**
   * Strip sensitive fields for API responses.
   * You can extend this to remove any other internal columns later.
   */
  static toResponse(user) {
    if (!user) return null;
    const {
      password_hash, // remove
      ...rest
    } = user;
    return rest;
  }

  /**
   * Create a user. Expects: { email, username?, password, display_name?, avatar_url?, bio?, date_of_birth?, country? }
   * Returns the created row (full DB shape).
   */
  static async create(data) {
    const now = new Date().toISOString();

    const id = uuidv4();
    const email = (data.email || '').toLowerCase();
    const username = data.username || null;

    const password_hash = await bcrypt.hash(String(data.password || ''), SALT_ROUNDS);

    const row = {
      id,
      email,
      username,
      display_name: data.display_name || null,
      password_hash,
      avatar_url: data.avatar_url || null,
      bio: data.bio || null,
      date_of_birth: data.date_of_birth || null,
      country: data.country || null,
      created_at: now,
      updated_at: now,
    };

    await db('users').insert(row);
    return row;
  }

  /**
   * Update a user by id with a partial set of columns.
   * NOTE: This method assumes inputs are already validated/sanitized upstream.
   */
  static async update(id, partial) {
    const allowed = {
      username: partial.username,
      display_name: partial.display_name,
      avatar_url: partial.avatar_url,
      bio: partial.bio,
      date_of_birth: partial.date_of_birth,
      country: partial.country,
      // never allow direct password update here; use changePassword instead
    };

    // drop undefined keys so we don't overwrite with undefined
    Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k]);

    if (Object.keys(allowed).length === 0) {
      // nothing to update; return current row
      return this.findById(id);
    }

    await db('users')
      .where({ id })
      .update({ ...allowed, updated_at: new Date().toISOString() });

    return this.findById(id);
  }

  /** Compare plaintext vs stored hash. */
  static async verifyPassword(plain, hashed) {
    if (!plain || !hashed) return false;
    return bcrypt.compare(String(plain), String(hashed));
  }

  /** Change password (hashes internally). */
  static async changePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(String(newPassword || ''), SALT_ROUNDS);
    await db('users')
      .where({ id })
      .update({ password_hash, updated_at: new Date().toISOString() });
  }

  /**
   * Return basic stats for the user:
   *  - playlists: # owned playlists
   *  - following: # artist follows
   *  - plays:     # play_history rows
   */
  static async getUserStats(id) {
    const [playlistCount, followingCount, playHistoryCount] = await Promise.all([
      db('playlists').where({ user_id: id }).count('* as count').first(),
      db('user_follows').where({ user_id: id }).count('* as count').first(),
      db('play_history').where({ user_id: id }).count('* as count').first(),
    ]);
    return {
      playlists: parseInt(playlistCount?.count, 10) || 0,
      following: parseInt(followingCount?.count, 10) || 0,
      plays: parseInt(playHistoryCount?.count, 10) || 0,
    };
  }

  /**
   * (Optional) List users for admin tooling.
   * Safe default: do not return password_hash.
   */
  static async list({ limit = 50, offset = 0 } = {}) {
    const rows = await db('users')
      .select([
        'id',
        'email',
        'username',
        'display_name',
        'avatar_url',
        'bio',
        'date_of_birth',
        'country',
        'created_at',
        'updated_at',
      ])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return rows;
  }

  /** (Optional) Delete user (hard delete). */
  static async delete(id) {
    // If you need cascading clean-up, do it in a transaction here.
    await db('users').where({ id }).del();
  }
}

module.exports = { UserModel };
