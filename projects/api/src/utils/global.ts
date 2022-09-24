import { LogLevel } from "./LogLevel";

declare global {
    var loglevel: LogLevel;

    interface Console {
        logE(...args: any[]): void;
        logW(...args: any[]): void;
        logI(...args: any[]): void;
        logD(...args: any[]): void;
        logDiag(...args: any[]): void;
    }
}

