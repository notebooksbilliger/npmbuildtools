export function SupportedVersionControlProviders(): string[];
export function GetVersionControlProviders(packagePath?: string): {
    git: boolean;
    tfs: boolean;
};
export function GetVersionControlProvider(packagePath?: string): string;
export function GetHistory(pathSpec: string, packagePath?: string): {
    Date: Date;
    Timestamp: any;
    StatusEntries: any[];
}[];
export function GetLastChange(pathSpec: string, excludeStatusCodes?: string[], ignoreStatusCodes?: string[]): number;
export class VersionControlProviders {
    git: boolean;
    tfs: boolean;
}
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
