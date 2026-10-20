import { useEffect } from 'react';
import { enterDemo } from './mode';

export function DemoEntry() {
  useEffect(enterDemo, []);
  return <p className="p-10 text-center text-muted">Loading demo…</p>;
}
