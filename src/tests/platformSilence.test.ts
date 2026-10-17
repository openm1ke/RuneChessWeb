// Playgama's QA mutes the platform, reloads the game and listens. The mute
// arrived before any music was playing, so pausing had nothing to stop and
// the menu track started anyway. The platform's mute is now a state that
// holds music back until the platform lifts it.
import { describe, expect, it, vi } from 'vitest';
import { MusicService } from '../services/musicService';

function spyOnTracks(service: MusicService) {
  const tracks = service as unknown as {
    menu: { play: (...a: unknown[]) => Promise<void>; resume: (...a: unknown[]) => Promise<void>; pause: () => void; isPlaying: boolean };
  };
  const play = vi.spyOn(tracks.menu, 'play').mockResolvedValue();
  const resume = vi.spyOn(tracks.menu, 'resume').mockResolvedValue();
  return { play, resume };
}

describe('the platform mute', () => {
  it('keeps music asked for while muted from starting, and plays it once lifted', async () => {
    const service = new MusicService();
    const { play, resume } = spyOnTracks(service);

    service.setPlatformSilenced(true);
    await service.startMenu();
    expect(play).not.toHaveBeenCalled();

    service.setPlatformSilenced(false);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('is not ended early by another pause', async () => {
    const service = new MusicService();
    const { resume } = spyOnTracks(service);

    service.setPlatformSilenced(true);
    await service.startMenu();
    // An ad closing, or the tab coming back, while the platform still
    // wants silence.
    service.pauseAll();
    service.resumeAll();
    expect(resume).not.toHaveBeenCalled();
  });

  it('a track stopped while muted does not come back when the mute lifts', async () => {
    const service = new MusicService();
    const { resume } = spyOnTracks(service);

    service.setPlatformSilenced(true);
    await service.startMenu();
    await service.stopMenu();
    service.setPlatformSilenced(false);
    expect(resume).not.toHaveBeenCalled();
  });
});
