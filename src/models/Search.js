const db = require('../config/database');

class SearchModel {
  static calculateRelevanceScore(query, ...fields) {
    const q = (query || '').toLowerCase();
    let score = 0;
    for (const f of fields) {
      const s = (f || '').toLowerCase();
      if (s.includes(q)) score += Math.min(q.length / (s.length || 1), 1);
    }
    return score;
  }

  // Universal search across entities
  static async search(query, filters) {
    const {
      type = 'all',
      limit = 20,
      offset = 0
    } = filters || {};

    const searchTerm = `%${query}%`;
    const results = {
      tracks: [],
      artists: [],
      albums: [],
      playlists: []
    };

    if (type === 'all' || type === 'track') {
      const tracks = await db('tracks')
        .select([
          'tracks.id',
          'tracks.title',
          'tracks.image_url',
          'tracks.play_count',
          'tracks.duration',
          'artists.name as artist_name',
          'artists.image_url as artist_image_url',
          'albums.title as album_title',
          'albums.cover_image_url as album_cover'
        ])
        .leftJoin('artists','tracks.artist_id','artists.id')
        .leftJoin('albums','tracks.album_id','albums.id')
        .where('tracks.title','like', searchTerm)
        .orWhere('artists.name','like', searchTerm)
        .orderBy('tracks.play_count','desc')
        .limit(limit).offset(offset);

      results.tracks = tracks.map(track => ({
        type: 'track',
        id: track.id,
        title: track.title,
        subtitle: track.artist_name,
        image_url: track.image_url || track.album_cover || track.artist_image_url,
        additional_info: {
          artist_name: track.artist_name,
          album_title: track.album_title,
          duration: track.duration,
          play_count: track.play_count
        },
        relevance_score: this.calculateRelevanceScore(query, track.title, track.artist_name)
      }));
    }

    if (type === 'all' || type === 'artist') {
      const artists = await db('artists')
        .select(['id','name','image_url','monthly_listeners','is_verified'])
        .where('name','like', searchTerm)
        .orderBy('monthly_listeners','desc')
        .limit(limit).offset(offset);

      results.artists = artists.map(artist => ({
        type: 'artist',
        id: artist.id,
        title: artist.name,
        subtitle: artist.is_verified ? 'Verified Artist' : 'Artist',
        image_url: artist.image_url,
        additional_info: { monthly_listeners: artist.monthly_listeners, is_verified: !!artist.is_verified },
        relevance_score: this.calculateRelevanceScore(query, artist.name)
      }));
    }

    if (type === 'all' || type === 'album') {
      const albums = await db('albums')
        .select([
          'albums.id',
          'albums.title',
          'albums.cover_image_url',
          'albums.release_date',
          'artists.name as artist_name',
          'artists.image_url as artist_image_url',
          db.raw('COUNT(tracks.id) as total_tracks'),
          db.raw('SUM(tracks.play_count) as total_plays')
        ])
        .leftJoin('artists','albums.artist_id','artists.id')
        .leftJoin('tracks','albums.id','tracks.album_id')
        .where('albums.title','like', searchTerm)
        .orWhere('artists.name','like', searchTerm)
        .groupBy('albums.id')
        .orderBy('albums.release_date','desc')
        .limit(limit).offset(offset);

      results.albums = albums.map(album => ({
        type: 'album',
        id: album.id,
        title: album.title,
        subtitle: `${album.artist_name} • ${new Date(album.release_date).getFullYear()}`,
        image_url: album.cover_image_url || album.artist_image_url,
        additional_info: {
          artist_name: album.artist_name,
          release_date: album.release_date,
          total_tracks: album.total_tracks,
          total_plays: parseInt(album.total_plays) || 0
        },
        relevance_score: this.calculateRelevanceScore(query, album.title, album.artist_name)
      }));
    }

    if (type === 'all' || type === 'playlist') {
      const playlists = await db('playlists')
        .select([
          'playlists.*',
          'users.username as creator_username',
          'users.display_name as creator_name',
          db.raw('COUNT(playlist_tracks.id) as track_count'),
          db.raw('COUNT(user_library.id) as followers_count')
        ])
        .leftJoin('users','playlists.user_id','users.id')
        .leftJoin('playlist_tracks','playlists.id','playlist_tracks.playlist_id')
        .leftJoin('user_library', function(){
          this.on('playlists.id','=','user_library.item_id')
              .andOn('user_library.item_type','=', db.raw('?', ['playlist']));
        })
        .where('playlists.is_public', true)
        .andWhere('playlists.name','like', searchTerm)
        .groupBy('playlists.id')
        .orderBy('playlists.updated_at','desc')
        .limit(limit).offset(offset);

      results.playlists = playlists.map(pl => ({
        type: 'playlist',
        id: pl.id,
        title: pl.name,
        subtitle: `by ${pl.creator_name || pl.creator_username}`,
        image_url: pl.image_url,
        additional_info: {
          track_count: parseInt(pl.track_count) || 0,
          followers_count: parseInt(pl.followers_count) || 0,
          is_public: !!pl.is_public
        },
        relevance_score: this.calculateRelevanceScore(query, pl.name, pl.creator_name || pl.creator_username)
      }));
    }

    const total_results = results.tracks.length + results.artists.length + results.albums.length + results.playlists.length;
    return { query, total_results, results };
  }

  static async quickSearch(query, limit = 20) {
    const searchTerm = `%${query}%`;
    const allResults = [];

    const tracks = await db('tracks')
      .select(['id','title','image_url','play_count'])
      .where('title','like', searchTerm)
      .orderBy('play_count','desc')
      .limit(Math.ceil(limit / 2));
    tracks.forEach(t => allResults.push({
      type: 'track', id: t.id, title: t.title, subtitle: null,
      image_url: t.image_url, relevance_score: this.calculateRelevanceScore(query, t.title)
    }));

    const artists = await db('artists')
      .select(['id','name','image_url'])
      .where('name','like', searchTerm)
      .orderBy('monthly_listeners','desc')
      .limit(Math.ceil(limit / 4));
    artists.forEach(a => allResults.push({
      type: 'artist', id: a.id, title: a.name, subtitle: 'Artist',
      image_url: a.image_url, relevance_score: this.calculateRelevanceScore(query, a.name)
    }));

    const albums = await db('albums')
      .select(['id','title','cover_image_url'])
      .where('title','like', searchTerm)
      .orderBy('release_date','desc')
      .limit(Math.ceil(limit / 4));
    albums.forEach(al => allResults.push({
      type: 'album', id: al.id, title: al.title, subtitle: 'Album',
      image_url: al.cover_image_url, relevance_score: this.calculateRelevanceScore(query, al.title)
    }));

    allResults.sort((a,b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    return allResults.slice(0, limit);
  }

  static async getSuggestions(query, limit = 10) {
    const searchTerm = `%${query}%`;
    const suggestions = [];

    const tracks = await db('tracks').select('title').where('title','like', searchTerm).orderBy('play_count','desc').limit(Math.ceil(limit / 2));
    suggestions.push(...tracks.map(t => t.title));

    const artists = await db('artists').select('name').where('name','like', searchTerm).orderBy('monthly_listeners','desc').limit(Math.ceil(limit / 2));
    suggestions.push(...artists.map(a => a.name));

    return [...new Set(suggestions)].slice(0, limit);
  }

  static async trending(limit = 10) {
    const trendingTerms = await db('search_history')
      .select('term', db.raw('COUNT(*) as count'))
      .where('created_at','>', new Date(Date.now()-7*24*60*60*1000).toISOString())
      .groupBy('term')
      .orderBy('count','desc')
      .limit(limit);
    return trendingTerms.map(t => t.term);
  }
}
module.exports = { SearchModel };
