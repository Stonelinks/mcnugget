import React, { Component } from "react"
import filesize from "filesize"
import { Link } from "react-router-dom"

import {
  API_URL,
  REFRESH_INTERVAL,
  UPLOADS_PATH,
  PROCESSING_PATH,
  styles
} from "./utils"

import LogViewer from "./LogViewer"

export default class FileBrowser extends Component {
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
              <div key={part} style={styles.inline}>
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
