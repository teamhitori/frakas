import { LogLevel } from "./LogLevel";

declare global {
    var loglevel: LogLevel;

    interface Console {
        logE(...args: any[]): void;
        logW(...args: any[]): void;
        logI(...args: any[]): void;
        logDebug(...args: any[]): void;
        logDiag(...args: any[]): void;
    }
}

