export function PostPack(clientScripts: string[][], consoleOptions?: ConsoleOptions_ | ConsoleOptions): void;
export function SliceArgv(argv: string[], file: string, noDefaultAll?: boolean): string[];
export function CheckReadme(packagePath?: string, readmeFileName?: string, options?: import("./lib/generate-adoc").GenerateReadmeOptions): string;
export function ColorizeDiff(diff: any, addedColor: any, removedColor: any, unchangedColor: any): any;
export var stdout: string[];
export var stderr: string[];
export function ConsoleCaptureStart(): void;
export function ConsoleCaptureStop(emit?: boolean): void;
export var ConsoleSupportedPlatforms: string[];
export var ConsoleDefaultMethods: string[];
/**
 * Enumeration of valid console log levels, along with a validator for
[ConsoleOptions]{@link module:index~ConsoleOptions} objects.
 */
export type ConsoleLogLevel = {
    /**
     * The default log level, muting the `info()` and
    `debug()` methods of the `console` object.
     */
    default: number;
    /**
     * The verbose log level, muting the `debug()`
    method of the `console` object.
     */
    verbose: number;
    /**
     * The debug log level, muting no methods of the
    `console` object.
     */
    debug: number;
    /**
     * A validator for
    [ConsoleOptions]{@link module:index~ConsoleOptions} objects.
     */
    Validate: any;
};
export var ConsoleLogLevel: ConsoleLogLevel;
export function ConsoleInit(platform?: "win32" | "github" | "devops" | "other"): void;
export function ConsoleReset(): void;
export function ConsolePushOptions(consoleOptions?: ConsoleOptions_ | ConsoleOptions): ConsoleOptions;
export function ConsolePopOptions(): void;
export function ConsolePushPrefixes(prefix?: any): void;
export function ConsolePopPrefixes(): void;
export function ConsolePushSystemPrefixes(system?: any): void;
export function ConsolePopSystemPrefixes(): void;
export function ConsolePushTheme(theme?: any): void;
export function ConsolePopTheme(): void;
export var ReadOnlyProperties: string[];
export var RunningInGitHub: boolean;
export var RunningInDevOps: boolean;
export var DebugMode: boolean;
export var TerminalCanBlock: boolean;
export var ConsolePlatform: string;
export var os: typeof import("./lib/os-utils");
export type GenerateReadmeOptions = {
    /**
     * The line separator to use (defaults to `os.EOL` if
    omitted).
     */
    EOL?: string;
    /**
     * Controls whether to update the date
    specification in the output document (i.e. the asciidoc `Date` attribute,
    which might be resolved and translated when saving in a different format).
     */
    updateTimestamp?: boolean;
    /**
     * Controls whether to update the
    package file (e.g. with the path of the generated document in the `readme`
    element).
     */
    noPackageJsonUpdate?: boolean;
    /**
     * Controls the
    rendering of the `npm install` command in the Installation block (defaults
    to `regular` if omitted).
     */
    dependencyType?: "none" | "global" | "regular" | "dev" | "opt";
    /**
     * The format to use for saving
    the generated file (defaults to `adoc` if omitted).
     */
    outputFormat?: "adoc" | "xml" | "md";
};
/**
 * Function to reset the `console` hook(s) akquired for capturing outputs.
 */
export type UnhookIntercept = () => void;
/**
 * Level of output verbosity.
 */
export type LogLevel = "default" | "debug" | "verbose";
/**
 * A set of options specifying the console output verbosity.
 *
 * Will be the only definition remaining starting with next major version.
 */
export type ConsoleOptions = {
    /**
     * The overall level of console output verbosity.
     */
    logLevel: "default" | "debug" | "verbose";
    /**
     * Emit verbose output.
    
    Automatically set to `true` if `{@link module:index~ConsoleOptions#logLevel}`
    is set to {@link module:index.ConsoleLogLevel}`.verbose` or higher, unless
    specified explicitly.
     */
    verbose?: boolean;
    /**
     * Emit debug output.
    
    Automatically set to `true` if `{@link module:index~ConsoleOptions#logLevel}`
    is set to {@link module:index~ConsoleLogLevel}`.debug` or higher, unless
    specified explicitly.
     */
    debug?: boolean;
};
export type ConsoleOptions_ = {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
};
export type Validate = () => any;
/**
 * A function returning a property value.
 */
export type Getter = () => any;
