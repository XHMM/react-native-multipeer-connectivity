import type { EmitterSubscription } from 'react-native';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-multipeer-connectivity' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const NativeModule = NativeModules.MultipeerConnectivity
  ? NativeModules.MultipeerConnectivity
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

type RNPeerID = string;

export interface RNPeer {
  id: RNPeerID;
  displayName: string;
}

export enum PeerState {
  notConnected = 0,
  connecting = 1,
  connected = 2,
}

export interface InitSessionOptions {
  /**
   * This name will be used for showing when other peers browsed you.
   * The peer’s name must be no longer than 63 bytes in UTF-8 encoding.
   */
  displayName: string;

  /**
   * This is the name corresponding to the value defined in Info.plist
   */
  serviceType: string;

  /**
   * Custom data available to browsers in the `onFoundPeer` event
   *
   * Limitations:
   *  - Object keys cannot contain an equals sign.
   *  - Each key and value must be string, and the key-value pair must be no longer than 255 bytes (total) when encoded in UTF-8 format with an equals sign (=) between the key and the value.
   *  - The total size of the keys and values should be no more than about 400 bytes.
   *
   * Check https://developer.apple.com/documentation/multipeerconnectivity/mcnearbyserviceadvertiser/1407102-init for detailed explanation.
   */
  discoveryInfo?: Record<string, string>;
}

export interface MPCSession {
  peerID: string;

  /**
   * Start browsing nearby peers which are advertizing
   */
  browse(): Promise<void>;

  /**
   * Start advertizing so it can be bound by the peers which are browsing
   */
  advertize(): Promise<void>;

  /**
   * Stop browsing
   */
  stopBrowsing(): Promise<void>;

  /**
   * Stop advetizing
   */
  stopAdvertizing(): Promise<void>;

  /**
   * Invite the peer you found
   */
  invite(peerID: string): Promise<void>;
  invite(options: {
    peerID: string;
    /**
     * Invite timeout seconds, default 30s
     */
    timeout?: number;
    /**
     * Context data sent to `onReceivedPeerInvitation` event
     */
    context?: Record<string, any>;
  }): Promise<void>;

  /**
   * Send utf-8 text to target peer
   * @param id
   * @param text
   */
  sendText(id: RNPeerID, text: string): Promise<void>;

  /**
   * Disconnect all peers
   */
  disconnect(): Promise<void>;

  onStartAdvertisingError(
    fn: (event: { text: string }) => void
  ): EmitterSubscription;

  /**
   * When you received a invitation by other peer using `invite`, this event will be called
   * @param fn
   */
  onReceivedPeerInvitation(
    fn: (event: {
      peer: RNPeer;
      context?: Record<string, any>;
      /**
       * You need to call this function to decide to accept(true) or reject(true) the invitation
       * @param accept
       */
      handler: (accept: boolean) => Promise<void>;
    }) => void
  ): EmitterSubscription;

  onStartBrowsingError(
    fn: (event: { text: string }) => void
  ): EmitterSubscription;

  /**
   * When you (re-)call `advertize` and found a peer, this event will be called, even if the peer has found before
   */
  onFoundPeer(
    fn: (event: {
      peer: RNPeer;
      discoveryInfo?: Record<string, string>;
    }) => void
  ): EmitterSubscription;

  /**
   * Called when the peer was disconnected, for example, the app was in background
   * @param fn
   */
  onLostPeer(fn: (event: { peer: RNPeer }) => void): EmitterSubscription;

  /**
   * Called when the peer state changed
   * @param fn
   */
  onPeerStateChanged(
    fn: (event: { peer: RNPeer; state: PeerState }) => void
  ): EmitterSubscription;

  /**
   * Called when you received a utf-8 text
   * @param fn
   */
  onReceivedText(
    fn: (event: { peer: RNPeer; text: string }) => void
  ): EmitterSubscription;
}

/**
 * Call this function to initiate a session
 * @param options
 */
export function initSession(options: InitSessionOptions): MPCSession {
  const { peerID } = NativeModule.initSession({
    displayName: options.displayName,
    serviceType: options.serviceType,
    discoveryInfo: options.discoveryInfo ?? {},
  }) as {
    peerID: string;
  };

  const browse: MPCSession['browse'] = async () => {
    await NativeModule.browse();
  };

  const advertize: MPCSession['advertize'] = async () => {
    await NativeModule.advertize();
  };

  const stopBrowsing: MPCSession['stopBrowsing'] = async () => {
    await NativeModule.stopBrowsing();
  };

  const stopAdvertizing: MPCSession['stopAdvertizing'] = async () => {
    await NativeModule.stopAdvertizing();
  };

  const invite: MPCSession['invite'] = async (invitationOptions) => {
    if (typeof invitationOptions === 'string') {
      await NativeModule.invite({
        peerID: invitationOptions,
        timeout: 30,
        context: null,
      });
    } else {
      await NativeModule.invite({
        peerID: invitationOptions.peerID,
        timeout: invitationOptions.timeout ?? 30,
        contextString: invitationOptions.context
          ? JSON.stringify(invitationOptions.context)
          : null,
      });
    }
  };

  const _processInvitation = async (options: {
    invitationId: string;
    accept: boolean;
  }) => {
    await NativeModule.processInvitation(options);
  };

  const sendText: MPCSession['sendText'] = async (id, text) => {
    await NativeModule.sendText({
      peerID: id,
      text,
    });
  };

  const disconnect: MPCSession['disconnect'] = async () => {
    await NativeModule.disconnect();
  };

  const eventEmitter = new NativeEventEmitter(NativeModule);

  const onStartAdvertisingError: MPCSession['onStartAdvertisingError'] = (
    fn
  ) => {
    return eventEmitter.addListener('onStartAdvertisingError', fn);
  };

  const onReceivedPeerInvitation: MPCSession['onReceivedPeerInvitation'] = (
    fn
  ) => {
    return eventEmitter.addListener('onReceivedPeerInvitation', (event) => {
      fn({
        peer: event.peer,
        context: event.contextString
          ? JSON.parse(event.contextString)
          : undefined,
        handler: async (accept) => {
          await _processInvitation({
            invitationId: event.invitationId,
            accept,
          });
        },
      });
    });
  };

  const onStartBrowsingError: MPCSession['onStartBrowsingError'] = (fn) => {
    return eventEmitter.addListener('onStartBrowsingError', fn);
  };

  const onFoundPeer: MPCSession['onFoundPeer'] = (fn) => {
    return eventEmitter.addListener('onFoundPeer', fn);
  };

  const onLostPeer: MPCSession['onLostPeer'] = (fn) => {
    return eventEmitter.addListener('onLostPeer', fn);
  };

  const onPeerStateChanged: MPCSession['onPeerStateChanged'] = (fn) => {
    return eventEmitter.addListener('onPeerStateChanged', fn);
  };

  const onReceivedText: MPCSession['onReceivedText'] = (fn) => {
    return eventEmitter.addListener('onReceivedText', fn);
  };

  return {
    peerID,
    browse,
    advertize,
    stopBrowsing,
    stopAdvertizing,
    invite,
    sendText,
    disconnect,

    onStartAdvertisingError,
    onReceivedPeerInvitation,
    onStartBrowsingError,
    onFoundPeer,
    onLostPeer,
    onPeerStateChanged,
    onReceivedText,
  };
}
