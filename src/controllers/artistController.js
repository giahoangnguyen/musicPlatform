const { ArtistModel } = require('../models/Artist');

module.exports = {
  // GET /api/artists (search/browse)
  async getArtists(req, res, next) {
    try {
      const { q, limit, offset } = req.valid || {};
      let artists;
      if (q && q.trim().length > 0) artists = await ArtistModel.search(q, limit, offset);
      else artists = await ArtistModel.getAll(limit, offset);
      res.json({ artists, pagination: { limit, offset, total: artists.length }, query: q || null });
    } catch (err) { next(err); }
  },

  // GET /api/artists/trending
  async getTrending(_req, res, next) {
    try {
      const artists = await ArtistModel.getTrending(20);
      res.json({ artists, total: artists.length });
    } catch (err) { next(err); }
  },

  // GET /api/artists/:id
  async getArtist(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const artist = await ArtistModel.getWithStats(id);
      if (!artist) {
        const e = new Error('Artist not found');
        e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND';
        throw e;
      }

      let is_following = false;
      if (userId) is_following = await ArtistModel.isFollowing(userId, id);

      res.json({ ...artist, is_following });
    } catch (err) { next(err); }
  },

  // GET /api/artists/:id/tracks/popular
  async getPopularTracks(req, res, next) {
    try {
      const { id } = req.valid;
      const tracks = await ArtistModel.getPopularTracks(id, 20, 0);
      res.json({ artist_id: id, tracks, total: tracks.length });
    } catch (err) { next(err); }
  },

  // GET /api/artists/:id/albums
  async getArtistAlbums(req, res, next) {
    try {
      const { id } = req.valid;
      const albums = await ArtistModel.getAlbums(id, 20, 0);
      res.json({ artist_id: id, albums, total: albums.length });
    } catch (err) { next(err); }
  },

  // POST /api/artists/:id/follow
  async follow(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const artist = await ArtistModel.findById(id);
      if (!artist) { const e = new Error('Artist not found'); e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND'; throw e; }

      const already = await ArtistModel.isFollowing(userId, id);
      if (!already) await ArtistModel.follow(userId, id);

      res.json({ following: true });
    } catch (err) { next(err); }
  },

  // DELETE /api/artists/:id/follow
  async unfollow(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const artist = await ArtistModel.findById(id);
      if (!artist) { const e = new Error('Artist not found'); e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND'; throw e; }

      const following = await ArtistModel.isFollowing(userId, id);
      if (following) await ArtistModel.unfollow(userId, id);

      res.json({ following: false });
    } catch (err) { next(err); }
  },

  // POST /api/artists
  async createArtist(req, res, next) {
    try {
      const { name, image_url, background_url, bio } = req.valid || {};
      const dup = await ArtistModel.findByName(name);
      if (dup) { const e = new Error('Artist already exists'); e.statusCode = 409; e.code = 'ARTIST_DUPLICATE'; throw e; }
      const artist = await ArtistModel.create({ name, bio, image_url, background_image_url: background_url });
      res.status(201).json(artist);
    } catch (err) { next(err); }
  },

  // PUT /api/artists/:id
async updateArtist(req, res, next) {
  try {
    const { id, background_url, ...data } = req.valid;

    // Map background_url to the actual DB column name
    if (typeof background_url !== 'undefined') {
      data.background_image_url = background_url;  // ✅ correct mapping
    }

    const exists = await ArtistModel.findById(id);
    if (!exists) { const e = new Error('Artist not found'); e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND'; throw e; }

    const updated = await ArtistModel.update(id, data);
    res.json(updated);
  } catch (err) { next(err); }
},


  // DELETE /api/artists/:id
  async deleteArtist(req, res, next) {
    try {
      const { id } = req.valid;
      const exists = await ArtistModel.findById(id);
      if (!exists) { const e = new Error('Artist not found'); e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND'; throw e; }
      await ArtistModel.delete(id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
