
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#import <React/RCTBridgeModule.h>
#import <React/RCTBridge+Private.h>

@import MultipeerConnectivity;


@interface MultipeerConnectivity: RCTEventEmitter<MCNearbyServiceAdvertiserDelegate, MCNearbyServiceBrowserDelegate, MCSessionDelegate>

@property(nonatomic) BOOL hasListeners;
@property(nonatomic) NSMutableDictionary* invitationMap;
@property(nonatomic) NSMutableDictionary* peerIds;
@property(nonatomic) MCPeerID* peerId;
@property(nonatomic) MCSession* session;
@property(nonatomic) MCNearbyServiceAdvertiser* advertiser;
@property(nonatomic) MCNearbyServiceBrowser* browser;

@end
