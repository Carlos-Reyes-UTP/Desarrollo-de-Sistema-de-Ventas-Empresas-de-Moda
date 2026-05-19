export interface TokenDecodificado {
  sub: string;
  authorities?: string[] | string;
  exp: number;
  [key: string]: unknown;
}
