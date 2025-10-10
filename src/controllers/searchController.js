const { SearchModel } = require('../models/Search');

module.exports = {
  // GET /api/search
  async searchAll(req, res, next) {
    try {
      const { q, limit, offset } = req.valid;
      const results = await SearchModel.search(q.trim(), { type: 'all', limit, offset });
      res.json(results); // { tracks, artists, albums, playlists, ... }
    } catch (err) { next(err); }
  },

  // GET /api/search/quick
  async quickSearch(req, res, next) {
    try {
      const { q, limit } = req.valid;
      const results = await SearchModel.quickSearch(q.trim(), limit);
      res.json(results);
    } catch (err) { next(err); }
  },

  // GET /api/search/suggestions
  async getSuggestions(req, res, next) {
    try {
      const { q, limit } = req.valid;
      const suggestions = await SearchModel.getSuggestions(q.trim(), limit);
      res.json({ suggestions });
    } catch (err) { next(err); }
  },

  // GET /api/search/trending
  async getTrendingSearches(req, res, next) {
    try {
      const { limit = 10 } = req.valid || {};
      const trending = await SearchModel.getTrendingSearches(limit);
      res.json({ trending });
    } catch (err) { next(err); }
  },

  // GET /api/search/tracks
  async searchTracks(req, res, next) {
    try {
      const { q, limit, offset } = req.valid;
      const results = await SearchModel.searchByCategory(q.trim(), 'track', {}, limit, offset);
      res.json(results);
    } catch (err) { next(err); }
  },

  // GET /api/search/artists
  async searchArtists(req, res, next) {
    try {
      const { q, limit, offset } = req.valid;
      const results = await SearchModel.searchByCategory(q.trim(), 'artist', {}, limit, offset);
      res.json(results);
    } catch (err) { next(err); }
  },

  // GET /api/search/albums
  async searchAlbums(req, res, next) {
    try {
      const { q, limit, offset } = req.valid;
      const results = await SearchModel.searchByCategory(q.trim(), 'album', {}, limit, offset);
      res.json(results);
    } catch (err) { next(err); }
  },

  // GET /api/search/playlists
  async searchPlaylists(req, res, next) {
    try {
      const { q, limit, offset } = req.valid;
      const results = await SearchModel.searchByCategory(q.trim(), 'playlist', {}, limit, offset);
      res.json(results);
    } catch (err) { next(err); }
  },
};
