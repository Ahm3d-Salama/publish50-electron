const path = require('path')
const Queue = require('bull')

const logger = require('./logger')
const preferences = require('./preferences')

const queueNames = [
  'image processing',
  'video transcoding',
  'youtube'
]

const queues = {}

const jobsPath = path.join(__dirname, 'jobs')
const cpus = require('os').cpus().length

queueNames.forEach((queueName) => {
  try {
    queues[queueName] = new Queue(queueName, {
      redis: {
        port: preferences.get('general.redisPort')
      }
    })
  }
  catch (err) {
    logger.error(err.toString())
  }
})

queues['image processing'].process(
  'resize still',
  cpus,
  path.join(jobsPath, 'resize-still.js')
)

queues['video transcoding'].process(
  'transcode',
  cpus,
  path.join(jobsPath, '/transcode.js')
)

queues['youtube'].process('upload', cpus, path.join(jobsPath, 'youtube.js'))

module.exports = {
  queues,
  close() {
    Object.values(queues).forEach((queue) => {

      // Abort running jobs
      Object.values(queue.childPool.retained).forEach((child) => {
        child.send({__abortJobId__: '__self__'})
      })

      // Close queues
      queue.close().catch((err) => {
        logger.error(err.toString())
      })
    })
  }
}
