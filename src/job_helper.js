import * as path from 'path'

function truncate(s) {
  if (s.length > 32)
    return `${s.substring(0, 12)}...${s.substring(s.length - 20)}`

  return s
}

export function getJobDescription (job) {
  const {name, data} = job

  switch(name) {
    case 'resize still':
      return `${truncate(data.imagePath)} to ${data.raster}`
    case 'transcode':
      return `Transcode ${truncate(data.videoPath)} to ${data.format} (${data.raster})`
    case 'update metadata':
      return `Update ${path.join(data.bucket || '', data.prefix || '')}`
    case 'upload':
      return `Upload ${truncate(data.videoPath)} to Youtube`
    default:
      return 'Unknown job'
  }
}
