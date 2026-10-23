import 'react-native';
import {render} from '@testing-library/react-native';
import * as React from 'react';

import {App} from '../src/App';

// The Vega jest preset leaves BackHandler undefined.
jest.mock('react-native', () =>
  Object.setPrototypeOf(
    {BackHandler: {addEventListener: () => ({remove: () => {}})}},
    jest.requireActual('react-native'),
  ),
);
jest.mock('@amazon-devices/react-native-kepler', () =>
  Object.setPrototypeOf(
    {useTVEventHandler: () => {}, BackHandler: {addEventListener: () => ({remove: () => {}})}},
    jest.requireActual('@amazon-devices/react-native-kepler'),
  ),
);
// The WebView's native module doesn't exist under Jest.
jest.mock('@amazon-devices/webview', () => ({WebView: () => null}));

describe('App', () => {
  it('opens on "Where to?" with sites to try', () => {
    const screen = render(<App />);
    expect(screen.getByText('Where to?')).toBeTruthy();
    expect(screen.getByText('BBC News')).toBeTruthy();
    screen.unmount();
  });
});
