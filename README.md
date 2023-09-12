# react-native-multipeer-connectivity

API wrapper of apple multipeer-connectivity for react-native

## Installation

```sh
npm install react-native-multipeer-connectivity
npx pod-install
```

Then update your `Info.plist` by adding:
```text
<key>NSLocalNetworkUsageDescription</key>
<string>[a]</string>
<key>NSBonjourServices</key>
<array>
    <string>_[b]._tcp</string>
</array>
```
- `[a]` will be used in the system permission request dialog
- `[b]` is the service name that will be used in our api


## API
```ts
import { initSession } from 'react-native-multipeer-connectivity';
const session = initSession(options);
```

> Copied from the generated .d.ts file:

```ts
type RNPeerID = string;
export interface RNPeer {
  id: RNPeerID;
  displayName: string;
}
export declare enum PeerState {
  notConnected = 0,
  connecting = 1,
  connected = 2
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
  onStartAdvertisingError(fn: (event: {
    text: string;
  }) => void): EmitterSubscription;
  /**
   * When you received a invitation by other peer using `invite`, this event will be called
   * @param fn
   */
  onReceivedPeerInvitation(fn: (event: {
    peer: RNPeer;
    context?: Record<string, any>;
    /**
     * You need to call this function to decide to accept(true) or reject(true) the invitation
     * @param accept
     */
    handler: (accept: boolean) => Promise<void>;
  }) => void): EmitterSubscription;
  onStartBrowsingError(fn: (event: {
    text: string;
  }) => void): EmitterSubscription;
  /**
   * When you (re-)call `advertize` and found a peer, this event will be called, even if the peer has found before
   */
  onFoundPeer(fn: (event: {
    peer: RNPeer;
    discoveryInfo?: Record<string, string>;
  }) => void): EmitterSubscription;
  /**
   * Called when the peer was disconnected, for example, the app was in background
   * @param fn
   */
  onLostPeer(fn: (event: {
    peer: RNPeer;
  }) => void): EmitterSubscription;
  /**
   * Called when the peer state changed
   * @param fn
   */
  onPeerStateChanged(fn: (event: {
    peer: RNPeer;
    state: PeerState;
  }) => void): EmitterSubscription;
  /**
   * Called when you received a utf-8 text
   * @param fn
   */
  onReceivedText(fn: (event: {
    peer: RNPeer;
    text: string;
  }) => void): EmitterSubscription;
}
/**
 * Call this function to initiate a session
 * @param options
 */
export declare function initSession(options: InitSessionOptions): MPCSession;
```

## Example
Checkout [example](./example) for a runnable demo

## Others
This [repo](https://github.com/lwansbrough/react-native-multipeer) did the same thing, but it abandoned and seems not work well with latest react-native versions, so I created this repo.


## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
