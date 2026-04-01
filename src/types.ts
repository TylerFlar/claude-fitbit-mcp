export interface AppConfig {
  client_id: string;
  client_secret: string;
}

export interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  scope: string;
  user_id: string;
}

export interface StoredAccount {
  user_id: string;
  display_name: string;
  tokens: Credentials;
}
