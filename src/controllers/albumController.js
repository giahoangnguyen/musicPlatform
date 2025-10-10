const { AlbumModel } = require('../models/Album');

module.exports = {
  // GET /api/albums (search/browse)
  async list(req, res, next) {
    try {
      const { q, artistId, limit, offset } = req.valid || {};
      let albums;

      if (q && q.trim().length > 0) {
        albums = await AlbumModel.search(q, limit, offset);
      } else if (artistId) {
        albums = await AlbumModel.getByArtist(artistId, limit, offset);
      } else {
        albums = await AlbumModel.getAll(undefined, limit, offset); 
      }

      res.json({
        albums,
        pagination: { limit, offset, total: albums.length },
        query: q || null
      });
    } catch (err) { next(err); }
  },

  // GET /api/albums/:id
  async getAlbum(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const album = await AlbumModel.getWithDetails(id);
      if (!album) {
        const e = new Error('Album not found');
        e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND';
        throw e;
      }

      let is_liked = false;
      if (userId) is_liked = await AlbumModel.isLiked(userId, id);

      res.json({ ...album, is_liked });
    } catch (err) { next(err); }
  },

  // GET /api/albums/:id/tracks
  async tracks(req, res, next) {
    try {
      const { id } = req.valid;
      const album = await AlbumModel.findById(id);
      if (!album) {
        const e = new Error('Album not found');
        e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND';
        throw e;
      }
      const tracks = await AlbumModel.getTracks(id);
      res.json({ album_id: id, tracks, total: tracks.length });
    } catch (err) { next(err); }
  },

  // POST /api/albums/:id/like
  async like(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const album = await AlbumModel.findById(id);
      if (!album) {
        const e = new Error('Album not found');
        e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND';
        throw e;
      }

      const already = await AlbumModel.isLiked(userId, id);
      if (!already) await AlbumModel.like(userId, id);

      res.json({ liked: true });
    } catch (err) { next(err); }
  },

  // DELETE /api/albums/:id/like
  async unlike(req, res, next) {
    try {
      const { id } = req.valid;
      const userId = req.user?.userId;

      const album = await AlbumModel.findById(id);
      if (!album) {
        const e = new Error('Album not found');
        e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND';
        throw e;
      }

      const liked = await AlbumModel.isLiked(userId, id);
      if (liked) await AlbumModel.unlike(userId, id);

      res.json({ liked: false });
    } catch (err) { next(err); }
  },

  // POST /api/albums
  async create(req, res, next) {
    try {
      const { title, artist_id, release_date, description, cover_image_url } = req.valid;

      const dup = await AlbumModel.findByTitleAndArtist(title, artist_id);
      if (dup) {
        const e = new Error('Album with this title already exists for artist');
        e.statusCode = 409; e.code = 'ALBUM_DUPLICATE';
        throw e;
      }

      const created = await AlbumModel.create({
        title, artist_id, release_date, description, cover_image_url
      });

      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  // PUT /api/albums/:id
  async update(req, res, next) {
    try {
      const { id, ...data } = req.valid;
      const exists = await AlbumModel.findById(id);
      if (!exists) {
        const e = new Error('Album not found');
        e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND';
        throw e;
      }
      const updated = await AlbumModel.update(id, data);
      res.json(updated);
    } catch (err) { next(err); }
  },

  // DELETE /api/albums/:id
  async remove(req, res, next) {
    try {
      const { id } = req.valid;
      const exists = await AlbumModel.findById(id);
      if (!exists) {
        const e = new Error('Album not found');
        e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND';
        throw e;
      }
      await AlbumModel.delete(id);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // GET /api/auth/me/albums/liked
  async getLikedAlbums(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { limit, offset } = req.valid;
      const albums = await AlbumModel.getLikedAlbums(userId, limit, offset);
      res.json({ albums, pagination: { limit, offset, total: albums.length } });
    } catch (err) { next(err); }
  }
};
