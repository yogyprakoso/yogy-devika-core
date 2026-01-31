import React from 'react';
import { useLoaderData } from 'react-router-dom';
import { getRequestHandler } from '@baseline/client-api/request-handler';
import { getAllRoomsAdmin } from '@baseline/client-api/room';
import { RoomAdminView } from '@baseline/types/room';
import PageContent from '../../../components/page-content/PageContent';
import RoomList from '../components/room-list/RoomList';

export async function roomsListLoader(): Promise<{ rooms: RoomAdminView[] }> {
  try {
    const rooms = await getAllRoomsAdmin(getRequestHandler());
    return { rooms: Array.isArray(rooms) ? rooms : [] };
  } catch (error) {
    console.error('Failed to load rooms:', error);
    return { rooms: [] };
  }
}

const Rooms = (): JSX.Element => {
  const { rooms } = useLoaderData() as { rooms: RoomAdminView[] };

  return (
    <PageContent>
      <RoomList rooms={rooms} />
    </PageContent>
  );
};

export default Rooms;
