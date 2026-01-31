/**
 * Room routes - for both Lambda and local server
 */

import { Router, Response } from 'express';
import { RequestContext } from '../../util/request-context.type';
import { getErrorMessage } from '../../util/error-message';
import {
  roomService,
  participantService,
  createRoom,
} from './room.service';
import { RoomStateMapper } from './room';
import { VoteValue } from '@baseline/types/room';

export const roomRoutes = Router();

// Valid vote values
const VALID_VOTES: VoteValue[] = [1, 2, 3, 5, 8, 13, 21, '?'];

/**
 * POST /rooms - Create a new room
 */
roomRoutes.post('/', async (req: RequestContext, res: Response) => {
  try {
    const hostId = req.currentUserSub;
    const room = await createRoom(hostId);

    // Auto-join host as participant
    const displayName = req.body.displayName || 'Host';
    await participantService.join(room.roomCode, hostId, displayName);

    res.status(201).json({ roomCode: room.roomCode });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to create room: ${message}`);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

/**
 * GET /rooms/:code - Get room state (for polling)
 */
roomRoutes.get('/:code', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserSub = req.currentUserSub;

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const participants = await participantService.getByRoom(code);
    const state = RoomStateMapper(room, participants, currentUserSub);

    res.json(state);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to get room: ${message}`);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

/**
 * DELETE /rooms/:code - Delete room (host only)
 */
roomRoutes.delete('/:code', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserSub = req.currentUserSub;

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== currentUserSub) {
      res.status(403).json({ error: 'Only host can delete room' });
      return;
    }

    // Delete all participants first
    const participants = await participantService.getByRoom(code);
    for (const p of participants) {
      await participantService.leave(code, p.odv);
    }

    await roomService.delete(code);
    res.status(204).send();
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to delete room: ${message}`);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

/**
 * POST /rooms/:code/join - Join room
 */
roomRoutes.post('/:code/join', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const { displayName } = req.body;
    const currentUserSub = req.currentUserSub;

    if (!displayName) {
      res.status(400).json({ error: 'Display name is required' });
      return;
    }

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Check if already joined
    const existing = await participantService.get(code, currentUserSub);
    if (existing) {
      res.json({ message: 'Already joined', participant: existing });
      return;
    }

    const participant = await participantService.join(
      code,
      currentUserSub,
      displayName
    );
    res.status(201).json(participant);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to join room: ${message}`);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

/**
 * DELETE /rooms/:code/leave - Leave room
 */
roomRoutes.delete('/:code/leave', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserSub = req.currentUserSub;

    await participantService.leave(code, currentUserSub);
    res.status(204).send();
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to leave room: ${message}`);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

/**
 * POST /rooms/:code/topic - Set topic (host only)
 */
roomRoutes.post('/:code/topic', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const { topic } = req.body;
    const currentUserSub = req.currentUserSub;

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== currentUserSub) {
      res.status(403).json({ error: 'Only host can set topic' });
      return;
    }

    const updated = await roomService.update({
      roomCode: code,
      topic: topic || '',
    });

    res.json({ topic: updated.topic });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to set topic: ${message}`);
    res.status(500).json({ error: 'Failed to set topic' });
  }
});

/**
 * POST /rooms/:code/vote - Submit vote
 */
roomRoutes.post('/:code/vote', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const { vote } = req.body;
    const currentUserSub = req.currentUserSub;

    // Validate vote value
    if (!VALID_VOTES.includes(vote)) {
      res.status(400).json({
        error: 'Invalid vote value',
        validValues: VALID_VOTES,
      });
      return;
    }

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.revealed) {
      res.status(400).json({ error: 'Cannot vote after reveal' });
      return;
    }

    const participant = await participantService.vote(code, currentUserSub, vote);
    res.json({ vote: participant.vote });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to vote: ${message}`);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

/**
 * POST /rooms/:code/reveal - Reveal votes (host only)
 */
roomRoutes.post('/:code/reveal', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserSub = req.currentUserSub;

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== currentUserSub) {
      res.status(403).json({ error: 'Only host can reveal votes' });
      return;
    }

    await roomService.update({
      roomCode: code,
      revealed: true,
    });

    res.json({ revealed: true });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to reveal votes: ${message}`);
    res.status(500).json({ error: 'Failed to reveal votes' });
  }
});

/**
 * POST /rooms/:code/reset - Reset votes for next round (host only)
 */
roomRoutes.post('/:code/reset', async (req: RequestContext, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserSub = req.currentUserSub;

    const room = await roomService.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== currentUserSub) {
      res.status(403).json({ error: 'Only host can reset' });
      return;
    }

    // Reset room state
    await roomService.update({
      roomCode: code,
      revealed: false,
      topic: '',
    });

    // Reset all participant votes
    await participantService.resetVotes(code);

    res.json({ reset: true });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to reset: ${message}`);
    res.status(500).json({ error: 'Failed to reset' });
  }
});
