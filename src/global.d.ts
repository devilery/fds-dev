
declare module 'axios-auth-refresh';

declare namespace NodeJS {
  export interface ProcessEnv {
    GITHUB_PRIVATE_KEY: string;
    SLACK_CLIENT_SECRET: string;
    SLACK_CLIENT_ID: string;
    SLACK_OAUTH_REDIRECT_URI: string;
  }
}