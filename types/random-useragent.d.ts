declare module 'random-useragent' {
  interface RandomUserAgent {
    getRandom(): string;
    getRandom(filter?: any): string;
  }
  
  const randomUseragent: RandomUserAgent;
  export = randomUseragent;
}