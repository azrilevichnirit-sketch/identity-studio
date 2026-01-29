/// <reference types="vite/client" />

// Allow importing CSV files as raw text
declare module '*.csv?raw' {
  const content: string;
  export default content;
}
