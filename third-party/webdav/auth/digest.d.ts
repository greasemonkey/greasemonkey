import { DigestContext, Response } from "../types";
export declare function createDigestContext(username: string, password: string): DigestContext;
export declare function generateDigestAuthHeader(options: any, digest: DigestContext): string;
export declare function parseDigestAuth(response: Response, _digest: DigestContext): boolean;
