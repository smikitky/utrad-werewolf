import fb from 'firebase-admin';

export const now = () => fb.database.ServerValue.TIMESTAMP;
