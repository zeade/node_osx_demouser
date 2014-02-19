// FIXME: this should work, does not appear to be

var mdns = require('mdns'),
  ad = mdns.createAdvertisement(
  'http', // service type
  srvPort, // port
  mdns.TCP, // protocol
  0, // flags
  0, // interface (not sure how to specify just en1)
  'osx_mouser', // name
  'local', // domain
  'osx_mouser.local', // host
  { 'What': 'what?' }, // txt_record (object)
  function () {  // ready callback
    console.log('mDNS ready');
  }
);
ad.start();
