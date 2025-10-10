declare module 'winston-daily-rotate-file' {
  import { TransportStream } from 'winston-transport';
  
  interface DailyRotateFileOptions {
    filename: string;
    datePattern?: string;
    level?: string;
    zippedArchive?: boolean;
    maxSize?: string;
    maxFiles?: string;
    format?: any;
  }
  
  class DailyRotateFile extends TransportStream {
    constructor(options: DailyRotateFileOptions);
  }
  
  export = DailyRotateFile;
}
