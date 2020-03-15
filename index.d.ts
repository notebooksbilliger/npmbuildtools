export function PostPack(clientScripts: string[][], consoleOptions?: {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
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
export var ConsoleSupportedPlatforms: string[];
export var ConsoleDefaultMethods: string[];
export var ConsoleLogLevel: {
    default: number;
    verbose: number;
    debug: number;
    /**
     * Checks and returns a `ConsoleOptions` object.
     * @param {ConsoleOptions} consoleOptions A `ConsoleOptions` object.
     * @returns {ConsoleOptions} A safeguarded `ConsoleOptions` object.
     * */
    Validate: (consoleOptions: {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    }) => {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    };
};
export function ConsoleInit(platform?: "win32" | "github" | "other"): void;
export function ConsoleReset(): void;
export function ConsolePushOptions(consoleOptions?: {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
}): {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
};
export function ConsolePopOptions(): void;
export function ConsolePushPrefixes(prefix?: any): void;
export function ConsolePopPrefixes(): void;
export function ConsolePushSystemPrefixes(system?: any): void;
export function ConsolePopSystemPrefixes(): void;
export function ConsolePushTheme(theme?: any): void;
export function ConsolePopTheme(): void;
export var ReadOnlyProperties: string[];
export var RunningInGitHub: boolean;
export var DebugMode: boolean;
export var TerminalCanBlock: boolean;
export var ConsolePlatform: string;
export type GenerateReadmeOptions = {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
};
export type LogLevel = "default" | "debug" | "verbose";
export type ConsoleOptions = {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
};
