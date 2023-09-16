import * as React from 'react';
import { useState } from 'react';
import {
  Button,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  initSession,
  PeerState,
  RNPeer,
  initSessionJSI,
} from 'react-native-multipeer-connectivity';
import { produce } from 'immer';

export function App2() {
  const [displayName, setDisplayName] = useState('');
  const [peerID, setPeerID] = useState('');
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isAdvertizing, setIsAdvertizing] = useState(false);
  const [peers, setPeers] = React.useState<
    Record<
      string,
      {
        state: PeerState;
        peer: RNPeer;
        discoveryInfo?: Record<string, string>;
      }
    >
  >({});
  const [receivedMessages, setReceivedMessages] = React.useState<
    Record<string, string[]>
  >({});

  const [session, setSession] = useState<null | ReturnType<typeof initSession>>(
    null
  );

  React.useEffect(() => {
    if (!session) return;

    const r1 = session.onStartAdvertisingError((ev) => {
      setIsAdvertizing(false);
      console.log('onStartAdvertisingError：', ev);
    });
    const r2 = session.onStartBrowsingError((ev) => {
      setIsBrowsing(false);
      console.log('onStartBrowsingError：', ev);
    });
    const r3 = session.onFoundPeer((ev) => {
      setPeers(
        produce((draft) => {
          // onFoundPeer will be called even if the peer found before when you re-advertize
          if (!draft[ev.peer.id]) {
            draft[ev.peer.id] = {
              peer: ev.peer,
              state: PeerState.notConnected,
              discoveryInfo: ev.discoveryInfo,
            };
          }
        })
      );
      console.log('onFoundPeer：', ev);
    });
    const r4 = session.onLostPeer((ev) => {
      console.log('onLostPeer：', ev);
      setPeers(
        produce((draft) => {
          delete draft[ev.peer.id];
        })
      );
    });
    const r5 = session.onPeerStateChanged((ev) => {
      console.log('onPeerStateChanged：', ev);
      setPeers(
        produce((draft) => {
          if (draft[ev.peer.id]) draft[ev.peer.id].state = ev.state;
          else {
            draft[ev.peer.id] = {
              state: ev.state,
              peer: ev.peer,
            };
          }
        })
      );
    });
    const r6 = session.onReceivedPeerInvitation((ev) => {
      console.log('onReceivedPeerInvitation：', ev);
      ev.handler(true);
    });
    const r7 = session.onReceivedText((ev) => {
      console.log('onReceivedText：', ev);
      setReceivedMessages(
        produce((draft) => {
          if (draft[ev.peer.id]) draft[ev.peer.id].push(ev.text);
          else draft[ev.peer.id] = [ev.text];
        })
      );
    });

    return () => {
      session.stopAdvertizing();
      session.stopBrowsing();
      r1.remove();
      r2.remove();
      r3.remove();
      r4.remove();
      r5.remove();
      r6.remove();
      r7.remove();
    };
  }, [session]);

  if (!displayName) {
    return (
      <View style={styles.container}>
        <Text style={{ fontSize: 20, marginBottom: 5 }}>
          Input your display name and enter:
        </Text>
        <TextInput
          style={{
            fontSize: 30,
            borderWidth: 1,
            borderColor: 'black',
            padding: 10,
            width: 300,
          }}
          placeholder={'display name'}
          onSubmitEditing={(ev) => {
            const name = ev.nativeEvent.text;
            setDisplayName(name);

            const session = initSession({
              displayName: name,
              serviceType: 'demo',
              discoveryInfo: {
                myName: name,
                joinAt: Date.now().toString(),
              },
            });

            setSession(session);
            setPeerID(session.peerID);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>my id: {peerID}</Text>
      {isBrowsing ? (
        <Button
          title={'stop browse'}
          onPress={() => {
            session?.stopBrowsing();
            setIsBrowsing(false);
          }}
        />
      ) : (
        <Button
          title={'start browse'}
          onPress={() => {
            session?.browse();
            setIsBrowsing(true);
          }}
        />
      )}
      {isAdvertizing ? (
        <Button
          title={'stop advertize'}
          onPress={() => {
            session?.stopAdvertizing();
            setIsAdvertizing(false);
          }}
        />
      ) : (
        <Button
          title={'start advertize'}
          onPress={() => {
            session?.advertize();
            setIsAdvertizing(true);
          }}
        />
      )}
      <Button
        title={'disconnect'}
        onPress={() => {
          session?.disconnect();
          setPeers({});
        }}
      />

      <View>
        <Text>Found peers:</Text>
        {Object.entries(peers).map(([id, info]) => {
          return (
            <View
              key={id}
              style={{
                borderWidth: 1,
                borderColor: 'black',
                marginBottom: 10,
                padding: 4,
              }}
            >
              <Pressable
                onPress={() => {
                  session?.invite(id);
                }}
              >
                <Text>
                  {id} - {info.state}
                </Text>
                <Text>displayName: {info.peer.displayName}</Text>
                <Text>discoveryInfo: {JSON.stringify(info.discoveryInfo)}</Text>
              </Pressable>

              {/* chat */}
              {info.state === PeerState.connected ? (
                <View>
                  <TextInput
                    style={{ borderColor: 'gray', borderWidth: 1 }}
                    placeholder={'input text'}
                    onSubmitEditing={(ev) => {
                      session?.sendText(id, ev.nativeEvent.text);
                    }}
                  />
                </View>
              ) : null}

              {/* received messages*/}
              {receivedMessages[id] ? (
                <View>
                  <Text>Received messages:</Text>
                  {receivedMessages[id].map((msg, idx) => {
                    return <Text key={idx}>{msg}</Text>;
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  React.useEffect(() => {
    initSessionJSI();
  }, []);

  return (
    <View style={styles.container}>
      <Text>ha</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
