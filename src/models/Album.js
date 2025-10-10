const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class AlbumModel {
  // Find album by ID
  static async findById(id) {
    const album = await db('albums').where({ id }).first();
    if (!album) return null;

    // Get total tracks count
    const trackCount = await db('tracks')
      .count('* as count')
      .where('album_id', id)
      .first();

    return {
      ...album,
      total_tracks: parseInt(trackCount?.count) || 0
    };
  }

  // Get album with artist details and stats
  static async getWithDetails(id) {
    const result = await db('albums')
      .select([
        'albums.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        db.raw('COUNT(tracks.id) as total_tracks'),
        db.raw('SUM(tracks.duration) as total_duration'),
        db.raw('SUM(tracks.play_count) as play_count')
      ])
      .leftJoin('artists', 'albums.artist_id', 'artists.id')
      .leftJoin('tracks', 'albums.id', 'tracks.album_id')
      .where('albums.id', id)
      .groupBy('albums.id')
      .first();

    if (!result) return null;

    // Get artist followers count
    const followers = await db('user_follows')
      .where('artist_id', result.artist_id)
      .count('* as count')
      .first();

    return {
      ...result,
      followers_count: parseInt(followers?.count) || 0,
      total_tracks: parseInt(result.total_tracks) || 0,
      total_duration: parseInt(result.total_duration) || 0,
      play_count: parseInt(result.play_count) || 0
    };
  }

  // Get all albums with pagination and optional search
  static async getAll(query, limit = 20, offset = 0) {
    let dbQuery = db('albums')
      .select([
        'albums.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        db.raw('COUNT(tracks.id) as total_tracks'),
        db.raw('SUM(tracks.duration) as total_duration'),
        db.raw('SUM(tracks.play_count) as play_count')
      ])
      .leftJoin('artists', 'albums.artist_id', 'artists.id')
      .leftJoin('tracks', 'albums.id', 'tracks.album_id');

    if (query) {
      dbQuery = dbQuery.where('albums.title', 'like', `%${query}%`)
                       .orWhere('artists.name', 'like', `%${query}%`);
    }

    const albums = await dbQuery
      .groupBy('albums.id')
      .orderBy('albums.release_date', 'desc')
      .limit(limit)
      .offset(offset);

    return albums.map(a => ({
      ...a,
      total_tracks: parseInt(a.total_tracks) || 0,
      total_duration: parseInt(a.total_duration) || 0,
      play_count: parseInt(a.play_count) || 0
    }));
  }

  // Search albums by title or artist
  static async search(query, limit = 20, offset = 0) {
    return this.getAll(query, limit, offset);
  }

  // Get albums for an artist
  static async getByArtist(artistId, limit = 20, offset = 0) {
    const albums = await db('albums')
      .select([
        'albums.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        db.raw('COUNT(tracks.id) as total_tracks'),
        db.raw('SUM(tracks.duration) as total_duration'),
        db.raw('SUM(tracks.play_count) as play_count')
      ])
      .leftJoin('artists', 'albums.artist_id', 'artists.id')
      .leftJoin('tracks', 'albums.id', 'tracks.album_id')
      .where('albums.artist_id', artistId)
      .groupBy('albums.id')
      .orderBy('albums.release_date', 'desc')
      .limit(limit)
      .offset(offset);

    return albums.map(album => ({
      ...album,
      total_tracks: parseInt(album.total_tracks) || 0,
      total_duration: parseInt(album.total_duration) || 0,
      play_count: parseInt(album.play_count) || 0
    }));
  }

  // Get popular albums (most played)
  static async getPopular(limit = 20, offset = 0) {
    const albums = await db('albums')
      .select([
        'albums.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        db.raw('COUNT(tracks.id) as total_tracks'),
        db.raw('SUM(tracks.duration) as total_duration'),
        db.raw('SUM(tracks.play_count) as play_count')
      ])
      .leftJoin('artists', 'albums.artist_id', 'artists.id')
      .leftJoin('tracks', 'albums.id', 'tracks.album_id')
      .groupBy('albums.id')
      .orderBy('play_count', 'desc')
      .limit(limit)
      .offset(offset);

    return albums.map(a => ({
      ...a,
      total_tracks: parseInt(a.total_tracks) || 0,
      total_duration: parseInt(a.total_duration) || 0,
      play_count: parseInt(a.play_count) || 0
    }));
  }

  // Get album tracks
  static async getTracks(albumId) {
    return db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url'
      ])
      .leftJoin('artists', 'tracks.artist_id', 'artists.id')
      .where('tracks.album_id', albumId)
      .orderBy('tracks.track_number', 'asc');
  }

  // Create album (admin)
  static async create(data) {
    const id = uuidv4();
    const newAlbum = {
      id,
      title: data.title,
      description: data.description || null,
      cover_image_url: data.cover_image_url || null,
      release_date: data.release_date,
      artist_id: data.artist_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db('albums').insert(newAlbum);
    const createdAlbum = await this.findById(id);
    return createdAlbum || { ...newAlbum, total_tracks: 0 };
  }

  // Update album
  static async update(id, data) {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    await db('albums').where({ id }).update(updateData);
    return this.findById(id);
  }

  // Delete album (+ cascade clean)
  static async delete(id) {
    await db.transaction(async trx => {
      await trx('tracks').where({ album_id: id }).update({ album_id: null });
      await trx('user_library').where({ item_type: 'album', item_id: id }).del();
      await trx('albums').where({ id }).del();
    });
  }

  // Update cached track count
  static async updateTrackCount(albumId) {
    const trackCount = await db('tracks')
      .where({ album_id: albumId })
      .count('* as count')
      .first();

    await db('albums')
      .where({ id: albumId })
      .update({ 
        total_tracks: parseInt(trackCount?.count) || 0,
        updated_at: new Date().toISOString()
      });
  }

  // Library helpers
  static async isLiked(userId, albumId) {
    const like = await db('user_library')
      .where({ user_id: userId, item_type: 'album', item_id: albumId })
      .first();
    return !!like;
  }
  static async like(userId, albumId) {
    const exists = await this.isLiked(userId, albumId);
    if (exists) return;
    await db('user_library').insert({
      id: uuidv4(),
      user_id: userId,
      item_type: 'album',
      item_id: albumId,
      created_at: new Date().toISOString()
    });
  }
  static async unlike(userId, albumId) {
    await db('user_library').where({ user_id: userId, item_type: 'album', item_id: albumId }).del();
  }
  static async getLikedAlbums(userId, limit = 20, offset = 0) {
    const albums = await db('user_library')
      .select('albums.*', 'artists.name as artist_name', 'artists.image_url as artist_image_url')
      .leftJoin('albums', 'user_library.item_id', 'albums.id')
      .leftJoin('artists', 'albums.artist_id', 'artists.id')
      .where({ 'user_library.user_id': userId, 'user_library.item_type': 'album' })
      .orderBy('user_library.created_at', 'desc')
      .limit(limit).offset(offset);

    const ids = albums.map(a => a.id);
    if (ids.length === 0) return [];

    const stats = await db('tracks')
      .select('album_id', db.raw('COUNT(*) as total_tracks'), db.raw('SUM(duration) as total_duration'), db.raw('SUM(play_count) as play_count'))
      .whereIn('album_id', ids)
      .groupBy('album_id');

    const statsMap = new Map(stats.map(s => [s.album_id, s]));
    return albums.map(album => {
      const s = statsMap.get(album.id);
      return {
        ...album,
        total_tracks: parseInt(s?.total_tracks) || 0,
        total_duration: parseInt(s?.total_duration) || 0,
        play_count: parseInt(s?.play_count) || 0
      };
    });
  }

  static async findByTitleAndArtist(title, artistId) {
    const album = await db('albums').where({ title, artist_id: artistId }).first();
    return album || null;
  }
}
module.exports = { AlbumModel };
