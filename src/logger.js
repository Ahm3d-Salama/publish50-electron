const { logger } = window

logger.transports.file.appName = 'publish50'
logger.transports.file.fileName = 'renderer.log'

// TODO
function error (arg) {
  return
}

export { logger, error }
