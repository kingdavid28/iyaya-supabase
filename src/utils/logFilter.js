// Log filter to show only errors and warnings
const originalLog = console.log;
const originalInfo = console.info;

// Override console.log and console.info to be silent
console.log = () => {};
console.info = () => {};

// Keep console.error and console.warn as they are
// console.error and console.warn remain unchanged

export const enableAllLogs = () => {
  console.log = originalLog;
  console.info = originalInfo;
};

export const enableErrorsOnly = () => {
  console.log = () => {};
  console.info = () => {};
};