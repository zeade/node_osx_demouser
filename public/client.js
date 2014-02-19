// Client touch event recognition library.
//
// Copyright (c) 2014 Micah Jaffe.

var noop = function () { return false; };

var touchStart = noop, 
  touchEnd = noop, 
  touchMove = noop, 
  touchCancel = noop, 
  mouseWheel = noop, 
  sendURL = noop,
  gestureStart = noop, 
  gestureChange = noop, 
  gestureEnd = noop;

var isPress = false,
  pressTimer = null,
  isTap = false,
  tapTimer = null,
  isSwipe = false,
  isPan = false,
  swipeTimer = null,
  isMulti = false,
  isScroll = false;

var now = function () { return (new Date()).getTime(); };

function isJittery (x1, x2, y1, y2) {
  return (Math.abs(x1 - x2) < 5 && Math.abs(y1 - y2) < 5);
}

function isSwipey (x1, x2, y1, y2) {
  return (Math.abs(x1 - x2) > 20 || Math.abs(y1 - y2) > 20);
}

function clearPressTimer () {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function clearTapTimer () {
  if (tapTimer) {
    clearTimeout(tapTimer);
    tapTimer = null;
  }
}

function clearSwipeTimer () {
  if (swipeTimer) {
    clearTimeout(swipeTimer);
    swipeTimer = null;
  }
}

function sendMessageForEvent (event) {
  // FIXME: compress this message down more?
  var msg = {
    '_t': event.type,
    'tap': (isTap ? 1 : 0),
    'press': (isPress ? 1 : 0),
    'scroll': (isScroll ? 1 : 0),
    'x': [],
    'y': []
  };
  if (typeof event.touches !== 'undefined') {
    for (var i = 0; i < event.touches.length; i++) {
      msg.x[i] = event.touches[i].pageX;
      msg.y[i] = event.touches[i].pageY;
    }
  }
  if (msg._t === 'deviceorientation') {
    msg.alpha = event.alpha;
    msg.beta = event.beta;
    msg.gamma = event.gamma;
    // console.log('event: a=' + msg.alpha + ', b=' + msg.beta + ', g=' + msg.gamma);
  }
  if (msg._t === 'devicemotion') {
    
  }
  $('#last_event').html(event.type + ': x=' + msg.x + ', y=' + msg.y);
  return socket.emit('event', msg);
}

function touchEventsDisconnected () {
  $('#connection_status').html('Disconnected');
  $('#last_event').html('...');

  touchStart = noop;
  touchEnd = noop;
  touchMove = noop;
  touchCancel = noop;
  mouseWheel = noop;
  gestureStart = noop;
  gestureChange = noop;
  gestureEnd = noop;
  sendURL = noop;
}

var startX = [ 0 ],
  startY = [ 0 ],
  srvTimeSkew = 0;

function touchEventsConnected () {
  $('#connection_status').html('Connected');
  $('#last_event').html('...');

  touchStart = function (event) {
    event.preventDefault();

    console.log('touchstart: ' + event.touches[0].pageX + ',' +  event.touches[0].pageY);
    $('.my-touchpad').css('background-color', '#FFFFFF');  // white
    
    // Start gesture-ish recognizers
    if (!tapTimer) {
      tapTimer = setTimeout(function () {
        isPress = false;
        isTap = true;
      }, 50);
    }

    if (!swipeTimer) {
      swipeTimer = setTimeout(function () {
        isSwipe = false;
        isPan = true;
      }, 450);
    }

    if (event.touches.length === 1) {
      if (!pressTimer) {
        pressTimer = setTimeout(function () {
          isPress = true;
          isTap = false;
          $('.my-touchpad').css('background-color', '#659EC7');  // light blue
          sendMessageForEvent(event);
        }, 450);
      }
    }
    if (event.touches.length === 2) {
      isMulti = true;
      if (!isPress) {
        isScroll = true;
        $('.my-touchpad').css('background-color', '#AA00FF');  // purple
        clearPressTimer();
      }
    }
    startX = [event.touches[0].pageX];
    startY = [event.touches[0].pageY];
    sendMessageForEvent(event);
    return false;
  };

  touchMove = function (event) {
    event.preventDefault();
    
    var x = event.touches[0].pageX,
      y = event.touches[0].pageY;
    // console.log('touchmove: ' + event.touches[0].pageX + ',' +  event.touches[0].pageY);
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (tapTimer && !isJittery(startX[0], x, startY[0], y)) {
      clearTimeout(tapTimer);
      tapTimer = null;
      isTap = false;
    }
    if (!isPan && isSwipey(startX[0], x, startY[0], y)) {
      // Do not touch timer since end state is what is important
      isSwipe = true;
    }

    // $('.my-touchpad').css('background-color', '#C0C0C0');  // gray
    sendMessageForEvent(event);
    return false;
  };

  touchEnd = function (event) {
    event.preventDefault();
    $('#last_event').html(event.type);
    // console.log(event.type);
    sendMessageForEvent(event);

    // clean-up
    if (isTap) {
      $('.my-touchpad').css('background-color', '#FF6600');  // orange
    }
    if (isSwipe) {
      // $('.my-touchpad').css('background-color', '#FFFF00');  // yellow
    }
    isPan = isSwipe = isMulti = isScroll = isTap = isPress = false;
    clearPressTimer();
    clearTapTimer();
    clearSwipeTimer();
    return false;
  };

  // Cancel same as end right now
  touchCancel = touchEnd;

  gestureStart = function (event) {
    event.preventDefault();
    // console.log(event);
    return false;
  };

  gestureChange = function (event) {
    event.preventDefault();
    // console.log(event);
    return false;
  };

  gestureEnd = function (event) {
    event.preventDefault();
    // console.log(event);
    return false;
  };

  sendURL = function (event) {
    var val = $('#send_url').attr('value');
    var msg = {
      '_t': 'send_url',
      'val': val
    };
    socket.emit('event', msg);
  };
}

var srvHostURL = document.location.protocol // "http:"
                   + '//' 
                   + document.location.host // "<hostName>:<port>"
                   + '/';
var socket = io.connect(srvHostURL);

$(document).ready(function () {

  touchEventsDisconnected();

  // Start socket
  socket.on('connect', function () {

    console.log('connected');
    touchEventsConnected();  
    $('.my-touchpad').bind('touchstart', touchStart);
    $('.my-touchpad').bind('touchmove', touchMove);
    $('.my-touchpad').bind('touchend', touchEnd);
    $('.my-touchpad').bind('touchcancel', touchCancel);
    $('.my-touchpad').bind('gesturestart', gestureStart);
    $('.my-touchpad').bind('gesturechange', gestureChange);
    $('.my-touchpad').bind('gestureend', gestureEnd);
    $('#send_url').bind('blur', sendURL);
    window.addEventListener('deviceorientation', sendMessageForEvent);
    // window.addEventListener('devicemotion', sendMessageForEvent);

/*
    socket.on('message', function (msg) {
      console.log('message received: ' + msg);
    });
*/

    socket.on('init', function (msg) {
      console.log('init: w=' + msg.screenWidth + ', h=' + msg.screenHeight);
      // $('.my-touchpad').css({'width': msg.screenWidth + 'px', 'height': msg.screenHeight + 'px'});
    });

    socket.on('ping', function (msg) {
      socket.emit('pong', msg);
    });

    socket.on('disconnect', function () {
      console.log('disconected');
      touchEventsDisconnected();
    });
  });  
});
