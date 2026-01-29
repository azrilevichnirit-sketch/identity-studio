/// <reference types="vite/client" />

// Allow importing CSV files as raw text
declare module '*.csv?raw' {
  const content: string;
  export default content;
}

// Allow importing JSON files
declare module '*.json' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;
  export default value;
}
