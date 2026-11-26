import { Code } from "./code";

const response = `{
  "version": "1.4.0",
  "assets": [{
    "name": "Editor_1.4.0.dmg",
    "size": 48314240
  }]
}`;

/** Pair an illustrative client prompt with actual fields from the generic update protocol. */
export function UpdateStory() {
  return (
    <figure
      className="update-story"
      aria-label="An application update, from the user prompt to the HTTP response"
    >
      <div
        className="update-notice"
        role="img"
        aria-label="Example desktop prompt: Editor 1.4.0 is available. The installed version is 1.3.0."
      >
        <div className="example-app-icon" aria-hidden="true">
          E<span />
        </div>
        <div className="update-notice-content">
          <div className="example-app-name">
            Editor <span>Software update</span>
          </div>
          <h2>There’s a new version.</h2>
          <p>
            <strong>Editor 1.4.0</strong> is ready to install.
            <br />
            You’re currently using <span className="installed-version">version 1.3.0.</span>
          </p>
          <div className="example-update-actions" aria-hidden="true">
            <span>Remind me later</span>
            <span>Install and relaunch</span>
          </div>
        </div>
      </div>
      <div className="update-exchange">
        <div className="exchange-request">
          <span>GET</span>
          <code>
            /editor/stable/generic/
            <wbr />
            update/1.3.0
          </code>
        </div>
        <div className="exchange-response">
          <span>200 OK</span>
          <span>application/json</span>
        </div>
        <Code code={response} language="json" />
      </div>
      <figcaption>Example application. Selected response fields.</figcaption>
    </figure>
  );
}
