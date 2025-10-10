const fs = require('fs');
const path = require('path');
const { UserModel } = require('../models/User');
const { ArtistModel } = require('../models/Artist');
const { AlbumModel } = require('../models/Album');
const { TrackModel } = require('../models/Track');
const { PlaylistModel } = require('../models/Playlist');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

async function safeUnlink(filePath) {
  try { await fs.promises.unlink(filePath); } catch (_) {}
}

module.exports = {
  // POST /api/upload/avatar  (req.file)
  async uploadUserAvatar(req, res, next) {
    try {
      const userId = req.user?.userId;
      if (!userId) { const e = new Error('User not authenticated'); e.statusCode = 401; e.code = 'NOT_AUTHENTICATED'; throw e; }
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const avatar_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await UserModel.update(userId, { avatar_url });
      res.status(201).json({ avatar_url, user: UserModel.toResponse(updated) });
    } catch (err) { 
      if (req.file?.path) await safeUnlink(req.file.path);
      next(err); 
    }
  },

  // POST /api/upload/artist/:artistId/image
  async uploadArtistImage(req, res, next) {
    try {
      const { artistId } = req.params;
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const artist = await ArtistModel.findById(artistId);
      if (!artist) { const e = new Error('Artist not found'); e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND'; throw e; }

      const image_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await ArtistModel.update(artistId, { image_url });
      res.status(201).json({ image_url, artist: updated });
    } catch (err) { if (req.file?.path) await safeUnlink(req.file.path); next(err); }
  },

  // POST /api/upload/artist/:artistId/background
  async uploadArtistBackground(req, res, next) {
    try {
      const { artistId } = req.params;
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const artist = await ArtistModel.findById(artistId);
      if (!artist) { const e = new Error('Artist not found'); e.statusCode = 404; e.code = 'ARTIST_NOT_FOUND'; throw e; }

      const background_image_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await ArtistModel.update(artistId, { background_image_url });
      res.status(201).json({ background_image_url, artist: updated });
    } catch (err) { if (req.file?.path) await safeUnlink(req.file.path); next(err); }
  },

  // POST /api/upload/album/:albumId/cover
  async uploadAlbumCover(req, res, next) {
    try {
      const { albumId } = req.params;
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const album = await AlbumModel.findById(albumId);
      if (!album) { const e = new Error('Album not found'); e.statusCode = 404; e.code = 'ALBUM_NOT_FOUND'; throw e; }

      const cover_image_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await AlbumModel.update(albumId, { cover_image_url });
      res.status(201).json({ cover_image_url, album: updated });
    } catch (err) { if (req.file?.path) await safeUnlink(req.file.path); next(err); }
  },

  // POST /api/upload/playlist/:playlistId/cover
  async uploadPlaylistCover(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { playlistId } = req.params;
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const playlist = await PlaylistModel.findById(playlistId);
      if (!playlist) { const e = new Error('Playlist not found'); e.statusCode = 404; e.code = 'PLAYLIST_NOT_FOUND'; throw e; }

      const isOwner = await PlaylistModel.isOwner(playlistId, userId);
      if (!isOwner) { const e = new Error('Forbidden'); e.statusCode = 403; e.code = 'PLAYLIST_FORBIDDEN'; throw e; }

      const cover_image_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await PlaylistModel.update(playlistId, userId, { image_url: cover_image_url });
      res.status(201).json({ cover_image_url, playlist: updated });
    } catch (err) { if (req.file?.path) await safeUnlink(req.file.path); next(err); }
  },

  // POST /api/upload/track/:trackId/audio
  async uploadTrackAudio(req, res, next) {
    try {
      const { trackId } = req.params;
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const track = await TrackModel.findById(trackId);
      if (!track) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }

      const audio_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await TrackModel.update(trackId, { audio_url });
      res.status(201).json({ audio_url, track: updated });
    } catch (err) { if (req.file?.path) await safeUnlink(req.file.path); next(err); }
  },

  // POST /api/upload/track/:trackId/image
  async uploadTrackImage(req, res, next) {
    try {
      const { trackId } = req.params;
      if (!req.file) { const e = new Error('No file uploaded'); e.statusCode = 400; e.code = 'NO_FILE_UPLOADED'; throw e; }

      const track = await TrackModel.findById(trackId);
      if (!track) { const e = new Error('Track not found'); e.statusCode = 404; e.code = 'TRACK_NOT_FOUND'; throw e; }

      const image_url = `/${req.file.path.replace(/\\/g, '/')}`;
      const updated = await TrackModel.update(trackId, { image_url });
      res.status(201).json({ image_url, track: updated });
    } catch (err) { if (req.file?.path) await safeUnlink(req.file.path); next(err); }
  },

  // POST /api/upload/images (multiple)
  async uploadMultipleImages(req, res, next) {
    try {
      const files = req.files || [];
      if (!Array.isArray(files) || files.length === 0) {
        const e = new Error('No files uploaded'); e.statusCode = 400; e.code = 'NO_FILES_UPLOADED'; throw e;
      }
      const items = files.map(f => ({ url: `/${f.path.replace(/\\/g, '/')}`, filename: f.filename, size: f.size }));
      res.status(201).json({ items, total: items.length });
    } catch (err) {
      // best-effort cleanup
      if (Array.isArray(req.files)) {
        await Promise.all(req.files.map(f => f?.path ? safeUnlink(f.path) : null));
      }
      next(err);
    }
  },

  // GET /api/upload/serve/:type/:filename
  async serveFile(req, res, next) {
    try {
      const { type, filename } = req.params;
      const filePath = path.resolve(UPLOAD_DIR, type, filename);
      if (!fs.existsSync(filePath)) {
        const e = new Error('File not found'); e.statusCode = 404; e.code = 'FILE_NOT_FOUND'; throw e;
      }
      res.sendFile(filePath);
    } catch (err) { next(err); }
  },

  // GET /api/upload/info/:type/:filename
  async getFileInfo(req, res, next) {
    try {
      const { type, filename } = req.params;
      const filePath = path.resolve(UPLOAD_DIR, type, filename);
      const stat = await fs.promises.stat(filePath);
      res.json({ type, filename, size: stat.size, mtime: stat.mtime });
    } catch (err) { next(err); }
  },

  // DELETE /api/upload/:type/:filename
  async deleteUploadedFile(req, res, next) {
    try {
      const { type, filename } = req.params;
      const filePath = path.resolve(UPLOAD_DIR, type, filename);
      if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
