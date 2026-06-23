// Manual mock for react-native-view-shot (package not installed).
// The ReferralQRModal imports ViewShot to capture the QR code as an image;
// in tests we don't need real capture, only a forwardRef-compatible
// component that exposes a `capture()` method.

const React = require('react');

const ViewShot = React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => ({
    capture: jest.fn(() => Promise.resolve('file:///mock/path/qr.png')),
  }));
  return React.createElement('View', props, props.children);
});

ViewShot.displayName = 'ViewShot';

module.exports = ViewShot;
module.exports.default = ViewShot;
