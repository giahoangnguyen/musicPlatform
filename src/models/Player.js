const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class PlayerModel {
  static async getCurrentPlayback(userId) {
    const playback = await db('current_playback').where({ user_id: userId }).first();
    if (!playback) return null;

    const trackDetails = await db('tracks')
      .select([
        'tracks.*',
        'artists.name as artist_name',
        'artists.image_url as artist_image_url',
        'albums.title as album_title',
        'albums.cover_image_url as album_cover_image_url'
      ])
      .leftJoin('artists','tracks.artist_id','artists.id')
      .leftJoin('albums','tracks.album_id','albums.id')
      .where('tracks.id', playback.track_id)
      .first();
    if (!trackDetails) return null;

    let context;
    if (playback.context_type && playback.context_id) {
      if (playback.context_type === 'album') {
        const album = await db('albums').where({ id: playback.context_id }).first();
        if (album) context = { type: 'album', id: album.id, title: album.title, image_url: album.cover_image_url };
      } else if (playback.context_type === 'playlist') {
        const playlist = await db('playlists').where({ id: playback.context_id }).first();
        if (playlist) context = { type: 'playlist', id: playlist.id, title: playlist.name, image_url: playlist.image_url };
      } else if (playback.context_type === 'artist') {
        const artist = await db('artists').where({ id: playback.context_id }).first();
        if (artist) context = { type: 'artist', id: artist.id, title: artist.name, image_url: artist.image_url };
      }
    }

    return { ...playback, track: trackDetails, context };
  }

  static async updatePlayback(userId, trackId, options = {}) {
    const existing = await db('current_playback').where({ user_id: userId }).first();
    const now = new Date().toISOString();

    const playbackData = {
      user_id: userId,
      track_id: trackId,
      context_type: options.context_type || null,
      context_id: options.context_id || null,
      is_playing: options.is_playing ?? true,
      position_ms: options.position_ms || 0,
      volume_percent: options.volume_percent ?? 80,
      device_name: options.device_name || 'Web Player',
      shuffle_state: options.shuffle_state ?? false,
      repeat_state: options.repeat_state || 'off',
      timestamp: now,
      updated_at: now
    };

    if (existing) {
      await db('current_playback').where({ user_id: userId }).update(playbackData);
      return { ...existing, ...playbackData };
    } else {
      const newPlayback = { id: uuidv4(), ...playbackData, created_at: now };
      await db('current_playback').insert(newPlayback);
      return newPlayback;
    }
  }

  static async playbackControl(userId, { action, position_ms, volume_percent, state }) {
    const current = await db('current_playback').where({ user_id: userId }).first();
    if (!current) return null;

    if (action === 'pause') {
      await db('current_playback').where({ user_id: userId }).update({ is_playing: false, updated_at: new Date().toISOString() });
    } else if (action === 'resume') {
      await db('current_playback').where({ user_id: userId }).update({ is_playing: true, updated_at: new Date().toISOString() });
    } else if (action === 'seek') {
      await db('current_playback').where({ user_id: userId }).update({ position_ms, updated_at: new Date().toISOString() });
    } else if (action === 'volume') {
      await db('current_playback').where({ user_id: userId }).update({ volume_percent, updated_at: new Date().toISOString() });
    } else if (action === 'shuffle') {
      await db('current_playback').where({ user_id: userId }).update({ shuffle_state: !!state, updated_at: new Date().toISOString() });
    } else if (action === 'repeat') {
      await db('current_playback').where({ user_id: userId }).update({ repeat_state: state, updated_at: new Date().toISOString() });
    } else if (action === 'next') {
      const nextTrack = await this.getNextTrack(userId);
      if (nextTrack) await this.updatePlayback(userId, nextTrack.id, { is_playing: true });
    } else if (action === 'previous') {
      const prevTrack = await this.getPreviousTrack(userId);
      if (prevTrack) await this.updatePlayback(userId, prevTrack.id, { is_playing: true });
    }

    return this.getCurrentPlayback(userId);
  }

  static async getNextTrack(userId) {
    const currentPlayback = await db('current_playback').where({ user_id: userId }).first();
    if (!currentPlayback) return null;

    if (currentPlayback.repeat_state === 'track') return { id: currentPlayback.track_id };

    const queueNext = await db('user_queue').where({ user_id: userId }).orderBy('position','asc').first();
    if (queueNext) {
      await db('user_queue').where({ id: queueNext.id }).del();
      return { id: queueNext.track_id };
    }

    if (currentPlayback.context_type && currentPlayback.context_id) {
      return this.getNextTrackFromContext(
        currentPlayback.track_id,
        currentPlayback.context_type,
        currentPlayback.context_id,
        currentPlayback.shuffle_state,
        currentPlayback.repeat_state === 'context'
      );
    }

    return null;
  }

  static async getPreviousTrack(userId) {
    const currentPlayback = await db('current_playback').where({ user_id: userId }).first();
    if (!currentPlayback) return null;

    const prev = await db('play_history')
      .where({ user_id: userId })
      .orderBy('played_at','desc')
      .offset(1)
      .first();
    if (prev) return { id: prev.track_id };
    return null;
  }

  static async getNextTrackFromContext(currentTrackId, contextType, contextId, shuffleState, repeatContext) {
    let tracks = [];
    if (contextType === 'album') {
      tracks = await db('tracks').where({ album_id: contextId }).orderBy('track_number','asc');
    } else if (contextType === 'playlist') {
      tracks = await db('playlist_tracks').select('track_id as id','position').where({ playlist_id: contextId }).orderBy('position','asc');
    }
    if (tracks.length === 0) return null;

    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex === -1) return null;

    if (shuffleState) {
      const nextIndex = Math.floor(Math.random() * tracks.length);
      return { id: tracks[nextIndex].id };
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex < tracks.length) return { id: tracks[nextIndex].id };
    if (repeatContext) return { id: tracks[0].id };
    return null;
  }

  static async getPreviousTrackFromContext(currentTrackId, contextType, contextId) {
    let tracks = [];
    if (contextType === 'album') {
      tracks = await db('tracks').where({ album_id: contextId }).orderBy('track_number','asc');
    } else if (contextType === 'playlist') {
      tracks = await db('playlist_tracks').select('track_id as id','position').where({ playlist_id: contextId }).orderBy('position','asc');
    }
    if (tracks.length === 0) return null;

    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex === -1) return null;

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) return { id: tracks[prevIndex].id };
    return null;
  }

  static async getQueue(userId, limit = 50) {
    return db('user_queue')
      .where({ user_id: userId })
      .orderBy('position','asc')
      .limit(limit);
  }

  static async addToQueue(userId, trackId, context) {
    const max = await db('user_queue').where({ user_id: userId }).max('position as max').first();
    const position = (parseInt(max?.max) || 0) + 1;
    const item = {
      id: uuidv4(),
      user_id: userId,
      track_id: trackId,
      context_type: context?.type || null,
      context_id: context?.id || null,
      position,
      created_at: new Date().toISOString()
    };
    await db('user_queue').insert(item);
    return item;
  }

  static async removeFromQueue(userId, queueItemId) {
    await db('user_queue').where({ user_id: userId, id: queueItemId }).del();
  }

  static async transferPlayback(userId, deviceName) {
    await db('current_playback').where({ user_id: userId }).update({ device_name: deviceName, updated_at: new Date().toISOString() });
    return db('current_playback').where({ user_id: userId }).first();
  }

  static async stopPlayback(userId) {
    await db('current_playback').where({ user_id: userId }).del();
  }
}
module.exports = { PlayerModel };
