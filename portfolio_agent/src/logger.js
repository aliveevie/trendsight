import winston from "winston";
import path from "path";
import fs from "fs";
import config from "./config.js";

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  defaultMeta: { service: "trading-agent" },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
    }),
    
    // Separate file for trades
    new winston.transports.File({
      filename: path.join(logsDir, "trades.log"),
      level: "info",
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          if (meta.trade) {
            return `${timestamp} [TRADE]: ${message} ${JSON.stringify(meta.trade)}`;
          }
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create specialized loggers
export const tradeLogger = {
  info: (message, tradeData = {}) => {
    logger.info(message, { trade: tradeData });
  },
  error: (message, error = {}) => {
    logger.error(message, { error: error.message || error });
  },
};

export const profitLogger = {
  info: (message, profitData = {}) => {
    logger.info(message, { profit: profitData });
  },
  error: (message, error = {}) => {
    logger.error(message, { error: error.message || error });
  },
};

export const systemLogger = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  error: (message, error = {}) => {
    logger.error(message, { error: error.message || error });
  },
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
};

export default logger; 