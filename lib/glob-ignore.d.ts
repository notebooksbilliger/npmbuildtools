export function IgnoreSync(pathSpec: string, ignoreFileName?: string, consoleOptions?: {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
}): string[];
