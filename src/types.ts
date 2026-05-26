/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  updatedAt: string | Date;
  activeCircleId?: string;
  activeSOS?: boolean;
  sosMessage?: string;
  batteryLevel?: number;
}

export interface Circle {
  id: string;
  name: string;
  code: string;
  createdById: string;
  createdAt: string;
}

export interface CircleMember {
  id: string; // matches userId
  userId: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'member';
  joinedAt: string;
  batteryLevel?: number;
}

export interface SOSAlert {
  id: string;
  userId: string;
  userName: string;
  message: string;
  latitude: number;
  longitude: number;
  active: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  createdAt: string;
  createdById: string;
}
