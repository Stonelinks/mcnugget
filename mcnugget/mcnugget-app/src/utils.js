// const API_URL = "http://rnd-proc-001:5000"
export const API_URL = "http://localhost:5000"

export const UPLOADER_STATUS = {
  NO_FILES: "no_files",
  HAS_FILES: "has_files",
  UPLOADING: "uploading",
  COMPLETE: "complete"
}

export const EXTENSION_TO_MIMETYPE = {
  jpeg: ["image/jpeg"],
  jpg: ["image/jpeg"],
  png: ["image/png"],
  zip: [
    "application/zip",
    "application/x-zip",
    "application/x-zip-compressed",
    "application/octet-stream",
    "application/x-compress",
    "application/x-compressed",
    "multipart/x-zip"
  ]
}

export const REFRESH_INTERVAL = 3000

export const UPLOADS_PATH = "0_uploads"
export const PROCESSING_PATH = "1_processing"
export const DONE_PATH = "2_done"

export const ALL_EXTENSIONS = []
export let ALL_MIMETYPES = []
Object.keys(EXTENSION_TO_MIMETYPE).forEach(ext => {
  ALL_EXTENSIONS.push(ext)
  ALL_MIMETYPES = ALL_MIMETYPES.concat(EXTENSION_TO_MIMETYPE[ext])
})

export const styles = { inline: { display: "inline-block" } }

export function square(d) {
  return {
    width: d,
    height: d
  }
}

export function fetchWithProgress(url, opts = {}, onProgress) {
  return new Promise((res, rej) => {
    var xhr = new XMLHttpRequest()
    xhr.open(opts.method || "get", url)
    for (var k in opts.headers || {}) xhr.setRequestHeader(k, opts.headers[k])
    xhr.onload = e => res(e.target.responseText)
    xhr.onerror = rej
    if (xhr.upload && onProgress) xhr.upload.onprogress = onProgress // event.loaded / event.total * 100 ; //event.lengthComputable
    xhr.send(opts.body)
  })
}

// shitty version of http://werkzeug.pocoo.org/docs/0.14/utils/#werkzeug.utils.secure_filename
export function sanitize(filename) {
  return filename
    .replace(/[:,]/g, "")
    .replace(/[^A-Za-z0-9_.-]/g, " ")
    .split(" ")
    .join("-")
}
