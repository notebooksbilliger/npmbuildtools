export function TaskVersionToString(version: any): string;
export function StringToTaskVersion(version: string): {
    Major: number;
    Minor: number;
    Patch: number;
};
export function TfxIgnore(vsixPackageFile?: string, ignoreFileName?: string, consoleOptions?: import("..").ConsoleOptions_ | import("..").ConsoleOptions): void;
export function TfxMkboot(packagePath: any, bootFile: any, consoleOptions: any, ...commands: any[]): void;
export function TfxMkboot2(options?: {
    packagePath?: string;
    bootFile?: string;
    noTaskUpdate?: boolean;
    vsixPackageFile?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: import("..").ConsoleOptions_ | import("..").ConsoleOptions;
}, ...commands: string[]): void;
export function TfxVersion(options?: {
    vsixPackageFile?: string;
    taskFilesName?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: import("..").ConsoleOptions_ | import("..").ConsoleOptions;
}): void;
export type TfxMkbootOptions = {
    packagePath?: string;
    bootFile?: string;
    noTaskUpdate?: boolean;
    vsixPackageFile?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: import("..").ConsoleOptions_ | import("..").ConsoleOptions;
};
export type TfxVersionOptions = {
    vsixPackageFile?: string;
    taskFilesName?: string;
    incrementReleaseType?: import("semver").ReleaseType;
    consoleOptions?: import("..").ConsoleOptions_ | import("..").ConsoleOptions;
};
