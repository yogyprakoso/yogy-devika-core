import React, { useState } from 'react';
import { getRequestHandler } from '@baseline/client-api/request-handler';
import { deleteRoomAdmin, getRoomDetailsAdmin } from '@baseline/client-api/room';
import { RoomAdminView, RoomAdminDetails } from '@baseline/types/room';
import ConfirmDelete from '../../../../components/confirm-delete/ConfirmDelete';
import RoomDetailsModal from '../room-details-modal/RoomDetailsModal';
import styles from './RoomList.module.scss';

interface Props {
  rooms: RoomAdminView[];
}

const RoomList = (props: Props): JSX.Element => {
  const [allRooms, setAllRooms] = useState<RoomAdminView[]>(props?.rooms || []);
  const [selectedRoom, setSelectedRoom] = useState<RoomAdminDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleDelete = async (roomCode: string): Promise<void> => {
    await deleteRoomAdmin(getRequestHandler(), roomCode);
    setAllRooms((rooms) => rooms.filter((r) => r.roomCode !== roomCode));
  };

  const handleViewDetails = async (roomCode: string): Promise<void> => {
    setLoadingDetails(true);
    try {
      const details = await getRoomDetailsAdmin(getRequestHandler(), roomCode);
      setSelectedRoom(details);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to load room details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setSelectedRoom(null);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isExpired = (expiresAt: number): boolean => {
    return Date.now() / 1000 > expiresAt;
  };

  return (
    <div className={styles.roomList}>
      <div className={styles.header}>
        <h2>Room Management</h2>
        <span className={styles.count}>{allRooms.length} rooms</span>
      </div>

      {allRooms.length === 0 ? (
        <div className={styles.empty}>
          <p>No active rooms</p>
        </div>
      ) : (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Code</span>
            <span>Topic</span>
            <span>Participants</span>
            <span>Created</span>
            <span>Actions</span>
          </div>
          {allRooms.map((room) => (
            <div
              key={room.roomCode}
              className={`${styles.item} ${isExpired(room.expiresAt) ? styles.expired : ''}`}
            >
              <span className={styles.code}>{room.roomCode}</span>
              <span className={styles.topic}>{room.topic || '(No topic)'}</span>
              <span className={styles.participants}>{room.participantCount}</span>
              <span className={styles.created}>{formatDate(room.createdAt)}</span>
              <span className={styles.actions}>
                <button
                  className={styles.viewBtn}
                  onClick={() => handleViewDetails(room.roomCode)}
                  disabled={loadingDetails}
                >
                  View
                </button>
                <ConfirmDelete
                  itemName={room.roomCode}
                  deleteFunction={async () => {
                    await handleDelete(room.roomCode);
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      <RoomDetailsModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default RoomList;
