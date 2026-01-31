import { Room, Participant } from '@baseline/types/room';
import { getErrorMessage } from '../../util/error-message';
import {
  getDynamodbConnection,
  putItem,
  getItem,
  deleteItem,
  queryItems,
} from '@baselinejs/dynamodb';
import { ServiceObject } from '../../util/service-object';

const dynamoDb = getDynamodbConnection({
  region: `${process.env.API_REGION}`,
});

const roomTable = `${process.env.APP_NAME}-${process.env.NODE_ENV}-room`;
const participantTable = `${process.env.APP_NAME}-${process.env.NODE_ENV}-participant`;

// Room Service (simple primary key)
export const roomService = new ServiceObject<Room>({
  dynamoDb: dynamoDb,
  objectName: 'Room',
  table: roomTable,
  primaryKey: 'roomCode',
  ownerField: 'hostId',
});

// Generate unique 6-character room code
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create room with auto-generated code and TTL
export const createRoom = async (hostId: string): Promise<Room> => {
  console.log(`Creating room for host: ${hostId}`);
  try {
    const now = Math.floor(Date.now() / 1000);
    const TTL_HOURS = 24;

    // Generate unique room code (retry if collision)
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await roomService.get(roomCode).catch(() => null);
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    const room: Room = {
      roomCode,
      hostId,
      topic: '',
      revealed: false,
      createdAt: now,
      expiresAt: now + TTL_HOURS * 60 * 60,
    };

    await putItem<Room>({
      dynamoDb,
      table: roomTable,
      item: room,
    });

    return room;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to create room: ${message}`);
    throw new Error(message);
  }
};

// Participant Service (composite key: roomCode + odv)
export const participantService = {
  async getByRoom(roomCode: string): Promise<Participant[]> {
    console.log(`Get participants for room: ${roomCode}`);
    try {
      return await queryItems<Participant>({
        dynamoDb,
        table: participantTable,
        keyName: 'roomCode',
        keyValue: roomCode,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get participants: ${message}`);
      throw new Error(message);
    }
  },

  async get(roomCode: string, odv: string): Promise<Participant | null> {
    console.log(`Get participant: ${roomCode}/${odv}`);
    try {
      return await getItem<Participant>({
        dynamoDb,
        table: participantTable,
        key: { roomCode, odv },
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get participant: ${message}`);
      return null;
    }
  },

  async join(
    roomCode: string,
    odv: string,
    displayName: string
  ): Promise<Participant> {
    console.log(`Join room: ${roomCode} as ${displayName}`);
    try {
      const participant: Participant = {
        roomCode,
        odv,
        displayName,
        vote: null,
        joinedAt: Math.floor(Date.now() / 1000),
      };

      await putItem<Participant>({
        dynamoDb,
        table: participantTable,
        item: participant,
      });

      return participant;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to join room: ${message}`);
      throw new Error(message);
    }
  },

  async leave(roomCode: string, odv: string): Promise<boolean> {
    console.log(`Leave room: ${roomCode}/${odv}`);
    try {
      return await deleteItem({
        dynamoDb,
        table: participantTable,
        key: { roomCode, odv },
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to leave room: ${message}`);
      throw new Error(message);
    }
  },

  async vote(
    roomCode: string,
    odv: string,
    vote: number | string
  ): Promise<Participant> {
    console.log(`Vote in room: ${roomCode}/${odv} = ${vote}`);
    try {
      const existing = await this.get(roomCode, odv);
      if (!existing) {
        throw new Error('Participant not found');
      }

      const updated: Participant = {
        ...existing,
        vote,
      };

      await putItem<Participant>({
        dynamoDb,
        table: participantTable,
        item: updated,
      });

      return updated;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to vote: ${message}`);
      throw new Error(message);
    }
  },

  async resetVotes(roomCode: string): Promise<void> {
    console.log(`Reset votes for room: ${roomCode}`);
    try {
      const participants = await this.getByRoom(roomCode);
      for (const p of participants) {
        await putItem<Participant>({
          dynamoDb,
          table: participantTable,
          item: { ...p, vote: null },
        });
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to reset votes: ${message}`);
      throw new Error(message);
    }
  },
};
