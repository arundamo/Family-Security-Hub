/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  UserProfile, Circle, CircleMember, SOSAlert, ChatMessage, SafeZone, LocationData 
} from '../types';
import { 
  db, auth, isMockFirebase, OperationType, handleFirestoreError 
} from '../firebase';
import { 
  doc, setDoc, onSnapshot, collection, addDoc, updateDoc, 
  deleteDoc, query, where, getDocs, orderBy, limit, serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from 'firebase/auth';

interface FamilyContextType {
  currentUser: UserProfile | null;
  activeCircle: Circle | null;
  members: CircleMember[];
  sosAlerts: SOSAlert[];
  chats: ChatMessage[];
  safeZones: SafeZone[];
  loading: boolean;
  isBackendConnected: boolean;
  error: string | null;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  createCircle: (name: string) => Promise<void>;
  joinCircle: (code: string) => Promise<void>;
  leaveCircle: () => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  triggerSOS: (message: string) => Promise<void>;
  resolveSOS: (sosId: string) => Promise<void>;
  addSafeZone: (name: string, lat: number, lng: number, radius: number) => Promise<void>;
  deleteSafeZone: (zoneId: string) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  updateUserLocation: (lat: number, lng: number) => Promise<void>;
  joinedCirclesList: { id: string; name: string; code: string }[];
  switchActiveCircle: (circleId: string) => Promise<void>;
  // Dev Sandbox Simulation
  simulateMemberMovement: (memberId: string, lat: number, lng: number) => void;
  simulateToggleSos: (memberId: string, message: string) => void;
  gpsStatus: 'fetching' | 'granted' | 'denied' | 'unsupported' | 'disabled';
  setGpsStatus: React.Dispatch<React.SetStateAction<'fetching' | 'granted' | 'denied' | 'unsupported' | 'disabled'>>;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
  mapCenter: { lat: number; lng: number };
  setMapCenter: (center: { lat: number; lng: number }) => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}

// ----------------------------------------------------------------------
// Mock Initial Data for Beautiful Sandboxed Playgrounds
// ----------------------------------------------------------------------
const INITIAL_MOCK_USER: UserProfile = {
  id: 'user_mom_1',
  displayName: 'Sarah Cook (You)',
  email: 'sarah.cook@example.com',
  photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  phoneNumber: '+1 (555) 0192',
  latitude: 37.422,
  longitude: -122.084,
  updatedAt: new Date().toISOString(),
  activeCircleId: 'circle_cook_family',
  activeSOS: false,
  batteryLevel: 85,
};

const INITIAL_MOCK_CIRCLE: Circle = {
  id: 'circle_cook_family',
  name: 'Cook Family Circle',
  code: 'CK8291',
  createdById: 'user_mom_1',
  createdAt: new Date().toISOString(),
};

const INITIAL_MOCK_MEMBERS: CircleMember[] = [
  {
    id: 'user_mom_1',
    userId: 'user_mom_1',
    displayName: 'Sarah Cook (You)',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'admin',
    joinedAt: new Date().toISOString(),
    batteryLevel: 85,
  },
  {
    id: 'user_dad_2',
    userId: 'user_dad_2',
    displayName: 'David Cook (Dad)',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'member',
    joinedAt: new Date().toISOString(),
    batteryLevel: 42,
  },
  {
    id: 'user_child_3',
    userId: 'user_child_3',
    displayName: 'Emily Cook (Daughter)',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'member',
    joinedAt: new Date().toISOString(),
    batteryLevel: 18,
  }
];

const INITIAL_MOCK_SAFEZONES: SafeZone[] = [
  {
    id: 'zone_home',
    name: 'Home Sanctuary',
    latitude: 37.4219999,
    longitude: -122.084057,
    radius: 120,
    createdAt: new Date().toISOString(),
    createdById: 'user_mom_1'
  },
  {
    id: 'zone_school',
    name: 'Greenwood High School',
    latitude: 37.4249,
    longitude: -122.091,
    radius: 180,
    createdAt: new Date().toISOString(),
    createdById: 'user_mom_1'
  }
];

const INITIAL_MOCK_MESSAGE: ChatMessage[] = [
  {
    id: 'msg_1',
    senderId: 'user_dad_2',
    senderName: 'David Cook (Dad)',
    text: 'Picked up groceries! Heading back home shortly.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'msg_2',
    senderId: 'user_child_3',
    senderName: 'Emily Cook (Daughter)',
    text: 'Finishing up badminton practice. I am at the gym.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  }
];

// Helper to calculate distance for checking safe zones in simulation
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of earth in meters
  const q1 = lat1 * Math.PI / 180;
  const q2 = lat2 * Math.PI / 180;
  const dq = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dq / 2) * Math.sin(dq / 2) +
            Math.cos(q1) * Math.cos(q2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeCircle, setActiveCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.422, lng: -122.084 });

  // Update map center when current user's logged location changes
  useEffect(() => {
    if (currentUser?.latitude && currentUser?.longitude) {
      setMapCenter({ lat: currentUser.latitude, lng: currentUser.longitude });
    }
  }, [currentUser?.latitude, currentUser?.longitude]);

  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(!isMockFirebase);
  const [error, setError] = useState<string | null>(null);

  const [joinedCirclesList, setJoinedCirclesList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [gpsStatusState, setGpsStatusState] = useState<'fetching' | 'granted' | 'denied' | 'unsupported' | 'disabled'>(() => {
    const cached = localStorage.getItem('family_gps_status');
    return (cached as any) || 'fetching';
  });

  const setGpsStatus = React.useCallback((value: React.SetStateAction<'fetching' | 'granted' | 'denied' | 'unsupported' | 'disabled'>) => {
    setGpsStatusState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('family_gps_status', next);
      return next;
    });
  }, []);

  const gpsStatus = gpsStatusState;

  // Synchronize joined circles with local storage
  useEffect(() => {
    const userId = currentUser?.id || 'mock_user';
    const cached = localStorage.getItem(`family_security_joined_circles_list_${userId}`);
    if (cached) {
      try {
        const list = JSON.parse(cached);
        setJoinedCirclesList(list);
      } catch (e) {
        setJoinedCirclesList([]);
      }
    } else {
      if (isMockFirebase || !isBackendConnected) {
        const defaultList = [{ id: 'circle_cook_family', name: 'Cook Family Circle', code: 'CK8291' }];
        setJoinedCirclesList(defaultList);
        localStorage.setItem(`family_security_joined_circles_list_${userId}`, JSON.stringify(defaultList));
      } else {
        setJoinedCirclesList([]);
      }
    }
  }, [currentUser?.id, isBackendConnected]);

  // Proactively auto-append the active circle to the user's joined circle list if missing
  useEffect(() => {
    const userId = currentUser?.id || 'mock_user';
    if (activeCircle) {
      const exists = joinedCirclesList.some(c => c.id === activeCircle.id);
      if (!exists) {
        const updated = [...joinedCirclesList, { id: activeCircle.id, name: activeCircle.name, code: activeCircle.code }];
        setJoinedCirclesList(updated);
        localStorage.setItem(`family_security_joined_circles_list_${userId}`, JSON.stringify(updated));
      }
    }
  }, [activeCircle?.id, activeCircle?.name, activeCircle?.code, currentUser?.id, joinedCirclesList]);

  const appendToJoinedCirclesList = (id: string, name: string, code: string) => {
    const userId = currentUser?.id || 'mock_user';
    setJoinedCirclesList(prev => {
      const exists = prev.some(c => c.id === id);
      if (exists) return prev;
      const updated = [...prev, { id, name, code }];
      localStorage.setItem(`family_security_joined_circles_list_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const switchActiveCircle = async (circleId: string) => {
    if (isMockFirebase || !isBackendConnected) {
      const targetCircle = joinedCirclesList.find(c => c.id === circleId);
      if (targetCircle) {
        setSimulatedCircle(targetCircle);
        setSimulatedUser(prev => ({ ...prev, activeCircleId: circleId }));
        setActiveCircle(targetCircle);

        if (circleId === 'circle_cook_family') {
          setSimulatedMembers(INITIAL_MOCK_MEMBERS);
          setSimulatedZones(INITIAL_MOCK_SAFEZONES);
          setMembers(INITIAL_MOCK_MEMBERS);
          setSafeZones(INITIAL_MOCK_SAFEZONES);
        } else {
          const mockFriends: CircleMember[] = [
            {
              id: simulatedUser.id,
              userId: simulatedUser.id,
              displayName: simulatedUser.displayName,
              photoURL: simulatedUser.photoURL,
              role: 'admin',
              joinedAt: new Date().toISOString(),
              batteryLevel: simulatedUser.batteryLevel || 85
            },
            {
              id: 'friend_1',
              userId: 'friend_1',
              displayName: 'Mark (Friend)',
              photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
              role: 'member',
              joinedAt: new Date().toISOString(),
              batteryLevel: 98
            },
            {
              id: 'friend_2',
              userId: 'friend_2',
              displayName: 'Emma (Friend)',
              photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
              role: 'member',
              joinedAt: new Date().toISOString(),
              batteryLevel: 9
            }
          ];
          setSimulatedMembers(mockFriends);
          setSimulatedZones([]);
          setMembers(mockFriends);
          setSafeZones([]);

          const uLat = currentUser?.latitude || 37.422;
          const uLng = currentUser?.longitude || -122.084;
          setSimulatedCoordinates(prev => ({
            ...prev,
            'friend_1': { latitude: uLat + 0.003, longitude: uLng - 0.004 },
            'friend_2': { latitude: uLat - 0.002, longitude: uLng + 0.005 }
          }));
        }

        setSimulatedChats([]);
        setChats([]);
        setSimulatedSos([]);
        setSosAlerts([]);
        setCurrentUser(prev => prev ? { ...prev, activeCircleId: circleId } : null);
      }
      return;
    }

    try {
      const activeUser = auth.currentUser!;
      await setDoc(doc(db, 'users', activeUser.uid), {
        activeCircleId: circleId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'users/switchCircle');
    }
  };

  // Maintain separate simulation structures in state to persist locally
  const [simulatedUser, setSimulatedUser] = useState<UserProfile>(() => {
    const cached = localStorage.getItem('family_sim_user');
    return cached ? JSON.parse(cached) : INITIAL_MOCK_USER;
  });
  const [simulatedCircle, setSimulatedCircle] = useState<Circle | null>(() => {
    const cached = localStorage.getItem('family_sim_circle');
    return cached ? JSON.parse(cached) : INITIAL_MOCK_CIRCLE;
  });
  const [simulatedMembers, setSimulatedMembers] = useState<CircleMember[]>(() => {
    const cached = localStorage.getItem('family_sim_members');
    return cached ? JSON.parse(cached) : INITIAL_MOCK_MEMBERS;
  });
  const [simulatedZones, setSimulatedZones] = useState<SafeZone[]>(() => {
    const cached = localStorage.getItem('family_sim_zones');
    return cached ? JSON.parse(cached) : INITIAL_MOCK_SAFEZONES;
  });
  const [simulatedChats, setSimulatedChats] = useState<ChatMessage[]>(() => {
    const cached = localStorage.getItem('family_sim_chats');
    return cached ? JSON.parse(cached) : INITIAL_MOCK_MESSAGE;
  });
  const [simulatedSos, setSimulatedSos] = useState<SOSAlert[]>(() => {
    const cached = localStorage.getItem('family_sim_sos');
    return cached ? JSON.parse(cached) : [];
  });

  // Track coordinates of other members within simulation
  const [simulatedCoordinates, setSimulatedCoordinates] = useState<Record<string, { latitude: number, longitude: number, activeSOS?: boolean, sosMessage?: string }>>({
    'user_mom_1': { latitude: 37.422, longitude: -122.084 },
    'user_dad_2': { latitude: 37.421, longitude: -122.089 },
    'user_child_3': { latitude: 37.426, longitude: -122.092 }
  });

  const [hasRealignedSandbox, setHasRealignedSandbox] = useState(() => {
    return localStorage.getItem('family_sim_realigned') === 'true';
  });

  // Shift sandbox mockups near the user's real-time coordinate upon load
  useEffect(() => {
    if (!hasRealignedSandbox && currentUser?.latitude) {
      const uLat = currentUser.latitude;
      const uLng = currentUser.longitude ?? -122.084;
      
      // Compute deviation distance from the default Mountain View point
      const isFar = Math.abs(uLat - 37.422) > 0.05 || Math.abs(uLng - -122.084) > 0.05;
      
      if (isFar) {
        const latOffset = uLat - 37.422;
        const lngOffset = uLng - -122.084;
        
        setSimulatedCoordinates(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            if (key !== currentUser.id) {
              next[key] = {
                ...next[key],
                latitude: (next[key]?.latitude ?? 37.422) + latOffset,
                longitude: (next[key]?.longitude ?? -122.084) + lngOffset
              };
            } else {
              next[key] = {
                ...next[key],
                latitude: uLat,
                longitude: uLng
              };
            }
          });
          return next;
        });

        setSimulatedZones(prev => prev.map(zone => ({
          ...zone,
          latitude: zone.latitude + latOffset,
          longitude: zone.longitude + lngOffset
        })));

        setHasRealignedSandbox(true);
        localStorage.setItem('family_sim_realigned', 'true');
      }
    }
  }, [currentUser?.latitude, currentUser?.longitude, hasRealignedSandbox, currentUser?.id]);

  // Save current simulated states to storage
  useEffect(() => {
    if (isMockFirebase || !isBackendConnected) {
      localStorage.setItem('family_sim_user', JSON.stringify(simulatedUser));
      localStorage.setItem('family_sim_circle', JSON.stringify(simulatedCircle));
      localStorage.setItem('family_sim_members', JSON.stringify(simulatedMembers));
      localStorage.setItem('family_sim_zones', JSON.stringify(simulatedZones));
      localStorage.setItem('family_sim_chats', JSON.stringify(simulatedChats));
      localStorage.setItem('family_sim_sos', JSON.stringify(simulatedSos));
    }
  }, [simulatedUser, simulatedCircle, simulatedMembers, simulatedZones, simulatedChats, simulatedSos, isBackendConnected]);

  // Synchronize browser battery Level if supported
  useEffect(() => {
    let active = true;
    let registeredBattery: any = null;
    let elementListener: any = null;

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (!active) return;
        registeredBattery = battery;

        const updateBattery = () => {
          const levelPercent = Math.round(battery.level * 100);
          
          setSimulatedUser(prev => {
            if (prev.batteryLevel === levelPercent) return prev;
            return { ...prev, batteryLevel: levelPercent };
          });

          setCurrentUser(prev => {
            if (!prev) return prev;
            if (prev.batteryLevel === levelPercent) return prev;
            return { ...prev, batteryLevel: levelPercent };
          });
          
          if (!isMockFirebase && isBackendConnected && currentUser?.id) {
            setDoc(doc(db, 'users', currentUser.id), {
              batteryLevel: levelPercent,
              updatedAt: serverTimestamp()
            }, { merge: true }).catch(() => {});
          }
        };

        updateBattery();
        elementListener = updateBattery;
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch((err: any) => console.warn("Battery status API ignored or unavailable in iframe environment:", err));
    }

    return () => {
      active = false;
      if (registeredBattery && elementListener) {
        registeredBattery.removeEventListener('levelchange', elementListener);
        registeredBattery.removeEventListener('chargingchange', elementListener);
      }
    };
  }, [currentUser?.id, isBackendConnected, isMockFirebase]);

  // Sync real-time browser location to database or mock coords
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }

    if (gpsStatus === 'disabled') {
       return;
    }

    // Fetch immediate startup coordinates
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateUserLocation(latitude, longitude);
        setGpsStatus('granted');
      },
      (err) => {
        console.warn("Initial position query denied or unavailable:", err);
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('unsupported');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateUserLocation(latitude, longitude);
        setGpsStatus('granted');
      },
      (err) => {
        console.warn("Watch position denied or unavailable:", err);
        if (err.code === 1) {
          setGpsStatus('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUser?.id, isBackendConnected, gpsStatus]);

  // ----------------------------------------------------------------------
  // Live FireBase Synchronization Thread
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (isMockFirebase || !db || !auth) {
      // Configure Simulated engine
      setCurrentUser(simulatedUser);
      setActiveCircle(simulatedCircle);
      setMembers(simulatedMembers);
      setSafeZones(simulatedZones);
      setChats(simulatedChats);
      setSosAlerts(simulatedSos);
      setLoading(false);
      setIsBackendConnected(false);
      return;
    }

    setLoading(true);
    let unsubUser: any = null;
    let unsubCircle: any = null;
    let unsubMembers: any = null;
    let unsubSos: any = null;
    let unsubChats: any = null;
    let unsubZones: any = null;
    let memberUnsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (userObj) => {
      if (userObj) {
        setIsBackendConnected(true);
        // Sync & Listen to current user document
        const userRef = doc(db, 'users', userObj.uid);
        
        unsubUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const profile: UserProfile = {
              id: snapshot.id,
              email: data.email || '',
              displayName: data.displayName || '',
              photoURL: data.photoURL || '',
              phoneNumber: data.phoneNumber || '',
              latitude: data.latitude,
              longitude: data.longitude,
              updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : new Date().toISOString(),
              activeCircleId: data.activeCircleId || '',
              activeSOS: data.activeSOS || false,
              sosMessage: data.sosMessage || '',
              batteryLevel: data.batteryLevel
            };
            setCurrentUser(profile);

            // Fetch circle listeners if circle is selected
            if (profile.activeCircleId) {
              setupCircleListeners(profile.activeCircleId);
            } else {
              setActiveCircle(null);
              setMembers([]);
              setSosAlerts([]);
              setChats([]);
              setSafeZones([]);
            }
          } else {
            // First time login - register profile
            const freshProfile: UserProfile = {
              id: userObj.uid,
              email: userObj.email || '',
              displayName: userObj.displayName || 'Anonymous Family Member',
              photoURL: userObj.photoURL || '',
              updatedAt: new Date().toISOString(),
            };
            setDoc(userRef, {
              ...freshProfile,
              updatedAt: serverTimestamp()
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${userObj.uid}`));
            setCurrentUser(freshProfile);
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${userObj.uid}`);
          setLoading(false);
        });

      } else {
        // Logged out
        if (unsubUser) { unsubUser(); unsubUser = null; }
        if (unsubCircle) { unsubCircle(); unsubCircle = null; }
        if (unsubMembers) { unsubMembers(); unsubMembers = null; }
        if (unsubSos) { unsubSos(); unsubSos = null; }
        if (unsubChats) { unsubChats(); unsubChats = null; }
        if (unsubZones) { unsubZones(); unsubZones = null; }
        memberUnsubs.forEach(unsub => unsub());
        memberUnsubs = [];

        setCurrentUser(null);
        setActiveCircle(null);
        setMembers([]);
        setSosAlerts([]);
        setChats([]);
        setSafeZones([]);
        setLoading(false);
      }
    });

    function setupCircleListeners(circleId: string) {
      if (unsubCircle) unsubCircle();
      if (unsubMembers) unsubMembers();
      if (unsubSos) unsubSos();
      if (unsubChats) unsubChats();
      if (unsubZones) unsubZones();
      memberUnsubs.forEach(unsub => unsub());
      memberUnsubs = [];

      // Listener 1: Circle Meta
      unsubCircle = onSnapshot(doc(db, 'circles', circleId), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setActiveCircle({
            id: snap.id,
            name: d.name,
            code: d.code,
            createdById: d.createdById,
            createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString()
          });
        }
      }, (e) => {
        // Silently skip or log circle lookup error if user logged out or switched circle permission
        handleFirestoreError(e, OperationType.GET, `circles/${circleId}`);
      });

      // Listener 2: Members list
      unsubMembers = onSnapshot(collection(db, 'circles', circleId, 'members'), (snap) => {
        const mList: CircleMember[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          mList.push({
            id: docSnap.id,
            userId: d.userId,
            displayName: d.displayName,
            photoURL: d.photoURL,
            role: d.role,
            joinedAt: d.joinedAt ? (d.joinedAt.toDate ? d.joinedAt.toDate().toISOString() : d.joinedAt) : new Date().toISOString()
          });
        });

        // Auto kicker detection: If list is populated but we aren't in it, we were kicked!
        const myUid = auth?.currentUser?.uid;
        if (myUid && mList.length > 0 && !mList.some(m => m.userId === myUid)) {
          console.warn("Client was removed from the active circle. Auto-cleaning.");
          leaveCircle();
          return;
        }

        setMembers(mList);

        // Geolocation pull: Fetch current locations of user keys
        memberUnsubs.forEach(unsub => unsub());
        memberUnsubs = [];

        mList.forEach((m) => {
          if (m.userId !== auth?.currentUser?.uid) {
            const unsubM = onSnapshot(doc(db, 'users', m.userId), (userSnap) => {
              if (userSnap.exists()) {
                const ud = userSnap.data();
                setSimulatedCoordinates(prev => ({
                  ...prev,
                  [m.userId]: {
                    latitude: ud.latitude || 37.42,
                    longitude: ud.longitude || -122.08,
                    activeSOS: ud.activeSOS || false,
                    sosMessage: ud.sosMessage || '',
                    batteryLevel: ud.batteryLevel,
                  }
                }));
              }
            });
            memberUnsubs.push(unsubM);
          }
        });
      }, (e) => {
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('insufficient')) {
          console.warn("Permission denied accessing circle members. Auto-exiting circle.");
          leaveCircle();
        } else {
          handleFirestoreError(e, OperationType.GET, `circles/${circleId}/members`);
        }
      });

      // Listener 3: Active SOS Alerts
      unsubSos = onSnapshot(collection(db, 'circles', circleId, 'sos'), (snap) => {
        const sosList: SOSAlert[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          sosList.push({
            id: docSnap.id,
            userId: d.userId,
            userName: d.userName,
            message: d.message,
            latitude: d.latitude,
            longitude: d.longitude,
            active: d.active,
            createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString(),
            resolvedAt: d.resolvedAt ? (d.resolvedAt.toDate ? d.resolvedAt.toDate().toISOString() : d.resolvedAt) : undefined,
            resolvedBy: d.resolvedBy
          });
        });
        setSosAlerts(sosList.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      }, (e) => handleFirestoreError(e, OperationType.GET, `circles/${circleId}/sos`));

      // Listener 4: Chat messages
      unsubChats = onSnapshot(collection(db, 'circles', circleId, 'chats'), (snap) => {
        const chatList: ChatMessage[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          chatList.push({
            id: docSnap.id,
            senderId: d.senderId,
            senderName: d.senderName,
            text: d.text,
            createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString()
          });
        });
        setMembers((currentMembers) => {
          setChats(chatList.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
          return currentMembers;
        });
      }, (e) => handleFirestoreError(e, OperationType.GET, `circles/${circleId}/chats`));

      // Listener 5: SafeZones
      unsubZones = onSnapshot(collection(db, 'circles', circleId, 'safezones'), (snap) => {
        const zoneList: SafeZone[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          zoneList.push({
            id: docSnap.id,
            name: d.name,
            latitude: d.latitude,
            longitude: d.longitude,
            radius: d.radius,
            createdById: d.createdById,
            createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString()
          });
        });
        setSafeZones(zoneList);
      }, (e) => handleFirestoreError(e, OperationType.GET, `circles/${circleId}/safezones`));
    }

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
      if (unsubCircle) unsubCircle();
      if (unsubMembers) unsubMembers();
      if (unsubSos) unsubSos();
      if (unsubChats) unsubChats();
      if (unsubZones) unsubZones();
      memberUnsubs.forEach(unsub => unsub());
    };
  }, [isBackendConnected]);

  // ----------------------------------------------------------------------
  // Functional Operations Actions API
  // ----------------------------------------------------------------------

  const googleLogin = async () => {
    if (isMockFirebase || !auth) {
      // Simulate login
      const profile: UserProfile = {
        ...simulatedUser,
        id: 'user_mom_1',
        displayName: 'Sarah Cook (You)',
        email: 'sarah.cook@example.com',
      };
      setSimulatedUser(profile);
      setCurrentUser(profile);
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const logout = async () => {
    if (isMockFirebase || !auth) {
      setCurrentUser(null);
      return;
    }
    try {
      await signOut(auth);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const createCircle = async (name: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (isMockFirebase || !isBackendConnected) {
      const circleId = 'circle_' + Math.random().toString(36).substring(2, 9);
      const newC: Circle = {
        id: circleId,
        name,
        code,
        createdById: simulatedUser.id,
        createdAt: new Date().toISOString(),
      };
      const newM: CircleMember = {
        id: simulatedUser.id,
        userId: simulatedUser.id,
        displayName: simulatedUser.displayName,
        photoURL: simulatedUser.photoURL,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      };
      appendToJoinedCirclesList(circleId, name, code);
      setSimulatedCircle(newC);
      setSimulatedMembers([newM]);
      setSimulatedChats([]);
      setSimulatedSos([]);
      setSimulatedZones([]);
      setSimulatedUser(prev => ({ ...prev, activeCircleId: circleId }));
      
      // Update globally cached context
      setActiveCircle(newC);
      setMembers([newM]);
      setChats([]);
      setSosAlerts([]);
      setSafeZones([]);
      setCurrentUser(prev => prev ? { ...prev, activeCircleId: circleId } : null);
      return;
    }

    try {
      const circleRef = doc(collection(db, 'circles'));
      const activeUser = auth.currentUser!;
      
      await setDoc(circleRef, {
        name,
        code,
        createdById: activeUser.uid,
        createdAt: serverTimestamp()
      });

      const memberRef = doc(db, 'circles', circleRef.id, 'members', activeUser.uid);
      await setDoc(memberRef, {
        userId: activeUser.uid,
        displayName: activeUser.displayName || 'Family Member',
        photoURL: activeUser.photoURL || '',
        role: 'admin',
        joinedAt: serverTimestamp()
      });

      appendToJoinedCirclesList(circleRef.id, name, code);

      // Update current user profile to join circle
      await setDoc(doc(db, 'users', activeUser.uid), {
        activeCircleId: circleRef.id,
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'circles/create');
    }
  };

  const joinCircle = async (code: string) => {
    if (isMockFirebase || !isBackendConnected) {
      if (code === simulatedCircle?.code) {
        // Already in or joined CK8291
        setActiveCircle(simulatedCircle);
        setMembers(simulatedMembers);
        return;
      }
      
      // Simulating loading a random circle
      const circleId = 'circle_' + Math.random().toString(36).substring(2, 9);
      const randCircle: Circle = {
        id: circleId,
        name: 'Friends Circle',
        code: code.toUpperCase(),
        createdById: 'user_dad_2',
        createdAt: new Date().toISOString()
      };
      const joinedMembers: CircleMember[] = [
        {
          id: 'user_dad_2',
          userId: 'user_dad_2',
          displayName: 'David Cook (Dad)',
          photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          role: 'admin',
          joinedAt: new Date().toISOString(),
          batteryLevel: 42
        },
        {
          id: simulatedUser.id,
          userId: simulatedUser.id,
          displayName: simulatedUser.displayName,
          photoURL: simulatedUser.photoURL,
          role: 'member',
          joinedAt: new Date().toISOString(),
          batteryLevel: simulatedUser.batteryLevel || 85
        }
      ];
      appendToJoinedCirclesList(circleId, randCircle.name, randCircle.code);
      setSimulatedCircle(randCircle);
      setSimulatedMembers(joinedMembers);
      setSimulatedUser(prev => ({ ...prev, activeCircleId: circleId }));
      
      setActiveCircle(randCircle);
      setMembers(joinedMembers);
      setCurrentUser(prev => prev ? { ...prev, activeCircleId: circleId } : null);
      return;
    }

    try {
      const activeUser = auth.currentUser!;
      const codesQuery = query(collection(db, 'circles'), where('code', '==', code.toUpperCase()), limit(1));
      let querySnap;
      try {
        querySnap = await getDocs(codesQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'circles');
        return;
      }
      
      if (querySnap.empty) {
        throw new Error('Family Circle not found. Verify invitation code.');
      }
      
      const targetCircleId = querySnap.docs[0].id;
      const targetCircleData = querySnap.docs[0].data();
      
      // Write profile registration in circle
      const memberRef = doc(db, 'circles', targetCircleId, 'members', activeUser.uid);
      await setDoc(memberRef, {
        userId: activeUser.uid,
        displayName: activeUser.displayName || 'Family Member',
        photoURL: activeUser.photoURL || '',
        role: 'member',
        joinedAt: serverTimestamp()
      });

      appendToJoinedCirclesList(targetCircleId, targetCircleData.name, targetCircleData.code || code.toUpperCase());

      // Update active circle
      await setDoc(doc(db, 'users', activeUser.uid), {
        activeCircleId: targetCircleId,
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const leaveCircle = async () => {
    const circleId = activeCircle?.id;
    if (!circleId) return;

    if (isMockFirebase || !isBackendConnected) {
      const updatedList = joinedCirclesList.filter(c => c.id !== circleId);
      setJoinedCirclesList(updatedList);
      localStorage.setItem(`family_security_joined_circles_list_${simulatedUser.id}`, JSON.stringify(updatedList));

      const nextCircle = updatedList[0] || null;
      if (nextCircle) {
        setSimulatedCircle(nextCircle);
        setSimulatedMembers(INITIAL_MOCK_MEMBERS);
        setSimulatedUser(prev => ({ ...prev, activeCircleId: nextCircle.id }));
        setActiveCircle(nextCircle);
        setMembers(INITIAL_MOCK_MEMBERS);
        setCurrentUser(prev => prev ? { ...prev, activeCircleId: nextCircle.id } : null);
      } else {
        setSimulatedCircle(null);
        setSimulatedMembers([]);
        setSimulatedUser(prev => ({ ...prev, activeCircleId: undefined }));
        setActiveCircle(null);
        setMembers([]);
        setChats([]);
        setSosAlerts([]);
        setSafeZones([]);
        setCurrentUser(prev => prev ? { ...prev, activeCircleId: undefined } : null);
      }
      return;
    }

    try {
      const uid = auth.currentUser!.uid;
      // Delete membership
      await deleteDoc(doc(db, 'circles', circleId, 'members', uid));
      
      const updatedList = joinedCirclesList.filter(c => c.id !== circleId);
      setJoinedCirclesList(updatedList);
      localStorage.setItem(`family_security_joined_circles_list_${uid}`, JSON.stringify(updatedList));

      const nextCircle = updatedList[0] || null;
      // Reset or switch active circle
      await setDoc(doc(db, 'users', uid), {
        activeCircleId: nextCircle ? nextCircle.id : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `circles/${circleId}/members`);
    }
  };

  const removeMember = async (targetUserId: string) => {
    const circleId = activeCircle?.id;
    if (!circleId) return;

    if (isMockFirebase || !isBackendConnected) {
      const targetName = simulatedMembers.find(m => m.userId === targetUserId)?.displayName || 'Member';
      setSimulatedMembers(prev => prev.filter(m => m.userId !== targetUserId));
      setMembers(prev => prev.filter(m => m.userId !== targetUserId));
      triggerSimulatedSystemMessage(`🚨 ${targetName} was removed from the family circle by an Admin.`);
      return;
    }

    try {
      await deleteDoc(doc(db, 'circles', circleId, 'members', targetUserId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `circles/${circleId}/members/${targetUserId}`);
    }
  };

  const triggerSOS = async (message: string) => {
    const circleId = activeCircle?.id;
    if (!circleId || !currentUser) return;

    const lat = currentUser.latitude || 37.422;
    const lng = currentUser.longitude || -122.084;

    if (isMockFirebase || !isBackendConnected) {
      const alertId = 'sos_' + Math.random().toString(36).substring(2, 9);
      const newSOS: SOSAlert = {
        id: alertId,
        userId: simulatedUser.id,
        userName: simulatedUser.displayName,
        message,
        latitude: lat,
        longitude: lng,
        active: true,
        createdAt: new Date().toISOString()
      };
      
      setSimulatedSos(prev => [newSOS, ...prev]);
      setSimulatedUser(prev => ({ ...prev, activeSOS: true, sosMessage: message }));
      
      setSosAlerts(prev => [newSOS, ...prev]);
      setCurrentUser(prev => prev ? { ...prev, activeSOS: true, sosMessage: message } : null);
      return;
    }

    try {
      const uid = auth.currentUser!.uid;
      const sosRef = doc(collection(db, 'circles', circleId, 'sos'));
      
      await setDoc(sosRef, {
        userId: uid,
        userName: currentUser.displayName,
        message,
        latitude: lat,
        longitude: lng,
        active: true,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'users', uid), {
        activeSOS: true,
        sosMessage: message,
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `circles/${circleId}/sos`);
    }
  };

  const resolveSOS = async (sosId: string) => {
    const circleId = activeCircle?.id;
    if (!circleId || !currentUser) return;

    if (isMockFirebase || !isBackendConnected) {
      setSimulatedSos(prev => prev.map(s => s.id === sosId ? { 
        ...s, 
        active: false, 
        resolvedAt: new Date().toISOString(), 
        resolvedBy: simulatedUser.id 
      } : s));
      
      setSimulatedUser(prev => ({ ...prev, activeSOS: false, sosMessage: '' }));
      
      setSosAlerts(prev => prev.map(s => s.id === sosId ? { 
        ...s, 
        active: false, 
        resolvedAt: new Date().toISOString(), 
        resolvedBy: currentUser.id 
      } : s));
      
      setCurrentUser(prev => prev ? { ...prev, activeSOS: false, sosMessage: '' } : null);
      return;
    }

    try {
      const uid = auth.currentUser!.uid;
      await updateDoc(doc(db, 'circles', circleId, 'sos', sosId), {
        active: false,
        resolvedAt: serverTimestamp(),
        resolvedBy: uid
      });

      // If the resolved SOS was triggered by ME, clear my profile SOS state
      const targetSOS = sosAlerts.find(s => s.id === sosId);
      if (targetSOS && targetSOS.userId === uid) {
        await setDoc(doc(db, 'users', uid), {
          activeSOS: false,
          sosMessage: '',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `circles/${circleId}/sos/${sosId}`);
    }
  };

  const addSafeZone = async (name: string, lat: number, lng: number, radius: number) => {
    const circleId = activeCircle?.id;
    if (!circleId || !currentUser) return;

    if (isMockFirebase || !isBackendConnected) {
      const zoneId = 'zone_' + Math.random().toString(36).substring(2, 9);
      const newZone: SafeZone = {
        id: zoneId,
        name,
        latitude: lat,
        longitude: lng,
        radius,
        createdAt: new Date().toISOString(),
        createdById: simulatedUser.id
      };
      setSimulatedZones(prev => [...prev, newZone]);
      setSafeZones(prev => [...prev, newZone]);
      return;
    }

    try {
      const zoneRef = doc(collection(db, 'circles', circleId, 'safezones'));
      await setDoc(zoneRef, {
        name,
        latitude: lat,
        longitude: lng,
        radius,
        createdAt: serverTimestamp(),
        createdById: auth.currentUser!.uid
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `circles/${circleId}/safezones`);
    }
  };

  const deleteSafeZone = async (zoneId: string) => {
    const circleId = activeCircle?.id;
    if (!circleId) return;

    if (isMockFirebase || !isBackendConnected) {
      setSimulatedZones(prev => prev.filter(z => z.id !== zoneId));
      setSafeZones(prev => prev.filter(z => z.id !== zoneId));
      return;
    }

    try {
      await deleteDoc(doc(db, 'circles', circleId, 'safezones', zoneId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `circles/${circleId}/safezones/${zoneId}`);
    }
  };

  const sendChatMessage = async (text: string) => {
    const circleId = activeCircle?.id;
    if (!circleId || !currentUser) return;

    if (isMockFirebase || !isBackendConnected) {
      const newMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        senderId: simulatedUser.id,
        senderName: simulatedUser.displayName,
        text,
        createdAt: new Date().toISOString(),
      };
      setSimulatedChats(prev => [...prev, newMsg]);
      setChats(prev => [...prev, newMsg]);
      return;
    }

    try {
      const chatRef = doc(collection(db, 'circles', circleId, 'chats'));
      await setDoc(chatRef, {
        senderId: auth.currentUser!.uid,
        senderName: currentUser.displayName,
        text,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `circles/${circleId}/chats`);
    }
  };

  const updateUserLocation = async (lat: number, lng: number) => {
    if (!currentUser) return;

    if (isMockFirebase || !isBackendConnected) {
      setSimulatedUser(prev => ({ ...prev, latitude: lat, longitude: lng, updatedAt: new Date().toISOString() }));
      setCurrentUser(prev => prev ? { ...prev, latitude: lat, longitude: lng, updatedAt: new Date().toISOString() } : null);
      
      // Update coordinates matrix
      setSimulatedCoordinates(prev => ({
        ...prev,
        [simulatedUser.id]: {
          ...prev[simulatedUser.id],
          latitude: lat,
          longitude: lng
        }
      }));
      return;
    }

    try {
      await setDoc(doc(db, 'users', currentUser.id), {
        latitude: lat,
        longitude: lng,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      // Background location update fails dynamically sometimes if permissions drop, silences log to keep fluid
    }
  };

  // ----------------------------------------------------------------------
  // Sandbox Simulator Operators
  // ----------------------------------------------------------------------
  const simulateMemberMovement = (memberId: string, lat: number, lng: number) => {
    const isMe = memberId === (currentUser?.id || simulatedUser.id);

    setSimulatedCoordinates(prev => {
      const currentLoc = prev[memberId] || { latitude: lat, longitude: lng };
      const updated = {
        ...prev,
        [memberId]: {
          ...currentLoc,
          latitude: lat,
          longitude: lng
        }
      };

      // Check if this movement enters/leaves any safezones and trigger simulated notifications
      const activeZones = isBackendConnected ? safeZones : simulatedZones;
      activeZones.forEach(zone => {
        const distBefore = getDistanceMeters(currentLoc.latitude, currentLoc.longitude, zone.latitude, zone.longitude);
        const distAfter = getDistanceMeters(lat, lng, zone.latitude, zone.longitude);
        
        const wasIn = distBefore <= zone.radius;
        const isIn = distAfter <= zone.radius;

        const mName = memberId === (currentUser?.id || simulatedUser.id) 
          ? 'You' 
          : (members.find(m => m.userId === memberId)?.displayName || 'Family member');

        if (!wasIn && isIn) {
          triggerSimulatedSystemMessage(`${mName} entered Safe Zone: "${zone.name}"`);
        } else if (wasIn && !isIn) {
          triggerSimulatedSystemMessage(`${mName} exited Safe Zone: "${zone.name}"`);
        }
      });

      return updated;
    });

    if (isMe) {
      setSimulatedUser(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        updatedAt: new Date().toISOString()
      }));
      setCurrentUser(prev => prev ? {
        ...prev,
        latitude: lat,
        longitude: lng,
        updatedAt: new Date().toISOString()
      } : null);
    }

    if (!isMockFirebase && isBackendConnected) {
      setDoc(doc(db, 'users', memberId), {
        latitude: lat,
        longitude: lng,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(err => console.warn("Live position simulation upload failed: ", err));
    }
  };

  const simulateToggleSos = (memberId: string, message: string) => {
    const isMe = memberId === (currentUser?.id || simulatedUser.id);
    const mName = isMe ? 'You' : (members.find(m => m.userId === memberId)?.displayName || 'Family member');
    
    // Check if currently active
    const existingSOS = sosAlerts.find(s => s.userId === memberId && s.active);
    
    if (existingSOS) {
      resolveSOS(existingSOS.id);
      triggerSimulatedSystemMessage(`🚨 Alert Resolved: ${mName} is now safe.`);
    } else {
      const coords = simulatedCoordinates[memberId] || { latitude: 37.422, longitude: -122.084 };
      if (isMe) {
        triggerSOS(message);
      } else {
        const dummyId = 'sos_' + Math.random().toString(36).substring(2, 9);
        const newSOS: SOSAlert = {
          id: dummyId,
          userId: memberId,
          userName: mName,
          message,
          latitude: coords.latitude,
          longitude: coords.longitude,
          active: true,
          createdAt: new Date().toISOString()
        };
        setSimulatedSos(prev => [newSOS, ...prev]);
        setSosAlerts(prev => [newSOS, ...prev]);
        triggerSimulatedSystemMessage(`🚨 EMERGENCY SOS TRIGGERED BY ${mName.toUpperCase()}: "${message}"`);
      }
    }
  };

  const triggerSimulatedSystemMessage = (text: string) => {
    const systemMsg: ChatMessage = {
      id: 'system_' + Math.random().toString(36).substring(2, 9),
      senderId: 'system',
      senderName: '🛡️ Security Bot',
      text,
      createdAt: new Date().toISOString()
    };
    setSimulatedChats(prev => [...prev, systemMsg]);
    setChats(prev => [...prev, systemMsg]);
  };

  // Merge current values with simulated overlays
  const currentCoordsMap = simulatedCoordinates;

  return (
    <FamilyContext.Provider value={{
      currentUser,
      activeCircle,
      members: members.map(m => {
        // Enforce mapping latest coordinates to member schemas
        const isMe = m.userId === currentUser?.id;
        const coords = currentCoordsMap[m.userId];
        return {
          ...m,
          latitude: isMe ? (currentUser?.latitude ?? coords?.latitude) : coords?.latitude,
          longitude: isMe ? (currentUser?.longitude ?? coords?.longitude) : coords?.longitude,
          activeSOS: isMe ? (currentUser?.activeSOS ?? coords?.activeSOS) : coords?.activeSOS,
          sosMessage: isMe ? (currentUser?.sosMessage ?? coords?.sosMessage) : coords?.sosMessage,
          batteryLevel: isMe ? (currentUser?.batteryLevel ?? m.batteryLevel ?? coords?.batteryLevel ?? 85) : (coords?.batteryLevel ?? m.batteryLevel ?? 100)
        } as any;
      }),
      sosAlerts,
      chats,
      safeZones,
      loading,
      isBackendConnected,
      error,
      googleLogin,
      logout,
      createCircle,
      joinCircle,
      leaveCircle,
      removeMember,
      triggerSOS,
      resolveSOS,
      addSafeZone,
      deleteSafeZone,
      sendChatMessage,
      updateUserLocation,
      joinedCirclesList,
      switchActiveCircle,
      simulateMemberMovement,
      simulateToggleSos,
      gpsStatus,
      setGpsStatus,
      selectedMemberId,
      setSelectedMemberId,
      mapCenter,
      setMapCenter
    }}>
      {children}
    </FamilyContext.Provider>
  );
};
