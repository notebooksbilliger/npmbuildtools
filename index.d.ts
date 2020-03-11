export function PostPack(clientScripts: string[][], options?: {
    verbose: boolean;
    debug: boolean;
}): void;
export function SliceArgv(argv: string[], file: string, noDefaultAll?: boolean): string[];
export function CheckReadme(packagePath?: string, readmeFileName?: string, options?: {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
}): string;
export function ColorizeDiff(diff: any, addedColor: any, removedColor: any, unchangedColor: any): any;
export var stdout: string[];
export var stderr: string[];
export function ConsoleCaptureStart(): void;
export function ConsoleCaptureStop(emit?: boolean): void;
export var ReadOnlyProperties: string[];
export var RunningInGitHub: boolean;
export var DebugMode: boolean;
export var TerminalCanBlock: boolean;
export type PostPackOptions = {
    verbose: boolean;
    debug: boolean;
};
export type GenerateReadmeOptions = {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
};
