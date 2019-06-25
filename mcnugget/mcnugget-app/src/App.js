import React, { Component } from "react"
import { Route, Switch, Link } from "react-router-dom"

import { styles, square } from "./utils"

import nugImg from "./nug.jpg"

import FileBrowser from "./FileBrowser"
import Uploader from "./Uploader"

const LOGO_SIZE = "30px"

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
        <img
          alt="nug"
          src={nugImg}
          style={{
            ...styles.inline,
            ...square(LOGO_SIZE)
          }}
        />
        <h2 style={styles.inline}>mcnugget</h2>{" "}
        <p style={styles.inline}>a Doyle skunkworks project</p>
        <hr />
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
