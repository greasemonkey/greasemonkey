/// <reference types="node" />
import Stream from "stream";
export declare type AuthHeader = string;
export declare enum AuthType {
    Digest = "digest",
    None = "none",
    Password = "password",
    Token = "token"
}
export declare type BufferLike = Buffer | ArrayBuffer;
export interface CreateDirectoryOptions extends WebDAVMethodOptions {
    recursive?: boolean;
}
export interface CreateReadStreamOptions extends WebDAVMethodOptions {
    callback?: (response: Response) => void;
    range?: {
        start: number;
        end?: number;
    };
}
export declare type CreateWriteStreamCallback = (response: Response) => void;
export interface CreateWriteStreamOptions extends WebDAVMethodOptions {
    overwrite?: boolean;
}
export interface DAVResultResponse {
    href: string;
    propstat: {
        prop: DAVResultResponseProps;
        status: string;
    };
}
export interface DAVResultResponseProps {
    displayname: string;
    resourcetype: {
        collection?: boolean;
    };
    getlastmodified?: string;
    getetag?: string;
    getcontentlength?: string;
    getcontenttype?: string;
    "quota-available-bytes"?: any;
    "quota-used-bytes"?: string;
}
export interface DAVResult {
    multistatus: {
        response: Array<DAVResultResponse>;
    };
}
export interface DAVResultRawMultistatus {
    response: DAVResultResponse | [DAVResultResponse];
}
export interface DAVResultRaw {
    multistatus: "" | DAVResultRawMultistatus | [DAVResultRawMultistatus];
}
export interface DigestContext {
    username: string;
    password: string;
    nc: number;
    algorithm: string;
    hasDigestAuth: boolean;
    cnonce?: string;
    nonce?: string;
    realm?: string;
    qop?: string;
    opaque?: string;
}
export interface DiskQuota {
    used: number;
    available: DiskQuotaAvailable;
}
export declare type DiskQuotaAvailable = "unknown" | "unlimited" | number;
export declare enum ErrorCode {
    DataTypeNoLength = "data-type-no-length",
    InvalidAuthType = "invalid-auth-type",
    InvalidOutputFormat = "invalid-output-format",
    LinkUnsupportedAuthType = "link-unsupported-auth"
}
export interface FileStat {
    filename: string;
    basename: string;
    lastmod: string;
    size: number;
    type: "file" | "directory";
    etag: string | null;
    mime?: string;
    props?: DAVResultResponseProps;
}
export interface GetDirectoryContentsOptions extends WebDAVMethodOptions {
    deep?: boolean;
    details?: boolean;
    glob?: string;
}
export interface GetFileContentsOptions extends WebDAVMethodOptions {
    details?: boolean;
    format?: "binary" | "text";
    onDownloadProgress?: ProgressEventCallback;
}
export interface GetQuotaOptions extends WebDAVMethodOptions {
    details?: boolean;
    path?: string;
}
export interface Headers {
    [key: string]: string;
}
export interface LockOptions extends WebDAVMethodOptions {
    refreshToken?: string;
    timeout?: string;
}
export interface LockResponse {
    serverTimeout: string;
    token: string;
}
export interface OAuthToken {
    access_token: string;
    token_type: string;
    refresh_token?: string;
}
export interface ProgressEvent {
    loaded: number;
    total: number;
}
export declare type ProgressEventCallback = (e: ProgressEvent) => void;
export interface PutFileContentsOptions extends WebDAVMethodOptions {
    contentLength?: boolean | number;
    overwrite?: boolean;
    onUploadProgress?: UploadProgressCallback;
}
export declare type RequestDataPayload = string | Buffer | ArrayBuffer | {
    [key: string]: any;
};
interface RequestOptionsBase {
    data?: RequestDataPayload;
    headers?: Headers;
    httpAgent?: any;
    httpsAgent?: any;
    maxBodyLength?: number;
    maxContentLength?: number;
    maxRedirects?: number;
    method: string;
    onDownloadProgress?: ProgressEventCallback;
    onUploadProgress?: ProgressEventCallback;
    responseType?: string;
    transformResponse?: Array<(value: any) => any>;
    url?: string;
    validateStatus?: (status: number) => boolean;
    withCredentials?: boolean;
    signal?: AbortSignal;
}
export interface RequestOptionsCustom extends RequestOptionsBase {
}
export interface RequestOptions extends RequestOptionsBase {
    url: string;
}
export interface RequestOptionsWithState extends RequestOptions {
    _digest?: DigestContext;
}
export interface Response {
    data: ResponseData;
    status: number;
    headers: Headers;
    statusText: string;
}
export declare type ResponseData = string | Buffer | ArrayBuffer | Object | Array<any>;
export interface ResponseDataDetailed<T> {
    data: T;
    headers: Headers;
    status: number;
    statusText: string;
}
export interface ResponseStatusValidator {
    (status: number): boolean;
}
export interface StatOptions extends WebDAVMethodOptions {
    details?: boolean;
}
export declare type UploadProgress = ProgressEvent;
export declare type UploadProgressCallback = ProgressEventCallback;
export interface WebDAVClient {
    copyFile: (filename: string, destination: string) => Promise<void>;
    createDirectory: (path: string, options?: CreateDirectoryOptions) => Promise<void>;
    createReadStream: (filename: string, options?: CreateReadStreamOptions) => Stream.Readable;
    createWriteStream: (filename: string, options?: CreateWriteStreamOptions, callback?: CreateWriteStreamCallback) => Stream.Writable;
    customRequest: (path: string, requestOptions: RequestOptionsCustom) => Promise<Response>;
    deleteFile: (filename: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    getDirectoryContents: (path: string, options?: GetDirectoryContentsOptions) => Promise<Array<FileStat> | ResponseDataDetailed<Array<FileStat>>>;
    getFileContents: (filename: string, options?: GetFileContentsOptions) => Promise<BufferLike | string | ResponseDataDetailed<BufferLike | string>>;
    getFileDownloadLink: (filename: string) => string;
    getFileUploadLink: (filename: string) => string;
    getHeaders: () => Headers;
    getQuota: (options?: GetQuotaOptions) => Promise<DiskQuota | null | ResponseDataDetailed<DiskQuota | null>>;
    lock: (path: string, options?: LockOptions) => Promise<LockResponse>;
    moveFile: (filename: string, destinationFilename: string) => Promise<void>;
    putFileContents: (filename: string, data: string | BufferLike | Stream.Readable, options?: PutFileContentsOptions) => Promise<boolean>;
    setHeaders: (headers: Headers) => void;
    stat: (path: string, options?: StatOptions) => Promise<FileStat | ResponseDataDetailed<FileStat>>;
    unlock: (path: string, token: string, options?: WebDAVMethodOptions) => Promise<void>;
}
export interface WebDAVClientContext {
    authType: AuthType;
    contactHref: string;
    digest?: DigestContext;
    headers: Headers;
    httpAgent?: any;
    httpsAgent?: any;
    maxBodyLength?: number;
    maxContentLength?: number;
    password?: string;
    remotePath: string;
    remoteURL: string;
    token?: OAuthToken;
    username?: string;
    withCredentials?: boolean;
}
export interface WebDAVClientError extends Error {
    status?: number;
    response?: Response;
}
export interface WebDAVClientOptions {
    authType?: AuthType;
    contactHref?: string;
    headers?: Headers;
    httpAgent?: any;
    httpsAgent?: any;
    maxBodyLength?: number;
    maxContentLength?: number;
    password?: string;
    token?: OAuthToken;
    username?: string;
    withCredentials?: boolean;
}
export interface WebDAVMethodOptions {
    data?: RequestDataPayload;
    headers?: Headers;
    signal?: AbortSignal;
}
export {};
