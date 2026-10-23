import {useRef} from 'react';
import {useTVEventHandler} from '@amazon-devices/react-native-kepler';

type Handlers = Partial<Record<'left' | 'right' | 'up' | 'down' | 'select', () => void>>;

// Remote keys, key-down only. OK arrives as 'select' on Vega OS 2 and as 'enter' on 1.3.
export function useKeys(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useTVEventHandler((evt: {eventType: string; eventKeyAction?: number}) => {
    if (evt.eventKeyAction === 1) {
      return;
    }
    const type = evt.eventType === 'enter' ? 'select' : evt.eventType;
    ref.current[type as keyof Handlers]?.();
  });
}
