export function GetHistory(pathSpec: string): {
    Date: Date;
    Timestamp: any;
    StatusEntries: any[];
}[];
export function GetLastChange(pathSpec: string, excludeStatusCodes?: string[], ignoreStatusCodes?: string[]): number;
export class HistoryEntry {
    constructor(timestamp: any);
    Date: Date;
    Timestamp: any;
    StatusEntries: any[];
}
export class StatusEntry {
    constructor(status: any, file: any);
    Status: any;
    File: any;
}
