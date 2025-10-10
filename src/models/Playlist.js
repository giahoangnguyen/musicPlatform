const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class PlaylistModel {
  static async findById(id) {
    return db('playlists').where({ id }).first();
  }

  static async isOwner(playlistId, userId) {
    const row = await db('playlists').select('user_id').where({ id: playlistId }).first();
    return row && row.user_id === userId;
  }

  static async getWithDetails(id) {
    const result = await db('playlists')
      .select([
        'playlists.*',
        'users.username as user_username',
        'users.display_name as user_display_name'
      ])
      .leftJoin('users','playlists.user_id','users.id')
      .where('playlists.id', id)
      .first();

    if (!result) return null;

    const trackStats = await db('playlist_tracks')
      .select([
        db.raw('COUNT(*) as total_tracks'),
        db.raw('SUM(tracks.duration) as total_duration')
      ])
      .leftJoin('tracks','playlist_tracks.track_id','tracks.id')
      .where('playlist_tracks.playlist_id', id)
      .first();

    const followersCount = await db('user_library')
      .where({ item_type: 'playlist', item_id: id })
      .count('* as count').first();

    return {
      ...result,
      total_tracks: parseInt(trackStats?.total_tracks) || 0,
      total_duration: parseInt(trackStats?.total_duration) || 0,
      followers_count: parseInt(followersCount?.count) || 0
    };
  }

  static async getUserPlaylists(userId, includePrivate = true) {
    let query = db('playlists')
      .select([
        'playlists.*',
        db.raw('(SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = playlists.id) as total_tracks'),
        db.raw('(SELECT SUM(t.duration) FROM playlist_tracks pt LEFT JOIN tracks t ON pt.track_id = t.id WHERE pt.playlist_id = playlists.id) as total_duration')
      ])
      .where('playlists.user_id', userId);

    if (!includePrivate) query = query.where('is_public', true);
    const playlists = await query.orderBy('playlists.updated_at', 'desc');

    const playlistIds = playlists.map(p => p.id);
    if (playlistIds.length === 0) return [];

    const followersData = await db('user_library')
      .select('item_id', db.raw('COUNT(*) as count'))
      .where({ item_type: 'playlist' })
      .whereIn('item_id', playlistIds)
      .groupBy('item_id');
    const followersMap = new Map(followersData.map(f => [f.item_id, parseInt(f.count)]));

    return playlists.map(playlist => ({
      ...playlist,
      total_tracks: parseInt(playlist.total_tracks) || 0,
      total_duration: parseInt(playlist.total_duration) || 0,
      followers_count: followersMap.get(playlist.id) || 0
    }));
  }

  static async generateUniquePlaylistName(userId, originalName) {
    const baseNameMatch = originalName.match(/^(.+?)(?:\s#\d+)?$/);
    const baseName = baseNameMatch && baseNameMatch[1] ? baseNameMatch[1].trim() : originalName;

    const existingPlaylists = await db('playlists')
      .select('name')
      .where('user_id', userId)
      .where('name','like', `${baseName}%`);

    const existingNames = existingPlaylists.map(p => p.name);
    if (!existingNames.includes(baseName)) return baseName;

    let counter = 2;
    let candidate = `${baseName} #${counter}`;
    while (existingNames.includes(candidate)) {
      counter += 1;
      candidate = `${baseName} #${counter}`;
    }
    return candidate;
  }

  static async create(userId, data) {
    const name = await this.generateUniquePlaylistName(userId, data.name);
    const id = uuidv4();
    const now = new Date().toISOString();
    const playlist = {
      id, user_id: userId, name,
      description: data.description || null,
      image_url: data.image_url || null,
      is_public: data.is_public !== false, // default public
      created_at: now, updated_at: now
    };
    await db('playlists').insert(playlist);
    return this.getWithDetails(id);
  }

  static async update(id, userId, data) {
    await db('playlists').where({ id, user_id: userId }).update({ ...data, updated_at: new Date().toISOString() });
    return this.getWithDetails(id);
  }

  static async delete(id, userId) {
    await db.transaction(async trx => {
      await trx('playlist_tracks').where({ playlist_id: id }).del();
      await trx('user_library').where({ item_type: 'playlist', item_id: id }).del();
      await trx('playlists').where({ id, user_id: userId }).del();
    });
  }

  static async canAccess(playlistId, userId) {
    const playlist = await db('playlists').where({ id: playlistId }).first();
    if (!playlist) return false;
    if (playlist.is_public) return true;
    if (userId && playlist.user_id === userId) return true;
    return false;
  }

  static async getTracks(playlistId, limit = 50, offset = 0) {
    return db('playlist_tracks')
      .select([
        'playlist_tracks.*',
        'tracks.title as track_title',
        'tracks.duration as track_duration',
        'tracks.audio_url as track_audio_url',
        'tracks.image_url as track_image_url',
        'tracks.play_count as track_play_count',
        'tracks.artist_id',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'tracks.album_id',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url',
        'users.username as added_by_username'
      ])
      .leftJoin('tracks','playlist_tracks.track_id','tracks.id')
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .leftJoin('users','playlist_tracks.added_by','users.id')
      .where('playlist_tracks.playlist_id', playlistId)
      .orderBy('playlist_tracks.position','asc')
      .limit(limit).offset(offset);
  }

  static async hasTrack(playlistId, trackId) {
    const row = await db('playlist_tracks').where({ playlist_id: playlistId, track_id: trackId }).first();
    return !!row;
  }

  static async addTrack(playlistId, trackId, userId) {
    const maxPos = await db('playlist_tracks').where({ playlist_id: playlistId }).max('position as max').first();
    const position = (parseInt(maxPos?.max) || 0) + 1;
    const item = {
      id: uuidv4(),
      playlist_id: playlistId,
      track_id: trackId,
      added_by: userId,
      position,
      added_at: new Date().toISOString()
    };
    await db('playlist_tracks').insert(item);
    return item;
  }

  static async removeTrack(playlistId, trackId, userId) {
    await db('playlist_tracks').where({ playlist_id: playlistId, track_id: trackId }).del();
  }

  static async reorderTracks(playlistId, trackId, newPosition, userId) {
    await db.transaction(async trx => {
      const current = await trx('playlist_tracks').where({ playlist_id: playlistId, track_id: trackId }).first();
      if (!current) return;
      const oldPosition = current.position;
      if (oldPosition === newPosition) return;

      if (oldPosition < newPosition) {
        await trx('playlist_tracks')
          .where('playlist_id', playlistId)
          .where('position','>', oldPosition)
          .where('position','<=', newPosition)
          .decrement('position', 1);
      } else {
        await trx('playlist_tracks')
          .where('playlist_id', playlistId)
          .where('position','>=', newPosition)
          .where('position','<', oldPosition)
          .increment('position', 1);
      }
      await trx('playlist_tracks').where({ playlist_id: playlistId, track_id: trackId }).update({ position: newPosition });
    });
  }

  static async isFollowing(userId, playlistId) {
    const row = await db('user_library').where({ user_id: userId, item_type: 'playlist', item_id: playlistId }).first();
    return !!row;
  }
  static async follow(userId, playlistId) {
    if (await this.isFollowing(userId, playlistId)) return;
    await db('user_library').insert({
      id: uuidv4(),
      user_id: userId,
      item_type: 'playlist',
      item_id: playlistId,
      created_at: new Date().toISOString()
    });
  }
  static async unfollow(userId, playlistId) {
    await db('user_library').where({ user_id: userId, item_type: 'playlist', item_id: playlistId }).del();
  }

  static async getPublicPlaylists(limit = 20, offset = 0) {
    const playlists = await db('playlists')
      .select([
        'playlists.*',
        'users.username as creator_username',
        'users.display_name as creator_name'
      ])
      .leftJoin('users','playlists.user_id','users.id')
      .where('playlists.is_public', true)
      .orderBy('playlists.updated_at','desc')
      .limit(limit).offset(offset);

    const ids = playlists.map(p => p.id);
    if (ids.length === 0) return [];

    const stats = await db('playlist_tracks')
      .select('playlist_id', db.raw('COUNT(*) as total_tracks'), db.raw('SUM(tracks.duration) as total_duration'))
      .leftJoin('tracks','playlist_tracks.track_id','tracks.id')
      .whereIn('playlist_id', ids)
      .groupBy('playlist_id');
    const statsMap = new Map(stats.map(s => [s.playlist_id, s]));

    return playlists.map(p => {
      const st = statsMap.get(p.id);
      return {
        ...p,
        total_tracks: parseInt(st?.total_tracks) || 0,
        total_duration: parseInt(st?.total_duration) || 0,
        followers_count: 0
      };
    });
  }
}
module.exports = { PlaylistModel };
