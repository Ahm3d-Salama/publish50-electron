const { exec, spawn } = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const EventEmitter = require('events')

class FfmpegEmitter extends EventEmitter {}

function ffprobe(videoPath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe \
      -loglevel quiet \
      -print_format json \
      -select_streams v:0 \
      -show_entries \
      'stream=duration,height,width' \
      ${videoPath}`,
      (err, stdout, stderr) => {
        if (err)
          return reject(err)

        const metadata = JSON.parse(stdout).streams[0]
        metadata.duration = Math.round(metadata.duration * 100) / 100
        metadata.aspectRatio = Math.round(metadata.width * 1000 / metadata.height) / 1000
        metadata.widescreen = [2.398, 2.370].indexOf(metadata.aspectRatio) > -1
        resolve(metadata)
      }
    )
  })
}


function ffmpeg(videoPath) {
  return {
    async thumbnails(options) {
      const metadata = await ffprobe(videoPath)
      const msDuration = metadata.duration * 1000000
      const emitter = new FfmpegEmitter()
      const { frequency, size, outFolder } = options

      let filters = `fps=(1/${frequency})`
      if (size)
        filters += `,scale=${size}`

      if (fs.existsSync(outFolder))
        fs.removeSync(outFolder)

      // TODO use when electron use node 11
      // fs.mkdirSync(outFolder, { recursive: true })
      fs.mkdirpSync(outFolder)

      const outFile = options.outFile || `%d-${path.basename(videoPath, path.extname(videoPath))}.jpg`
      const destination = path.join(outFolder, outFile)

      const args = [
        '-i', videoPath,
        '-loglevel', 'quiet',
        '-nostdin',
        '-progress', '-',
        '-filter:v', `${filters}`,
        destination
      ]

      const process = spawn('ffmpeg', args)
      process.stderr.on('data', (err) => {
        emitter.emit('error', err)
      })

      let progress = {}
      let lines = ''
      process.stdout.on('data', (chunk) => {
        lines += chunk.toString()
        if (!lines.endsWith('\n'))
          return

        lines.split('\n').filter(line => line).forEach(line => {
          const [ key, val ] = line.split('=')
          if (key === 'progress') {
            progress.percent = Math.round(progress.out_time_ms * 100 / msDuration)
            emitter.emit('progress', progress)
            progress = {}
            return
          }

          progress[key] = val
        })

        lines = ''
      })

      process.on('exit', (code, signal) => {
        emitter.emit('end', { code, signal })
      })

      return emitter
    }
  }
}

module.exports = { ffprobe, ffmpeg }
