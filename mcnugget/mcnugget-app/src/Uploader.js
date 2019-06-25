import React, { Component } from "react"
import Dropzone from "react-dropzone"
import filesize from "filesize"
import Queue from "better-queue"
import QueueStore from "better-queue-memory"
import uuidv4 from "uuid/v4"
import moment from "moment"
import { Link } from "react-router-dom"

import {
  API_URL,
  UPLOADER_STATUS,
  UPLOADS_PATH,
  ALL_EXTENSIONS,
  ALL_MIMETYPES,
  styles,
  fetchWithProgress,
  sanitize
} from "./utils"

export default class Uploader extends Component {
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
            <p style={styles.inline}>Uploading to {projectID}</p>
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
              <p style={styles.inline}>
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
