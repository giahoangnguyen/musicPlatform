const { TrackModel } = require('../models/Track');

module.exports = {
  // GET /api/tracks (search/browse)
  async list(req, res, next) {
    try {
      const { q, artistId, albumId, limit, offset } = req.valid || {};
      let tracks;

      if (q && q.trim().length > 0) {
        tracks = await TrackModel.search(q, limit, offset);
      } else if (artistId) {
        tracks = await TrackModel.getByArtist(artistId, limit, offset);
      } else if (albumId) {
        tracks = await TrackModel.getByAlbum(albumId, limit, offset);
      } else {
        tracks = await TrackModel.getAll(limit, offset);
      }

      res.json({
        tracks,
        pagination: { limit, offset, total: tracks.length },
        query: q || null
      });
    } catch (err) { next(err); }
  },

  // GET /api/tracks/:id
  async getTrack(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const track = await TrackModel.getWithDetails(id);
      if (!track) {
        const e = new Error('Track not found');
        e.statusCode = 404; e.code = 'TRACK_NOT_FOUND';
        throw e;
      }

      let is_liked = false;
      if (userId) is_liked = await TrackModel.isLiked(userId, id);

      res.json({ ...track, is_liked });
    } catch (err) { next(err); }
  },

  // POST /api/tracks/:id/play
  async play(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const track = await TrackModel.findById(id);
      if (!track) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }

      const position = typeof req.body?.position === 'number' ? req.body.position : 0;
      await TrackModel.recordPlay(userId, id, position);

      const updated = await TrackModel.getWithDetails(id);
      res.json(updated);
    } catch (err) { next(err); }
  },

  // POST /api/tracks/:id/like
  async like(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const track = await TrackModel.findById(id);
      if (!track) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }

      const already = await TrackModel.isLiked(userId, id);
      if (!already) await TrackModel.like(userId, id);

      res.json({ liked: true });
    } catch (err) { next(err); }
  },

  // DELETE /api/tracks/:id/like
  async unlike(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const track = await TrackModel.findById(id);
      if (!track) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }

      const liked = await TrackModel.isLiked(userId, id);
      if (liked) await TrackModel.unlike(userId, id);

      res.json({ liked: false });
    } catch (err) { next(err); }
  },

  // GET /api/tracks/popular
  async popular(_req, res, next) {
    try {
      const tracks = await TrackModel.getPopular(20, 0);
      res.json({ tracks, total: tracks.length });
    } catch (err) { next(err); }
  },

  // GET /api/tracks/trending
  async trending(_req, res, next) {
    try {
      const tracks = await TrackModel.getTrending(20);
      res.json({ tracks, total: tracks.length });
    } catch (err) { next(err); }
  },

  // POST /api/tracks
  async create(req, res, next) {
    try {
      const created = await TrackModel.create(req.valid);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  // PUT /api/tracks/:id
  async update(req, res, next) {
    try {
      const { id, ...data } = req.valid;
      const exists = await TrackModel.findById(id);
      if (!exists) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }
      const updated = await TrackModel.update(id, data);
      res.json(updated);
    } catch (err) { next(err); }
  },

  // DELETE /api/tracks/:id
  async remove(req, res, next) {
    try {
      const { id } = req.valid;
      const exists = await TrackModel.findById(id);
      if (!exists) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }
      await TrackModel.delete(id);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // GET /api/auth/me/tracks/liked
  async getLikedTracks(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { limit, offset } = req.valid;
      const tracks = await TrackModel.getLikedTracks(userId, limit, offset);
      res.json({ tracks, pagination: { limit, offset, total: tracks.length } });
    } catch (err) { next(err); }
  },

  // GET /api/auth/me/player/recently-played
  async getRecentlyPlayed(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { limit, offset } = req.valid;
      const items = await TrackModel.getRecentlyPlayed(userId, limit, offset);
      res.json({ items, pagination: { limit, offset, total: items.length } });
    } catch (err) { next(err); }
  },
};
