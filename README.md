# react-native-multipeer-connectivity

working, not published yet

## Installation

```sh
npm install react-native-multipeer-connectivity

# ios
npx pod-install
```

## Usage

Update your `Info.plist` by adding:
```text
<key>NSLocalNetworkUsageDescription</key>
<string>[a]</string>
<key>NSBonjourServices</key>
<array>
    <string>_[b]._tcp</string>
</array>
```


cite
https://github.com/lwansbrough/react-native-multipeer/blob/master/MultipeerConnection.js#L4

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
