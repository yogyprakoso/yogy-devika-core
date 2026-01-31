import { RoomState } from '@baseline/types/room';
import { RequestHandler } from './request-handler';

export interface CreateRoomResponse {
  roomCode: string;
}

export interface JoinRoomData {
  displayName: string;
}

export interface VoteData {
  vote: number | string;
}

export interface TopicData {
  topic: string;
}

export const createRoom = async (
  requestHandler: RequestHandler,
  data: JoinRoomData,
): Promise<CreateRoomResponse> => {
  const response = await requestHandler.request<CreateRoomResponse>({
    method: 'POST',
    url: 'rooms',
    hasAuthentication: true,
    data,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const getRoom = async (
  requestHandler: RequestHandler,
  roomCode: string,
): Promise<RoomState> => {
  const response = await requestHandler.request<RoomState>({
    method: 'GET',
    url: `rooms/${roomCode}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const joinRoom = async (
  requestHandler: RequestHandler,
  roomCode: string,
  data: JoinRoomData,
): Promise<void> => {
  const response = await requestHandler.request({
    method: 'POST',
    url: `rooms/${roomCode}/join`,
    hasAuthentication: true,
    data,
  });
  if ('data' in response) {
    return;
  }
  throw response;
};

export const leaveRoom = async (
  requestHandler: RequestHandler,
  roomCode: string,
): Promise<void> => {
  const response = await requestHandler.request({
    method: 'DELETE',
    url: `rooms/${roomCode}/leave`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return;
  }
  throw response;
};

export const setTopic = async (
  requestHandler: RequestHandler,
  roomCode: string,
  data: TopicData,
): Promise<void> => {
  const response = await requestHandler.request({
    method: 'POST',
    url: `rooms/${roomCode}/topic`,
    hasAuthentication: true,
    data,
  });
  if ('data' in response) {
    return;
  }
  throw response;
};

export const vote = async (
  requestHandler: RequestHandler,
  roomCode: string,
  data: VoteData,
): Promise<void> => {
  const response = await requestHandler.request({
    method: 'POST',
    url: `rooms/${roomCode}/vote`,
    hasAuthentication: true,
    data,
  });
  if ('data' in response) {
    return;
  }
  throw response;
};

export const revealVotes = async (
  requestHandler: RequestHandler,
  roomCode: string,
): Promise<void> => {
  const response = await requestHandler.request({
    method: 'POST',
    url: `rooms/${roomCode}/reveal`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return;
  }
  throw response;
};

export const resetRoom = async (
  requestHandler: RequestHandler,
  roomCode: string,
): Promise<void> => {
  const response = await requestHandler.request({
    method: 'POST',
    url: `rooms/${roomCode}/reset`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return;
  }
  throw response;
};
