import { DAVResult, DAVResultResponseProps, DiskQuotaAvailable, FileStat } from "../types";
export declare function parseXML(xml: string): Promise<DAVResult>;
export declare function prepareFileFromProps(props: DAVResultResponseProps, rawFilename: string, isDetailed?: boolean): FileStat;
export declare function parseStat(result: DAVResult, filename: string, isDetailed?: boolean): FileStat;
export declare function translateDiskSpace(value: string | number): DiskQuotaAvailable;
