import MultipeerConnectivity

typealias RNPeerID = String

extension MCPeerID {
  func toDict(_ rnPeerID: RNPeerID) -> NSDictionary {
      return NSDictionary(dictionary: [
      "id": rnPeerID,
      "displayName": self.displayName
    ])
  }
}

@objc(MultipeerConnectivity)
class MultipeerConnectivity: RCTEventEmitter {
    static var INTERNAL_KEY_RN_PEER_ID = "__mpc_rn_peer_id";
    static var INTERNAL_KEY_RN_CTX_KEY = "__mpc_context_string"

    private var hasListeners = false

    private var invitationMap: Dictionary<String, (Bool, MCSession?) -> Void> = Dictionary()
    private var peerIds: [(RNPeerID, MCPeerID)] = []
    private var peerID: (RNPeerID?, MCPeerID?)
    private var session: MCSession?
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?

    override init() {
        super.init()
    }

    deinit {
        advertiser?.stopAdvertisingPeer()
        browser?.stopBrowsingForPeers()
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String]! {
        return [
            "onStartAdvertisingError",
            "onReceivedPeerInvitation",
            "onStartBrowsingError",
            "onFoundPeer",
            "onLostPeer",
            "onPeerStateChanged",
            "onReceivedText"
        ]
    }

    @objc
    override func startObserving() {
        hasListeners = true
    }

    @objc
    override func stopObserving() {
        hasListeners = false
    }

    @objc
    func initSession(_ options: NSDictionary) -> NSDictionary {
        let displayName = (options["displayName"] as! String)
        let serviceType = (options["serviceType"] as! String)
        let discoveryInfo = (options["discoveryInfo"] as? NSDictionary ?? nil)

        let rnPeerID = UUID().uuidString;
        let discoveryInfoWithId = NSMutableDictionary(dictionary: [
            Self.INTERNAL_KEY_RN_PEER_ID: rnPeerID
        ])
        if let discoveryInfo = discoveryInfo {
            discoveryInfoWithId.addEntries(from: discoveryInfo as! [String : String])
        }

        let peerID = MCPeerID(displayName: displayName);
        self.peerID = (rnPeerID, peerID);
        session = MCSession(peer: peerID)
        advertiser = MCNearbyServiceAdvertiser(peer: peerID, discoveryInfo: (discoveryInfoWithId as! [String : String]), serviceType: serviceType);
        browser = MCNearbyServiceBrowser(peer: peerID, serviceType: serviceType)
        advertiser!.delegate = self
        browser!.delegate = self
        session!.delegate = self

        return NSDictionary(dictionary: [
          "peerID": rnPeerID
        ]);
    }

    @objc
    func browse(_ resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock) {
        browser?.startBrowsingForPeers()
        resolve(nil)
    }

    @objc
    func advertize(_ resolve: RCTPromiseResolveBlock,
                   rejecter reject: RCTPromiseRejectBlock) {
        advertiser?.startAdvertisingPeer()
        resolve(nil)
    }

    @objc
    func stopBrowse(_ resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock) {
        browser?.stopBrowsingForPeers()
        resolve(nil)
    }

    @objc
    func stopAdvertize(_ resolve: RCTPromiseResolveBlock,
                   rejecter reject: RCTPromiseRejectBlock) {
        advertiser?.stopAdvertisingPeer()
        resolve(nil)
    }

    @objc
    func invite(_ options: NSDictionary, resolver resolve: RCTPromiseResolveBlock,
                 rejecter reject: RCTPromiseRejectBlock) {
        let rnPeerID = (options["peerID"] as! String)
        let timeout = (options["timeout"] as! NSNumber)
        let contextString = (options["contextString"] as? String) // json string

        let contextWithInternal = NSMutableDictionary(dictionary: [
          Self.INTERNAL_KEY_RN_PEER_ID: self.peerID.0
        ])
        if let contextString = contextString {
          contextWithInternal.addEntries(from: [
            Self.INTERNAL_KEY_RN_CTX_KEY: contextString
          ])
        }

        if let session = session, let peerID = peerIds.first(where: {
            $0.0 == rnPeerID
        }) {
            browser?.invitePeer(peerID.1, to: session, withContext: jsonToData(json: contextWithInternal), timeout: TimeInterval(truncating: timeout))
            resolve(nil)
        } else {
            reject("ERR_FATAL", "Not found target peer, this should not happen", nil);
        }
    }

    @objc
    func processInvitation(_ options: NSDictionary, resolver resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock) {
        let invitationId = (options["invitationId"] as! String)
        let accept = (options["accept"] as! Bool)

        if let handler = invitationMap[invitationId] {
            handler(accept, self.session)
            invitationMap.removeValue(forKey: invitationId)
        }
        resolve(nil)
    }

    @objc
    func sendText(_ options: NSDictionary, resolver resolve: RCTPromiseResolveBlock,
                  rejecter reject: RCTPromiseRejectBlock) {
        let rnPeerID = (options["peerID"] as! String)
        let text = (options["text"] as! String)

        do {
            if  let peerID = peerIds.first(where: {
                $0.0 == rnPeerID
            }) {
                try session?.send(text.data(using: .utf8)! , toPeers: [peerID.1], with: .reliable)
            }
            resolve(nil)
        } catch {
            reject("ERR_SEND_TEXT", error.localizedDescription, nil)
        }
    }

    @objc
    func disconnect(_ resolve: RCTPromiseResolveBlock,
                   rejecter reject: RCTPromiseRejectBlock) {
        session?.disconnect()
        resolve(nil)
    }
}


extension MultipeerConnectivity: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
        sendEvent(withName: "onStartAdvertisingError", body: [
            "text": error.localizedDescription
        ])
    }

    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        if let context = context {
            let json = dataToJSON(data: context) as? [String: Any];
            let fromRNPeerID = json?[Self.INTERNAL_KEY_RN_PEER_ID] as? String;
            let contextString = json?[Self.INTERNAL_KEY_RN_CTX_KEY] as? String;
          if let fromRNPeerID = fromRNPeerID {
            if let peer = peerIds.first(where: {$0.0 == fromRNPeerID}) {
            } else {
                peerIds.append((fromRNPeerID, peerID))
            }
            invitationMap[fromRNPeerID] = invitationHandler;
            sendEvent(withName: "onReceivedPeerInvitation", body: [
                "invitationId": fromRNPeerID,
                "peer": peerID.toDict(fromRNPeerID),
                "contextString": contextString != nil ? contextString : nil,
            ])
            return;
          } else {
            print("Invitation data didn't contain peer id for react-native, this should not happen");
          }
        } else {
          print("Invitation data was nil, this should not happen");
        }

        invitationHandler(false, self.session);
    }
}

extension MultipeerConnectivity: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
        sendEvent(withName: "onStartBrowsingError", body: [
            "text": error.localizedDescription
        ])
    }

    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        if let info = info {
            let rnPeerID = info[Self.INTERNAL_KEY_RN_PEER_ID]!;
            peerIds.append((rnPeerID, peerID));
            let infoWithoutInternal = NSMutableDictionary(dictionary: info)
            infoWithoutInternal.removeObject(forKey: Self.INTERNAL_KEY_RN_PEER_ID)
            sendEvent(withName: "onFoundPeer", body: [
                "peer": peerID.toDict(rnPeerID),
                "discoveryInfo": infoWithoutInternal
            ])
        } else {
            print("Discovery info was empty, this should not happen");
        }
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        if let idx = peerIds.firstIndex( where: {
            $0.1 == peerID
        }) {
            let peer = peerIds[idx];
            peerIds.remove(at: idx);
            sendEvent(withName: "onLostPeer", body: [
                "peer": peerID.toDict(peer.0),
            ])
        }
    }
}

extension MultipeerConnectivity: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        if let peer = peerIds.first( where: {
            $0.1 == peerID
        }) {
            sendEvent(withName: "onPeerStateChanged", body: [
                "peer": peerID.toDict(peer.0),
                "state": state.rawValue
            ])
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        if let peer = peerIds.first( where: {
            $0.1 == peerID
        }) {
            sendEvent(withName: "onReceivedText", body: [
                "peer": peerID.toDict(peer.0),
                "text": String(data: data, encoding: .utf8)
            ])
        }
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {
        // TODO
    }

    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {
        // TODO
    }

    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {
        // TODO
    }
}

func dataToJSON(data: Data) -> Any? {
   do {
       return try JSONSerialization.jsonObject(with: data, options: .mutableContainers)
   } catch let jsonErr {
       print("convert data to json failed:", jsonErr)
   }
   return nil
}

func jsonToData(json: Any) -> Data? {
    do {
        return try JSONSerialization.data(withJSONObject: json, options: JSONSerialization.WritingOptions.prettyPrinted)
    } catch let jsonErr {
        print("convert json to data failed:", jsonErr)
    }
    return nil;
}

