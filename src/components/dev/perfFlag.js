// true when the page address has ?perf in it — turns on the frame meter
// (see PerfMeter.jsx), e.g. http://localhost:5173/swarm-site/?perf
export const perfMeterOn = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');
