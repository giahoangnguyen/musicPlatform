const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class ArtistModel {
  // boolean casting helper
  static castArtistBooleans(artist){
    if (!artist) return artist;
    return { ...artist, is_verified: Boolean(artist.is_verified) };
  }
  static castArtistArrayBooleans(artists){
    return artists.map(a => this.castArtistBooleans(a));
  }

  static async findById(id){
    const artist = await db('artists').where({ id }).first();
    return artist ? this.castArtistBooleans(artist) : null;
  }
  static async findByName(name){
    const artist = await db('artists').where({ name }).first();
    return artist ? this.castArtistBooleans(artist) : null;
  }

  static async getAll(limit = 20, offset = 0){
    const artists = await db('artists').orderBy('monthly_listeners','desc').limit(limit).offset(offset);
    return this.castArtistArrayBooleans(artists);
  }
  static async search(query, limit = 20, offset = 0){
    const artists = await db('artists')
      .where('name','like',`%${query}%`)
      .orderBy('monthly_listeners','desc')
      .limit(limit).offset(offset);
    return this.castArtistArrayBooleans(artists);
  }

  static async getWithStats(id){
    const artist = await this.findById(id);
    if (!artist) return null;

    const [trackCount, albumCount, followerCount] = await Promise.all([
      db('tracks').where({ artist_id: id }).count('* as count').first(),
      db('albums').where({ artist_id: id }).count('* as count').first(),
      db('user_follows').where({ artist_id: id }).count('* as count').first(),
    ]);

    return {
      ...artist,
      total_tracks: parseInt(trackCount?.count) || 0,
      total_albums: parseInt(albumCount?.count) || 0,
      followers_count: parseInt(followerCount?.count) || 0
    };
  }

  static async getPopularTracks(artistId, limit = 20, offset = 0){
    return db('tracks')
      .select([
        'tracks.*',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('albums','tracks.album_id','albums.id')
      .where('tracks.artist_id', artistId)
      .orderBy('tracks.play_count','desc')
      .limit(limit).offset(offset);
  }

  static async getTrending(limit = 20, offset = 0) {
    const rows = await db('artists')
      .select('*')
      .orderBy('monthly_listeners', 'desc')
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset(offset);
  
    return this.castArtistArrayBooleans(rows);
  }
  

  static async getAlbums(artistId, limit = 20, offset = 0){
    return db('albums')
      .where({ artist_id: artistId })
      .orderBy('release_date','desc')
      .limit(limit).offset(offset);
  }

  static async create(data){
    const id = uuidv4();
    const newArtist = {
      id,
      name: data.name,
      bio: data.bio || null,
      image_url: data.image_url || null,
      background_image_url: data.background_image_url || null,
      monthly_listeners: 0,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db('artists').insert(newArtist);
    return this.findById(id);
  }

  static async update(id, data){
    await db('artists').where({ id }).update({ ...data, updated_at: new Date().toISOString() });
    return this.findById(id);
  }

  static async delete(id){
    await db.transaction(async trx => {
      await trx('tracks').where({ artist_id: id }).update({ artist_id: null });
      await trx('albums').where({ artist_id: id }).update({ artist_id: null });
      await trx('user_follows').where({ artist_id: id }).del();
      await trx('artists').where({ id }).del();
    });
  }

  static async isFollowing(userId, artistId){
    const row = await db('user_follows').where({ user_id: userId, artist_id: artistId }).first();
    return !!row;
  }
  static async follow(userId, artistId){
    if (await this.isFollowing(userId, artistId)) return;
    await db('user_follows').insert({
      id: uuidv4(), user_id: userId, artist_id: artistId, created_at: new Date().toISOString()
    });
  }
  static async unfollow(userId, artistId){
    await db('user_follows').where({ user_id: userId, artist_id: artistId }).del();
  }

  // recompute monthly listeners (unique listeners in last 30d)
  static async updateMonthlyListeners(artistId){
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    const result = await db('tracks')
      .leftJoin('play_history','tracks.id','play_history.track_id')
      .where('tracks.artist_id', artistId)
      .where('play_history.played_at','>', thirtyDaysAgo.toISOString())
      .countDistinct('play_history.user_id as unique_listeners')
      .first();

    await db('artists')
      .where({ id: artistId })
      .update({ monthly_listeners: parseInt(result?.unique_listeners) || 0, updated_at: new Date().toISOString() });
  }
}
module.exports = { ArtistModel };
