export function TaskVersionToString(version: any): string;
export function StringToTaskVersion(version: string): {
    Major: number;
    Minor: number;
    Patch: number;
};
export function TfxIgnore(vsixPackageFile?: string, ignoreFileName?: string, consoleOptions?: {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
}): void;
export function TfxMkboot(packagePath: any, bootFile: any, consoleOptions: any, ...commands: any[]): void;
export function TfxMkboot2(options?: {
    packagePath?: string;
    bootFile?: string;
    noTaskUpdate?: boolean;
    vsixPackageFile?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    };
}, ...commands: string[]): void;
export function TfxVersion(options?: {
    vsixPackageFile?: string;
    taskFilesName?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    };
}): void;
export type TfxMkbootOptions = {
    packagePath?: string;
    bootFile?: string;
    noTaskUpdate?: boolean;
    vsixPackageFile?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    };
};
export type TfxVersionOptions = {
    vsixPackageFile?: string;
    taskFilesName?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    };
};
