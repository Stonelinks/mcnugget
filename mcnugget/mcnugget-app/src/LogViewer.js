import React, { Component } from "react"

import { API_URL, REFRESH_INTERVAL } from "./utils"

export default class LogViewer extends Component {
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
