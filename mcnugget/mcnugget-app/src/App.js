import React, { Component } from "react"
import Dropzone from "react-dropzone"
import filesize from "filesize"
import Queue from "better-queue"
import QueueStore from "better-queue-memory"
import uuidv4 from "uuid/v4"
import moment from "moment"
import { Route, Switch, Link } from "react-router-dom"

// const API_URL = "http://rnd-proc-001:5000"
const API_URL = "http://localhost:5000"

const UPLOADER_STATUS = {
  NO_FILES: "no_files",
  HAS_FILES: "HAS_files",
  UPLOADING: "uploading",
  COMPLETE: "complete"
}

const EXTENSION_TO_MIMETYPE = {
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

const REFRESH_INTERVAL = 3000

const UPLOADS_PATH = "0_uploads"
const PROCESSING_PATH = "1_processing"
const DONE_PATH = "2_done"

const ALL_EXTENSIONS = []
let ALL_MIMETYPES = []
Object.keys(EXTENSION_TO_MIMETYPE).forEach(ext => {
  ALL_EXTENSIONS.push(ext)
  ALL_MIMETYPES = ALL_MIMETYPES.concat(EXTENSION_TO_MIMETYPE[ext])
})

function fetchWithProgress(url, opts = {}, onProgress) {
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
function sanitize(filename) {
  return filename
    .replace(/[:,]/g, "")
    .replace(/[^A-Za-z0-9_.-]/g, " ")
    .split(" ")
    .join("-")
}

class Uploader extends Component {
  constructor(props) {
    super(props)
    this.state = {
      projectID: uuidv4(),
      status: UPLOADER_STATUS.NO_FILES,
      files: [],
      progress: {}
    }

    this.onAcceptFiles = this.onAcceptFiles.bind(this)
    this.onCancel = this.onCancel.bind(this)
    this.onUpload = this.onUpload.bind(this)
    this.updateProgress = this.updateProgress.bind(this)
  }

  componentDidMount() {
    this.setState({
      projectID: uuidv4(),
      status: UPLOADER_STATUS.NO_FILES,
      files: [],
      progress: {}
    })

    this.q = new Queue(
      ({ id, file }, cb) => {
        const data = new FormData()
        data.append("file", file)
        fetchWithProgress(
          `${API_URL}/upload/${this.state.projectID}/${file.name}`,
          {
            mode: "no-cors",
            method: "POST",
            body: data
          },
          e => {
            const { loaded, total } = e
            console.log(
              id,
              "upload progress",
              filesize(loaded),
              "of",
              filesize(total)
            )
            this.updateProgress(id, { loaded, total })
          }
        ).then(res => cb(null, res), e => cb(e, null))
      },
      {
        store: new QueueStore(),
        autoResume: false,
        concurrent: 10,
        maxRetries: 1000,
        retryDelay: 1000,
        afterProcessDelay: 1000
      }
    )
      .on("task_finish", id => {
        console.log(id, "finished upload")
        this.updateProgress(id, { done: true })
      })
      .on("task_failed", id => {
        console.log(id, "failed upload")
        debugger
      })
  }

  componentWillUnmount() {
    this.q.destroy()
  }

  updateProgress(id, p) {
    const { projectID, progress } = this.state
    const newProgress = Object.assign(progress, {
      [id]: Object.assign(progress[id], p)
    })
    let newStatus = UPLOADER_STATUS.COMPLETE
    let allDone = true
    for (var k in newProgress) {
      if (allDone && !newProgress[k].done) {
        allDone = false
        newStatus = UPLOADER_STATUS.UPLOADING
      }
    }

    if (newStatus === UPLOADER_STATUS.COMPLETE) {
      setTimeout(() => {
        window.location.href = `/files/${UPLOADS_PATH}/${projectID}`
      }, 1000)
    }

    this.setState({
      status: newStatus,
      progress: newProgress
    })
  }

  onAcceptFiles(files) {
    if (files && files.length) {
      this.setState({
        status: UPLOADER_STATUS.HAS_FILES,
        files
      })
    }
  }

  onCancel() {
    this.setState({
      status: UPLOADER_STATUS.NO_FILES,
      files: []
    })
  }

  onUpload() {
    const ts = moment().format("MMMM Do YYYY, h:mm a")
    const name = prompt("Please name the project", ts)
    if (!name) {
      this.onCancel()
      return
    }
    this.setState({
      projectID: sanitize(`${name === ts ? ts : name + "-" + ts}-${uuidv4()}`)
    })

    const progress = {}
    this.state.files.forEach(f => {
      const id = f.name
      progress[id] = {
        id,
        done: false,
        loaded: 0,
        total: f.size
      }

      this.q.push({ id, file: f })
    })

    this.setState({
      status: UPLOADER_STATUS.UPLOADING,
      progress
    })
  }

  render() {
    const { projectID, status, files, progress } = this.state
    return (
      <div>
        <aside>
          {status === UPLOADER_STATUS.UPLOADING && (
            <p style={{ display: "inline-block" }}>Uploading to {projectID}</p>
          )}
          {status === UPLOADER_STATUS.HAS_FILES && (
            <button onClick={this.onUpload}>Upload {files.length} files</button>
          )}
          {(status === UPLOADER_STATUS.UPLOADING ||
            status === UPLOADER_STATUS.HAS_FILES) && (
            <Link to="/">
              <button onClick={this.onCancel} style={{ marginLeft: "10px" }}>
                Cancel
              </button>
            </Link>
          )}
          {status === UPLOADER_STATUS.COMPLETE && (
            <div>
              <p style={{ display: "inline-block" }}>
                Upload to {projectID} complete. You will be automatically
                redirected.
              </p>
            </div>
          )}
        </aside>
        {status === UPLOADER_STATUS.NO_FILES && (
          <Dropzone
            accept={ALL_MIMETYPES.join(", ")}
            onDrop={this.onAcceptFiles}
            style={{
              borderRadius: "10px",
              border: "1px dashed black",
              padding: "10px"
            }}
          >
            <p>
              Try dropping some files here, or click to select files to upload.
            </p>
            <p>
              {`${ALL_EXTENSIONS.join(", ")}`} files are accepted, zips must
              contain images.
            </p>
          </Dropzone>
        )}
        <aside>
          {status === UPLOADER_STATUS.HAS_FILES && (
            <div>
              <ul>
                {files.sort().map(f => (
                  <li key={f.name}>
                    {f.name} - {filesize(f.size)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status === UPLOADER_STATUS.UPLOADING && (
            <div>
              <ul>
                {Object.entries(progress)
                  .sort()
                  .reverse()
                  .map(([filename, p]) => {
                    return (
                      <li key={filename}>
                        {filename} -
                        {p.done
                          ? " upload complete"
                          : ` ${filesize(p.loaded)} of ${filesize(p.total)}`}
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    )
  }
}

class LogViewer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      contents: ""
    }

    this.pollData = this.pollData.bind(this)
  }

  componentWillMount() {
    this._polling = true
    this.pollData()
  }

  componentWillUnmount() {
    this._polling = false
  }

  pollData() {
    const { path } = this.props.logFile
    const reqURL = `${API_URL}/data_files/${path}`
    fetch(reqURL)
      .then(r => r.text())
      .then(contents => {
        this.setState({ contents })
        if (this._polling) {
          setTimeout(this.pollData, REFRESH_INTERVAL)
        }
      })
  }

  render() {
    const { contents } = this.state
    return <pre>{contents}</pre>
  }
}
class FileBrowser extends Component {
  constructor(props) {
    super(props)
    this.state = {
      currPath: this.getDefaultPath(),
      files: []
    }

    this.pollData = this.pollData.bind(this)
    this.fetchOnce = this.fetchOnce.bind(this)
    this.changePath = this.changePath.bind(this)
    this.getDefaultPath = this.getDefaultPath.bind(this)
    this.makeReqURLForPath = this.makeReqURLForPath.bind(this)
    this.onClickItem = this.onClickItem.bind(this)
    this.onBeginProcessing = this.onBeginProcessing.bind(this)
    this.onReprocess = this.onReprocess.bind(this)
  }

  componentWillMount() {
    this.fetchOnce()
    this._polling = true
    this.pollData()
  }

  componentWillUnmount() {
    this._polling = false
  }

  getDefaultPath() {
    const params = this.props.match && this.props.match.params
    return (params && params.path) || ""
  }

  makeReqURLForPath(path) {
    return `${API_URL}/data_files/${path || ""}`
  }

  changePath(path) {
    this.setState({ currPath: path }, this.fetchOnce)
  }

  fetchOnce(cb) {
    const { currPath } = this.state
    const reqURL = this.makeReqURLForPath(currPath)
    fetch(reqURL)
      .then(r => r.json())
      .then(files => {
        this.setState({ files })
        cb && cb()
      })
  }

  pollData() {
    this.fetchOnce(() => {
      if (this._polling) {
        setTimeout(this.pollData, REFRESH_INTERVAL)
      }
    })
  }

  onBeginProcessing(projectID) {
    fetch(`${API_URL}/begin_processing/${projectID}`, {
      method: "POST"
    })
      .then(r => r.text())
      .then(console.log)

    setTimeout(() => {
      window.location.href = `/files/${PROCESSING_PATH}/${projectID}`
    }, 1000)
  }

  onReprocess(projectID) {
    fetch(`${API_URL}/reprocess/${projectID}`, {
      method: "POST"
    })
      .then(r => r.text())
      .then(console.log)

    setTimeout(() => {
      window.location.href = `/files/${PROCESSING_PATH}/${projectID}`
    }, 1000)
  }

  onClickItem(f) {
    if (f.isFile) {
      const reqURL = this.makeReqURLForPath(f.path)
      window.location.href = reqURL
    } else {
      this.changePath(f.path)
    }
  }

  render() {
    const path = this.getDefaultPath()
    const splitPath = path.split("/")
    const isRoot = !path
    const isUpload = splitPath[0] === UPLOADS_PATH && splitPath.length >= 2
    const isProcess = splitPath[0] === PROCESSING_PATH && splitPath.length >= 2
    const projectID = splitPath[1]
    const { files } = this.state
    const logFiles = files
      .filter(f => f.name.startsWith("mcnugget-log"))
      .sort((a, b) => a.name <= b.name)
    const logFile = isProcess && !!logFiles.length && logFiles[0]
    return (
      <div>
        {!isRoot && (
          <Link to="/">
            <button>Home</button>
          </Link>
        )}
        {!isRoot &&
          splitPath.map((part, i) => {
            if (!part) {
              return null
            }
            const partPath = splitPath.slice(0, i + 1).join("/")
            const innerComponent =
              i === splitPath.length - 1 ? (
                part
              ) : (
                <Link
                  to={`/files/${partPath}`}
                  onClick={() => this.changePath(partPath)}
                >
                  {part}
                </Link>
              )
            return (
              <div key={part} style={{ display: "inline-block" }}>
                <div style={{ display: "inline-block", margin: "5px" }}>/</div>
                {innerComponent}
              </div>
            )
          })}
        {isUpload && (
          <div>
            <button onClick={() => this.onBeginProcessing(projectID)}>
              Process upload
            </button>
          </div>
        )}
        {isProcess && (
          <div>
            <button onClick={() => this.onReprocess(projectID)}>
              Reprocess
            </button>
            {logFile && <LogViewer logFile={logFile} />}
          </div>
        )}
        <ul>
          {files.map(f => {
            return (
              <li key={f.name}>
                <Link
                  to={!f.isFile && `/files/${f.path}`}
                  onClick={() => this.onClickItem(f)}
                >
                  {f.name}
                </Link>
                {f.isFile && ` - ${filesize(f.size)}`}
                {!f.isFile && ` - ${f.numItems} items`}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }
}

class Home extends Component {
  render() {
    return (
      <div>
        <div>
          <Link to="/new">
            <button>Create new</button>
          </Link>
        </div>
        <FileBrowser />
      </div>
    )
  }
}

class App extends Component {
  render() {
    return (
      <div>
        <h2 style={{ display: "inline-block" }}>mcnugget</h2>{" "}
        <p style={{ display: "inline-block" }}>a Doyle skunkworks project</p>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/new" component={Uploader} />
          <Route path="/files/:path*" component={FileBrowser} />
        </Switch>
      </div>
    )
  }
}

export default App
