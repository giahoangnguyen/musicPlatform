const { PlayerModel } = require('../models/Player');

module.exports = {
  // GET /api/me/player
  async getCurrentPlayback(req, res, next) {
    try {
      const userId = req.user?.userId;
      const data = await PlayerModel.getCurrentPlayback(userId);
      res.json(data || { is_playing: false, device_name: null, progress_ms: 0, queue: [] });
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/play   (start)
  async startPlayback(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { track_id, context_type, context_id, position_ms = 0 } = req.valid;
      await PlayerModel.updatePlayback(userId, track_id, { context_type, context_id, position_ms });
      const updated = await PlayerModel.getCurrentPlayback(userId);
      res.json(updated);
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/play   (resume)
  async resumePlayback(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updated = await PlayerModel.playbackControl(userId, { action: 'resume' });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/pause
  async pausePlayback(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updated = await PlayerModel.playbackControl(userId, { action: 'pause' });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // POST /api/me/player/next
  async nextTrack(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updated = await PlayerModel.playbackControl(userId, { action: 'next' });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // POST /api/me/player/previous
  async previousTrack(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updated = await PlayerModel.playbackControl(userId, { action: 'previous' });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/seek
  async seek(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { position_ms } = req.valid;
      const updated = await PlayerModel.playbackControl(userId, { action: 'seek', position_ms });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/volume
  async setVolume(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { volume_percent } = req.valid;
      const updated = await PlayerModel.playbackControl(userId, { action: 'volume', volume_percent });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/shuffle
  async setShuffle(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { state } = req.valid;
      const updated = await PlayerModel.playbackControl(userId, { action: 'shuffle', state });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/repeat
  async setRepeat(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { state } = req.valid; // 'off' | 'context' | 'track'
      const updated = await PlayerModel.playbackControl(userId, { action: 'repeat', state });
      res.json(updated);
    } catch (err) { next(err); }
  },

  // GET /api/me/player/queue
  async getQueue(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { limit = 20 } = req.valid || {};
      const queue = await PlayerModel.getQueue(userId, limit);
      res.json({ items: queue, total: queue.length });
    } catch (err) { next(err); }
  },

  // POST /api/me/player/queue
  async addToQueue(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { track_id } = req.valid;
      const item = await PlayerModel.addToQueue(userId, track_id);
      res.status(201).json(item);
    } catch (err) { next(err); }
  },

  // DELETE /api/me/player/queue/:queueItemId
  async removeFromQueue(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { queueItemId } = req.valid;
      await PlayerModel.removeFromQueue(userId, queueItemId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // DELETE /api/me/player
  async stopPlayback(req, res, next) {
    try {
      const userId = req.user?.userId;
      await PlayerModel.stopPlayback(userId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // PUT /api/me/player/device
  async transferPlayback(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { device_id } = req.valid;
      const updated = await PlayerModel.transferPlayback(userId, device_id);
      res.json(updated);
    } catch (err) { next(err); }
  },
};
