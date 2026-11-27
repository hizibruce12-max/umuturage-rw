import posthog from './posthog.js'

const posthogLogger = {
  info(message, attributes) {
    posthog?.logger.info(message, attributes)
  },
  warn(message, attributes) {
    posthog?.logger.warn(message, attributes)
  },
}

export default posthogLogger
