const { PlaylistModel } = require('../models/Playlist');

module.exports = {
  // GET /api/playlists/:id
  async getPlaylist(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const canAccess = await PlaylistModel.canAccess(id, userId);
      if (!canAccess) { const e = new Error('Playlist not found'); e.statusCode = 404; e.code = 'PLAYLIST_NOT_FOUND'; throw e; }

      const playlist = await PlaylistModel.getWithDetails(id);
      let is_following = false, is_owner = false;
      if (userId) {
        is_following = await PlaylistModel.isFollowing(userId, id);
        is_owner = await PlaylistModel.isOwner(id, userId);
      }

      res.json({ ...playlist, is_following, is_owner });
    } catch (err) { next(err); }
  },

  // GET /api/playlists/:id/tracks
  async tracks(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const canAccess = await PlaylistModel.canAccess(id, userId);
      if (!canAccess) { const e = new Error('Playlist not found'); e.statusCode = 404; e.code = 'PLAYLIST_NOT_FOUND'; throw e; }

      const { limit = 20, offset = 0 } = req.valid || {};
      const items = await PlaylistModel.getTracks(id, limit, offset);
      res.json({ playlist_id: id, items, pagination: { limit, offset, total: items.length } });
    } catch (err) { next(err); }
  },

  // POST /api/playlists
  async create(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { name, description, is_public = true, image_url } = req.valid;
      const created = await PlaylistModel.create(userId, { name, description, is_public, image_url });
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  // PUT /api/playlists/:id
  async update(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { id, ...data } = req.valid;
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) { const e = new Error('Forbidden'); e.statusCode = 403; e.code = 'PLAYLIST_FORBIDDEN'; throw e; }
      const updated = await PlaylistModel.update(id, userId, data);
      res.json(updated);
    } catch (err) { next(err); }
  },

  // DELETE /api/playlists/:id
  async remove(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { id } = req.valid;
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) { const e = new Error('Forbidden'); e.statusCode = 403; e.code = 'PLAYLIST_FORBIDDEN'; throw e; }
      await PlaylistModel.delete(id, userId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // POST /api/playlists/:id/tracks
  async addTrack(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { id, trackId, position } = req.valid;

      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) { const e = new Error('Forbidden'); e.statusCode = 403; e.code = 'PLAYLIST_FORBIDDEN'; throw e; }

      const hasTrack = await PlaylistModel.hasTrack(id, trackId);
      if (hasTrack) { const e = new Error('Track already in playlist'); e.statusCode = 409; e.code = 'TRACK_ALREADY_EXISTS'; throw e; }

      const item = await PlaylistModel.addTrack(id, trackId, userId); // position handled internally in TS
      // Optionally reorder here: await PlaylistModel.reorderTracks(id, item.track_id, position, userId);
      res.status(201).json(item);
    } catch (err) { next(err); }
  },

  // DELETE /api/playlists/:id/tracks/:trackId
  async removeTrack(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { id, trackId } = req.valid;

      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) { const e = new Error('Forbidden'); e.statusCode = 403; e.code = 'PLAYLIST_FORBIDDEN'; throw e; }

      const hasTrack = await PlaylistModel.hasTrack(id, trackId);
      if (!hasTrack) { const e = new Error('Track not in playlist'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND_IN_PLAYLIST'; throw e; }

      await PlaylistModel.removeTrack(id, trackId, userId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // POST /api/playlists/:id/follow
  async follow(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { id } = req.valid;

      const isFollowing = await PlaylistModel.isFollowing(userId, id);
      if (!isFollowing) await PlaylistModel.follow(userId, id);

      res.json({ following: true });
    } catch (err) { next(err); }
  },

  // DELETE /api/playlists/:id/follow
  async unfollow(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { id } = req.valid;

      const isFollowing = await PlaylistModel.isFollowing(userId, id);
      if (isFollowing) await PlaylistModel.unfollow(userId, id);

      res.json({ following: false });
    } catch (err) { next(err); }
  },

  // GET /api/auth/me/playlists
  async listMine(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { limit, offset } = req.valid;
      const playlists = await PlaylistModel.getUserPlaylists(userId, true); // TS returns mine (owned)
      res.json({ playlists, pagination: { limit, offset, total: playlists.length } });
    } catch (err) { next(err); }
  },

  // GET /api/auth/me/playlists/followed
  async getFollowedPlaylists(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { limit, offset } = req.valid;
      const playlists = await PlaylistModel.getFollowedPlaylists(userId, limit, offset);
      res.json({ playlists, pagination: { limit, offset, total: playlists.length } });
    } catch (err) { next(err); }
  },
};
