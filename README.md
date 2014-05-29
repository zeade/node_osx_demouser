# DeMouser - control your Mac from a web page

Run a node server on your Mac to control its mouse pointer from a web client, specifically intended for your mobile phone. Currently only works on Mac OS X 10.5 and higher. The client browser needs to support Socket.IO based connections (e.g. WebSockets).

This is a highly functional prototype, but it's still a prototype. Use with caution.

## Developer pre-reqs

Xcode installed (http://developer.apple.com).

Brew installed (http://brew.sh/).

Node and NPM installed from brew:

    brew install node

## Adding and building project dependencies 

npm packages to install in directory of this project (or globally). `node-gyp` is needed to compile the OS X controller code for native access to the mouse:

    npm install -g node-gyp
    npm install 
  
Create the OS X server-controller module:

    cd node_osx
    node-gyp clean configure build
  
## Run server

    cd ..
    node osx_server.js

NOTE: will listen on first network (en) interface with an IP address, change if needed.

## Connect client via web browser

Connect on the URL listed on start-up (e.g. 10.0.1.1:9000) with either iOS or Android browser. Gesture emulation for mobile devices: 

* __Tap__ = left mouse click = turns screen orange
* __Tap + hold for 0.5sec__ = left mouse click and hold, toggled to drag = turns screen blue. __Remove finger__ = mouse up
* __Tap + movement__ = move mouse
* __2 finger touch + movement__ = wheel scroll (vertical or horizontal) = turns screen purple

## TODOs

* More gestures (right click, etc)
* Richer command set beyond gestures (play music, start screen saver, keyboard, etc)
* Get mDNS working for server
* Make this work for Linux? Windows?

## License

The MIT License

Copyright (c) 2014 Micah Jaffe <me@micahjaffe.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
