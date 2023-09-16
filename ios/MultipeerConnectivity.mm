
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#import <React/RCTBridgeModule.h>
#import <React/RCTBridge+Private.h>
#import <jsi/jsi.h>

#import "JSIUtils.h"

#import "MultipeerConnectivity.h"

using namespace facebook::jsi;
using namespace std;

@implementation MultipeerConnectivity

RCT_EXPORT_MODULE(MultipeerConnectivity);

@synthesize bridge = _bridge;
@synthesize methodQueue = _methodQueue;

-(instancetype)init {
 
    return self;
}

-(NSDictionary*)jsInitSession:(NSDictionary*)options {
    self.peerIds = [NSMutableDictionary new];
    self.invitationMap = [NSMutableDictionary new];
    
    NSString* displayName = options[@"displayName"];
    NSString* serviceType = options[@"serviceType"];
    NSDictionary* discoveryInfo = options[@"discoveryInfo"];
    
    self.peerId = [[MCPeerID alloc] initWithDisplayName:displayName];
    self.session = [[MCSession alloc] initWithPeer:self.peerId];
    self.session.delegate = self;
    
    return @{
        @"peerId": [NSString stringWithFormat:@"%lu", (unsigned long)[self.peerId hash]]
    };
}

-(void)startBrowsing {
    if (_browser == nil) {
        _browser = [[MCNearbyServiceBrowser alloc] init];
    }
    _browser.delegate = self;
    [_browser startBrowsingForPeers];
}

-(void)stopBrowsing {
    [_browser stopBrowsingForPeers];
}

-(void)startAdvertizing {
    if (_advertiser == nil) {
        _advertiser = [[MCNearbyServiceAdvertiser alloc] init];
    }
    _advertiser.delegate = self;
    [_advertiser startAdvertisingPeer];
}

-(void)stopAdvertizing {
    [_advertiser stopAdvertisingPeer];
}

-(void)invite:(NSDictionary*)options {
    NSString* peerId = options[@"peerId"];
    NSNumber* timeout = options[@"timeout"];
    NSString* contextString = options[@"contextString"]; // json string
    
    MCPeerID* peer = [_peerIds valueForKey:peerId];
    [_browser invitePeer:peer toSession:_session withContext: [contextString dataUsingEncoding:NSUTF8StringEncoding] timeout:[timeout doubleValue]];
}

-(void)processInvitation:(NSDictionary*)options {
    NSString* invitationId = options[@"invitationId"];
    BOOL accept = options[@"accept"];
    
    void (^handler)(BOOL, MCSession *) = [_invitationMap objectForKey:invitationId];
    handler(accept, _session);
}

-(void)sendText {
    // todo
}

-(void)disconnectAll {
    [_session disconnect];
}

- (void)advertiser:(MCNearbyServiceAdvertiser *)advertiser
didNotStartAdvertisingPeer:(NSError *)error {
    [self sendEventWithName:@"onStartAdvertisingError" body:@{
        @"text": [error description]
    }];
}
- (void)advertiser:(nonnull MCNearbyServiceAdvertiser *)advertiser didReceiveInvitationFromPeer:(nonnull MCPeerID *)peerID withContext:(nullable NSData *)context invitationHandler:(nonnull void (^)(BOOL, MCSession * _Nullable))invitationHandler {
    NSLog(@"didReceiveInvitationFromPeer");
}

- (void)browser:(nonnull MCNearbyServiceBrowser *)browser foundPeer:(nonnull MCPeerID *)peerID withDiscoveryInfo:(nullable NSDictionary<NSString *,NSString *> *)info {
    NSLog(@"foundPeer");
}

- (void)browser:(nonnull MCNearbyServiceBrowser *)browser lostPeer:(nonnull MCPeerID *)peerID {
    NSLog(@"lostPeer");
}

- (void)session:(nonnull MCSession *)session didFinishReceivingResourceWithName:(nonnull NSString *)resourceName fromPeer:(nonnull MCPeerID *)peerID atURL:(nullable NSURL *)localURL withError:(nullable NSError *)error {
    
}

- (void)session:(nonnull MCSession *)session didReceiveData:(nonnull NSData *)data fromPeer:(nonnull MCPeerID *)peerID {
    
}

- (void)session:(nonnull MCSession *)session didReceiveStream:(nonnull NSInputStream *)stream withName:(nonnull NSString *)streamName fromPeer:(nonnull MCPeerID *)peerID {
    
}

- (void)session:(nonnull MCSession *)session didStartReceivingResourceWithName:(nonnull NSString *)resourceName fromPeer:(nonnull MCPeerID *)peerID withProgress:(nonnull NSProgress *)progress {
    
}

- (void)session:(nonnull MCSession *)session peer:(nonnull MCPeerID *)peerID didChangeState:(MCSessionState)state {
    
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install)
{
    RCTBridge* bridge = [RCTBridge currentBridge];
    RCTCxxBridge* cxxBridge = (RCTCxxBridge*)bridge;
    if (cxxBridge == nil) {
        return @false;
    }
    
    auto jsiRuntime = (Runtime*) cxxBridge.runtime;
    if (jsiRuntime == nil) {
        return @false;
    }
    

    auto initSessionFn = Function::createFromHostFunction(*jsiRuntime,
                                                          PropNameID::forAscii(*jsiRuntime,
                                                                               "initSession"),
                                                          1,
                                                          [self, jsiRuntime](Runtime &runtime,
                                                                      const Value &thisValue,
                                                                      const Value *arguments,
                                                                      size_t count) -> Value {

        NSDictionary* options = convertJSIObjectToNSDictionary(*jsiRuntime, arguments[0].asObject(*jsiRuntime));
        return convertNSDictionaryToJSIObject(*jsiRuntime,[NSDictionary new]);
//        return String::createFromUtf8(runtime, [@"" UTF8String] ?: "");
    });

    (*jsiRuntime).global().setProperty(*jsiRuntime, "initSession", move(initSessionFn));


    
    return @true;
}

@end
