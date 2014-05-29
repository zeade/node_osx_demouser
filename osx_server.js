// Node based server focused on touch (mobile) based control of the host OS X system.
//
// Copyright (c) 2014, Micah Jaffe.

var osx = require('./node_osx/build/Release/osx'),
  exec = require('child_process').exec,
  spawn = require('child_process').spawn,
  sprintf = require('sprintf'),
  express = require('express'),
  bodyParser = require('body-parser'),
  errorHandler = require('errorhandler'),
  app = express(),
  srvPort = 9000,
  httpRegex = /^\b(https?):\/\/(?:(\S+?)(?::(\S+?))?@)?([a-z0-9\-.]+)(?::(\d+))?((?:[a-z0-9\-._?,'+\&%$=~*!():@\\]*)+)?/i,
  domainOrIpRegex = /^\b(?:(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9][a-z0-9\-]{0,61}?[a-z0-9]\.)+[a-z]{2,6})\b/i;

// FIXME: move this to a JS binding for OSX module
osx.open = function (val) {
  console.log('open: ' + val);

  if (httpRegex.exec(val)) {
    spawn('/usr/bin/open', [val]);
  } 
  else if (domainOrIpRegex.exec(val)) {
    spawn('/usr/bin/open', ['http://' + val]);
  }
  else if (val) {
    var url = 'http://google.com/search?q=' + val;
    spawn('/usr/bin/open', [url]);
  }
};

var now = function () { return (new Date()).getTime(); };

// Grabs first IP address on en
var getIpAddress = function (foundIPAddr) {
  
  var ipRegex = /\s+inet (\d+\.\d+\.\d+\.\d+)/m,
    i = 0;
  
  while (i < 10) {
    (function () {
      var iface = 'en' + i;
      exec('ifconfig ' + iface, function (error, stdout, stderr) {
        var ipAddr = stdout.match(ipRegex);
        if (ipAddr) {
          foundIPAddr(ipAddr[1], iface);
        }
      });
    })();
    i++;
  }
};

// Server based info
var screen = osx.screen(),
  srvX = screen.originX, 
  srvY = screen.originY,
  srvWidth = screen.sizeWidth,
  srvHeight = screen.sizeHeight,
  cliCount = 0,
  eventID = 10000 + process.pid,
  eventCount = 0,
  isPingerOn = false;

// And go...

// Express goodies, this is mostly to make sure we are serving static files out of "./public"
app.use(bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(errorHandler({ 
  'dumpExceptions': true,
  'showStack': true
}));

// Root route
app.get('/', function (req, res) {
  var fs = require('fs');
  var index = fs.readFileSync('public/index.html');
  res.writeHead(200, {'Content-Type': 'text/html'}); 
  res.end(index);
});

// Socket.IO
getIpAddress(function (ipAddr, iface) {
  console.log('Starting express on ' + ipAddr + ':' + srvPort + ' on interface ' + iface);
  var http = require('http'), 
    server = http.createServer(app),
    io = require('socket.io').listen(server);
  server.listen(srvPort, ipAddr);

  // var mdns = require('mdns'),
  //   ad = mdns.createAdvertisement(
  //   mdns.tcp('http'), // service type
  //   srvPort // port
  // );
  // console.log('Starting mDNS');
  // ad.start();

  // io.set('log level', 1);

  io.sockets.on('connection', function (socket) {

    // Per client 
    var cliX = 0,
      cliY = 0,
      pings = [],
      pingCount = -1,
      pingTimer = null;

    var handleClientEvent = function (msg) {
      if (msg._t === 'touchstart') {
        cliX = msg.x[0];
        cliY = msg.y[0];
        if (msg.press) {
          eventID++;
          osx.mouseDown(srvX, srvY, 0, eventID);
        }
      }
      else if (msg._t === 'touchmove') {
        var diffX = (cliX - msg.x[0]) * -1;
        var diffY = (cliY - msg.y[0]) * -1;
        cliX = msg.x[0];
        cliY = msg.y[0];
        var mvX = srvX + diffX;
        var mvY = srvY + diffY;

        if (msg.scroll) {
          osx.scrollWheel(2, -diffY, -diffX);
        } else if (mvX >= 0 && mvX <= srvWidth && mvY >= 0 && mvY <= srvHeight) {
          srvX = mvX;
          srvY = mvY;
          if (msg.press) {
            osx.mouseDrag(mvX, mvY, 0, eventID);
          } else {
            osx.mouseMove(mvX, mvY);
          }
        }
      }
      else if (msg._t === 'touchend' || msg._t === 'touchcancel') {
        if (msg.tap) {
          eventID++;
          osx.mouseDown(srvX, srvY, 0, eventID);
        }
        if (msg.press || msg.tap) {
          osx.mouseUp(srvX, srvY);
        }
      }
      else if (msg._t === 'send_url') {
        osx.open(msg.val);
      }
      else if (msg._t === 'deviceorientation') {
        // console.log("alpha=" + sprintf.sprintf("%0.3f", msg.alpha) +
        // ", beta=" + sprintf.sprintf("%0.3f", msg.beta) + ", gamma=" + sprintf.sprintf("%0.3f", msg.gamma));
      }
    };

    var startPingTimer = function () {
      return setTimeout(function () {
        pingCount++;
        socket.emit('ping', [pingCount, now(), eventCount]);
      }, 1000);
    };

    // socket.connection.setNoDelay();
    // socket.connection.setKeepAlive(true);

    cliCount++;
    console.log('client #' + cliCount + ' connected');
    // console.log(socket);

    // Move mouse based on incoming messages
    socket.on('event', function (msg) {
      eventCount++;
      handleClientEvent(msg);
      // console.log(msg);
    });

    socket.on('disconnect', function () {
      console.log('client disconnected');
      cliCount--;
      if (pingTimer) {
        clearTimeout(pingTimer);
        pingTimer = null;
      }
      if (pings.length > 0) {
        var stats = require('fs').createWriteStream('/tmp/ping_stats_' + socket.id + '.csv', {'mode': 0644});
        stats.write('ping_sequence,time_in_ms,events_sent_by_client_during_ping_wait\n');
        var i;
        for (i = 0; i < pings.length; i++) {
          stats.write(i + ',' + pings[i][0] + ',' + pings[i][1] + '\n');
        }
        stats.end();
      }
    });

    socket.on('pong', function (msg) {
      if (typeof msg === 'undefined') {
        return;
      }
      var tD = now() - msg[1];
      var eD = eventCount - msg[2];
      pings[msg[0]] = [tD, eD];
      console.log('ping cli=%d seq=%d events=%d time=%d ms', socket.id, msg[0], eD, tD);
      pingTimer = startPingTimer();
    });

    // Init client
    var msg = { 
      'screenWidth': srvWidth, 
      'screenHeight': srvHeight,
      'clientCount': cliCount,
      't': now()
    };
    socket.emit('init', msg);

    if (isPingerOn) {
      pingTimer = startPingTimer();
    }
  }); // end of client connection
}); // end of finding IP

