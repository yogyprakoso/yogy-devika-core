import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { RoomAdminDetails } from '@baseline/types/room';
import styles from './RoomDetailsModal.module.scss';

interface Props {
  room: RoomAdminDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

const RoomDetailsModal = ({ room, isOpen, onClose }: Props): JSX.Element => {
  if (!room) return <></>;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg">
      <ModalHeader toggle={onClose}>
        Room Details: {room.roomCode}
      </ModalHeader>
      <ModalBody>
        <div className={styles.details}>
          <div className={styles.section}>
            <h4>Room Information</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Room Code</span>
                <span className={styles.value}>{room.roomCode}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Topic</span>
                <span className={styles.value}>{room.topic || '(No topic set)'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Host ID</span>
                <span className={styles.value}>{room.hostId}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Created</span>
                <span className={styles.value}>{formatDate(room.createdAt)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Expires</span>
                <span className={styles.value}>{formatDate(room.expiresAt)}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h4>Participants ({room.participants.length})</h4>
            {room.participants.length === 0 ? (
              <p className={styles.noParticipants}>No participants in this room</p>
            ) : (
              <div className={styles.participantList}>
                <div className={styles.participantHeader}>
                  <span>Name</span>
                  <span>Joined</span>
                </div>
                {room.participants.map((p) => (
                  <div key={p.odv} className={styles.participant}>
                    <span className={styles.name}>{p.displayName}</span>
                    <span className={styles.joined}>{formatDate(p.joinedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RoomDetailsModal;
