import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Wifi, WifiOff, Users, TestTube, Search, Music, Volume2, AlertTriangle, User, Crown, UserCheck, UserMinus, UserPlus } from 'lucide-react';

interface MultiplayerTestProps {
  onBack: () => void;
}

// Player info interface
interface PlayerInfo {
  actorNr: number;
  name: string;
  isLocal: boolean;
  isReady: boolean;
  joinTime: number;
}

// Declare Photon types for TypeScript
declare global {
  interface Window {
    Photon: any;
  }
}

export const MultiplayerTest: React.FC<MultiplayerTestProps> = ({ onBack }) => {
  const [client, setClient] = useState<any>(null);
  const [appId, setAppId] = useState('f35d510e-8c33-40a0-ba19-3e0066f5ecc8');
  const [roomName, setRoomName] = useState('TestRoom');
  const [logs, setLogs] = useState<string[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isInRoom: false,
    canJoinRoom: false,
    playerCount: 0,
    currentState: 'Uninitialized',
    roomName: '',
    maxPlayers: 0,
    isHost: false,
    hostActorNr: 0
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('eu'); // Changed to 'eu' to match your working example
  
  // Host control states
  const [promotePlayerId, setPromotePlayerId] = useState('');
  const [kickPlayerId, setKickPlayerId] = useState('');
  
  // Track current host ID exactly like HTML example
  const [currentHostId, setCurrentHostId] = useState<number | null>(null);
  
  const logRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);

  const log = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    log("Simple Multiplayer Test initialized");
    
    // Check if Photon is available
    if (typeof window !== 'undefined' && window.Photon) {
      log("✅ Photon SDK detected");
    } else {
      log("❌ Photon SDK not found");
    }

    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.disconnect();
        } catch (error) {
          log(`⚠️ Error during cleanup: ${error}`);
        }
      }
    };
  }, [log]);

  // Update player list exactly like the working HTML example
  const updatePlayerList = useCallback((overrideHostId?: number) => {
    if (!clientRef.current || !clientRef.current.myRoom()) {
      setPlayers([]);
      setConnectionState(prev => ({ 
        ...prev, 
        playerCount: 0, 
        roomName: '', 
        maxPlayers: 0,
        isHost: false,
        hostActorNr: 0
      }));
      return;
    }

    const room = clientRef.current.myRoom();
    if (!room) {
      log("No room available");
      return;
    }

    // Use override host ID if provided, otherwise use tracked host ID, otherwise fall back to room.masterClientId
    const effectiveHostId = overrideHostId !== undefined ? overrideHostId : 
                           (currentHostId !== null ? currentHostId : room.masterClientId);

    // Clear and rebuild player list exactly like HTML example
    const newPlayers: PlayerInfo[] = [];

    if (clientRef.current.actors) {
      for (let actorNr in clientRef.current.actors) {
        const actor = clientRef.current.actors[actorNr];
        newPlayers.push({
          actorNr: actor.actorNr,
          name: actor.isLocal ? 'You' : `Player ${actor.actorNr}`,
          isLocal: actor.isLocal,
          isReady: false,
          joinTime: Date.now()
        });
      }
    }

    // Sort players by actor number
    newPlayers.sort((a, b) => a.actorNr - b.actorNr);

    // Check if current player is host using effective host ID
    const myActor = clientRef.current.myActor();
    const isHost = myActor && effectiveHostId === myActor.actorNr;
    
    log(`Host check: effectiveHostId=${effectiveHostId}, myActor=${myActor?.actorNr}, isHost=${isHost}`);

    setPlayers(newPlayers);
    setConnectionState(prev => ({
      ...prev,
      playerCount: newPlayers.length,
      roomName: room.name,
      maxPlayers: room.maxPlayers || 0,
      isHost: isHost,
      hostActorNr: effectiveHostId || 0
    }));

    log(`Player list updated: ${newPlayers.length} players, effectiveHost: ${effectiveHostId}, you are host: ${isHost}`);
  }, [log, currentHostId]);

  // Add player exactly like HTML example
  const addPlayer = useCallback((actor: any) => {
    updatePlayerList();
  }, [updatePlayerList]);

  // Remove player exactly like HTML example
  const removePlayer = useCallback((actorNr: number) => {
    updatePlayerList();
  }, [updatePlayerList]);

  // Discover existing players exactly like HTML example
  const discoverExistingPlayers = useCallback(() => {
    log("Discovering existing players from client.actors...");

    if (clientRef.current.actors) {
      log(`Client actors keys: ${Object.keys(clientRef.current.actors).join(', ')}`);
      for (let actorNr in clientRef.current.actors) {
        const actor = clientRef.current.actors[actorNr];
        log(`Discovered player: ${actor.actorNr} (local: ${actor.isLocal})`);
      }
    } else {
      log("Client actors is undefined or null");
    }

    updatePlayerList();
  }, [log, updatePlayerList]);

  // Promote player to host (EXACTLY like HTML example with IMMEDIATE UI update)
  const promoteToHost = useCallback(() => {
    const playerId = promotePlayerId.trim();
    if (!playerId) {
      alert("Please enter player ID");
      return;
    }

    if (!clientRef.current) {
      alert("Not connected!");
      return;
    }

    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) {
      alert("Please enter a valid player ID number");
      return;
    }

    // Check if we are the current host using tracked host ID (exactly like HTML)
    const effectiveHostId = currentHostId !== null ? currentHostId : clientRef.current.myRoom().masterClientId;
    if (effectiveHostId !== clientRef.current.myActor().actorNr) {
      alert("Only the current host can promote players to host!");
      return;
    }

    log(`Promoting player ${playerId} to host`);

    // Use the correct method to change master client (exactly like HTML)
    const properties: any = {};
    properties[window.Photon.LoadBalancing.Constants.GameProperties.MasterClientId] = playerIdNum;
    clientRef.current.myRoom().setCustomProperties(properties);

    // Send a custom event to notify all players (exactly like HTML)
    clientRef.current.raiseEvent(4, { 
      newHostId: playerIdNum,
      promotedBy: clientRef.current.myActor().actorNr 
    });

    // IMMEDIATELY update our own host status since we won't receive our own event (exactly like HTML)
    setCurrentHostId(playerIdNum);
    log(`Updated currentHostId to ${playerIdNum} (promoting player)`);
    
    // FORCE IMMEDIATE UI UPDATE with the new host ID - This is the key fix!
    updatePlayerList(playerIdNum);

    setPromotePlayerId('');
  }, [promotePlayerId, log, currentHostId, updatePlayerList]);

  // Kick player (exactly like HTML example)
  const kickPlayer = useCallback(() => {
    const playerId = kickPlayerId.trim();
    if (!playerId) {
      alert("Please enter player ID");
      return;
    }

    if (!clientRef.current) {
      alert("Not connected!");
      return;
    }

    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) {
      alert("Please enter a valid player ID number");
      return;
    }

    // Server-side validation: check if we are actually the host using tracked host ID (exactly like HTML)
    const effectiveHostId = currentHostId !== null ? currentHostId : clientRef.current.myRoom().masterClientId;
    if (effectiveHostId !== clientRef.current.myActor().actorNr) {
      alert("Only the host can kick players!");
      return;
    }

    // Don't allow kicking yourself (exactly like HTML)
    if (playerIdNum === clientRef.current.myActor().actorNr) {
      alert("You cannot kick yourself!");
      return;
    }

    log(`Kicking player ${playerId}`);
    clientRef.current.raiseEvent(3, { targetPlayerId: playerIdNum });
    setKickPlayerId('');
  }, [kickPlayerId, log, currentHostId]);

  const connect = useCallback(() => {
    if (!appId.trim()) {
      alert("Please enter App ID");
      return;
    }

    if (!window.Photon) {
      log("❌ Photon SDK not available");
      setConnectionError("Photon SDK not loaded");
      return;
    }

    try {
      setConnectionError(null);
      log("Connecting...");
      
      // Create client exactly like working HTML example
      const newClient = new window.Photon.LoadBalancing.LoadBalancingClient(1, appId.trim(), "1.0");
      clientRef.current = newClient;

      // Set up event handlers exactly like HTML example
      newClient.onStateChange = (state: number) => {
        const stateName = window.Photon.LoadBalancing.LoadBalancingClient.stateName[state] || state;
        log(`State: ${stateName}`);
        
        const isConnected = state >= 2; // ConnectedToNameServer or higher
        const canJoinRoom = state >= 4; // ConnectedToMaster or higher
        const isInRoom = state === 8; // Joined state
        
        setConnectionState(prev => ({
          ...prev,
          currentState: stateName,
          isConnected,
          canJoinRoom: canJoinRoom && !isInRoom,
          isInRoom
        }));
      };

      newClient.onConnectedToMaster = () => {
        log("Connected to Master!");
      };

      newClient.onJoinRoom = (createdByMe: boolean) => {
        log(`Joined room: ${clientRef.current.myRoom().name} (created: ${createdByMe})`);
        
        // Initialize host ID from room (exactly like HTML)
        const room = clientRef.current.myRoom();
        const initialHostId = room ? room.masterClientId : null;
        setCurrentHostId(initialHostId);
        log(`Initialized currentHostId to ${initialHostId}`);
        
        // Discover all existing players immediately
        discoverExistingPlayers();
      };

      newClient.onDisconnected = () => {
        log("Disconnected");
        setPlayers([]);
        setCurrentHostId(null); // Reset host tracking
        updatePlayerList();
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isInRoom: false,
          canJoinRoom: false,
          playerCount: 0,
          roomName: '',
          maxPlayers: 0,
          isHost: false,
          hostActorNr: 0,
          currentState: 'Disconnected'
        }));
      };

      newClient.onActorJoin = (actor: any) => {
        log(`Player ${actor.actorNr} joined (local: ${actor.isLocal})`);
        addPlayer(actor);
      };

      newClient.onActorLeave = (actor: any) => {
        log(`Player ${actor.actorNr} left (local: ${actor.isLocal})`);
        removePlayer(actor.actorNr);
      };

      newClient.onEvent = (eventCode: number, content: any, actorNr: number) => {
        if (eventCode === 2 && content && content.note) {
          const playerName = content.playerId === clientRef.current.myActor().actorNr ? 'You' : `Player ${actorNr}`;
          log(`🎵 ${playerName} played: ${content.note} (received event)`);
        } else if (eventCode === 3 && content && content.targetPlayerId) {
          // Kick event (exactly like HTML example)
          if (content.targetPlayerId === clientRef.current.myActor().actorNr) {
            log("You have been kicked from the room!");
            // Immediately clear UI and players
            setPlayers([]);
            setCurrentHostId(null);
            updatePlayerList();
            clientRef.current.leaveRoom();
          } else {
            log(`Player ${content.targetPlayerId} was kicked from the room (received event)`);
          }
        } else if (eventCode === 4 && content && content.newHostId) {
          // Host promotion event (exactly like HTML example)
          const newHostId = content.newHostId;
          const promotedBy = content.promotedBy;
          const myId = clientRef.current.myActor().actorNr;

          log(`Host promotion event received: newHostId=${newHostId}, promotedBy=${promotedBy}, myId=${myId}`);

          // Update our tracked host ID
          setCurrentHostId(newHostId);
          log(`Updated currentHostId to ${newHostId} (received event)`);

          if (newHostId === myId) {
            log(`🎉 You have been promoted to host by Player ${promotedBy}!`);
          } else if (promotedBy === myId) {
            log(`👑 You promoted Player ${newHostId} to host`);
          } else {
            log(`👑 Player ${newHostId} was promoted to host by Player ${promotedBy}`);
          }

          // Update UI immediately with new host status
          updatePlayerList();
        }
      };

      // Room properties change handler (exactly like HTML example)
      newClient.onMyRoomPropertiesChange = () => {
        log("Room properties changed");
        
        const room = clientRef.current.myRoom();
        const myActor = clientRef.current.myActor();

        if (room && myActor) {
          const newHostId = room.masterClientId;
          const myId = myActor.actorNr;

          log(`Host change: newHostId=${newHostId}, myId=${myId}`);

          if (newHostId === myId) {
            log("🎉 You have been promoted to host!");
          } else {
            log(`👑 Player ${newHostId} is now the host`);
          }
        }
        
        updatePlayerList(); // Update to show new host status
      };

      // Actor properties change handler (exactly like HTML example)
      newClient.onActorPropertiesChange = (actor: any) => {
        log(`Actor ${actor.actorNr} properties changed`);
        updatePlayerList();
      };

      setClient(newClient);
      
      // Connect to region master exactly like HTML example
      newClient.connectToRegionMaster(selectedRegion);
      
    } catch (error) {
      log(`❌ Failed to create client: ${error}`);
      setConnectionError(`Failed to create client: ${error}`);
    }
  }, [appId, selectedRegion, log, addPlayer, removePlayer, discoverExistingPlayers, updatePlayerList]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  const joinRoom = useCallback(() => {
    if (!clientRef.current) {
      alert("Not connected!");
      return;
    }

    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName) {
      alert("Please enter room name");
      return;
    }

    log(`Joining room: ${trimmedRoomName}`);
    clientRef.current.joinRoom(trimmedRoomName, { createIfNotExists: true });
  }, [roomName, log]);

  const leaveRoom = useCallback(() => {
    if (!clientRef.current) {
      alert("Not connected!");
      return;
    }
    log("Leaving room");
    clientRef.current.leaveRoom();
    setPlayers([]);
    setCurrentHostId(null);
    updatePlayerList();
  }, [log, updatePlayerList]);

  const testMultiplayer = useCallback(() => {
    if (!clientRef.current) {
      alert("Not connected!");
      return;
    }

    if (!clientRef.current.myRoom()) {
      alert("Not in a room!");
      return;
    }

    const testData = {
      note: 'TEST',
      frequency: 440,
      playerId: clientRef.current.myActor().actorNr
    };

    log("🧪 Sending test note...");
    clientRef.current.raiseEvent(2, testData);
  }, [log]);

  const checkState = useCallback(() => {
    log("=== STATE CHECK ===");
    log(`Client exists: ${!!clientRef.current}`);
    if (clientRef.current) {
      log(`Client state: ${clientRef.current.getState()}`);
      log(`Is in room: ${!!clientRef.current.myRoom()}`);
      if (clientRef.current.myActor) {
        log(`My actor: ${clientRef.current.myActor().actorNr}`);
      }
      log(`Total players in state: ${players.length}`);
      log(`Current host ID tracked: ${currentHostId}`);

      if (clientRef.current.myRoom()) {
        const room = clientRef.current.myRoom();
        log(`Room name: ${room.name}`);
        log(`Room playerCount: ${room.playerCount}`);
        log(`Room masterClientId: ${room.masterClientId}`);
        log(`Am I host: ${connectionState.isHost}`);
      }
    }
    log("=== END CHECK ===");
  }, [log, players.length, connectionState.isHost, currentHostId]);

  const forceRefresh = useCallback(() => {
    log("Force refreshing player list...");
    if (!clientRef.current || !clientRef.current.myRoom()) {
      log("Not connected or not in room");
      return;
    }

    // Clear and rediscover all players
    discoverExistingPlayers();
  }, [log, discoverExistingPlayers]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    log("🧹 Logs cleared");
  }, [log]);

  const regions = [
    { code: 'eu', name: 'Europe' },
    { code: 'us', name: 'US East' },
    { code: 'usw', name: 'US West' },
    { code: 'asia', name: 'Asia' },
    { code: 'jp', name: 'Japan' },
    { code: 'au', name: 'Australia' }
  ];

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-2xl lg:text-4xl font-bold text-white text-center flex-1 flex items-center justify-center space-x-3">
          <TestTube className="w-6 h-6 lg:w-10 lg:h-10 text-cyan-400" />
          <span>Multiplayer Test</span>
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Connection Error Alert */}
      {connectionError && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-semibold">Connection Error</p>
            <p className="text-red-300 text-sm">{connectionError}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {connectionState.isInRoom && (
        <div className="max-w-7xl mx-auto mb-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center space-x-3">
          <Users className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-semibold">🎉 Connected to Room!</p>
            <p className="text-green-300 text-sm">
              You can now test multiplayer features. Try the "Test Multiplayer" button!
              {connectionState.isHost && " You are the host and can manage players."}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid - Responsive Layout */}
      <div className="max-w-7xl mx-auto">
        {/* Top Row - Connection and Room */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-4 lg:mb-8">
          {/* Connection Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 flex items-center space-x-2">
              {connectionState.isConnected ? <Wifi className="w-5 h-5 lg:w-6 lg:h-6 text-green-400" /> : <WifiOff className="w-5 h-5 lg:w-6 lg:h-6 text-red-400" />}
              <span>Connection</span>
            </h2>
            
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">Photon App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs font-mono"
                  placeholder="Enter Photon App ID"
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm mb-2">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  disabled={connectionState.isConnected}
                >
                  {regions.map(region => (
                    <option key={region.code} value={region.code} className="bg-gray-800">
                      {region.name} ({region.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={connect}
                  disabled={connectionState.isConnected}
                  className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm lg:text-base"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Connect</span>
                </button>
                
                <button
                  onClick={disconnect}
                  disabled={!client}
                  className="flex-1 bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm lg:text-base"
                >
                  <WifiOff className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
              
              {/* Status Indicators */}
              <div className="space-y-2 pt-3 lg:pt-4 border-t border-white/20">
                <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">State:</span>
                    <span className={`font-semibold text-xs ${connectionState.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {connectionState.currentState}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Connected:</span>
                    <span className={`font-semibold ${connectionState.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {connectionState.isConnected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">In Room:</span>
                    <span className={`font-semibold ${connectionState.isInRoom ? 'text-green-400' : 'text-gray-400'}`}>
                      {connectionState.isInRoom ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Players:</span>
                    <span className="text-white font-semibold">{connectionState.playerCount}</span>
                  </div>
                </div>
                {connectionState.isInRoom && (
                  <div className="flex items-center justify-between text-xs lg:text-sm">
                    <span className="text-white/70">Host:</span>
                    <span className={`font-semibold ${connectionState.isHost ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {connectionState.isHost ? 'You' : `Player ${connectionState.hostActorNr}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Room Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 flex items-center space-x-2">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
              <span>Room Management</span>
            </h2>
            
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter room name"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={joinRoom}
                  disabled={!connectionState.canJoinRoom}
                  className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-lg transition-colors duration-200 text-sm lg:text-base"
                >
                  Join Room
                </button>
                
                <button
                  onClick={leaveRoom}
                  disabled={!connectionState.isInRoom}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-lg transition-colors duration-200 text-sm lg:text-base"
                >
                  Leave Room
                </button>
              </div>
              
              {/* Room Info */}
              {connectionState.isInRoom && connectionState.roomName && (
                <div className="bg-black/20 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Room:</span>
                      <span className="text-white font-semibold truncate ml-2">{connectionState.roomName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Max:</span>
                      <span className="text-white font-semibold">
                        {connectionState.maxPlayers || 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Players:</span>
                      <span className="text-white font-semibold">
                        {connectionState.playerCount}
                        {connectionState.maxPlayers && ` / ${connectionState.maxPlayers}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Host:</span>
                      <span className="text-white font-semibold">
                        {connectionState.isHost ? 'You' : `Player ${connectionState.hostActorNr}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Test Actions */}
              <div className="space-y-2 pt-3 lg:pt-4 border-t border-white/20">
                <button
                  onClick={testMultiplayer}
                  disabled={!connectionState.isInRoom}
                  className={`w-full font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm lg:text-base ${
                    connectionState.isInRoom 
                      ? 'bg-purple-500 hover:bg-purple-400 text-white' 
                      : 'bg-gray-500 cursor-not-allowed text-gray-300'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  <span>🧪 Test Multiplayer</span>
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={checkState}
                    className="bg-yellow-500 hover:bg-yellow-400 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1 text-xs lg:text-sm"
                  >
                    <Search className="w-3 h-3 lg:w-4 lg:h-4" />
                    <span>Check State</span>
                  </button>

                  <button
                    onClick={forceRefresh}
                    className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 text-xs lg:text-sm"
                  >
                    ⚡ Force Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Players, Host Controls, and Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Player List Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400" />
              <span>Players in Lobby</span>
            </h2>
            
            {!connectionState.isInRoom ? (
              <div className="text-center py-6 lg:py-8">
                <Users className="w-10 h-10 lg:w-12 lg:h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50 text-sm">Join a room to see players</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-6 lg:py-8">
                <Users className="w-10 h-10 lg:w-12 lg:h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50 text-sm">Loading players...</p>
                <p className="text-white/30 text-xs mt-2">If this persists, try "Force Refresh"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.map((player, index) => {
                  const isHost = player.actorNr === connectionState.hostActorNr;
                  return (
                    <div
                      key={player.actorNr}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                        player.isLocal 
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : isHost
                          ? 'bg-yellow-500/20 border border-yellow-500/30'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {/* Player Avatar */}
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center ${
                        player.isLocal 
                          ? 'bg-green-500 text-white' 
                          : isHost
                          ? 'bg-yellow-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {player.isLocal ? (
                          <Crown className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : isHost ? (
                          <Crown className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <User className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </div>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold text-sm lg:text-base truncate ${
                            player.isLocal ? 'text-green-300' : isHost ? 'text-yellow-300' : 'text-white'
                          }`}>
                            {player.name}
                          </span>
                          {player.isLocal && (
                            <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded-full">
                              YOU
                            </span>
                          )}
                          {isHost && !player.isLocal && (
                            <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-1 rounded-full">
                              HOST
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">
                          Actor #{player.actorNr}
                        </div>
                      </div>
                      
                      {/* Player Status */}
                      <div className="text-right">
                        <div className={`w-3 h-3 rounded-full ${
                          player.isLocal ? 'bg-green-400' : isHost ? 'bg-yellow-400' : 'bg-blue-400'
                        }`} />
                        <div className="text-xs text-white/60 mt-1">
                          Online
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Player Count Summary */}
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Total Players:</span>
                    <span className="text-white font-semibold">
                      {players.length}
                      {connectionState.maxPlayers && ` / ${connectionState.maxPlayers}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-white/70">Room:</span>
                    <span className="text-white font-semibold text-xs truncate ml-2">
                      {connectionState.roomName}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Host Controls Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 flex items-center space-x-2">
              <Crown className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400" />
              <span>Host Controls</span>
            </h2>
            
            {!connectionState.isInRoom ? (
              <div className="text-center py-6 lg:py-8">
                <Crown className="w-10 h-10 lg:w-12 lg:h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50 text-sm">Join a room to access host controls</p>
              </div>
            ) : !connectionState.isHost ? (
              <div className="text-center py-6 lg:py-8">
                <Crown className="w-10 h-10 lg:w-12 lg:h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50 text-sm">Only the host can manage players</p>
                <p className="text-white/30 text-xs mt-2">
                  Current host: Player {connectionState.hostActorNr}
                </p>
              </div>
            ) : (
              <div className="space-y-4 lg:space-y-6">
                {/* Promote to Host */}
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 lg:w-5 lg:h-5 text-green-400" />
                    <span>Promote to Host</span>
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={promotePlayerId}
                      onChange={(e) => setPromotePlayerId(e.target.value)}
                      placeholder="Player Actor ID"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={promoteToHost}
                      disabled={!promotePlayerId.trim()}
                      className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm lg:text-base"
                    >
                      <Crown className="w-4 h-4" />
                      <span>👑 Promote to Host</span>
                    </button>
                  </div>
                </div>

                {/* Kick Player */}
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <UserMinus className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
                    <span>Kick Player</span>
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={kickPlayerId}
                      onChange={(e) => setKickPlayerId(e.target.value)}
                      placeholder="Player Actor ID"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={kickPlayer}
                      disabled={!kickPlayerId.trim()}
                      className="w-full bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm lg:text-base"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>🚪 Kick Player</span>
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                {players.filter(p => !p.isLocal).length > 0 && (
                  <div className="pt-4 border-t border-white/20">
                    <h4 className="text-sm font-semibold text-white/80 mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      {players.filter(p => !p.isLocal).map(player => (
                        <div key={player.actorNr} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                          <div className="text-sm text-white">Player {player.actorNr}</div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                setPromotePlayerId(player.actorNr.toString());
                                setTimeout(() => promoteToHost(), 100);
                              }}
                              className="bg-green-600 hover:bg-green-500 text-white text-xs py-1 px-2 rounded transition-colors duration-200"
                              title="Promote to Host"
                            >
                              👑
                            </button>
                            <button
                              onClick={() => {
                                setKickPlayerId(player.actorNr.toString());
                                setTimeout(() => kickPlayer(), 100);
                              }}
                              className="bg-red-600 hover:bg-red-500 text-white text-xs py-1 px-2 rounded transition-colors duration-200"
                              title="Kick Player"
                            >
                              🚪
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Host Info */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300 font-semibold text-sm">You are the Host</span>
                  </div>
                  <p className="text-yellow-200 text-xs">
                    You can promote other players to host or kick disruptive players from the room.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Log Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl lg:text-2xl font-bold text-white">Event Log</h2>
              <button
                onClick={clearLogs}
                className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-1 px-3 rounded transition-colors duration-200 text-sm"
              >
                Clear
              </button>
            </div>
            
            <div 
              ref={logRef}
              className="bg-black/30 rounded-lg p-3 lg:p-4 h-64 lg:h-96 overflow-y-auto font-mono text-xs text-white/90"
            >
              {logs.length === 0 ? (
                <div className="text-white/50 italic">No events yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1 break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-6xl mx-auto mt-6 lg:mt-8 bg-white/5 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/10">
        <h3 className="text-lg lg:text-xl font-bold text-white mb-4">🎮 Photon Multiplayer Testing Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 text-white/80">
          <div>
            <h4 className="font-semibold text-white mb-2">1. Connect</h4>
            <p className="text-sm">Enter your Photon App ID, select a region, and connect to the master server. Check the logs for connection status.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">2. Join Room</h4>
            <p className="text-sm">Create or join a room. Multiple players can join the same room name to test together. Must be connected to master first.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">3. See Players</h4>
            <p className="text-sm">View all players in the lobby with real-time updates. Your player shows with a crown icon and green highlight.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">4. Host Controls</h4>
            <p className="text-sm">If you're the host, you can promote other players to host or kick disruptive players from the room.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">5. Test Events</h4>
            <p className="text-sm">Send test multiplayer events. All players in the room will receive them in real-time with audio feedback.</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-black/20 rounded-lg">
          <h4 className="font-semibold text-white mb-2">🔧 Tips</h4>
          <ul className="text-sm text-white/70 space-y-1">
            <li>• Open multiple browser tabs to simulate multiple players</li>
            <li>• Use the same room name across tabs to test communication</li>
            <li>• The player list updates in real-time as people join/leave</li>
            <li>• Your player is highlighted in green with a crown icon</li>
            <li>• The first player to join becomes the host (yellow highlight)</li>
            <li>• Host can promote other players or kick them using Actor IDs</li>
            <li>• Quick action buttons are available for each player when you're host</li>
            <li>• Test events send musical notes that other players can hear</li>
            <li>• If player list shows "Loading...", try the "Force Refresh" button</li>
          </ul>
        </div>
      </div>
    </div>
  );
};