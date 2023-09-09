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

export function initSession(options: {
  /**
   * The peer’s name must be no longer than 63 bytes in UTF-8 encoding.
   */
  displayName: string;
  serviceType: string;

  /**
   * Data made available to browsers.
   *
   * Limitations:
   *  - Object keys cannot contain an equals sign.
   *  - Each key and value must be string, and the key-value pair must be no longer than 255 bytes (total) when encoded in UTF-8 format with an equals sign (=) between the key and the value.
   *  - The total size of the keys and values should be no more than about 400 bytes.
   *
   * Check https://developer.apple.com/documentation/multipeerconnectivity/mcnearbyserviceadvertiser/1407102-init for detailed explanation.
   */
  discoveryInfo?: Record<string, string>;
}) {
  // TODO: add data validation to prevent app crashed?
  const { peerID } = NativeModule.initSession({
    displayName: options.displayName,
    serviceType: options.serviceType,
    discoveryInfo: options.discoveryInfo ?? {},
  }) as {
    peerID: string;
  };

  const browse = async () => {
    await NativeModule.browse();
  };

  const advertize = async () => {
    await NativeModule.advertize();
  };

  const stopBrowse = async () => {
    await NativeModule.stopBrowse();
  };

  const stopAdvertize = async () => {
    await NativeModule.stopAdvertize();
  };

  const invite = async (
    options:
      | {
          peerID: string;
          timeout?: number;
          context?: Record<string, any>;
        }
      | string
  ) => {
    if (typeof options === 'string') {
      await NativeModule.invite({
        peerID: options,
        timeout: 30,
        context: null,
      });
    } else {
      await NativeModule.invite({
        peerID: options.peerID,
        timeout: options.timeout ?? 30,
        contextString: options.context ? JSON.stringify(options.context) : null,
      });
    }
  };

  const _processInvitation = async (options: {
    invitationId: string;
    accept: boolean;
  }) => {
    await NativeModule.processInvitation(options);
  };

  const sendText = async (id: RNPeerID, text: string) => {
    await NativeModule.sendText({
      peerID: id,
      text,
    });
  };

  const disconnect = async () => {
    await NativeModule.disconnect();
  };

  const eventEmitter = new NativeEventEmitter(NativeModule);

  const onStartAdvertisingError = (fn: (event: { text: string }) => void) => {
    return eventEmitter.addListener('onStartAdvertisingError', fn);
  };

  const onReceivedPeerInvitation = (
    fn: (event: {
      peer: RNPeer;
      context?: Record<string, any>;
      handler: (accept: boolean) => Promise<void>;
    }) => void
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

  const onStartBrowsingError = (fn: (event: { text: string }) => void) => {
    return eventEmitter.addListener('onStartBrowsingError', fn);
  };

  /**
   * When you (re-)call `advertize` and found a peer, this event will be called, even if the peer was found before
   */
  const onFoundPeer = (
    fn: (event: {
      peer: RNPeer;
      discoveryInfo?: Record<string, string>;
    }) => void
  ) => {
    return eventEmitter.addListener('onFoundPeer', fn);
  };

  const onLostPeer = (fn: (event: { peer: RNPeer }) => void) => {
    return eventEmitter.addListener('onLostPeer', fn);
  };

  const onPeerStateChanged = (
    fn: (event: { peer: RNPeer; state: PeerState }) => void
  ) => {
    return eventEmitter.addListener('onPeerStateChanged', fn);
  };

  const onReceivedText = (
    fn: (event: { peer: RNPeer; text: string }) => void
  ) => {
    return eventEmitter.addListener('onReceivedText', fn);
  };

  return {
    peerID,
    browse,
    advertize,
    stopBrowse,
    stopAdvertize,
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
