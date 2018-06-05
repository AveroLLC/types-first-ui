import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './containers/App';

const root = document.createElement('div');

ReactDOM.render(<App />, root);

document.body.appendChild(root);
