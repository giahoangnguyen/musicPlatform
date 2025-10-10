const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class TrackModel {
  static async findById(id) {
    return db('tracks').where({ id }).first();
  }

  static async getWithDetails(id) {
    const result = await db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where('tracks.id', id)
      .first();
    return result || null;
  }

  static async getAll(limit = 20, offset = 0) {
    return db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .orderBy('tracks.play_count','desc')
      .limit(limit).offset(offset);
  }

  static async search(query, limit = 20, offset = 0) {
    return db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where(function() {
        this.where('tracks.title','like',`%${query}%`)
            .orWhere('artists.name','like',`%${query}%`);
      })
      .orderBy('tracks.play_count','desc')
      .limit(limit).offset(offset);
  }

  static async getByArtist(artistId, limit = 20, offset = 0) {
    return db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where('tracks.artist_id', artistId)
      .orderBy('tracks.play_count','desc')
      .limit(limit).offset(offset);
  }

  static async getByAlbum(albumId, limit = 20, offset = 0) {
    return db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where('tracks.album_id', albumId)
      .orderBy('tracks.track_number','asc')
      .limit(limit).offset(offset);
  }

  static async create(data) {
    const id = uuidv4();
    const newTrack = {
      id,
      title: data.title,
      duration: data.duration,
      audio_url: data.audio_url,
      image_url: data.image_url || null,
      artist_id: data.artist_id,
      album_id: data.album_id || null,
      track_number: data.track_number || null,
      play_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db('tracks').insert(newTrack);
    return this.findById(id);
  }

  static async update(id, data) {
    await db('tracks').where({ id }).update({ ...data, updated_at: new Date().toISOString() });
    return this.findById(id);
  }

  static async delete(id) {
    await db('tracks').where({ id }).del();
  }

  static async incrementPlayCount(trackId) {
    await db('tracks').where({ id: trackId }).increment('play_count', 1);
  }

  static async recordPlay(userId, trackId, playDuration) {
    const playRecord = {
      id: uuidv4(),
      user_id: userId,
      track_id: trackId,
      played_at: new Date().toISOString(),
      play_duration: playDuration || null
    };
    await db('play_history').insert(playRecord);
    await this.incrementPlayCount(trackId);
  }

  static async isLiked(userId, trackId) {
    const like = await db('user_library')
      .where({ user_id: userId, item_type: 'track', item_id: trackId })
      .first();
    return !!like;
  }
  static async like(userId, trackId) {
    if (await this.isLiked(userId, trackId)) return;
    await db('user_library').insert({
      id: uuidv4(),
      user_id: userId,
      item_type: 'track',
      item_id: trackId,
      created_at: new Date().toISOString()
    });
  }
  static async unlike(userId, trackId) {
    await db('user_library').where({ user_id: userId, item_type: 'track', item_id: trackId }).del();
  }

  static async getLikedTracks(userId, limit = 20, offset = 0) {
    return db('user_library')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('tracks','user_library.item_id','tracks.id')
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where({ 'user_library.user_id': userId, 'user_library.item_type': 'track' })
      .orderBy('user_library.created_at', 'desc')
      .limit(limit).offset(offset);
  }

  static async getRecentlyPlayed(userId, limit = 20, offset = 0) {
    return db('play_history')
      .select([
        'play_history.*',
        'tracks.title as track_title',
        'tracks.duration as track_duration',
        'tracks.image_url as track_image_url',
        'artists.name as artist_name',
        'albums.title as album_title'
      ])
      .leftJoin('tracks','play_history.track_id','tracks.id')
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where('play_history.user_id', userId)
      .orderBy('play_history.played_at','desc')
      .limit(limit).offset(offset);
  }

  static async popular(limit = 20) {
    return db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url',
        db.raw('COUNT(play_history.id) as recent_plays')
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .leftJoin('play_history', function() {
        this.on('tracks.id','=','play_history.track_id')
            .andOn('play_history.played_at','>', db.raw('?', [new Date(Date.now()-7*24*60*60*1000).toISOString()]));
      })
      .groupBy('tracks.id')
      .orderBy('recent_plays','desc')
      .limit(limit);
  }

  static async trending(limit = 20) {
    return this.popular(limit);
  }
}
module.exports = { TrackModel };
